import { ApiClient } from "./ApiClient.js";

export class TicTacToeWebService extends ApiClient {
  constructor() {
    super("http://localhost:8080/tictactoe-webservice/api");
  }

  /**
   * USE CASE:       Save a player's move for a game (appends a new line to the game's record file).
   *
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
   * RESPONSE (json): {
   *   "msg": "Record saved."
   * }
   */
  saveMove(body) {
    return this.post("/game/save", body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Fetch all recorded moves of a specific game by its UUID.
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":  "Records found",
   *   "list": [
   *     {
   *       "id":        "AAA3b01d-a5d2-44b9-bbd7-2b34a58a4167",  // game UUID
   *       "playerid":  "Gio",                                   // player name/id
   *       "symbol":    "O",                                     // player symbol
   *       "location":  "5",                                     // board cell (string)
   *       "datasaved": "2026-09-01 11:30:25"                    // move timestamp
   *     }
   *   ]
   * }
   */
  listGameMoves(gameId) {
    return this.get(`/game/${gameId}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       List all games a specific player participated in.
   *
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":  "Records found",
   *   "list": [
   *     {
   *       "id": "AAA3b01d-a5d2-44b9-bbd7-2b34a58a4167"  // game UUID the player joined
   *     }
   *   ]
   * }
   */
  listPlayerGames(playerId) {
    return this.get(`/player/${playerId}/games`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Retrieve every saved game/record grouped by room.
   *
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":  "Records found",
   *   "list": [
   *     {
   *       "roomcode":  "1234",
   *       "gamecount": 2,
   *       "games": [
   *         { "gameid": "AAA3b01d-a5d2-44b9-bbd7-2b34a58a4167" }
   *       ]
   *     }
   *   ]
   * }
   */
  getAllGames() {
    return this.get("/game/list", {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Retrieve every saved players/record containing all games they have played.
   *
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":  "Records found",
   *   "players": [
   *   {
   *         "playerid": "123",
   *         "games": [
   *            {
   *                "gameid": "417fe8a6-6658-4c9e-9d95-981535b12511",
   *                "roomcode": "TLO6"
   *            }
   *         ]
   *     },
   *   ]
   * }
   */
  getAllPlayersPlayedGames() {
    return this.get("/game/players", {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Get the list of players currently in a given room.
   *
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":     "Players found.",
   *   "players": [
   *     {
   *       "playerid":     "Leo",
   *       "score":        0,
   *       "streakCount":  0,
   *       "symbol":       "O"
   *     }
   *   ]
   * }
   */
  getPlayersOnTheGame(roomCode) {
    return this.get(`/data/players/${roomCode}`, {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Add a new player to a room with a chosen symbol.
   *
   *
   * BODY (json): {
   *   "playerid": "Leo",  // player name/id
   *   "symbol":   "O"     // chosen symbol (X or O)
   * }
   *
   * RESPONSE (json): {
   *   "msg":     "Player added.",
   *   "players": [
   *     {
   *       "playerid":     "Leo",
   *       "score":        0,
   *       "streakCount":  0,
   *       "symbol":       "O"
   *     }
   *   ]
   * }
   */
  addPlayer(body, roomCode) {
    return this.post(`/data/player/${roomCode}`, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Increment a player's score (typically called on a win).
   *
   *
   * BODY (json): {
   *   "playerid": "Leo",  // player name/id
   *   "roomcode": "1234", // room/game code
   *   "symbol":   "X"     // player symbol
   * }
   *
   * RESPONSE (json): {
   *   "msg":           "Player score increased successfully.",
   *   "updatedPlayer": {
   *     "playerid":     "Leo",
   *     "score":        1,
   *     "streakCount":  0,
   *     "symbol":       "X"
   *   }
   * }
   */
  addPlayerScore(body) {
    return this.patch(`/data/player-score/increase`, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Delete a game by its room code.
   *
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":     "Game data deleted.",
   *   "players": [
   *     {
   *       "playerid":     "Leo",
   *       "score":        0,
   *       "streakCount":  0,
   *       "symbol":       "O"
   *     }
   *   ]
   * }
   */
  deleteGame(roomCode) {
    return this.delete(`/data/game/${roomCode}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Generate a new room key for a game.
   *
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":     "Generated Room Keys.",
   *   "gameKey": {
   *     "roomCode": "1234",
   *     "gameId":   "AAA3b01d-a5d2-44b9-bbd7-2b34a58a4167"
   *   }
   * }
   */
  generateRoomKey() {
    return this.get("/data/game-key/generate", {
      headers: {
        Accept: "application/json",
      },
    });
  }

  /**
   * USE CASE:       Look up the game UUID that maps to a given game code.
   *
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":     "Room Keys",
   *   "gameKey": {
   *     "roomCode": "1234",
   *     "gameId":   "AAA3b01d-a5d2-44b9-bbd7-2b34a58a4167"
   *   }
   * }
   */
  getRoomUUID(gameCode) {
    return this.get(`/data/game-key/${gameCode}`, {
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
   *
   * BODY:           none
   *
   * RESPONSE (json): {
   *   "msg":     "Game UUID regenerated.",
   *   "gameKey": {
   *     "roomCode": "1234",
   *     "gameId":   "NEW-UUID-gnerated-here"  // freshly generated UUID
   *   }
   * }
   */
  regenerateGameUUID(roomCode) {
    return this.patch(`/data/game-key/regenerate/${roomCode}`, undefined, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }
}
