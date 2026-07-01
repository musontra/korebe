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
