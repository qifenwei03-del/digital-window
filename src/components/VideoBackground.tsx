"use client";

import { useEffect, useRef, useState } from "react";
import type { RemoteClock } from "@/lib/useSync";

type Props = {
  sources: string[];
  activeIndex: number;
  /** 有值代表這台負責發布播放時間（雙螢幕時是左半那台） */
  onPublishClock?: (videoIndex: number, time: number) => void;
  /** 遠端的播放時間，跟隨端用來校正 */
  clock?: RemoteClock | null;
  /** 顯示中的影片第一次真的開始播（有畫面了）時呼叫一次，用來收掉載入畫面 */
  onFirstFrame?: () => void;
};

const PUBLISH_INTERVAL_MS = 400;
/** 超過這個秒差就直接 seek，硬跳一次比長時間追趕好 */
const SEEK_THRESHOLD_S = 0.5;
/** 這個秒差以內不動，避免一直微調造成抖動 */
const IN_SYNC_S = 0.06;
/** 開場先讓播放中的那支獨佔資源這麼久，再開始預載其餘影片 */
const PRELOAD_START_MS = 6000;
/** 之後每多載一支之間的間隔 */
const PRELOAD_GAP_MS = 4000;
/**
 * 影片始終沒開始播時，預載仍然要啟動。自動播放被擋的話 playing 永遠不會來，
 * 少了這道保險就再也不會預載任何一支，切換時每次都得從頭抓。
 */
const PRELOAD_FALLBACK_MS = 12000;

export default function VideoBackground({
  sources,
  activeIndex,
  onPublishClock,
  clock,
  onFirstFrame,
}: Props) {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  // 只回報一次；之後切換影片不該再觸發載入畫面
  const firstFrameSent = useRef(false);
  // 預載排程要在開始播之後才啟動，所以這裡需要的是會觸發 render 的狀態
  const [preloadArmed, setPreloadArmed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPreloadArmed(true), PRELOAD_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);
  // 預載排程讀得到最新的 activeIndex，但不因為它變動而重跑
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    // 只讓顯示中的那支解碼；其餘暫停但保留已下載的緩衝，
    // 切換才不必重抓（GitHub Pages 只給 max-age=600）。
    refs.current.forEach((video, i) => {
      if (video && i !== activeIndex) video.pause();
    });

    const active = refs.current[activeIndex];
    if (!active) return;
    // src 一律在 effect 裡才指定：寫進 SSR HTML 的話，瀏覽器會在解析階段就開抓
    // 影片，跟 JS chunks 搶頻寬（實測讓 hydration 延後 40 秒）。
    if (!active.src) active.src = sources[activeIndex];

    // play() 是一次性的，不像 autoPlay 屬性會自動重試。分頁在背景時會被拒絕，
    // 展示螢幕不能停在靜止首格，所以回到前景時再試一次。
    const tryPlay = () => void active.play().catch(() => {});
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay);
    return () => document.removeEventListener("visibilitychange", tryPlay);
  }, [activeIndex, sources]);

  // 時間來源：定期把目前播放位置廣播出去
  useEffect(() => {
    if (!onPublishClock) return;
    const timer = setInterval(() => {
      const active = refs.current[activeIndex];
      if (active && !active.paused) onPublishClock(activeIndex, active.currentTime);
    }, PUBLISH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [onPublishClock, activeIndex]);

  // 跟隨端：依遠端時間校正
  useEffect(() => {
    const active = refs.current[activeIndex];
    if (!active) return;

    // 沒有時間來源就把速率歸位，否則會停在上次的校正值
    if (!clock || clock.videoIndex !== activeIndex) {
      active.playbackRate = 1;
      return;
    }

    // 補上訊息在網路上花掉的時間
    const expected = clock.time + (performance.now() - clock.sentAt) / 1000;
    let drift = active.currentTime - expected;

    // 影片是 loop 的，跨越循環點時原始差值會接近整支長度，換算成較短的那一側
    const duration = active.duration;
    if (Number.isFinite(duration) && duration > 0 && Math.abs(drift) > duration / 2) {
      drift -= Math.sign(drift) * duration;
    }

    const magnitude = Math.abs(drift);
    if (magnitude > SEEK_THRESHOLD_S) {
      active.playbackRate = 1;
      const target = expected % (Number.isFinite(duration) && duration > 0 ? duration : Infinity);
      active.currentTime = target < 0 ? 0 : target;
    } else if (magnitude > IN_SYNC_S) {
      // 領先就放慢、落後就加快，讓它自己收斂，不用硬跳
      active.playbackRate = drift > 0 ? 0.97 : 1.03;
    } else {
      active.playbackRate = 1;
    }
  }, [clock, activeIndex]);

  /*
    預載其餘影片。

    原本是鏈式的：某支 canplaythrough 就指定下一支的 src。看起來是「載完一支
    才載下一支」，實際上不是 —— canplaythrough 只表示「以目前速率估計能播完」，
    不必等整支下載完就會觸發。實測六支在 1.2 秒內全部開始下載
    （527/663/768/888/1080/1191ms），等於開場同時有六個下載與六個解多工器在跑，
    而合成器正在對舞台做 backdrop-filter。這就是前幾秒偶爾閃動的來源，
    也解釋了為什麼不是每次都閃：檔案在不在快取裡決定了負擔差多少。

    改成用時間排程。播放中的那支先獨佔資源幾秒，之後每隔幾秒才多載一支。
    切換仍然是即時的：真的切到還沒載的那支時，上面的 effect 會當場指定 src。
  */
  useEffect(() => {
    if (!preloadArmed) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = PRELOAD_START_MS;
    sources.forEach((src, i) => {
      if (i === activeIndexRef.current) return;
      timers.push(
        setTimeout(() => {
          const video = refs.current[i];
          if (video && !video.src) video.src = src;
        }, delay)
      );
      delay += PRELOAD_GAP_MS;
    });
    return () => timers.forEach(clearTimeout);
    // activeIndex 用 ref 讀：切換影片不該把預載排程整個重來
  }, [preloadArmed, sources]);

  /*
    用 playing 而不是 canplaythrough 當「可以露臉了」的訊號。
    canplaythrough 只保證資料夠，畫面不一定已經上去；playing 是真的開始出畫格，
    這樣載入畫面收掉的瞬間底下一定已經是動的影像，不會閃一格黑或靜止首格。
  */
  const handlePlaying = (i: number) => () => {
    if (i !== activeIndex || firstFrameSent.current) return;
    firstFrameSent.current = true;
    setPreloadArmed(true);
    onFirstFrame?.();
  };

  return (
    <>
      {sources.map((src, i) => (
        <video
          key={src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={handlePlaying(i)}
          className={`absolute inset-0 h-full w-full object-cover ${
            i === activeIndex ? "" : "invisible"
          }`}
        />
      ))}
    </>
  );
}
