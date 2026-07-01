// Snapshot broadcasting: send the authoritative state snapshot to all players in a room.
// Each snapshot is PERSONALIZED: it tells the receiving player whether THEY are the blind one,
// and sound events are included ONLY for the blind player (with positional noise added here).
import { ServerMessageType, safeSend } from "./messages.js";
import { SOUND_POSITION_NOISE } from "../config.js";

function round2(n) {
  return Math.round(n * 100) / 100;
}

function noise() {
  return (Math.random() * 2 - 1) * SOUND_POSITION_NOISE;
}

export function broadcastSnapshots(room) {
  const state = room.state;

  // Shared (public) portion. Who is blind is public; the dark-vision/sound is what stays private.
  const players = {};
  for (const [id, p] of Object.entries(state.players)) {
    players[id] = {
      pos: { x: round2(p.pos.x), y: round2(p.pos.y) },
      alive: p.alive,
      isBlind: p.isBlind,
    };
  }

  const base = {
    type: ServerMessageType.SNAPSHOT,
    tick: state.tickCounter,
    phase: state.phase,
    players,
    bullet: state.bullet
      ? { pos: { x: round2(state.bullet.pos.x), y: round2(state.bullet.pos.y) } }
      : null,
    obstacles: state.obstacles,
    bouncesRemaining: state.bouncesRemaining,
    maxBounces: state.maxBounces,
    winnerId: state.winnerId,
  };

  for (const [id, ws] of room.connections()) {
    const youAreBlind = id === state.blindId;
    const snapshot = { ...base, you: { id, isBlind: youAreBlind } };

    // Sound events go to the blind player only, jittered, and never include its own sound.
    if (youAreBlind && state.sounds.length) {
      snapshot.sounds = state.sounds
        .filter((s) => s.id !== id)
        .map((s) => ({ pos: { x: round2(s.pos.x + noise()), y: round2(s.pos.y + noise()) } }));
    } else {
      snapshot.sounds = [];
    }

    safeSend(ws, snapshot);
  }
}
