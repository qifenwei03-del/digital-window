"use client";

import { useEffect, useRef } from "react";

type Props = { sources: string[]; activeIndex: number };

export default function VideoBackground({ sources, activeIndex }: Props) {
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

  // 依序預載：載完一支才開始下一支。四支同時抓會把開場的頻寬吃光。
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
