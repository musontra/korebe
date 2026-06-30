// Capture user input (movement direction vector, shoot command) and forward it to the net layer.
import { sendInput, sendShoot } from "./net";
import { getSnapshot, getMyId } from "./state";
import { pixelToWorld } from "./canvas";

const keys = new Set<string>();

export function startInput(canvas: HTMLCanvasElement): void {
  window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  // Click -> shoot toward the clicked world point. Always sent; the SERVER decides whether to honor it.
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const worldX = pixelToWorld(e.clientX - rect.left);
    const worldY = pixelToWorld(e.clientY - rect.top);

    const snap = getSnapshot();
    const myId = getMyId();
    if (!snap || !myId) return;
    const me = snap.players[myId];
    if (!me) return;
    sendShoot(worldX - me.pos.x, worldY - me.pos.y);
  });

  // Movement intent is sent EVERY frame (server drains its input buffer each tick).
  requestAnimationFrame(pump);
}

function pump(): void {
  let dx = 0;
  let dy = 0;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;
  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;

  const mag = Math.hypot(dx, dy);
  if (mag > 0) {
    sendInput(dx / mag, dy / mag);
  } else {
    sendInput(0, 0);
  }
  requestAnimationFrame(pump);
}
