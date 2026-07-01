// HUD + screen notifications: phase, countdown, blind badge, alive count, bounce indicator,
// plus round-end toast, eliminated banner and the game-over screen. Driven once per snapshot.
// Pure DOM/state reflection — no physics, no server calls.
import type { Snapshot } from "../state";
import { getMyId } from "../state";

// must match server config (server/src/config.js)
const TICK_RATE = 30;
const MOVEMENT_PHASE_TICKS = 300;
const SHOOTING_PHASE_TIMEOUT_TICKS = 300;
const ROUND_END_TOAST_MS = 2000; // how long the "PX elendi" toast stays up

const PHASE_LABELS: Record<string, string> = {
  RoundStart: "Hazırlık",
  MovementPhase: "Hareket",
  ShootingPhase: "Atış",
  BulletSimulation: "Mermi",
  RoundEnd: "Tur sonu",
  GameEnd: "Oyun bitti",
};

function el(id: string): HTMLElement | null {
  return document.getElementById(id);
}

// Countdown as M:SS (phases are always under a minute, so minutes stay 0).
function fmt(ticks: number): string {
  const s = Math.max(0, Math.ceil(ticks / TICK_RATE));
  return "0:" + (s < 10 ? "0" + s : String(s));
}

// Track alive state across snapshots to detect eliminations (alive true -> false).
let prevAlive: Record<string, boolean> = {};
let toastTimer: number | undefined;

function showRoundEndToast(id: string): void {
  const toast = el("roundEnd");
  const msg = el("roundEndMsg");
  if (msg) msg.textContent = `${id} ELENDİ`;
  if (toast) {
    toast.classList.remove("hidden");
    if (toastTimer !== undefined) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.add("hidden"), ROUND_END_TOAST_MS);
  }
}

export function updateHud(snap: Snapshot): void {
  const phaseEl = el("hudPhase");
  const timerEl = el("hudTimer");
  const blindEl = el("hudBlind");
  const aliveEl = el("hudAlive");
  const bounceEl = el("hudBounce");
  const bounceValEl = el("hudBounceVal");

  const isBlind = !!(snap.you && snap.you.isBlind);
  const myId = getMyId();

  if (phaseEl) phaseEl.textContent = PHASE_LABELS[snap.phase] ?? snap.phase;

  if (timerEl) {
    let remain = "";
    if (snap.phase === "MovementPhase") remain = fmt(MOVEMENT_PHASE_TICKS - snap.tick);
    else if (snap.phase === "ShootingPhase") remain = fmt(SHOOTING_PHASE_TIMEOUT_TICKS - snap.tick);
    timerEl.textContent = remain;
  }

  if (blindEl) blindEl.classList.toggle("hidden", !isBlind);

  if (aliveEl) {
    const aliveCount = Object.values(snap.players).filter((p) => p.alive).length;
    aliveEl.textContent = String(aliveCount); // "KALAN:" label is static in the markup
  }

  if (bounceEl) {
    const show = isBlind && (snap.phase === "ShootingPhase" || snap.phase === "BulletSimulation");
    bounceEl.classList.toggle("hidden", !show); // toggles the whole container (label + value)
  }
  if (bounceValEl) {
    bounceValEl.textContent = `${snap.bouncesRemaining}/${snap.maxBounces}`;
  }

  // --- round-end toast: a player went alive -> dead since the last snapshot ---
  for (const [id, p] of Object.entries(snap.players)) {
    if (prevAlive[id] === true && !p.alive) showRoundEndToast(id);
  }
  const nextAlive: Record<string, boolean> = {};
  for (const [id, p] of Object.entries(snap.players)) nextAlive[id] = p.alive;
  prevAlive = nextAlive;

  // --- eliminated banner: I am out, spectating ---
  const banner = el("eliminatedBanner");
  if (banner) {
    const iAmDead = !!(myId && snap.players[myId] && !snap.players[myId].alive);
    banner.classList.toggle("hidden", !iAmDead);
  }

  // --- game over: winner decided ---
  const over = el("gameOver");
  if (over) {
    if (snap.winnerId) {
      over.classList.remove("hidden");
      const title = el("gameOverTitle");
      const result = el("gameOverResult");
      const iWon = myId === snap.winnerId;
      if (title) {
        title.textContent = iWon ? "KAZANDIN!" : "KAYBETTİN";
        title.classList.toggle("text-primary-container", iWon);
        title.classList.toggle("text-on-surface", !iWon);
      }
      if (result) result.textContent = `KAZANAN: ${snap.winnerId}`;
    } else {
      over.classList.add("hidden");
    }
  }
}
