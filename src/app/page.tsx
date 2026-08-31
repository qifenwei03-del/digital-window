"use client";

import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import WeatherCard from "@/components/WeatherCard";
import WeatherDashboard from "@/components/WeatherDashboard";
import WeatherDetail from "@/components/WeatherDetail";
import WeatherAmbient from "@/components/WeatherAmbient";
import WeatherBoard from "@/components/WeatherBoard";
import { useWeather } from "@/lib/useWeather";

// GitHub Pages 部署在子路徑下，靜態資源需加上 basePath
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 鍵盤 1、2… 依序切換
const VIDEOS = [1, 2, 3, 4].map((n) => `${BASE_PATH}/videos/${n}.mp4`);

// A、S、D、F、G 各自對應一個面板，直接選取；預設同 A
type Panel = "compact" | "dashboard" | "detail" | "ambient" | "board";
const PANEL_KEYS: Record<string, Panel> = {
  a: "compact",
  s: "dashboard",
  d: "detail",
  f: "ambient",
  g: "board",
};

export default function Home() {
  const [videoIndex, setVideoIndex] = useState(0);
  const [panel, setPanel] = useState<Panel>("compact");
  const { weather, failed } = useWeather();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = PANEL_KEYS[e.key.toLowerCase()];
      if (target) {
        setPanel(target);
        return;
      }
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
        <VideoBackground sources={VIDEOS} activeIndex={videoIndex} />
        {panel === "compact" ? (
          /* 左上 1/4 區塊 */
          <div className="absolute left-0 top-0 h-1/2 w-1/2 p-[3cqw]">
            <WeatherCard weather={weather} failed={failed} />
          </div>
        ) : (
          /* 其餘四種都是滿版 */
          <div className="absolute inset-0">
            {panel === "dashboard" && <WeatherDashboard weather={weather} failed={failed} />}
            {panel === "detail" && <WeatherDetail weather={weather} failed={failed} />}
            {panel === "ambient" && <WeatherAmbient weather={weather} failed={failed} />}
            {panel === "board" && <WeatherBoard weather={weather} failed={failed} />}
          </div>
        )}
      </div>
    </main>
  );
}
