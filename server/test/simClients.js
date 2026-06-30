// TEMPORARY Phase 1 test harness — NOT the real game client.
// DETERMINISTIC wall-aiming mode to verify the bounce/reflection path:
//   - Bots stand still during MovementPhase, so positions stay fixed (2-player reset = (500,200) & (500,800)).
//   - 3-player round (maxBounces=1): blind aims straight at the opponent to force an elimination -> 2 players.
//   - 2-player round (maxBounces=3), shot #1: blind fires HORIZONTALLY. The opponent is vertically aligned,
//       so the bullet misses and bounces left/right 3 times, then vanishes (bounce budget exhausted).
//   - 2-player round (maxBounces=3), shot #2: blind fires AWAY from the opponent (straight up/down). The bullet
//       bounces off that wall once and comes straight back into the opponent -> hit after a bounce -> GameEnd.
import WebSocket from "ws";

const URL = process.env.URL || "ws://localhost:8080";
const CODE = process.env.CODE || "BOUNCE";

// Shared across the 3 bots in this process: how many 2-player (maxBounces=3) shots have been fired so far.
let twoPlayerShots = 0;

function makeBot(name) {
  const ws = new WebSocket(URL);
  let myId = null;
  let hasShot = false;

  ws.on("open", () => ws.send(JSON.stringify({ type: "JOIN", code: CODE })));

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
      hasShot = false; // stand still: send no INPUT so positions stay deterministic
      return;
    }

    if (msg.phase === "ShootingPhase" && msg.you.isBlind && !hasShot) {
      const me = msg.players[myId];
      const oppId = Object.keys(msg.players).find((id) => id !== myId && msg.players[id].alive);
      if (!me || !oppId) return;
      const opp = msg.players[oppId];

      let dx;
      let dy;
      if (msg.maxBounces === 1) {
        // 3-player round: straight aim, force an elimination to reach the 2-player rounds.
        dx = opp.pos.x - me.pos.x;
        dy = opp.pos.y - me.pos.y;
        console.log(`[bot ${name}] (${myId}) 3p straight aim at ${oppId}`);
      } else if (twoPlayerShots === 0) {
        // 2-player round, miss case: horizontal shot, opponent is vertically aligned -> 3 bounces then gone.
        dx = 1;
        dy = 0;
        twoPlayerShots++;
        console.log(`[bot ${name}] (${myId}) 2p WALL-MISS shot (horizontal)`);
      } else {
        // 2-player round, hit-after-bounce: fire away from opponent so it bounces back into them.
        dx = me.pos.x - opp.pos.x;
        dy = me.pos.y - opp.pos.y;
        twoPlayerShots++;
        console.log(`[bot ${name}] (${myId}) 2p WALL-HIT shot (away from ${oppId})`);
      }

      ws.send(JSON.stringify({ type: "SHOOT", dx, dy }));
      hasShot = true;
    }
  });

  ws.on("close", () => console.log(`[bot ${name}] closed`));
  ws.on("error", (e) => console.log(`[bot ${name}] error: ${e.message}`));
  return ws;
}

makeBot("A");
makeBot("B");
makeBot("C");
