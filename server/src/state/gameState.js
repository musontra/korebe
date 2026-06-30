// Authoritative game state container (players, bullet, current phase, tick counter, alive count).
// The server is the single owner of this object. For performance we mutate it in-place each tick
// (this is a deliberate decision: there is exactly one writer — the room's game loop).

export const Phase = {
  ROUND_START: "RoundStart",
  MOVEMENT: "MovementPhase",
  SHOOTING: "ShootingPhase",
  BULLET_SIM: "BulletSimulation",
  ROUND_END: "RoundEnd",
  GAME_END: "GameEnd",
};

export function createGameState() {
  return {
    players: {}, // id -> { pos:{x,y}, vel:{x,y}, alive:bool, isBlind:bool }
    obstacles: [], // Phase 1: empty. Bullet reflection loop must handle the empty array safely.
    bullet: null, // { pos:{x,y}, vel:{x,y} } or null
    phase: Phase.ROUND_START,
    tickCounter: 0, // ticks elapsed WITHIN the current phase
    blindId: null,
    prevBlindId: null,
    maxBounces: 0,
    bouncesRemaining: 0,
    sounds: [], // transient per-tick sound events; rebuilt each tick, sent to the blind player only
    winnerId: null,
  };
}

export function addPlayer(state, id) {
  state.players[id] = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    alive: true,
    isBlind: false,
  };
}

export function aliveIds(state) {
  return Object.keys(state.players).filter((id) => state.players[id].alive);
}
