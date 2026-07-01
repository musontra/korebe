// HUD: phase, countdown, blind notice, alive count, bounce indicator. DOM/CSS layer over the canvas.
// Replaces the Phase 2 raw debug text. Updated once per snapshot.
import type { Snapshot } from "../state";

// must match server config (server/src/config.js)
const TICK_RATE = 30;
const MOVEMENT_PHASE_TICKS = 300;
const SHOOTING_PHASE_TIMEOUT_TICKS = 300;

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

export function updateHud(snap: Snapshot): void {
  const phaseEl = el("hudPhase");
  const timerEl = el("hudTimer");
  const blindEl = el("hudBlind");
  const aliveEl = el("hudAlive");
  const bounceEl = el("hudBounce");

  const isBlind = !!(snap.you && snap.you.isBlind);

  if (phaseEl) {
    phaseEl.textContent = snap.winnerId
      ? `Kazanan: ${snap.winnerId}`
      : (PHASE_LABELS[snap.phase] ?? snap.phase);
  }

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

  const bounceValEl = el("hudBounceVal");
  if (bounceEl) {
    const show = isBlind && (snap.phase === "ShootingPhase" || snap.phase === "BulletSimulation");
    bounceEl.classList.toggle("hidden", !show); // toggles the whole container (label + value)
  }
  if (bounceValEl) {
    bounceValEl.textContent = `${snap.bouncesRemaining}/${snap.maxBounces}`;
  }
}
