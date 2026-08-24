"use client";

import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import WeatherCard from "@/components/WeatherCard";

// GitHub Pages 部署在子路徑下，靜態資源需加上 basePath
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 鍵盤 1、2… 依序切換
const VIDEOS = [
  `${BASE_PATH}/videos/forest.mp4`,
  `${BASE_PATH}/videos/skyline.mp4`,
];

export default function Home() {
  const [videoIndex, setVideoIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const index = Number(e.key) - 1;
      if (index >= 0 && index < VIDEOS.length) setVideoIndex(index);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="flex h-dvh w-full items-center justify-center overflow-hidden bg-black">
      {/* 1:1 展示畫面，作為 container 讓面板以 cqw 等比縮放 */}
      <div className="@container relative aspect-square h-full max-h-[100vw]">
        <VideoBackground src={VIDEOS[videoIndex]} />
        {/* 左上 1/4 區塊 */}
        <div className="absolute left-0 top-0 h-1/2 w-1/2 p-[3cqw]">
          <WeatherCard />
        </div>
      </div>
    </main>
  );
}
