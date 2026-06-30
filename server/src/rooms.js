// Room registry: create/lookup match rooms by join code; maps codes to Room instances.
import { createRoom } from "./room.js";

const rooms = new Map(); // code -> room

export function getOrCreateRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    room = createRoom(code);
    rooms.set(code, room);
    console.log(`[rooms] created room ${code}`);
  }
  return room;
}

export function removeRoom(code) {
  rooms.delete(code);
}
