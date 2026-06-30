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
