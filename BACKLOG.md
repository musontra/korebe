# Backlog

Deferred work that is intentionally out of the current phase. Pick up after deploy, once the game is stable.

## Phase 5.5 — Rematch (server room reset)

**Problem:** After `GameEnd`, a room stays `started=true` and is never reset or removed from the
registry (see `server/src/room.js` / `server/src/rooms.js`). Re-joining the *same room code* is
rejected with `ERROR: match already started`.

**V1 workaround (current):** `gameOver` screen buttons (`playAgainBtn` / `exitBtn`) both reload → empty
lobby; players must enter a NEW room code to play again. Ugly but works, and it keeps Phase 4 free of
server changes.

**To do:** add room lifecycle handling so a finished room can host a new match in place — either reset
the room state at `GameEnd`, or accept re-joins after the match ends. Touches `room.js` / `rooms.js`.

**Why deferred:** doing it during Phase 4 (UI) would break the "no server changes this phase" rule and
the phase-by-phase discipline. Backlog until after deploy.

## Phase 5.x — Blind-disconnect fast-cut

**Current (Phase 5):** if the blind player disconnects mid-`ShootingPhase`, no shoot input ever
arrives, so the round just waits out `SHOOTING_PHASE_TIMEOUT_TICKS` (~10s) and then ends with no
elimination. Functional, not frozen — just a rare up-to-10s delay.

**To do (optional):** in `handleClose`, if the disconnecting player is the current `blindId` and we
are in `ShootingPhase`, end the round immediately instead of waiting for the timeout.

**Why deferred:** accepted for V1. It would add a new code path into the state machine, against the
Phase 5 principle of "minimum touch to the sim". Not worth it for a rare 10s delay.

## V2 A2 — Wall-bounce spark particles

**Current (A2):** particles fire on solid client-side events — elimination (`alive` true->false) and
the bullet vanishing (`bullet` non-null->null). Wall/obstacle bounces have NO particle.

**To do (optional):** spark particles at each bounce. The client would have to INFER a bounce from
the bullet's position delta between snapshots (a sharp direction change), since the public snapshot
carries `bullet.pos` only (no velocity, no bounce event).

**Why deferred:** at 30 Hz a bounce can happen and reverse between two ticks, so client-side bounce
detection is approximate and flaky. The core impacts are tied to exact events and are solid; bounce
sparks would be a fragile guess. Revisit only if the extra flair is worth the imprecision.
