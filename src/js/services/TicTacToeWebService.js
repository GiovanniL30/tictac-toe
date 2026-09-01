import { ApiClient } from "./ApiClient.js";

export class TicTacToeWebService extends ApiClient {
  constructor() {
    super("http://localhost:8080/tictactoe-webservice-1.0/api");
  }

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
}
