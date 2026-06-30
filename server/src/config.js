// Locked, server-authoritative constants. The server is the single source of truth;
// these values define the simulation and MUST NOT be duplicated/overridden on the client.

// --- Networking ---
// Port is configurable via env (PORT). config provides the fallback default.
export const DEFAULT_PORT = 8080;

// --- Tick / timing ---
// The whole simulation is driven at a fixed tick rate. All durations are counted
// in TICKS, never wall-clock seconds, so the simulation is deterministic.
export const TICK_RATE = 30; // Hz
export const TICK_MS = 1000 / TICK_RATE; // ~33.33ms per tick

// --- Arena (server world units; the server knows nothing about pixels) ---
export const ARENA_WIDTH = 1000;
export const ARENA_HEIGHT = 1000;

// --- Round phase durations (in ticks) ---
export const MOVEMENT_PHASE_TICKS = 10 * TICK_RATE; // 10s = 300 ticks

// --- Movement sound ---
// Players moving at or above this speed (world units per tick) emit a sound event
// that is sent only to the blind player. Sane default; tune later.
export const SOUND_SPEED_THRESHOLD = 3; // world units / tick

// --- Bullet bounce rules ---
// Max wall/obstacle bounces, computed at RoundStart from the current alive count.
// 3 players alive -> 1 bounce, 2 players alive -> 3 bounces.
export const BOUNCE_RULES = {
  3: 1,
  2: 3,
};

// Resolve max bounces for a given alive count; falls back to the closest defined rule.
export function bouncesForAliveCount(aliveCount) {
  return BOUNCE_RULES[aliveCount] ?? BOUNCE_RULES[2];
}
