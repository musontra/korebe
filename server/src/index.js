// Server entry point. Starts the WebSocket server and logs new connections.
// Phase 0: no game logic, no rooms — just prove the socket comes up and accepts clients.

import { WebSocketServer } from "ws";
import { DEFAULT_PORT } from "./config.js";

const PORT = Number(process.env.PORT) || DEFAULT_PORT;

const wss = new WebSocketServer({ port: PORT });

wss.on("listening", () => {
  console.log(`[server] WebSocket server listening on ws://localhost:${PORT}`);
});

wss.on("connection", (socket, req) => {
  console.log(`[server] new connection from ${req.socket.remoteAddress}`);

  socket.on("close", () => {
    console.log("[server] connection closed");
  });
});

wss.on("error", (err) => {
  console.error("[server] server error:", err);
});
