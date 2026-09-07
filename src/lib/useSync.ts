"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  讓多個視窗／多台機器的場景與影片時間保持一致。兩條通道並行：

    · BroadcastChannel —— 同一個瀏覽器裡的視窗之間。零設定、不需要伺服器，
      在 https 上也能用，所以 GitHub Pages 這種靜態部署照樣會同步。
      一台電腦推兩台螢幕、開兩個視窗的情況靠它就夠了。

    · WebSocket relay —— 兩台不同機器之間唯一的辦法。但 https 頁面連不上
      ws://（混合內容），所以 Pages 上不會通，展場要從本機以 http 提供頁面。

  兩條都連不上時整站照常運作（單機模式），只是不同步。
*/

/*
  跨裝置共享的場景。刻意不含 display（L／R）—— 那是每台自己看哪一半，
  同步過去等於兩台看同一半，反而壞掉。玻璃模式則要一致，否則兩半質感不同。
*/
export type Scene = { videoIndex: number; panel: string; flatGlass: boolean };

export type RemoteClock = {
  videoIndex: number;
  time: number;
  /** 送出時的本地時間，用來補償傳輸延遲 */
  sentAt: number;
};

/*
  relay 位址的決定順序：網址參數 → 建置時的環境變數 → 頁面所在主機的 8787 埠。

  預設值讓「兩台電視都從展場機器開頁面」零設定就能運作。
  網址參數是給 relay 不在頁面主機上的情況用的 —— 環境變數在建置時就固定了，
  部署完改不了，展場現場沒辦法為了換一個 IP 重新建置。

  注意：https 頁面連 ws:// 會被瀏覽器當成混合內容擋掉。所以雙螢幕展場請從
  本機以 http 提供頁面，不要開 GitHub Pages 那個網址（那份是預覽用的）。
*/
function resolveUrl(): string {
  if (typeof window === "undefined") return "";
  const fromQuery = new URLSearchParams(window.location.search).get("sync");
  if (fromQuery) return fromQuery;
  const explicit = process.env.NEXT_PUBLIC_SYNC_URL;
  if (explicit) return explicit;
  const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${window.location.hostname}:8787`;
}

/** 同瀏覽器視窗之間的頻道名稱 */
const CHANNEL_NAME = "digital-window";

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
  /*
    同瀏覽器通道有沒有在用。這是瀏覽器的靜態能力（有沒有 BroadcastChannel），
    不是會變動的連線狀態，所以直接推導、不進 state ——
    在 effect 裡呼叫 setState 只是把一個常數繞一圈。
  */
  const localChannel = typeof BroadcastChannel !== "undefined";
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

  /*
    兩條通道共用的收訊處理。

    hello 的規則：只有「已經連上一段時間」的那端才回答。兩端同時開機時
    都會發 hello，若雙方都回答就會互換場景、變成各自不同步。
  */
  const handleMessage = useCallback(
    (msg: Record<string, unknown>, reply: (payload: Record<string, unknown>) => void, openedAt: number) => {
      if (msg.t === "hello") {
        if (performance.now() - openedAt > HELLO_ANSWER_AFTER_MS) {
          reply({ t: "scene", ...sceneRef.current });
        }
      } else if (
        msg.t === "scene" &&
        typeof msg.videoIndex === "number" &&
        typeof msg.panel === "string"
      ) {
        // flatGlass 用 === true 取值：舊版本的 client 不會送這個欄位
        const next = {
          videoIndex: msg.videoIndex,
          panel: msg.panel,
          flatGlass: msg.flatGlass === true,
        };
        appliedRef.current = JSON.stringify(next);
        onRemoteRef.current(next);
      } else if (
        msg.t === "clock" &&
        typeof msg.videoIndex === "number" &&
        typeof msg.time === "number"
      ) {
        setClock({ videoIndex: msg.videoIndex, time: msg.time, sentAt: performance.now() });
      }
    },
    []
  );

  /*
    同一台機器、同一個瀏覽器裡的視窗之間，用 BroadcastChannel 同步。

    這不是取代 WebSocket，是補另一半：
      · BroadcastChannel —— 同瀏覽器同 origin。零設定、不需要伺服器，
        而且在 https 上也能用，所以 GitHub Pages 這種靜態部署照樣會同步。
      · WebSocket relay ——「兩台不同機器」唯一的辦法，但 https 頁面連不上
        ws://，所以在 Pages 上永遠不會通。

    兩條同時開著，訊息往兩邊送。BroadcastChannel 不會把訊息送回發送端自己，
    所以不必額外防回彈；跨通道的回彈則由 appliedRef 擋掉。

    刻意不用 localStorage —— 它跨裝置無效，而且要靠 storage 事件輪替，
    語意比 BroadcastChannel 髒得多。
  */
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    const openedAt = performance.now();

    channel.addEventListener("message", (event: MessageEvent) => {
      const msg = event.data as Record<string, unknown>;
      if (msg && typeof msg === "object") {
        handleMessage(msg, (reply) => channel.postMessage(reply), openedAt);
      }
    });
    channel.postMessage({ t: "hello" });

    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [handleMessage]);

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
        handleMessage(msg, (reply) => socket.send(JSON.stringify(reply)), openedAt);
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
    // handleMessage 的依賴是空的、身分穩定，所以這個 effect 實際上只跑一次
  }, [handleMessage]);

  // 兩條通道都送。哪一條沒接上就自然略過，不影響另一條
  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
    channelRef.current?.postMessage(payload);
  }, []);

  /*
    本地場景變動就廣播；剛從遠端套用的那筆跳過，避免回彈。

    送出後也要記進 appliedRef —— scene 每次 render 都是新的物件字面值，
    而 clock 每 400ms 就觸發一次 re-render。少了這行，本地改過場景之後
    每次 render 都會把同一筆再送一遍（實測 6 秒 14 則），還會持續對另一台
    重新宣告舊狀態。所以 appliedRef 的語意是「已經達成共識的場景」，
    不分是我送出的還是對方送來的。
  */
  useEffect(() => {
    const payload = JSON.stringify(scene);
    if (payload === appliedRef.current) return;
    appliedRef.current = payload;
    send({ t: "scene", ...scene });
  }, [scene, send]);

  const publishClock = useCallback(
    (videoIndex: number, time: number) => send({ t: "clock", videoIndex, time }),
    [send]
  );

  return { connected, localChannel, clock, publishClock };
}
