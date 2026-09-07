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
import { FRAME_BANDS, SAFE_SQUARE } from "@/lib/frame";

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
  const [showFrame, setShowFrame] = useState(false);
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
    setFlatGlass(next.flatGlass);
  }, []);

  const { clock, publishClock, connected } = useSync({
    scene: { videoIndex, panel, flatGlass },
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

      // 佈場用：把實體窗框疊在畫面上，確認 UI 真的閃開了框料
      if (key === "w") {
        setShowFrame((on) => !on);
        return;
      }

      // 關掉玻璃模糊的備援模式。會同步到另一台 —— 兩半的質感必須一致
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
      {/* 佈場用：把實體窗框的框料疊出來，確認 UI 真的落在玻璃區內。
          按 W 開關，展場不該看到。畫在舞台裡，所以會跟著裁切一起位移。 */}
      {showFrame && (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
          {/* 橫向框料。上下框大半落在螢幕外，超出的部分會被 overflow-hidden 裁掉 */}
          {[
            { band: FRAME_BANDS.topRail, label: "上框" },
            { band: FRAME_BANDS.midRail, label: "中橫杆" },
            { band: FRAME_BANDS.bottomRail, label: "下框" },
          ].map(({ band, label }) => (
            <div
              key={label}
              className="absolute inset-x-0 flex items-center justify-center bg-amber-400"
              style={{ top: `${band.top}%`, height: `${band.bottom - band.top}%` }}
            >
              <span className="text-[1.1cqw] tracking-widest text-amber-900/70">{label}</span>
            </div>
          ))}

          {/* 直向框料。左右邊料是「電視比框寬」的那一截，蓋掉的正好是 1:1 舞台的黑邊 */}
          {[
            { from: FRAME_BANDS.leftStile.from, to: FRAME_BANDS.leftStile.to },
            { from: FRAME_BANDS.rightStile.from, to: FRAME_BANDS.rightStile.to },
            { from: FRAME_BANDS.mullion.left, to: FRAME_BANDS.mullion.right },
          ].map(({ from, to }) => (
            <div
              key={from}
              className="absolute inset-y-0 bg-amber-400"
              style={{ left: `${from}%`, width: `${to - from}%` }}
            />
          ))}
        </div>
      )}

      {/*
        UI 的安全區：塞進實體窗框上段玻璃的正方形。

        只有面板層內縮，影片維持滿版 —— 景色從框料後面延續過去正是窗景該有的
        樣子，被擋住也不損失資訊；文字與卡片被框料切掉才是真的看不到。

        這一層自己是 @container，所以 cqw 改以它為基準：版面比例一格未動，
        所有尺寸同步縮小。硬把 1:1 的版面壓進 1.45:1 的上段玻璃會撐破卡片
        （實測 S 溢出 129px、D 469px、G 920px），縮放則一項資訊都不必刪。
      */}
      {panel === "compact" ? (
        /*
          A 不進安全區正方形。

          它本來就是一張靠左上的小卡，而安全區是水平置中的 —— 放進去會被推到
          畫面正中央，失去「窗角上的一張卡」那個構圖。所以改成直接貼著上段玻璃
          的左上角，只讓開上框；尺寸維持以舞台為基準，跟先前一樣大。

          寬度收在中梃之內：容器佔舞台一半，扣掉 3cqw 內距後卡片右緣約在 47%，
          而中梃從 48.6% 才開始。
        */
        <div
          className="absolute left-0 h-1/2 w-1/2 p-[3cqw]"
          style={{ top: `${FRAME_BANDS.upper.top}%` }}
        >
          <WeatherCard weather={weather} failed={failed} />
        </div>
      ) : (
        <div
          className="@container absolute aspect-square"
          style={{
            width: `${SAFE_SQUARE.size}%`,
            top: `${SAFE_SQUARE.top}%`,
            left: `${SAFE_SQUARE.left}%`,
          }}
        >
          {/*
            crop 一律為 true —— 它的意思是「框後面的版面」，不是「雙螢幕才用」。

            實體窗框一直都在：中梃橫在正中線、中橫杆橫過畫面。一般模式若沿用
            原本的多欄網格，卡片會被中梃剖開、折線整條被中橫杆蓋掉、更新時間
            被下框吃掉 —— 實測確認過。所以兩種模式共用同一套框後版面。

            side 才是雙螢幕專屬：只有真的裁切時才需要「另一半不 render」。
          */}
          <div className="absolute inset-0">
            {panel === "dashboard" && (
              <WeatherDashboard
                weather={weather}
                failed={failed}
                crop
                side={cropping ? (display as "left" | "right") : undefined}
              />
            )}
            {panel === "detail" && (
              <WeatherDetail
                weather={weather}
                failed={failed}
                crop
                side={cropping ? (display as "left" | "right") : undefined}
              />
            )}
            {panel === "ambient" && <WeatherAmbient weather={weather} failed={failed} crop />}
            {panel === "board" && <WeatherBoard weather={weather} failed={failed} crop />}
          </div>
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
        className={`pointer-events-none fixed inset-0 z-40 bg-black transition-opacity duration-[900ms] ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        {/*
          不置中：置中的話字正好落在中梃後面（一般模式），或壓在邊料上（裁切模式）。
          水平 30% 在三種模式下都落在玻璃區內。
        */}
        <p className="absolute left-[30%] top-1/2 -translate-y-1/2 text-[1.6vmin] tracking-[0.45em] text-white/40">
          載入中
        </p>
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
