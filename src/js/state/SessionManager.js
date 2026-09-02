import { PLAYER_ROLE } from "../utils/constants/PlayerRoles.js";

export class SessionManager {
  constructor(context) {
    this.context = context;
    this.pageExitHandler = null;
  }

  saveNewRoom(key, gameId, playerCode, playerName) {
    this.context.gameState.key = key;
    this.context.gameState.gameId = gameId;
    this.context.gameState.playerCode = playerCode;
    this.context.gameState.playerName = playerName;
  }

  saveJoinedRoom(key, gameId, playerName, playerCode) {
    this.context.gameState.key = key;
    this.context.gameState.gameId = gameId;
    this.context.gameState.playerName = playerName;
    this.context.gameState.playerCode = playerCode;
  }

  clearRoomAndSession() {
    this.context.gameState.clearSession();
  }

  registerPageExit() {
    this.pageExitHandler = () => {
      const { playerCode, key } = this.context.gameState;

      if (playerCode !== PLAYER_ROLE.X && playerCode !== PLAYER_ROLE.O) {
        return;
      }

      console.log("Register page exit");
      this.context.api
        .resetGame(key, { keepalive: true })
        .catch((e) => console.error("Exit reset failed:", e));
      this.context.gameState.clearSession();
    };

    window.addEventListener("pagehide", this.pageExitHandler);
    window.addEventListener("beforeunload", this.pageExitHandler);
  }

  deregisterPageExit() {
    window.removeEventListener("pagehide", this.pageExitHandler);
    window.removeEventListener("beforeunload", this.pageExitHandler);

    this.pageExitHandler = null;
  }
}
