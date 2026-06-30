// Bullet simulation: motion, mirror reflection off walls/obstacles, bounce counting, player hit detection.
import { BULLET_RADIUS, PLAYER_RADIUS } from "../config.js";
import { reflectOffWalls, reflectOffObstacle, circleHit } from "./collision.js";
import { aliveIds } from "../state/gameState.js";

// Advance the bullet one tick. The shooter (blind player) is EXCLUDED from hit detection.
// Decrements state.bouncesRemaining by the bounces that happened this tick.
// Returns { eliminatedId|null, bulletGone:bool, bounces:number }.
export function advanceBullet(state, shooterId) {
  const b = state.bullet;
  b.pos.x += b.vel.x;
  b.pos.y += b.vel.y;

  // Walls always reflect. Obstacles: Phase 1 array is empty, so this loop is a no-op.
  let bounces = reflectOffWalls(b, BULLET_RADIUS);
  for (const obs of state.obstacles) {
    bounces += reflectOffObstacle(b, BULLET_RADIUS, obs);
  }
  state.bouncesRemaining -= bounces;

  // Hit detection — skip the shooter entirely (blind never hits itself).
  for (const id of aliveIds(state)) {
    if (id === shooterId) continue;
    if (circleHit(b.pos, BULLET_RADIUS, state.players[id].pos, PLAYER_RADIUS)) {
      return { eliminatedId: id, bulletGone: true, bounces };
    }
  }

  // Bounce budget exhausted -> bullet disappears (checked AFTER hit so a hit on the final bounce counts).
  if (state.bouncesRemaining < 0) {
    return { eliminatedId: null, bulletGone: true, bounces };
  }
  return { eliminatedId: null, bulletGone: false, bounces };
}
