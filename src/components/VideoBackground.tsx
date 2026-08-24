"use client";

import { useEffect, useRef } from "react";

// src 只在 effect 裡指定：若寫進 SSR HTML，瀏覽器會在解析階段就開抓 20MB+ 的影片，
// 跟 JS chunks 搶頻寬（實測讓 hydration 延後 40 秒）。autoPlay 會蓋掉 preload 提示，
// 所以連 autoPlay 也不能放在標記上，改由 effect 呼叫 play()。
export default function VideoBackground({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.src = src;

    // play() 是一次性的：分頁在背景時會被拒絕，且不像 autoPlay 屬性會自動重試。
    // 展示螢幕不能停在靜止首格，所以回到前景時再試一次。
    const tryPlay = () => void video.play().catch(() => {});
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay);
    return () => document.removeEventListener("visibilitychange", tryPlay);
  }, [src]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
