"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import VideoBackground from "@/components/VideoBackground";
import WeatherCard from "@/components/WeatherCard";
import WeatherDashboard from "@/components/WeatherDashboard";
import WeatherDetail from "@/components/WeatherDetail";
import WeatherAmbient from "@/components/WeatherAmbient";
import WeatherBoard from "@/components/WeatherBoard";
import { useWeather } from "@/lib/useWeather";
import { useSync, type Scene } from "@/lib/useSync";

// GitHub Pages 部署在子路徑下，靜態資源需加上 basePath
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 鍵盤 1、2… 依序切換
const VIDEOS = [1, 2, 3, 4, 5, 6].map((n) => `${BASE_PATH}/videos/${n}.mp4`);

// A、S、D、F、G 各自對應一個面板，直接選取；預設同 A
type Panel = "compact" | "dashboard" | "detail" | "ambient" | "board";
const PANEL_KEYS: Record<string, Panel> = {
  a: "compact",
  s: "dashboard",
  d: "detail",
  f: "ambient",
  g: "board",
};

/*
  雙螢幕裁切。兩台直式電視並排組成一個大畫面，各自開同一個網址，
  L／R 只決定自己看完整畫布的哪一半。

  做法是在原本的 main 外面包一層「虛擬畫布」，寬度 = 兩台螢幕合併寬度（200vw），
  右半那台再往左推一個螢幕寬。裡面的版面完全沒動，所以兩邊的縮放比例必然一致，
  接縫處會自然銜接 —— 這比讓左右各自算一次 responsive 可靠得多。
*/
type Display = "normal" | "left" | "right";
const DISPLAY_KEYS: Record<string, Display> = { l: "left", r: "right" };

// 視口是不是直式；裁切只在直式時生效，桌面橫式維持原樣
function usePortrait() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("resize", notify);
      window.addEventListener("orientationchange", notify);
      return () => {
        window.removeEventListener("resize", notify);
        window.removeEventListener("orientationchange", notify);
      };
    },
    () => window.innerHeight > window.innerWidth,
    () => false
  );
}

export default function Home() {
  const [videoIndex, setVideoIndex] = useState(0);
  const [panel, setPanel] = useState<Panel>("compact");
  const [display, setDisplay] = useState<Display>("normal");
  const { weather, failed } = useWeather();
  const portrait = usePortrait();

  const applyRemoteScene = useCallback((next: Scene) => {
    setVideoIndex(next.videoIndex);
    setPanel(next.panel as Panel);
  }, []);

  const { clock, publishClock, connected } = useSync({
    scene: { videoIndex, panel },
    onRemoteScene: applyRemoteScene,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // 同一鍵再按一次回到一般顯示，否則進了裁切就沒有退路
      const nextDisplay = DISPLAY_KEYS[key];
      if (nextDisplay) {
        setDisplay((current) => (current === nextDisplay ? "normal" : nextDisplay));
        return;
      }

      const target = PANEL_KEYS[key];
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

  const cropping = display !== "normal" && portrait;
  // 左半那台當時間來源，右半跟隨。沒進裁切模式時不需要指定。
  const isClockSource = cropping && display === "left";

  return (
    <div className="h-dvh w-screen overflow-hidden bg-black">
      <div
        className="h-full"
        style={
          cropping
            ? {
                width: "200vw",
                // 畫布寬 200vw，右半那台要往左推整個螢幕寬（100vw），不是畫布的一半
                transform: display === "right" ? "translateX(-100vw)" : undefined,
              }
            : { width: "100%" }
        }
      >
        <main className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
          {/* 1:1 展示畫面，作為 container 讓面板以 cqw 等比縮放。

              上限必須掛在 max-height：aspect-ratio 搭 height:100% 時，max-width 不會
              回頭縮高度（顯式高度會贏，比例反而被破壞），只有 max-height 會讓寬度跟著縮。
              裁切模式的容器是兩倍螢幕寬，所以上限跟著換成 200vw。 */}
          <div
            className="@container relative aspect-square h-full"
            style={{ maxHeight: cropping ? "200vw" : "100vw" }}
          >
            <VideoBackground
              sources={VIDEOS}
              activeIndex={videoIndex}
              onPublishClock={isClockSource ? publishClock : undefined}
              clock={isClockSource ? null : clock}
            />
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
      </div>

      {/* 只在裁切模式顯示，確認這台是哪一半、有沒有連上同步 */}
      {cropping && (
        <p className="pointer-events-none fixed bottom-2 left-2 z-50 rounded bg-black/50 px-2 py-1 font-mono text-[11px] text-white/70">
          {display === "left" ? "L" : "R"} · sync {connected ? "on" : "off"}
        </p>
      )}
    </div>
  );
}
