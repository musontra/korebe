// Locked, server-authoritative constants. The server is the single source of truth;
// these values define the simulation and MUST NOT be duplicated/overridden on the client.

// --- Networking ---
// Port is configurable via env (PORT). config provides the fallback default.
export const DEFAULT_PORT = 8080;

// --- Logging ---
// High-volume per-tick logs (phase transitions, each bullet bounce) are gated behind DEBUG so
// production stays quiet. Match milestones (round start, shoot, hit, game end) always log.
// Enable with `DEBUG=1 npm start`.
export const DEBUG = !!process.env.DEBUG;

// --- Tick / timing ---
// The whole simulation is driven at a fixed tick rate. All durations are counted
// in TICKS, never wall-clock seconds, so the simulation is deterministic.
export const TICK_RATE = 30; // Hz
export const TICK_MS = 1000 / TICK_RATE; // ~33.33ms per tick

// --- Arena (server world units; the server knows nothing about pixels) ---
export const ARENA_WIDTH = 1000;
export const ARENA_HEIGHT = 1000;

// --- Obstacles (Package C) ---
// Static AABB obstacles. Two hard constraints: (1) THICK (>= ~50) so a bullet moving BULLET_SPEED
// per tick can't step across one in a single tick and tunnel through without ever overlapping;
// (2) must NOT cover the 3 spawn points on the R=300 spawn ring, or a player would spawn inside one.
// Symmetric (both axes) for fairness. Tuned for playability: the four blocks are pulled IN toward
// the center (from 180 -> 280) to narrow the open ring and create mid-arena hiding pockets/corridors
// for non-blind players, while still clearing the 3 spawn points (bottom blocks stay ~40px from the
// side spawns at y=650, > player radius 25). The center block is kept large to make a pure straight
// shot across the middle harder and reward bounces.
export const OBSTACLES = [
  { x: 440, y: 440, w: 120, h: 120 }, // center: cover + central bounce faces
  { x: 280, y: 280, w: 90, h: 90 }, // mid-ring blocks: hiding pockets + bounce setups
  { x: 630, y: 280, w: 90, h: 90 },
  { x: 280, y: 630, w: 90, h: 90 },
  { x: 630, y: 630, w: 90, h: 90 },
];

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

// --- Players (added in Phase 1) ---
export const PLAYERS_PER_MATCH = 3;
export const PLAYER_RADIUS = 25; // world units
export const PLAYER_MOVE_SPEED = 6; // world units per tick at full input magnitude

// --- Bullet ---
export const BULLET_RADIUS = 8; // world units
export const BULLET_SPEED = 18; // world units per tick (< PLAYER_RADIUS to limit tunneling)

// --- Phase pacing (ticks) ---
export const ROUND_START_TICKS = 30; // ~1s preparation before MovementPhase
// If the blind player does not shoot within this window, the round ends with NO elimination.
// 300 ticks = 10s, symmetric with MovementPhase.
export const SHOOTING_PHASE_TIMEOUT_TICKS = 300;

// --- Sound ---
// Max +/- world-unit jitter added to a sound's position before it is sent to the blind player,
// so the blind player only gets an APPROXIMATE location.
export const SOUND_POSITION_NOISE = 60;

// --- Blind selection weights ---
// Previous blind player gets a significantly lower chance of being picked again.
export const NORMAL_BLIND_WEIGHT = 1.0;
export const PREV_BLIND_WEIGHT = 0.15;
