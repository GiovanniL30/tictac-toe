export class GameState {
  static PAGE_STATES = {
    HOME: "home",
    WAITING_ROOM: "waiting-room",
    JOIN_ROOM: "join-room",
    CREATE_ROOM: "create-room",
    GAME_START: "game-start",
    SPECTATOR: "spectator",
    HISTORY_ROOMS: "history-rooms",
    HISTORY_GAMES: "history-games",
    HISTORY_REPLAY: "history-replay",
  };

  constructor() {
    this.key = null;
    this.gameId = null;
    this.playerCode = null;
    this.playerName = null;
    this.spectatorId = null;
    this.pageState = GameState.PAGE_STATES.HOME;
  }

  clearSession() {
    this.clearData();
  }

  clearData() {
    this.key = null;
    this.gameId = null;
    this.playerCode = null;
    this.playerName = null;
    this.spectatorId = null;
    this.pageState = GameState.PAGE_STATES.HOME;
  }
}
