export class GameState {
  static PAGE_STATES = {
    HOME: "home",
    WAITING_ROOM: "waiting-room",
    JOIN_ROOM: "join-room",
    CREATE_ROOM: "create-room",
    GAME_START: "game-start",
    SPECTATOR: "spectator",
  };

  constructor() {
    this.key = null;
    this.playerCode = null;
    this.playerName = null;
    this.spectatorId = null;
    this.pageState = GameState.PAGE_STATES.HOME;
  }

  saveSession() {
    sessionStorage.setItem(
      "tictactoe-session",
      JSON.stringify({
        key: this.key,
        player: this.playerCode,
        playerName: this.playerName,
      }),
    );
  }

  restoreSession() {
    const session = sessionStorage.getItem("tictactoe-session");

    if (!session) {
      return false;
    }

    const data = JSON.parse(session);

    this.key = data.key;
    this.playerCode = data.player;
    this.playerName = data.playerName;

    return true;
  }

  clearSession() {
    sessionStorage.removeItem("tictactoe-session");

    this.key = null;
    this.playerCode = null;
  }

  clearData() {
    this.key = null;
    this.playerCode = null;
    this.playerName = null;
    this.spectatorId = null;
    this.pageState = GameState.PAGE_STATES.HOME;
  }
}
