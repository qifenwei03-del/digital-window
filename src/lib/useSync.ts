"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  兩台電視各自開同一個網址，用 WebSocket 讓場景與影片時間保持一致。
  刻意不用 localStorage —— 那是同一瀏覽器的 origin 內共享，跨裝置無效。

  伺服器連不上時整站照常運作（單機模式），只是不同步。
  所以 GitHub Pages 那份靜態部署不會因為沒有 sync server 而壞掉。
*/

export type Scene = { videoIndex: number; panel: string };

export type RemoteClock = {
  videoIndex: number;
  time: number;
  /** 送出時的本地時間，用來補償傳輸延遲 */
  sentAt: number;
};

// 預設連到頁面所在主機的 8787 埠 —— 兩台電視都從展場機器開頁面時零設定即可運作
function resolveUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SYNC_URL;
  if (explicit) return explicit;
  if (typeof window === "undefined") return "";
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.hostname}:8787`;
}

const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 10000;
/** 連上未滿這個時間的 client 不回答別人的 hello，避免兩台同時開機時互換場景 */
const HELLO_ANSWER_AFTER_MS = 3000;

export function useSync({
  scene,
  onRemoteScene,
}: {
  scene: Scene;
  onRemoteScene: (scene: Scene) => void;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState<RemoteClock | null>(null);

  /*
    從遠端套用的場景不該再廣播出去，否則兩台會互相回彈。

    初始值刻意設成「本地初始場景」，這樣掛載時不會廣播 —— 否則任何一台重新載入
    （斷電、瀏覽器重啟）都會把還在正常播放的另一台重設回預設場景。
  */
  const appliedRef = useRef(JSON.stringify(scene));
  // 用來回答別人的 hello；不放進依賴，只要最新值
  const sceneRef = useRef(scene);
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);
  // onRemoteScene 每次 render 都是新的函式，用 ref 讓連線的 effect 不必依賴它
  // （不能在 render 期間寫 ref，所以放進 effect）
  const onRemoteRef = useRef(onRemoteScene);
  useEffect(() => {
    onRemoteRef.current = onRemoteScene;
  }, [onRemoteScene]);

  useEffect(() => {
    const url = resolveUrl();
    if (!url) return;

    let closed = false;
    let retry = RECONNECT_MIN_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        // https 頁面連 ws:// 會直接丟例外，靜靜重試就好
        timer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, RECONNECT_MAX_MS);
        return;
      }
      socketRef.current = socket;

      let openedAt = 0;

      socket.addEventListener("open", () => {
        retry = RECONNECT_MIN_MS;
        openedAt = performance.now();
        setConnected(true);
        // 剛加入的先問「現在在播什麼」，由既有的那台回答，而不是強加自己的預設值
        socket.send(JSON.stringify({ t: "hello" }));
      });

      socket.addEventListener("message", (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (msg.t === "hello") {
          /*
            只有「已經連上一段時間」的那台才回答。兩台同時開機時都會發 hello，
            若雙方都回答就會互換場景、變成各自不同步。
          */
          if (performance.now() - openedAt > HELLO_ANSWER_AFTER_MS) {
            socket.send(JSON.stringify({ t: "scene", ...sceneRef.current }));
          }
        } else if (
          msg.t === "scene" &&
          typeof msg.videoIndex === "number" &&
          typeof msg.panel === "string"
        ) {
          const next = { videoIndex: msg.videoIndex, panel: msg.panel };
          appliedRef.current = JSON.stringify(next);
          onRemoteRef.current(next);
        } else if (msg.t === "clock" && typeof msg.videoIndex === "number" && typeof msg.time === "number") {
          setClock({ videoIndex: msg.videoIndex, time: msg.time, sentAt: performance.now() });
        }
      });

      const scheduleReconnect = () => {
        setConnected(false);
        socketRef.current = null;
        if (closed) return;
        timer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, RECONNECT_MAX_MS);
      };

      socket.addEventListener("close", scheduleReconnect);
      socket.addEventListener("error", () => socket.close());
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  // 本地場景變動就廣播；剛從遠端套用的那筆跳過，避免回彈
  useEffect(() => {
    const payload = JSON.stringify(scene);
    if (payload === appliedRef.current) return;
    send({ t: "scene", ...scene });
  }, [scene, send]);

  const publishClock = useCallback(
    (videoIndex: number, time: number) => send({ t: "clock", videoIndex, time }),
    [send]
  );

  return { connected, clock, publishClock };
}
