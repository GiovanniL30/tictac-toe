import { ApiClient } from "./ApiClient.js";

export class TicTacToeWebService extends ApiClient {
  constructor() {
    super("http://localhost:8080/tictactoe-webservice/api");
  }

  /**
   * USE CASE:       Save a player's move for a game (appends a new line to the game's record file).
   *
   * HTTP:           POST /v1/game/save
   *
   * BODY (json): {
   *   "gameid":    "AAA3b01d-a5d2-44b9-bbd7-2b34a58a4167",  // UUID of the game
   *   "roomcode":  "1234",                                   // room/game code
   *   "symbol":    "O",                                     // player symbol (X or O)
   *   "location":  5,                                       // board cell index (0-8)
   *   "playerid":  "Gio",                                   // player name/id
   *   "datesave":  "2026-09-01 11:30:25"                    // move timestamp
   * }
   *
   * RETURN:         server response (HTTP result of the save operation).
   */
  saveMove(body) {
    return this.post("/v1/game/save", body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Fetch all recorded moves of a specific game by its UUID.
   *
   * HTTP:           GET /v1/game/{gameId}
   *
   * BODY:           none
   *
   * RETURN:         array of game moves (JsonObject list) for the given gameId.
   */
  listGameMoves(gameId) {
    return this.get(`/v1/game/${gameId}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       List all games a specific player participated in.
   *
   * HTTP:           GET /v1/list-games/{playerId}
   *
   * BODY:           none
   *
   * RETURN:         list of games associated with the given playerId.
   */
  listPlayerGames(playerId) {
    return this.get(`/v1/list-games/${playerId}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Retrieve every saved game/record in the system.
   *
   * HTTP:           GET /v1/games
   *
   * BODY:           none
   *
   * RETURN:         list of all games.
   */
  getAllGames() {
    return this.get("/v1/games", {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Get the list of players currently in a given room.
   *
   * HTTP:           GET /v1/data/players/{roomCode}
   *
   * BODY:           none
   *
   * RETURN:         list of players in the room identified by roomCode.
   */
  getPlayersOnTheGame(roomCode) {
    return this.get(`/v1/data/players/${roomCode}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Add a new player to a room with a chosen symbol.
   *
   * HTTP:           POST /v1/data/player/{roomCode}
   *
   * BODY (json): {
   *   "playerid": "Leo",  // player name/id
   *   "symbol":   "O"     // chosen symbol (X or O)
   * }
   *
   * RETURN:         server response (HTTP result of adding the player).
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
   * USE CASE:       Increment a player's score (typically called on a win).
   *
   * HTTP:           PATCH /v1/data/player-score/increase
   *
   * BODY (json): {
   *   "playerid": "Leo",  // player name/id
   *   "roomcode": "1234", // room/game code
   *   "symbol":   "X"     // player symbol
   * }
   *
   * RETURN:         server response (HTTP result of the score update).
   */
  addPlayerScore(body) {
    return this.patch(`/v1/data/player-score/increase`, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Delete a game by its room code.
   *
   * HTTP:           DELETE /v1/data/game/{roomCode}
   *
   * BODY:           none
   *
   * RETURN:         server response (HTTP result of the deletion).
   */
  deleteGame(roomCode) {
    return this.delete(`/v1/data/game/${roomCode}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Generate a new room key for a game.
   *
   * HTTP:           GET /v1/data/game-key/generate
   *
   * BODY:           none
   *
   * RETURN:         a generated GameKey object.
   */
  generateRoomKey() {
    return this.get("/v1/data/game-key/generate", {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Look up the game UUID that maps to a given game code.
   *
   * HTTP:           GET /v1/data/game-key/{gameCode}
   *
   * BODY:           none
   *
   * RETURN:         the room UUID associated with gameCode.
   */
  getRoomUUID(gameCode) {
    return this.get(`/v1/data/game-key/${gameCode}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Regenerate (replace) the game UUID for a room code.
   *                 Updates the stored UUID in place and returns the newly
   *                 generated UUID (does NOT remove the room/players).
   *                 USED FOR PLAY AGAIN HERE ON FRONTEND
   *
   * HTTP:           PATCH /v1/data/game-key/regenerate/{roomCode}
   *
   * BODY:           none
   *
   * RETURN:         server response containing the newly generated GameKey
   *                 (roomCode + new UUID).
   */
  regenerateGameUUID(roomCode) {
    return this.patch(`/v1/data/game-key/regenerate/${roomCode}`, undefined, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }
}
