// HUD + screen notifications: phase, countdown, blind badge, alive count, bounce indicator,
// plus round-end toast, eliminated banner and the game-over screen. Driven once per snapshot.
// Pure DOM/state reflection — no physics, no server calls.
import type { Snapshot } from "../state";
import { getMyId } from "../state";
import { clearRipples } from "../vision";

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
// Track the winner so we can detect a rematch (winnerId non-null -> null) and reset visual state.
let prevWinnerId: string | null = null;

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

// A rematch starts a new match in place (no page reload), so leftover visual state from the
// previous match must be wiped explicitly: game-over screen, eliminated banner, round-end toast,
// the alive-diff baseline (so a revived player doesn't fire a stale "elendi" toast), and ripples.
function resetForNewMatch(snap: Snapshot): void {
  el("gameOver")?.classList.add("hidden");
  el("eliminatedBanner")?.classList.add("hidden");
  el("roundEnd")?.classList.add("hidden");
  if (toastTimer !== undefined) {
    clearTimeout(toastTimer);
    toastTimer = undefined;
  }
  prevAlive = {};
  for (const [id, p] of Object.entries(snap.players)) prevAlive[id] = p.alive;
  clearRipples();
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

  // Detect a rematch (previous match had a winner, this snapshot has none) and wipe leftover
  // visual state BEFORE the rest of this frame runs (so no stale toast/banner survives).
  if (prevWinnerId !== null && snap.winnerId === null) resetForNewMatch(snap);
  prevWinnerId = snap.winnerId;

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

      // Rematch readiness. need = connected players; körebe requires >= 2. When too few remain,
      // show "yeterli oyuncu yok" and disable the button so pressing it does nothing.
      const enough = snap.rematchNeed >= 2;
      const rstatus = el("rematchStatus");
      if (rstatus) {
        rstatus.textContent = enough
          ? `HAZIR: ${snap.rematchReady}/${snap.rematchNeed}`
          : "YETERLİ OYUNCU YOK";
      }
      const playBtn = el("playAgainBtn");
      if (playBtn) {
        playBtn.classList.toggle("opacity-40", !enough);
        playBtn.classList.toggle("pointer-events-none", !enough);
      }
    } else {
      over.classList.add("hidden");
    }
  }
}
