// A single match instance: holds connected players, owns its game loop and authoritative state.
// Buffers per-player input (latest-wins) and exposes drainInputs()/connections() to the game loop.
import { createGameState, addPlayer, aliveIds, Phase } from "./state/gameState.js";
import { createGameLoop } from "./gameLoop.js";
import { finishRound, startRound } from "./state/stateMachine.js";
import { ClientMessageType, ServerMessageType, parse, safeSend } from "./net/messages.js";
import { PLAYERS_PER_MATCH } from "./config.js";

// onEmpty is called once the last connection leaves, so the registry can drop this room and
// its code can be reused. Passed in (instead of importing rooms.js) to avoid a circular import.
export function createRoom(code, onEmpty) {
  const state = createGameState();
  const conns = new Map(); // id -> ws
  let movementInputs = {}; // id -> {dx,dy}  (consumed each tick)
  let shootInputs = {}; // id -> {dx,dy}  (consumed each tick)
  let started = false;
  let nextPlayerNum = 1;
  let loop = null;
  const rematchReady = new Set(); // ids that pressed "play again"; only meaningful at GameEnd

  // Connected players still marked ready (a disconnect during the wait shrinks both counts).
  const readyConnectedCount = () => [...rematchReady].filter((id) => conns.has(id)).length;

  const room = {
    code,
    state,
    interval: null,
    connections: () => conns.entries(),
    // For the game-over HUD: how many connected players are ready vs. how many are connected.
    getRematch: () => ({ ready: readyConnectedCount(), need: conns.size }),
    drainInputs() {
      const movement = movementInputs;
      const shoot = shootInputs;
      movementInputs = {};
      shootInputs = {};
      return { movement, shoot };
    },
  };

  function broadcastRaw(obj) {
    for (const ws of conns.values()) safeSend(ws, obj);
  }

  function handleMessage(id, raw) {
    const msg = parse(raw);
    if (!msg) return;
    if (msg.type === ClientMessageType.INPUT) {
      movementInputs[id] = { dx: Number(msg.dx) || 0, dy: Number(msg.dy) || 0 };
    } else if (msg.type === ClientMessageType.SHOOT) {
      shootInputs[id] = { dx: Number(msg.dx) || 0, dy: Number(msg.dy) || 0 };
    } else if (msg.type === ClientMessageType.REMATCH) {
      // "Play again": only honored once the match is over. Mark this player ready and, if every
      // connected player is now ready (and at least 2 remain), reset the room in place.
      if (state.phase === Phase.GAME_END && conns.has(id)) {
        rematchReady.add(id);
        maybeStartRematch();
      }
    }
    // The game loop enforces phase rules (movement ignored outside MovementPhase; shoot accepted
    // only from the blind player in ShootingPhase). Buffering both here is harmless.
  }

  // Start a rematch when all connected players are ready. "need" is dynamic (current connected
  // count) so nobody is stuck waiting on someone who left. Körebe needs >= 2 players.
  function maybeStartRematch() {
    if (state.phase !== Phase.GAME_END) return;
    const connected = conns.size;
    if (connected >= 2 && readyConnectedCount() === connected) resetForRematch();
  }

  // Reset the room in place and reuse the EXISTING startRound (same weighted blind select,
  // maxBounces-from-alive, phase flow) so a rematch is indistinguishable from the first match.
  function resetForRematch() {
    for (const pid of Object.keys(state.players)) {
      if (conns.has(pid)) state.players[pid].alive = true; // revive everyone still here
      else delete state.players[pid]; // drop players who left during the match / the wait
    }
    state.winnerId = null;
    state.bullet = null;
    state.sounds = [];
    state.tickCounter = 0;
    rematchReady.clear();
    startRound(state, log); // the loop is still ticking (idle in GAME_END); it picks this up
    log(`[rematch] new match with ${conns.size} players`);
  }

  const log = (m) => console.log(`[room ${code}] ${m}`);

  function handleClose(id) {
    log(`${id} disconnected`);
    conns.delete(id);
    rematchReady.delete(id);

    if (!started) {
      // (C) Lobby: remove the player entirely (no ghost lingering in state) and refresh the
      // waiting count so remaining lobby clients drop e.g. 2/3 -> 1/3.
      delete state.players[id];
      broadcastRaw({ type: ServerMessageType.WAITING, count: conns.size, need: PLAYERS_PER_MATCH });
    } else if (state.phase === Phase.GAME_END) {
      // Left the game-over screen: "need" shrank, so the remaining players may now all be ready.
      maybeStartRematch();
    } else {
      // Mid-match: treat the disconnect as an elimination.
      if (state.players[id]) state.players[id].alive = false;
      // (B) If only one player is left, end the game IMMEDIATELY rather than waiting out the
      // current phase timeout. This is the alive<=1 branch — distinct from the accepted
      // blind-disconnect 10s timeout (which only applies while >1 players remain).
      if (aliveIds(state).length <= 1) {
        finishRound(state, null, log);
      }
    }

    // (D) Once the last connection is gone, stop the loop and drop the room so its code is
    // free to host a brand-new match (fixes the "match already started" lock on reuse).
    if (conns.size === 0) {
      if (loop) loop.stop();
      onEmpty?.();
    }
  }

  function startMatch() {
    started = true;
    console.log(`[room ${code}] match starting with ${conns.size} players`);
    loop = createGameLoop(room);
    room.loop = loop;
    loop.start();
  }

  // Called by index.js once a connection has sent a valid JOIN for this room code.
  room.addConnection = function addConnection(ws) {
    if (started) {
      safeSend(ws, { type: ServerMessageType.ERROR, msg: "match already started" });
      ws.close();
      return;
    }
    const id = "P" + nextPlayerNum++;
    conns.set(id, ws);
    addPlayer(state, id);
    safeSend(ws, { type: ServerMessageType.JOINED, playerId: id, roomCode: code });
    broadcastRaw({ type: ServerMessageType.WAITING, count: conns.size, need: PLAYERS_PER_MATCH });
    console.log(`[room ${code}] ${id} joined (${conns.size}/${PLAYERS_PER_MATCH})`);

    ws.on("message", (raw) => handleMessage(id, raw));
    ws.on("close", () => handleClose(id));
    // Without an 'error' listener, a socket error (e.g. ECONNRESET on an abrupt disconnect)
    // becomes an uncaught exception and crashes the whole server process. Swallow + log;
    // the paired 'close' handler still runs and cleans the player up.
    ws.on("error", (err) => console.error(`[room ${code}] ${id} socket error:`, err?.message ?? err));

    if (conns.size === PLAYERS_PER_MATCH) startMatch();
  };

  return room;
}
