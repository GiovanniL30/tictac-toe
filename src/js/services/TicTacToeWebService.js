import { ApiClient } from "./ApiClient.js";

export class TicTacToeWebService extends ApiClient {
  constructor() {
    super("http://localhost:8080/tictactoe-webservice-1.0/api");
  }

  saveMove(body) {
    return this.post("/v1/game/save", body);
  }

  listGameMoves(gameId) {
    return this.get(`/v1/game/${gameId}`);
  }

  listPlayerGames(playerId) {
    return this.get(`/v1/list-games/${playerId}`);
  }
}
