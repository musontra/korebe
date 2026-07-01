// Wire message types and JSON (de)serialization for client<->server messages.
// V1: plain JSON. Server is authoritative; client messages are only intents (input/commands).

// Client -> Server
export const ClientMessageType = {
  JOIN: "JOIN", // {type, code}
  INPUT: "INPUT", // {type, dx, dy}  movement direction (only honored in MovementPhase)
  SHOOT: "SHOOT", // {type, dx, dy}  shoot direction (only honored from the blind player in ShootingPhase)
};

// Server -> Client
export const ServerMessageType = {
  JOINED: "JOINED", // {type, playerId, roomCode}
  WAITING: "WAITING", // {type, count, need}
  SNAPSHOT: "SNAPSHOT", // per-tick authoritative state (personalized per player)
  ERROR: "ERROR", // {type, msg}
};

export function parse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function serialize(obj) {
  return JSON.stringify(obj);
}

// Resilience (Phase 5): a socket can close between a readyState check and the actual send,
// so ws.send() may throw. This tick loop broadcasts to every connection every tick; one dead
// socket must NEVER crash the loop or the room. Swallow the error and let the 'close' handler
// clean the connection up. The authoritative sim is unaffected.
export function safeSend(ws, obj) {
  try {
    ws.send(serialize(obj));
  } catch (err) {
    console.error("[net] send failed:", err?.message ?? err);
  }
}
