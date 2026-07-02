// Client-side audio: SFX + standoff music, driven by the authoritative snapshot (no server calls,
// no physics). ASSET-AGNOSTIC BY DESIGN: sounds are discovered with import.meta.glob, which resolves
// ONLY the files that actually exist at build time. A missing sound is therefore never fetched —
// zero 404s, nothing logged, the game is unaffected. Drop a file into src/assets/audio/ (e.g.
// shot.mp3) and Vite/HMR picks it up automatically; the file's basename is the sound's name.
//
// Expected names: shot (gunshot), hit (elimination — swap with your own "ugh", keep the name),
// step (blind-only footstep, fired in sync with the sound ripple), ui (button clicks),
// standoff (cowboy-standoff music loop during ShootingPhase).
import type { Snapshot } from "./state";

// eager URLs for every audio file present at build time. Missing names simply aren't in the map.
const ASSET_MODULES = import.meta.glob("/src/assets/audio/*.{mp3,ogg,wav}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ASSET_URLS: Record<string, string> = {}; // basename (no extension) -> resolved URL
for (const [path, url] of Object.entries(ASSET_MODULES)) {
  const base = path.split("/").pop()!.replace(/\.(mp3|ogg|wav)$/, "");
  ASSET_URLS[base] = url;
}
const MUSIC_NAME = "standoff";

// Footstep AUDIO throttle. Ripple visuals stay at their Phase-3-tuned density (that debounce is a
// blindness-balance decision and must NOT change); this only thins the STEP SOUND so continuous
// movement doesn't become an audible buzz. Tune by ear once real assets are in.
const STEP_MIN_INTERVAL_MS = 150;
let lastStepAt = 0;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const buffers: Record<string, AudioBuffer> = {}; // only present once a file has loaded OK
let musicBuffer: AudioBuffer | null = null;
let musicSource: AudioBufferSourceNode | null = null;
let muted = false;

// Lightweight trace so the trigger logic can be verified WITHOUT real audio files (test hook).
// Every play/music/mute call is recorded here even when it produces no sound (missing file / muted).
export const audioTrace: { t: number; action: string }[] = [];
function trace(action: string): void {
  audioTrace.push({ t: Math.round(performance.now()), action });
  if (audioTrace.length > 300) audioTrace.shift();
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (!ctx) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null; // missing file -> silent (no throw, no console error)
    const data = await res.arrayBuffer();
    return await ctx.decodeAudioData(data);
  } catch {
    return null; // network/decode failure -> silent
  }
}

// Must be called from a user gesture (the Join click) so the browser permits audio (autoplay).
export function initAudio(): void {
  if (ctx) {
    void ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null; // Web Audio unavailable -> the whole system stays a silent no-op
    return;
  }
  // Preload only the files that exist (from the glob). Each load is independent and non-blocking.
  for (const [name, url] of Object.entries(ASSET_URLS)) {
    loadBuffer(url).then((b) => {
      if (!b) return;
      if (name === MUSIC_NAME) musicBuffer = b;
      else buffers[name] = b;
    });
  }
}

export function play(name: string): void {
  // Throttle footstep AUDIO only (the ripple in vision.ts still fires every event — visuals intact).
  if (name === "step") {
    const now = performance.now();
    if (now - lastStepAt < STEP_MIN_INTERVAL_MS) return;
    lastStepAt = now;
  }
  trace(`play:${name}`);
  const buf = buffers[name];
  if (!ctx || !masterGain || !buf) return; // not ready / missing file -> silent
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(masterGain);
  src.start();
}

export function startMusic(): void {
  trace("music:start");
  if (!ctx || !masterGain || !musicBuffer || musicSource) return; // already playing or not ready
  const src = ctx.createBufferSource();
  src.buffer = musicBuffer;
  src.loop = true;
  src.connect(masterGain);
  src.start();
  musicSource = src;
}

export function stopMusic(): void {
  trace("music:stop");
  if (musicSource) {
    try {
      musicSource.stop();
    } catch {
      /* already stopped */
    }
    musicSource = null;
  }
}

// Single control point: muting drops the master gain to 0, so ongoing music is silenced instantly
// and unmuting restores it. Session-only (no persistence).
export function toggleMute(): boolean {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 1;
  trace(`mute:${muted}`);
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

// --- snapshot-driven triggers: shot / hit / standoff music / rematch reset ---
// (Footsteps are fired from vision.ts at ripple creation, so audio and ripple stay in sync.)
let prevWinnerId: string | null = null;
let prevPhase: string | null = null;
let prevBullet = false;
let prevAlive: Record<string, boolean> = {};

export function updateAudio(snap: Snapshot): void {
  // Rematch (winner cleared): stop music and reset the diff baselines, mirroring hud.ts.
  if (prevWinnerId !== null && snap.winnerId === null) {
    stopMusic();
    prevPhase = null;
    prevBullet = false;
    prevAlive = {};
  }
  prevWinnerId = snap.winnerId;

  // Gunshot: the single bullet just appeared (null -> non-null).
  const bulletNow = !!snap.bullet;
  if (bulletNow && !prevBullet) play("shot");
  prevBullet = bulletNow;

  // Hit: a player went alive -> dead since the last snapshot.
  for (const [id, p] of Object.entries(snap.players)) {
    if (prevAlive[id] === true && !p.alive) play("hit");
  }
  prevAlive = {};
  for (const [id, p] of Object.entries(snap.players)) prevAlive[id] = p.alive;

  // Standoff music: loop while everyone is frozen in ShootingPhase; stop when the phase changes.
  if (snap.phase !== prevPhase) {
    if (snap.phase === "ShootingPhase") startMusic();
    else if (prevPhase === "ShootingPhase") stopMusic();
    prevPhase = snap.phase;
  }
}

// Expose the trace for asset-free verification in the browser (harmless in production).
if (typeof window !== "undefined") {
  (window as unknown as { __audio: unknown }).__audio = {
    trace: audioTrace,
    muted: () => muted,
  };
}
