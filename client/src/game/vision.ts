// Blind-player vision overlay (dark mask + circular reveal) and expanding sound-ripple rendering.
// CRITICAL: every effect here applies ONLY when the receiving client is the blind player.
// For non-blind players drawVisionOverlay() is a strict no-op, so darkness never leaks to them.
import { worldToPixel, CANVAS_SIZE } from "./canvas";
import type { Snapshot, SoundView, Obstacle } from "./state";
import { play } from "./audio";

// --- Tunables (adjust gameplay feel from here; do not hunt through the code) ---
const VISION_RADIUS = 180; // px: outer radius of the blind player's visible circle
const VISION_INNER = 45; // px: fully-clear inner radius before the darkness gradient begins
// MUST stay 1.0: outside the vision circle the overlay is fully opaque, so NOTHING (player circle,
// ring, or label) leaks through the darkness for the blind player.
const OVERLAY_MAX_ALPHA = 1.0;
const RIPPLE_LIFETIME_MS = 700; // how long a sound ripple stays on screen
const RIPPLE_EXPAND_SPEED = 0.12; // px per ms: how fast a ripple radius grows
const RIPPLE_START_RADIUS = 6; // px: ripple radius at birth
// The map layout is shared knowledge (not a per-player position leak), so the blind player still
// gets a dim outline of obstacles through the darkness — faint enough to not compete with ripples.
const OBSTACLE_FAINT_ALPHA = 0.35;

// --- Ripple debounce (server sends id-less, noisy positions; we thin them client-side) ---
// A new sound is dropped if a ripple already exists within RIPPLE_DEBOUNCE_DIST_PX pixels that is
// younger than RIPPLE_DEBOUNCE_MS. Server noise is +/-60 world units (~43 px), so 80 px swallows the
// jitter cluster of one player without merging two genuinely separate (distant) players.
const RIPPLE_DEBOUNCE_MS = 250;
const RIPPLE_DEBOUNCE_DIST_PX = 80;

interface Ripple {
  x: number; // world units (noisy position from server)
  y: number;
  born: number; // performance.now() timestamp
}

const ripples: Ripple[] = [];

// Drop all active ripples. Called on rematch (no page reload) so sounds from the previous match
// don't linger into the new one. Ripples self-expire in ~700ms, but this makes the reset instant.
export function clearRipples(): void {
  ripples.length = 0;
}

// Add this snapshot's sound events as new ripples. Called once per snapshot (not per frame).
// Position-based debounce keeps one player's rapid sounds from piling into a dense, location-revealing cluster.
export function ingestSounds(sounds: SoundView[]): void {
  if (!sounds || sounds.length === 0) return;
  const now = performance.now();
  const thr2 = RIPPLE_DEBOUNCE_DIST_PX * RIPPLE_DEBOUNCE_DIST_PX;

  outer: for (const s of sounds) {
    // ripples is roughly time-ordered (push appends); scan newest -> oldest, stop once too old to matter
    for (let j = ripples.length - 1; j >= 0; j--) {
      if (now - ripples[j].born > RIPPLE_DEBOUNCE_MS) break;
      const dxp = worldToPixel(s.pos.x - ripples[j].x);
      const dyp = worldToPixel(s.pos.y - ripples[j].y);
      if (dxp * dxp + dyp * dyp < thr2) continue outer; // recent ripple too close -> skip this sound
    }
    ripples.push({ x: s.pos.x, y: s.pos.y, born: now });
    // Footstep audio is fired HERE, at the exact moment a ripple is created, so the sound the
    // blind player hears is perfectly in sync with the ripple it sees (same debounced event).
    play("step");
  }
}

export function drawVisionOverlay(ctx: CanvasRenderingContext2D, snap: Snapshot): void {
  // Non-blind players see the arena normally: do nothing.
  if (!snap.you || !snap.you.isBlind) return;

  const me = snap.players[snap.you.id];
  if (me) {
    const cx = worldToPixel(me.pos.x);
    const cy = worldToPixel(me.pos.y);
    // Single fillRect with a radial gradient: clear center -> soft fade -> FULLY BLACK at the rim and
    // beyond. The last stop is opaque (OVERLAY_MAX_ALPHA = 1.0) so the area outside the vision circle
    // is total darkness; no distant player silhouette or label can be read through it.
    const g = ctx.createRadialGradient(cx, cy, VISION_INNER, cx, cy, VISION_RADIUS);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${OVERLAY_MAX_ALPHA})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  // Faint obstacle outlines through the darkness (map layout leaks no player position).
  drawFaintObstacles(ctx, snap.obstacles);

  // Ripples are drawn ON TOP of the darkness so the blind player can sense sounds in the dark.
  drawRipples(ctx);
}

function drawFaintObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]): void {
  ctx.save();
  ctx.globalAlpha = OBSTACLE_FAINT_ALPHA;
  ctx.strokeStyle = "crimson";
  ctx.lineWidth = 2;
  for (const o of obstacles) {
    ctx.strokeRect(worldToPixel(o.x), worldToPixel(o.y), worldToPixel(o.w), worldToPixel(o.h));
  }
  ctx.restore();
}

function drawRipples(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  for (let i = ripples.length - 1; i >= 0; i--) {
    const age = now - ripples[i].born;
    if (age >= RIPPLE_LIFETIME_MS) {
      ripples.splice(i, 1);
      continue;
    }
    const t = age / RIPPLE_LIFETIME_MS;
    const radius = RIPPLE_START_RADIUS + age * RIPPLE_EXPAND_SPEED;
    const alpha = (1 - t) * 0.5; // low opacity, fading out
    const x = worldToPixel(ripples[i].x);
    const y = worldToPixel(ripples[i].y);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(120,200,255,${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `rgba(120,200,255,${alpha})`;
    ctx.shadowBlur = 8; // slight blur
    ctx.stroke();
    ctx.restore();
  }
}
