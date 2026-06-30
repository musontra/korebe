// TEMPORARY Phase 1 test harness — NOT the real game client.
// Connects 3 bot players over WebSocket so a full match can be watched in the server terminal.
// Bots move randomly during MovementPhase; the blind bot aims at a live opponent in ShootingPhase
// (deliberate aiming so hit detection reliably fires and we can observe elimination -> GameEnd).
import WebSocket from "ws";

const URL = process.env.URL || "ws://localhost:8080";
const CODE = process.env.CODE || "TEST";

function makeBot(name) {
  const ws = new WebSocket(URL);
  let myId = null;
  let hasShot = false;

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "JOIN", code: CODE }));
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "JOINED") {
      myId = msg.playerId;
      console.log(`[bot ${name}] joined as ${myId}`);
      return;
    }

    if (msg.type !== "SNAPSHOT") return;

    if (msg.phase === "MovementPhase") {
      hasShot = false;
      const a = Math.random() * Math.PI * 2;
      ws.send(JSON.stringify({ type: "INPUT", dx: Math.cos(a), dy: Math.sin(a) }));
    } else if (msg.phase === "ShootingPhase" && msg.you.isBlind && !hasShot) {
      // Aim straight at the first live opponent.
      const me = msg.players[myId];
      const targetId = Object.keys(msg.players).find(
        (id) => id !== myId && msg.players[id].alive
      );
      if (me && targetId) {
        const t = msg.players[targetId];
        ws.send(JSON.stringify({ type: "SHOOT", dx: t.pos.x - me.pos.x, dy: t.pos.y - me.pos.y }));
        hasShot = true;
      }
    }
  });

  ws.on("close", () => console.log(`[bot ${name}] closed`));
  ws.on("error", (e) => console.log(`[bot ${name}] error: ${e.message}`));
  return ws;
}

makeBot("A");
makeBot("B");
makeBot("C");
