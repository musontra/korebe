// A single match instance: holds connected players, owns its game loop and authoritative state.
// Buffers per-player input (latest-wins) and exposes drainInputs()/connections() to the game loop.
import { createGameState, addPlayer } from "./state/gameState.js";
import { createGameLoop } from "./gameLoop.js";
import { ClientMessageType, ServerMessageType, serialize, parse } from "./net/messages.js";
import { PLAYERS_PER_MATCH } from "./config.js";

export function createRoom(code) {
  const state = createGameState();
  const conns = new Map(); // id -> ws
  let movementInputs = {}; // id -> {dx,dy}  (consumed each tick)
  let shootInputs = {}; // id -> {dx,dy}  (consumed each tick)
  let started = false;
  let nextPlayerNum = 1;
  let loop = null;

  const room = {
    code,
    state,
    interval: null,
    connections: () => conns.entries(),
    drainInputs() {
      const movement = movementInputs;
      const shoot = shootInputs;
      movementInputs = {};
      shootInputs = {};
      return { movement, shoot };
    },
  };

  function broadcastRaw(obj) {
    for (const ws of conns.values()) ws.send(serialize(obj));
  }

  function handleMessage(id, raw) {
    const msg = parse(raw);
    if (!msg) return;
    if (msg.type === ClientMessageType.INPUT) {
      movementInputs[id] = { dx: Number(msg.dx) || 0, dy: Number(msg.dy) || 0 };
    } else if (msg.type === ClientMessageType.SHOOT) {
      shootInputs[id] = { dx: Number(msg.dx) || 0, dy: Number(msg.dy) || 0 };
    }
    // The game loop enforces phase rules (movement ignored outside MovementPhase; shoot accepted
    // only from the blind player in ShootingPhase). Buffering both here is harmless.
  }

  function handleClose(id) {
    console.log(`[room ${code}] ${id} disconnected`);
    if (state.players[id]) state.players[id].alive = false;
    conns.delete(id);
    if (conns.size === 0 && loop) loop.stop();
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
      ws.send(serialize({ type: ServerMessageType.ERROR, msg: "match already started" }));
      ws.close();
      return;
    }
    const id = "P" + nextPlayerNum++;
    conns.set(id, ws);
    addPlayer(state, id);
    ws.send(serialize({ type: ServerMessageType.JOINED, playerId: id, roomCode: code }));
    broadcastRaw({ type: ServerMessageType.WAITING, count: conns.size, need: PLAYERS_PER_MATCH });
    console.log(`[room ${code}] ${id} joined (${conns.size}/${PLAYERS_PER_MATCH})`);

    ws.on("message", (raw) => handleMessage(id, raw));
    ws.on("close", () => handleClose(id));

    if (conns.size === PLAYERS_PER_MATCH) startMatch();
  };

  return room;
}
