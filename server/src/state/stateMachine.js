// Round state machine helpers: RoundStart -> MovementPhase -> ShootingPhase -> BulletSimulation
// -> RoundEnd -> (NextRound | GameEnd). The gameLoop owns per-tick orchestration and calls these
// helpers to enter phases, start rounds, and finish rounds. All timing is counted in TICKS.
import { Phase, aliveIds } from "./gameState.js";
import { ARENA_WIDTH, ARENA_HEIGHT, bouncesForAliveCount } from "../config.js";
import { selectBlind } from "../sim/blindSelect.js";

// Place alive players evenly on a circle around the arena center, velocities zeroed.
function resetPositions(state) {
  const ids = aliveIds(state);
  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT / 2;
  const R = 300;
  ids.forEach((id, i) => {
    const ang = (Math.PI * 2 * i) / ids.length - Math.PI / 2;
    const p = state.players[id];
    p.pos.x = cx + Math.cos(ang) * R;
    p.pos.y = cy + Math.sin(ang) * R;
    p.vel.x = 0;
    p.vel.y = 0;
  });
}

// Enter a new phase and reset the in-phase tick counter.
export function enterPhase(state, phase, log) {
  state.phase = phase;
  state.tickCounter = 0;
  log(`[phase] -> ${phase}`);
}

// RoundStart: weighted blind selection, reset positions, compute bounce budget from alive count.
export function startRound(state, log) {
  state.prevBlindId = state.blindId;
  const alive = aliveIds(state);
  const blind = selectBlind(alive, state.prevBlindId);
  state.blindId = blind;
  for (const id of Object.keys(state.players)) {
    state.players[id].isBlind = id === blind;
  }
  resetPositions(state);
  state.bullet = null;
  state.maxBounces = bouncesForAliveCount(alive.length);
  state.bouncesRemaining = state.maxBounces;
  state.phase = Phase.ROUND_START;
  state.tickCounter = 0;
  // This line lets us verify the bounce rule (3->1, 2->3) from the terminal.
  log(`[round] RoundStart: ${alive.length} alive, blind=${blind}, maxBounces=${state.maxBounces}`);
}

// Finish a round. eliminatedId may be null (timeout or missed shot).
// Decides NextRound vs GameEnd from the remaining alive count.
export function finishRound(state, eliminatedId, log) {
  state.phase = Phase.ROUND_END;
  state.bullet = null;
  const alive = aliveIds(state);
  if (alive.length <= 1) {
    state.phase = Phase.GAME_END;
    state.winnerId = alive[0] ?? null;
    log(`[game] GameEnd: winner=${state.winnerId}`);
  } else {
    log(`[round] next`);
    startRound(state, log);
  }
}
