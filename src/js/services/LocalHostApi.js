import { ApiClient } from "./ApiClient.js";

export class LocalHostApi extends ApiClient {
  constructor() {
    super("http://localhost:8080/tictactoe/tictactoeserver");
  }

  createGame(key) {
    return this.get(`/createGame?key=${key}`);
  }

  addMove({ key, tile, y, x }) {
    return this.get(`/move?key=${key}&tile=${tile}&y=${y}&x=${x}`);
  }

  resetGame(key) {
    return this.get(`/reset?key=${key}`);
  }

  checkGameStatus(key) {
    return this.get(`/check?key=${key}`);
  }

  checkBoardStatus(key) {
    return this.get(`/board?key=${key}`);
  }
}
