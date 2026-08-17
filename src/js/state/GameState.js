export class GameState {
  static PAGE_STATES = {
    HOME: "home",
    WAITING_ROOM: "waiting-room",
    JOIN_ROOM: "join-room",
    CREATE_ROOM: "create-room",
    GAME_START: "game-start",
    SPECTATOR: "spectator",
  };

  static PLAYERS = {
    X: "X",
    O: "O",
    SPECTATOR: "SPECTATOR",
  };

  constructor() {
    this.key = null;
    this.currentPlayer = null;
    this.spectatorCount = 0;
    this.pageState = GameState.PAGE_STATES.HOME;
  }

  saveSession() {
    sessionStorage.setItem(
      "tictactoe-session",
      JSON.stringify({
        key: this.key,
        player: this.currentPlayer,
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
    this.currentPlayer = data.player;

    return true;
  }

  clearSession() {
    sessionStorage.removeItem("tictactoe-session");

    this.key = null;
    this.currentPlayer = null;
  }
}
