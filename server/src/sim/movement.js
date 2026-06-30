// Movement phase simulation: integrate player input, solid player-player collision, emit sound events.
import { PLAYER_MOVE_SPEED, PLAYER_RADIUS, SOUND_SPEED_THRESHOLD } from "../config.js";
import { clampToArena, resolvePlayerCollision } from "./collision.js";
import { aliveIds } from "../state/gameState.js";

// Apply one movement tick.
// inputs: { id -> {dx,dy} } direction vectors (defensively re-normalized here).
// Returns sound events [{ id, pos:{x,y} }] for alive players moving at/above SOUND_SPEED_THRESHOLD.
export function applyMovement(state, inputs) {
  const ids = aliveIds(state);

  // 1) integrate velocity from input, then position, then clamp to arena
  for (const id of ids) {
    const p = state.players[id];
    const inp = inputs[id];
    if (inp) {
      const mag = Math.hypot(inp.dx, inp.dy);
      if (mag > 0) {
        p.vel.x = (inp.dx / mag) * PLAYER_MOVE_SPEED;
        p.vel.y = (inp.dy / mag) * PLAYER_MOVE_SPEED;
      } else {
        p.vel.x = 0;
        p.vel.y = 0;
      }
    } else {
      p.vel.x = 0;
      p.vel.y = 0;
    }
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    clampToArena(p.pos, PLAYER_RADIUS);
  }

  // 2) resolve solid player-player collisions (a few iterations for stability)
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        resolvePlayerCollision(state.players[ids[i]], state.players[ids[j]], PLAYER_RADIUS);
      }
    }
  }
  for (const id of ids) clampToArena(state.players[id].pos, PLAYER_RADIUS);

  // 3) sound events (speed = velocity magnitude, world units per tick)
  const sounds = [];
  for (const id of ids) {
    const p = state.players[id];
    const speed = Math.hypot(p.vel.x, p.vel.y);
    if (speed >= SOUND_SPEED_THRESHOLD) {
      sounds.push({ id, pos: { x: p.pos.x, y: p.pos.y } });
    }
  }
  return sounds;
}
