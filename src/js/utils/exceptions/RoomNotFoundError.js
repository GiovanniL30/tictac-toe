export class RoomNotFoundError extends Error {
  constructor(message = "Room not found.") {
    super(message);
    this.name = "RoomNotFoundError";
  }
}
