# Antigravity — Project Context

## What this is
A 3-player top-down multiplayer arena game based on the "blind tag" (körebe) mechanic.
**WEB version** (NOT mobile). The original spec was Flutter/Flame; we are porting to web.

## Stack (LOCKED — do not change without explicit instruction)
- Client: Astro + Tailwind CSS + TypeScript. Game screen = plain HTML Canvas 2D + requestAnimationFrame.
- Server: Node.js + `ws` (WebSocket). Room-based. One match = one room. Join via room code.
- NO physics engine anywhere. NO Phaser/Unity/Godot. NO Firebase for gameplay.
- NO matchmaking in V1.

## The single most important rule: SERVER-AUTHORITATIVE
- ALL physics, collision, bullet motion, bounce, hit detection, elimination happen on the SERVER.
- The client has ZERO physics. The client only:
  1. Sends input: movement (direction vector) and shoot command (direction).
  2. Renders the authoritative snapshot it receives.
- The client NEVER decides hits, physics, or eliminations. Even "tap = shoot" is just a command sent to the server; the server decides everything.

## Locked architecture decisions
- Tick rate: 30 Hz. Count phase durations in TICKS, not seconds (MovementPhase = 10s = 300 ticks).
- Snapshot format: plain JSON in V1. No binary optimization yet.
- Server world units: 1000x1000 arena. Server knows nothing about pixels. Client scales to canvas.
- Input: normalized direction vector {dx, dy}.

## Game rules (DO NOT introduce new mechanics)
- 3 players per match (V1).
- One random "blind player" (körebe) per round.
- Round state machine (strict): RoundStart → MovementPhase(10s) → ShootingPhase → BulletSimulation → RoundEnd → (NextRound | GameEnd).
- MovementPhase: everyone moves, no shooting, solid player-player collision. Players moving above a speed threshold emit a sound event.
- ShootingPhase: ALL players frozen. Only the blind player may act. Blind player has exactly ONE bullet, fired by tap (direction).
- BulletSimulation: bullet moves via simple physics, reflects off arena walls and obstacles (mirror reflection: angle out = angle in). Limited bounce count:
  - 3 players alive → 1 bounce
  - 2 players alive → 3 bounces
  - bounce count is computed at RoundStart from current alive count.
  - When max bounces reached, bullet disappears.
  - If bullet hits a player → that player eliminated, bullet disappears, round ends.
- RoundEnd: remove eliminated players, select new blind player via WEIGHTED random (previous blind has significantly LOWER chance).
- GameEnd: one player remains = winner.

## Vision & sound (applied ONLY on the blind player's client)
- Blind player's screen is mostly dark with a small circular visible area (dark overlay + radial gradient mask).
- Sound events are sent by the server to the BLIND player only, with small positional noise added server-side (so position is approximate, not exact). Client draws expanding, blurred, low-opacity ripples.
- Non-blind players see the arena normally.

## Folder structure
server/src: index, rooms, room, gameLoop, config; state/{stateMachine,gameState}; sim/{movement,bullet,collision,blindSelect}; net/{messages,broadcast}
client/src: pages/ (Astro + Stitch UI); game/{net,state,input,renderer,canvas,vision}; game/hud/

## Working style (IMPORTANT for the agent)
- This is a SINGLE developer project. Avoid overengineering. Avoid unnecessary abstractions. Prefer the simplest stable solution.
- Build PHASE BY PHASE. Do not jump ahead to later phases or build the client while we are on the server.
- Before large/structural changes, propose first and wait for confirmation.
- Add clear comments explaining architecture decisions, especially around the authoritative model.
- If something is unspecified, pick the simplest safe option and note it.
- Communicate with the developer in TURKISH. All explanations, summaries, plans, and progress reports must be in Turkish. Code, file names, code comments, and commit messages stay in English.
