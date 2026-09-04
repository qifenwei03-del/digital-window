"use client";

import { useEffect, useRef } from "react";
import type { RemoteClock } from "@/lib/useSync";

type Props = {
  sources: string[];
  activeIndex: number;
  /** 有值代表這台負責發布播放時間（雙螢幕時是左半那台） */
  onPublishClock?: (videoIndex: number, time: number) => void;
  /** 遠端的播放時間，跟隨端用來校正 */
  clock?: RemoteClock | null;
};

const PUBLISH_INTERVAL_MS = 400;
/** 超過這個秒差就直接 seek，硬跳一次比長時間追趕好 */
const SEEK_THRESHOLD_S = 0.5;
/** 這個秒差以內不動，避免一直微調造成抖動 */
const IN_SYNC_S = 0.06;

export default function VideoBackground({
  sources,
  activeIndex,
  onPublishClock,
  clock,
}: Props) {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

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

  // 依序預載：載完一支才開始下一支。六支同時抓會把開場的頻寬吃光。
  const preloadNext = (i: number) => () => {
    const next = refs.current[i + 1];
    if (next && !next.src) next.src = sources[i + 1];
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
          onCanPlayThrough={preloadNext(i)}
          className={`absolute inset-0 h-full w-full object-cover ${
            i === activeIndex ? "" : "invisible"
          }`}
        />
      ))}
    </>
  );
}
