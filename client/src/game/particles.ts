// Tiny particle system for visual juice (bullet impact, elimination burst). Pure cosmetic: it draws
// on the same canvas AFTER the scene but BEFORE the blind-vision overlay, so darkness still covers
// particles outside the blind player's reveal circle (no position leak). No physics, no server data.
import { worldToPixel } from "./canvas";

interface Particle {
  x0: number; // pixel origin
  y0: number;
  vx: number; // pixels per ms
  vy: number;
  born: number; // performance.now()
  life: number; // ms
  color: string;
  size: number; // px radius
}

const particles: Particle[] = [];
const MAX_PARTICLES = 300; // hard cap so a burst storm can never balloon

// Spawn a radial burst at a WORLD position (converted to pixels here). Cosmetic only.
export function spawnBurst(worldX: number, worldY: number, color: string, count = 12): void {
  const x0 = worldToPixel(worldX);
  const y0 = worldToPixel(worldY);
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.04 + Math.random() * 0.16; // px/ms
    particles.push({
      x0,
      y0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      born: performance.now(),
      life: 280 + Math.random() * 320,
      color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}

// Drop all particles (called on rematch so nothing lingers into the new match).
export function clearParticles(): void {
  particles.length = 0;
}

// Live count (test/debug hook; harmless in production).
export function particleCount(): number {
  return particles.length;
}

// Advance + draw every particle. Called once per render frame from renderer.ts.
export function updateAndDraw(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const age = now - p.born;
    if (age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    const t = age / p.life; // 0 -> 1
    const x = p.x0 + p.vx * age;
    const y = p.y0 + p.vy * age;
    ctx.save();
    ctx.globalAlpha = 1 - t; // fade out
    ctx.beginPath();
    ctx.arc(x, y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}
