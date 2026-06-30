// Fixed 30 Hz tick loop driver for a room; advances the state machine one tick at a time.
// This is the single per-tick orchestrator: read input -> simulate by phase -> transition -> broadcast.
// All physics/decisions happen here on the server; the client only renders the broadcast snapshot.
import { Phase } from "./state/gameState.js";
import {
  TICK_MS,
  MOVEMENT_PHASE_TICKS,
  SHOOTING_PHASE_TIMEOUT_TICKS,
  ROUND_START_TICKS,
  BULLET_SPEED,
  BULLET_RADIUS,
  PLAYER_RADIUS,
} from "./config.js";
import { startRound, finishRound, enterPhase } from "./state/stateMachine.js";
import { applyMovement } from "./sim/movement.js";
import { advanceBullet } from "./sim/bullet.js";
import { broadcastSnapshots } from "./net/broadcast.js";

export function createGameLoop(room) {
  const state = room.state;
  const log = (m) => console.log(`[room ${room.code}] ${m}`);

  function tick() {
    const inputs = room.drainInputs(); // { movement:{id:{dx,dy}}, shoot:{id:{dx,dy}} }
    state.sounds = []; // transient; only repopulated during MovementPhase

    switch (state.phase) {
      case Phase.ROUND_START:
        if (state.tickCounter >= ROUND_START_TICKS) {
          enterPhase(state, Phase.MOVEMENT, log);
        }
        break;

      case Phase.MOVEMENT: {
        // Movement input is honored ONLY in this phase.
        state.sounds = applyMovement(state, inputs.movement);
        if (state.tickCounter >= MOVEMENT_PHASE_TICKS) {
          enterPhase(state, Phase.SHOOTING, log);
        }
        break;
      }

      case Phase.SHOOTING: {
        // All players frozen. Only the blind player can shoot; everyone else is ignored.
        const cmd = inputs.shoot[state.blindId];
        if (cmd) {
          fireBullet(state, cmd);
          log(`[shoot] ${state.blindId} fired`);
          enterPhase(state, Phase.BULLET_SIM, log);
        } else if (state.tickCounter >= SHOOTING_PHASE_TIMEOUT_TICKS) {
          log(`[shoot] timeout (no shot) -> round ends with no elimination`);
          finishRound(state, null, log);
        }
        break;
      }

      case Phase.BULLET_SIM: {
        const res = advanceBullet(state, state.blindId);
        // Log each completed bounce as N/max while the budget still holds.
        if (res.bounces > 0 && state.bouncesRemaining >= 0) {
          const used = state.maxBounces - state.bouncesRemaining;
          log(`[bullet] bounce ${used}/${state.maxBounces}`);
        }
        if (res.eliminatedId) {
          state.players[res.eliminatedId].alive = false;
          log(`[hit] ${res.eliminatedId} eliminated`);
          finishRound(state, res.eliminatedId, log);
        } else if (res.bulletGone) {
          log(`[bullet] gone (bounce limit reached, no hit)`);
          finishRound(state, null, log);
        }
        break;
      }

      case Phase.GAME_END:
      default:
        // Idle: match is over. Loop keeps ticking + broadcasting until the room is torn down.
        break;
    }

    state.tickCounter++;
    broadcastSnapshots(room);
  }

  function start() {
    startRound(state, log);
    room.interval = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (room.interval) {
      clearInterval(room.interval);
      room.interval = null;
    }
  }

  return { start, stop };
}

// Spawn the single bullet for the blind player, just outside its own radius, in the shoot direction.
function fireBullet(state, cmd) {
  const blind = state.players[state.blindId];
  const mag = Math.hypot(cmd.dx, cmd.dy) || 1;
  const dx = cmd.dx / mag;
  const dy = cmd.dy / mag;
  const offset = PLAYER_RADIUS + BULLET_RADIUS + 1;
  state.bullet = {
    pos: { x: blind.pos.x + dx * offset, y: blind.pos.y + dy * offset },
    vel: { x: dx * BULLET_SPEED, y: dy * BULLET_SPEED },
  };
  state.bouncesRemaining = state.maxBounces;
}
