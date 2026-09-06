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

  完整畫布的寬度 = 兩台螢幕合併寬度（200vw），舞台是其中水平置中的正方形。
  兩台的舞台尺寸算法完全相同，只有位置差一個螢幕寬，所以縮放比例必然一致、
  接縫處自然銜接 —— 這比讓左右各自算一次 responsive 可靠得多。

  裡面的版面一行都沒動，差別只在舞台怎麼被定位（見下面 render 的說明）。
*/
type Display = "normal" | "left" | "right";
const DISPLAY_KEYS: Record<string, Display> = { l: "left", r: "right" };

// 完整畫布（兩台合併）能容納的正方形邊長
const STAGE_SIDE = "min(200vw, 100dvh)";

// 載入畫面最多蓋這麼久，之後不管載到哪都放行（見 Home 裡的說明）
const GATE_TIMEOUT_MS = 10000;

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
  const [showStatus, setShowStatus] = useState(false);
  // 診斷用：關掉所有玻璃模糊，確認閃動是不是濾鏡負擔造成的
  const [flatGlass, setFlatGlass] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [gateTimedOut, setGateTimedOut] = useState(false);
  const { weather, failed } = useWeather();
  const portrait = usePortrait();

  /*
    載入閘門。開場那幾秒影片還在抓、天氣還沒回來，面板會先以骨架狀態出現再跳成
    實際數值，展場看起來像出錯。改成整片黑幕蓋住，等影片真的開始播、天氣也有結果
    才淡出。

    逾時是必要的保險：自動播放被擋、或影片抓不到時 playing 事件永遠不會來，
    沒有逾時的話展示螢幕會整晚停在黑幕上。寧可露出未完成的畫面，也不能全黑。
  */
  const ready = (videoStarted && (weather !== null || failed)) || gateTimedOut;
  const handleFirstFrame = useCallback(() => setVideoStarted(true), []);

  useEffect(() => {
    const timer = setTimeout(() => setGateTimedOut(true), GATE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

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

      // 佈場用的狀態角標，預設不顯示
      if (key === "i") {
        setShowStatus((on) => !on);
        return;
      }

      // 診斷用：關掉玻璃模糊。閃動如果因此停止，就確定是濾鏡負擔
      if (key === "q") {
        setFlatGlass((flat) => !flat);
        return;
      }

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

  const stage = (
    <>
      <VideoBackground
        sources={VIDEOS}
        activeIndex={videoIndex}
        onPublishClock={isClockSource ? publishClock : undefined}
        clock={isClockSource ? null : clock}
        onFirstFrame={handleFirstFrame}
      />
      {panel === "compact" ? (
        /* 左上 1/4 區塊 */
        <div className="absolute left-0 top-0 h-1/2 w-1/2 p-[3cqw]">
          <WeatherCard weather={weather} failed={failed} />
        </div>
      ) : (
        /* 其餘四種都是滿版 */
        <div className="absolute inset-0">
          {panel === "dashboard" && (
            <WeatherDashboard
              weather={weather}
              failed={failed}
              crop={cropping}
              side={cropping ? (display as "left" | "right") : undefined}
            />
          )}
          {panel === "detail" && (
            <WeatherDetail
              weather={weather}
              failed={failed}
              crop={cropping}
              side={cropping ? (display as "left" | "right") : undefined}
            />
          )}
          {panel === "ambient" && (
            <WeatherAmbient weather={weather} failed={failed} crop={cropping} />
          )}
          {panel === "board" && <WeatherBoard weather={weather} failed={failed} crop={cropping} />}
        </div>
      )}
    </>
  );

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-black"
      data-crop={cropping ? "1" : undefined}
      data-glass={flatGlass ? "flat" : undefined}
    >
      {cropping ? (
        /*
          裁切模式：舞台直接絕對定位，不包一層虛擬畫布。

          原本是「200vw 寬的容器 + 右半 translateX(-100vw)」，兩者都會造成閃動：
          transform 會建立合成層，底下的 backdrop-filter 元素必須相對被變換的空間
          重新取樣背景，疊上持續變動的影片材質就會不穩；200vw 也讓圖層面積變成
          螢幕的兩倍。改成用 left 直接算位移，圖層只有舞台本身大小，也沒有 transform。

          S = min(200vw, 100dvh) 是完整畫布能容納的正方形邊長，
          它在合併畫布裡水平置中，右半那台再減掉一個螢幕寬。
        */
        <div
          className="@container absolute aspect-square"
          style={{
            height: STAGE_SIDE,
            top: `calc((100dvh - ${STAGE_SIDE}) / 2)`,
            left: `calc((200vw - ${STAGE_SIDE}) / 2${display === "right" ? " - 100vw" : ""})`,
          }}
        >
          {stage}
        </div>
      ) : (
        <main className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
          {/* 1:1 展示畫面，作為 container 讓面板以 cqw 等比縮放。
              上限掛在 max-height：aspect-ratio 搭 height:100% 時 max-width 不會回頭
              縮高度（顯式高度會贏，比例反而被破壞），只有 max-height 會讓寬度跟著縮。 */}
          <div className="@container relative aspect-square h-full max-h-[100vw]">{stage}</div>
        </main>
      )}

      {/* 載入黑幕。蓋住整個視窗（含 1:1 舞台外的黑邊），淡出後就不再回來。
          留在 DOM 裡但設 opacity 0，避免卸載時觸發一次額外的重繪。 */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black transition-opacity duration-[900ms] ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-[1.6vmin] tracking-[0.45em] text-white/40">載入中</p>
      </div>

      {/* 佈場時用來確認這台是哪一半、有沒有連上同步。
          預設隱藏，展場不該看到；按 I 叫出來。

          不限裁切模式 —— 同步沒連上時畫面上看不出任何異狀，兩台就這樣各走各的，
          而一般模式下反而最需要先確認 relay 有沒有起來。 */}
      {showStatus && (
        <p className="pointer-events-none fixed bottom-2 left-2 z-50 rounded bg-black/50 px-2 py-1 font-mono text-[11px] text-white/70">
          {cropping ? (display === "left" ? "L" : "R") : "full"} · sync{" "}
          <span className={connected ? "text-emerald-300" : "text-red-300"}>
            {connected ? "on" : "off"}
          </span>{" "}
          · glass {flatGlass ? "flat" : "on"}
        </p>
      )}
    </div>
  );
}
