import { ApiClient } from "./ApiClient.js";

export class TicTacToeWebService extends ApiClient {
  constructor() {
    super("http://localhost:8080/tictactoe-webservice/api");
  }

  /**
   * body sample: {
    "gameid": "AAA3b01d-a5d2-44b9-bbd7-2b34a58a4167",
    "roomcode": "1234",
    "symbol": "O",
    "location": 5,
    "playerid": "Gio",
    "datesave": "2026-09-01 11:30:25"
    }
   */
  saveMove(body) {
    return this.post("/v1/game/save", body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  listGameMoves(gameId) {
    return this.get(`/v1/game/${gameId}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  listPlayerGames(playerId) {
    return this.get(`/v1/list-games/${playerId}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  getAllGames() {
    return this.get("/v1/games", {
      headers: {
        Accept: "application/json",
      },
    });
  }

  getPlayersOnTheGame(roomCode) {
    return this.get(`/v1/data/players/${roomCode}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * body sample: {
    "playerid": "Leo",
    "symbol": "O"
  }
   */
  addPlayer(body, roomCode) {
    return this.post(`/v1/data/player/${roomCode}`, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * body sample: {
    "playerid": "Leo",
    "roomcode": "1234",
    "symbol": "X"
  }
   */
  addPlayerScore(body) {
    return this.patch(`/v1/data/player-score/increase`, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  deleteGame(roomCode) {
    return this.delete(`/v1/data/game/${roomCode}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  generateRoomKey() {
    return this.get("/v1/data/game-key/generate", {
      headers: {
        Accept: "application/json",
      },
    });
  }

  getRoomUUID(gameCode) {
    return this.get(`/v1/data/game-key/${gameCode}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }
}
