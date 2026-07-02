// Visual juice orchestration: snapshot-diff triggers (same discipline as audio.ts) that fire
// bullet-impact / elimination particles and a short elimination screen shake. Pure client cosmetic;
// no server calls. Screen shake is applied as a CSS transform on the <canvas> ELEMENT so renderer.ts
// drawing (arena/players/bullet/vision) is never touched — remove initJuice and the game is unchanged.
import type { Snapshot } from "./state";
import { spawnBurst, clearParticles, particleCount } from "./particles";

const IMPACT_COLOR = "#ffd23b"; // bullet fizzle (matches the bullet)
const HIT_COLOR = "#d90429"; // elimination (Antigravity crimson)
const SHAKE_MS = 220;
const SHAKE_MAX_PX = 7; // small on purpose: juice, not motion sickness

let canvasEl: HTMLCanvasElement | null = null;
let shakeUntil = 0;

let prevWinnerId: string | null = null;
let prevBullet = false;
let prevBulletPos: { x: number; y: number } | null = null;
let prevAlive: Record<string, boolean> = {};

// Store the canvas element and start the shake loop (which only writes a CSS transform).
export function initJuice(canvas: HTMLCanvasElement): void {
  canvasEl = canvas;
  requestAnimationFrame(shakeLoop);
}

function triggerShake(): void {
  shakeUntil = performance.now() + SHAKE_MS;
}

// Own rAF: decays the shake to zero and writes it as a CSS translate. Never touches canvas content.
function shakeLoop(): void {
  if (canvasEl) {
    const now = performance.now();
    if (now < shakeUntil) {
      const t = (shakeUntil - now) / SHAKE_MS; // 1 -> 0
      const m = SHAKE_MAX_PX * t;
      const rx = (Math.random() * 2 - 1) * m;
      const ry = (Math.random() * 2 - 1) * m;
      canvasEl.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
    } else if (canvasEl.style.transform) {
      canvasEl.style.transform = ""; // settle exactly back to origin
    }
  }
  requestAnimationFrame(shakeLoop);
}

export function updateJuice(snap: Snapshot): void {
  // Rematch (winner cleared): drop leftover particles and reset the diff baselines + shake.
  if (prevWinnerId !== null && snap.winnerId === null) {
    clearParticles();
    prevBullet = false;
    prevBulletPos = null;
    prevAlive = {};
    shakeUntil = 0;
    if (canvasEl) canvasEl.style.transform = "";
  }
  prevWinnerId = snap.winnerId;

  // Bullet impact: the bullet just vanished (hit a player or ran out of bounces). Burst at its
  // last known position. (Wall-bounce sparks are intentionally out of scope — see BACKLOG.md.)
  const bulletNow = !!snap.bullet;
  if (!bulletNow && prevBullet && prevBulletPos) {
    spawnBurst(prevBulletPos.x, prevBulletPos.y, IMPACT_COLOR, 14);
  }
  prevBullet = bulletNow;
  if (snap.bullet) prevBulletPos = { x: snap.bullet.pos.x, y: snap.bullet.pos.y };

  // Elimination: a player went alive -> dead. Crimson burst at their position + a short shake.
  for (const [id, p] of Object.entries(snap.players)) {
    if (prevAlive[id] === true && !p.alive) {
      spawnBurst(p.pos.x, p.pos.y, HIT_COLOR, 18);
      triggerShake();
    }
  }
  prevAlive = {};
  for (const [id, p] of Object.entries(snap.players)) prevAlive[id] = p.alive;
}

// Test/debug hook: observe shake + particle state from the browser (harmless in production).
if (typeof window !== "undefined") {
  (window as unknown as { __juice: unknown }).__juice = {
    shaking: () => performance.now() < shakeUntil,
    transform: () => (canvasEl ? canvasEl.style.transform : ""),
    particles: () => particleCount(),
  };
}

