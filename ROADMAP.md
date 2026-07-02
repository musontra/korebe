# V2 Roadmap

Post-deploy work packages, in execution order. Each package is done, tested, and committed
before the next begins (same phase-by-phase discipline as V1). Legend: ⚙️ touches the
authoritative server · 🎨 pure client.

Deferred/one-off items live in [BACKLOG.md](BACKLOG.md); this file is the ordered plan.

## 1. E — Rematch ⚙️
Play again in the SAME room after a match ends: reset the room state at `GameEnd` so players
can start a fresh match without a new room code. Same work as **"Phase 5.5 — Rematch"** in
[BACKLOG.md](BACKLOG.md) — see that note for the analysis; not repeated here.
**Durum: bekliyor**

## 2. A — Sound + Juice 🎨
Footstep / gunshot / hit sounds, cowboy-standoff music during `ShootingPhase`; bullet-impact
particles, elimination screen shake, button/transition effects. All driven off events already
in the server snapshot — no server changes.
**Durum: bekliyor**

## 3. C — Map / obstacles ⚙️🎨
Place obstacles in the arena on the server (bullet-reflection code has been ready since Phase 1);
render the map visually on the client.
**Durum: bekliyor**

## 4. B — Character art, static 🎨
Replace the plain circles with top-down character sprites. Static art only — NO animation
(that is package G).
**Durum: bekliyor**

## 5. F — Mobile / touch controls 🎨
On-screen joystick + tap-to-shoot, without breaking desktop input. Required for a truly
public-facing web build.
**Durum: bekliyor**

## 6. H — Connection / error UX 🎨
User feedback for server wake-up (cold start), disconnects, and room-not-filling situations.
**Durum: bekliyor**

## 7. D — Matchmaking ⚙️
"Quick Play" + "Create Private Room". This intentionally revisits the V1 "no matchmaking" rule
(see the CLAUDE.md note).
**Durum: bekliyor**

## 8. G — Animation 🎨
Walk / shoot sprite animation, built on top of package B. Last, because it depends on the
static sprites landing first.
**Durum: bekliyor**

## Deploy — after all packages
Once the packages above are done and stable, do the real deploy (Render server + Cloudflare
Pages client) following [server/README.md](server/README.md) and [client/README.md](client/README.md).
