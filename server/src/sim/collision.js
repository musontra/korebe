// Shared collision primitives (circle-circle, circle-wall, mirror reflection math).
// Pure geometry helpers; no game-rule knowledge lives here.
import { ARENA_WIDTH, ARENA_HEIGHT } from "../config.js";

// Keep a circle of the given radius inside the arena (in-place).
export function clampToArena(pos, radius) {
  pos.x = Math.max(radius, Math.min(ARENA_WIDTH - radius, pos.x));
  pos.y = Math.max(radius, Math.min(ARENA_HEIGHT - radius, pos.y));
}

// Solid player-player collision: push two overlapping equal-radius circles apart (in-place).
export function resolvePlayerCollision(a, b, radius) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = radius * 2;
  if (dist > 0 && dist < minDist) {
    const overlap = (minDist - dist) / 2;
    const nx = dx / dist;
    const ny = dy / dist;
    a.pos.x -= nx * overlap;
    a.pos.y -= ny * overlap;
    b.pos.x += nx * overlap;
    b.pos.y += ny * overlap;
  } else if (dist === 0) {
    // Exactly overlapping: nudge apart deterministically so we never divide by zero.
    a.pos.x -= radius;
    b.pos.x += radius;
  }
}

// Reflect a bullet off the arena walls (mirror reflection). Returns how many bounces occurred (0..2).
export function reflectOffWalls(bullet, radius) {
  let bounces = 0;
  if (bullet.pos.x < radius) {
    bullet.pos.x = radius;
    bullet.vel.x = -bullet.vel.x;
    bounces++;
  } else if (bullet.pos.x > ARENA_WIDTH - radius) {
    bullet.pos.x = ARENA_WIDTH - radius;
    bullet.vel.x = -bullet.vel.x;
    bounces++;
  }
  if (bullet.pos.y < radius) {
    bullet.pos.y = radius;
    bullet.vel.y = -bullet.vel.y;
    bounces++;
  } else if (bullet.pos.y > ARENA_HEIGHT - radius) {
    bullet.pos.y = ARENA_HEIGHT - radius;
    bullet.vel.y = -bullet.vel.y;
    bounces++;
  }
  return bounces;
}

// Reflect a bullet off one AABB obstacle {x,y,w,h} (mirror reflection). Returns 0 or 1.
export function reflectOffObstacle(bullet, radius, obs) {
  const cx = Math.max(obs.x, Math.min(bullet.pos.x, obs.x + obs.w));
  const cy = Math.max(obs.y, Math.min(bullet.pos.y, obs.y + obs.h));
  const dx = bullet.pos.x - cx;
  const dy = bullet.pos.y - cy;
  const centerInside = dx === 0 && dy === 0; // bullet CENTER stepped inside the box

  // No contact: center outside AND the circle doesn't reach the box.
  if (!centerInside && dx * dx + dy * dy > radius * radius) return 0;

  if (centerInside) {
    // At BULLET_SPEED a single step can land the center inside the box, where the closest-point
    // normal degenerates (dx=dy=0). Resolve by the SHALLOWEST face: flip that axis and push the
    // bullet back out the side it entered. Without this the bullet sails straight through.
    const left = bullet.pos.x - obs.x;
    const right = obs.x + obs.w - bullet.pos.x;
    const top = bullet.pos.y - obs.y;
    const bottom = obs.y + obs.h - bullet.pos.y;
    if (Math.min(left, right) <= Math.min(top, bottom)) {
      bullet.vel.x = -bullet.vel.x;
      bullet.pos.x = left < right ? obs.x - radius : obs.x + obs.w + radius;
    } else {
      bullet.vel.y = -bullet.vel.y;
      bullet.pos.y = top < bottom ? obs.y - radius : obs.y + obs.h + radius;
    }
    return 1;
  }

  // Center outside, circle grazes a face/corner: reflect on the shallowest-penetration axis.
  if (Math.abs(dx) > Math.abs(dy)) {
    bullet.vel.x = -bullet.vel.x;
    bullet.pos.x = dx >= 0 ? obs.x + obs.w + radius : obs.x - radius;
  } else {
    bullet.vel.y = -bullet.vel.y;
    bullet.pos.y = dy >= 0 ? obs.y + obs.h + radius : obs.y - radius;
  }
  return 1;
}

// Circle-circle overlap test.
export function circleHit(p1, r1, p2, r2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const rr = r1 + r2;
  return dx * dx + dy * dy <= rr * rr;
}
