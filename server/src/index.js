// Server entry point. Accepts WebSocket connections; the first message must be JOIN {code}.
// After a valid JOIN the connection is handed to its room, which owns it for the rest of the match.
import { WebSocketServer } from "ws";
import { DEFAULT_PORT } from "./config.js";
import { getOrCreateRoom } from "./rooms.js";
import { ClientMessageType, parse } from "./net/messages.js";

const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const wss = new WebSocketServer({ port: PORT });

wss.on("listening", () => {
  console.log(`[server] WebSocket server listening on ws://localhost:${PORT}`);
});

wss.on("connection", (ws) => {
  console.log("[server] new connection (awaiting JOIN)");

  // Guard the pre-JOIN window too: a socket can error before a room adopts it (which is where
  // the room's own 'error' listener gets attached). Without this, an early ECONNRESET would be
  // an uncaught exception and crash the server.
  ws.on("error", (err) => console.error("[server] connection error:", err?.message ?? err));

  // Handle only the JOIN handshake here; the room takes over message handling afterwards.
  const onJoin = (raw) => {
    const msg = parse(raw);
    if (msg && msg.type === ClientMessageType.JOIN && msg.code) {
      ws.off("message", onJoin);
      const room = getOrCreateRoom(String(msg.code));
      room.addConnection(ws);
    }
  };
  ws.on("message", onJoin);
});

wss.on("error", (err) => {
  console.error("[server] server error:", err);
});
