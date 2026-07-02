// WebSocket client: connect to the server, send input commands, receive authoritative snapshots.
import { setSnapshot, setMyId, type Snapshot } from "./state";

// Server URL. In production set PUBLIC_SERVER_URL (a wss:// URL, since the client is served over
// HTTPS and a ws:// connection would be blocked as mixed content). If unset — i.e. local dev with
// no .env — it falls back to the local server, so `npm run dev` works with zero config.
const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL ?? "ws://localhost:8080";

export interface NetCallbacks {
  onJoined?: (playerId: string, roomCode: string) => void;
  onWaiting?: (count: number, need: number) => void;
  onSnapshot?: (snap: Snapshot) => void;
  onError?: (msg: string) => void;
  onClose?: () => void;
}

let socket: WebSocket | null = null;

export function connect(code: string, callbacks: NetCallbacks): void {
  socket = new WebSocket(SERVER_URL);

  socket.addEventListener("open", () => {
    send({ type: "JOIN", code });
  });

  socket.addEventListener("message", (ev) => {
    let msg: any;
    try {
      msg = JSON.parse(ev.data as string);
    } catch {
      return;
    }
    switch (msg.type) {
      case "JOINED":
        setMyId(msg.playerId);
        callbacks.onJoined?.(msg.playerId, msg.roomCode);
        break;
      case "WAITING":
        callbacks.onWaiting?.(msg.count, msg.need);
        break;
      case "SNAPSHOT":
        setSnapshot(msg as Snapshot);
        callbacks.onSnapshot?.(msg as Snapshot);
        break;
      case "ERROR":
        callbacks.onError?.(msg.msg);
        break;
    }
  });

  socket.addEventListener("close", () => callbacks.onClose?.());
}

function send(obj: unknown): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(obj));
  }
}

// Movement intent: normalized direction. Sent every frame because the server drains its
// input buffer each tick (so a held key must be re-sent continuously or the player stops).
export function sendInput(dx: number, dy: number): void {
  send({ type: "INPUT", dx, dy });
}

// Shoot intent: always sent on click; the SERVER decides whether to honor it
// (only the blind player in ShootingPhase actually fires).
export function sendShoot(dx: number, dy: number): void {
  send({ type: "SHOOT", dx, dy });
}

// Rematch intent ("play again"). The server only honors it at GameEnd and starts a fresh match
// in place once all connected players are ready (see server/src/room.js). Re-sending is harmless.
export function sendRematch(): void {
  send({ type: "REMATCH" });
}
