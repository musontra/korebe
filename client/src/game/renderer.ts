// Render the authoritative snapshot to the canvas each animation frame (requestAnimationFrame).
// Pure snapshot drawing: no interpolation, no smoothing, no client-side prediction.
// Phase 3: raw debug panel removed (replaced by the HUD DOM layer); blind vision overlay added.
import { getSnapshot, type PlayerView } from "./state";
import { getCtx, worldToPixel, CANVAS_SIZE } from "./canvas";
import { drawVisionOverlay } from "./vision";

// World units; must match server config (PLAYER_RADIUS=25, BULLET_RADIUS=8).
const PLAYER_RADIUS = 25;
const BULLET_RADIUS = 8;

const PLAYER_COLORS: Record<string, string> = {
  P1: "#e23b3b",
  P2: "#3bd16f",
  P3: "#3b7fe2",
};

let running = false;

export function startRenderer(): void {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

function frame(): void {
  draw();
  if (running) requestAnimationFrame(frame);
}

function draw(): void {
  const ctx = getCtx();

  // background + arena border
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, CANVAS_SIZE - 2, CANVAS_SIZE - 2);

  const snap = getSnapshot();
  if (!snap) {
    drawText("waiting for snapshot...", 10, 20);
    return;
  }

  // obstacles (rectangles) — empty in Phase 2/3
  ctx.fillStyle = "#444";
  for (const o of snap.obstacles) {
    ctx.fillRect(worldToPixel(o.x), worldToPixel(o.y), worldToPixel(o.w), worldToPixel(o.h));
  }

  for (const [id, p] of Object.entries(snap.players)) {
    drawPlayer(id, p);
  }

  if (snap.bullet) {
    ctx.beginPath();
    ctx.arc(
      worldToPixel(snap.bullet.pos.x),
      worldToPixel(snap.bullet.pos.y),
      worldToPixel(BULLET_RADIUS),
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#ffd23b";
    ctx.fill();
  }

  // Blind-only darkness + sound ripples. No-op for non-blind clients (no darkness leak).
  drawVisionOverlay(ctx, snap);
}

function drawPlayer(id: string, p: PlayerView): void {
  const ctx = getCtx();
  const x = worldToPixel(p.pos.x);
  const y = worldToPixel(p.pos.y);
  const r = worldToPixel(PLAYER_RADIUS);

  ctx.globalAlpha = p.alive ? 1 : 0.35;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = PLAYER_COLORS[id] ?? "#cccccc";
  ctx.fill();
  ctx.globalAlpha = 1;

  // blind player = white ring
  if (p.isBlind) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  drawText(id, x - 7, y - r - 6);
}

function drawText(text: string, x: number, y: number): void {
  const ctx = getCtx();
  ctx.fillStyle = "#ffffff";
  ctx.font = "13px monospace";
  ctx.fillText(text, x, y);
}
