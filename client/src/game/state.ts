// Client-side mirror of the latest authoritative snapshot (render-only; the client has ZERO physics).

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerView {
  pos: Vec2;
  alive: boolean;
  isBlind: boolean;
}

export interface SoundView {
  pos: Vec2;
}

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Mirrors the server broadcast shape exactly (see server/src/net/broadcast.js).
export interface Snapshot {
  type: "SNAPSHOT";
  tick: number;
  phase: string;
  players: Record<string, PlayerView>;
  bullet: { pos: Vec2 } | null;
  obstacles: Obstacle[];
  bouncesRemaining: number;
  maxBounces: number;
  winnerId: string | null;
  you: { id: string; isBlind: boolean };
  sounds: SoundView[];
}

let latest: Snapshot | null = null;
let myId: string | null = null;

export function setSnapshot(s: Snapshot): void {
  latest = s;
}

export function getSnapshot(): Snapshot | null {
  return latest;
}

export function setMyId(id: string): void {
  myId = id;
}

export function getMyId(): string | null {
  return myId;
}
