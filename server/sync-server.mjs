/*
  兩台展示電視之間的同步中繼。收到什麼就轉給其他人，自己不解讀內容。

  跑法：
    npm run sync              # 預設 8787
    PORT=9000 npm run sync

  兩台電視只要從同一台機器開頁面，前端會自動連 ws://<那台機器>:8787，不需要設定。
  要指定別的位址就用 NEXT_PUBLIC_SYNC_URL 建置。

  刻意保持無狀態：場景由任一台發起、其他台跟隨；播放時間由左半那台發布。
  伺服器不需要知道誰是誰，也不需要記住最後狀態 —— 展示機是同時開機的，
  而且場景一變就會重新廣播。
*/

import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? 8787);
const server = new WebSocketServer({ port });

const stamp = () => new Date().toTimeString().slice(0, 8);

server.on("listening", () => {
  console.log(`[${stamp()}] sync server listening on ws://0.0.0.0:${port}`);
});

server.on("connection", (socket, request) => {
  const peer = request.socket.remoteAddress ?? "unknown";
  console.log(`[${stamp()}] + ${peer}  (${server.clients.size} connected)`);

  socket.on("message", (data, isBinary) => {
    for (const client of server.clients) {
      if (client !== socket && client.readyState === client.OPEN) {
        client.send(data, { binary: isBinary });
      }
    }
  });

  socket.on("close", () => {
    console.log(`[${stamp()}] - ${peer}  (${server.clients.size} connected)`);
  });

  socket.on("error", () => socket.close());
});

server.on("error", (error) => {
  console.error(`[${stamp()}] server error:`, error.message);
});
