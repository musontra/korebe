// Room registry: create/lookup match rooms by join code; maps codes to Room instances.
import { createRoom } from "./room.js";

const rooms = new Map(); // code -> room

export function getOrCreateRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    // onEmpty drops the room once its last player leaves, freeing the code for a new match.
    room = createRoom(code, () => {
      rooms.delete(code);
      console.log(`[rooms] removed empty room ${code}`);
    });
    rooms.set(code, room);
    console.log(`[rooms] created room ${code}`);
  }
  return room;
}

export function removeRoom(code) {
  rooms.delete(code);
}
