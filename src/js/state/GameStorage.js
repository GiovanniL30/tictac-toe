export class GameStorage {
  static getPlayersKey(roomKey) {
    return `tictactoe-players-${roomKey}`;
  }

  static getScoresKey(roomKey) {
    return `tictactoe-scores-${roomKey}`;
  }

  static createPlayers(roomKey, playerName, player) {
    const players = {
      X: null,
      O: null,
    };

    players[player] = playerName;

    localStorage.setItem(this.getPlayersKey(roomKey), JSON.stringify(players));

    this.createScores(roomKey);

    return players;
  }

  static setPlayer(roomKey, playerName, player) {
    const players = this.getPlayers(roomKey);

    if (player !== "X" && player !== "O") {
      return players;
    }

    players[player] = playerName;

    localStorage.setItem(this.getPlayersKey(roomKey), JSON.stringify(players));

    return players;
  }

  static getPlayers(roomKey) {
    const data = localStorage.getItem(this.getPlayersKey(roomKey));

    if (!data) {
      return {
        X: null,
        O: null,
      };
    }

    return JSON.parse(data);
  }

  static removePlayers(roomKey) {
    localStorage.removeItem(this.getPlayersKey(roomKey));
  }

  // -----------------------------
  // SCORES
  // -----------------------------

  static createScores(roomKey) {
    const scores = {
      X: 0,
      O: 0,
    };

    localStorage.setItem(this.getScoresKey(roomKey), JSON.stringify(scores));

    return scores;
  }

  static getScores(roomKey) {
    const data = localStorage.getItem(this.getScoresKey(roomKey));

    if (!data) {
      return {
        X: 0,
        O: 0,
      };
    }

    return JSON.parse(data);
  }

  static incrementWin(roomKey, player) {
    if (player !== "X" && player !== "O") {
      return;
    }

    const scores = this.getScores(roomKey);

    scores[player]++;

    localStorage.setItem(this.getScoresKey(roomKey), JSON.stringify(scores));

    return scores;
  }

  static removeScores(roomKey) {
    localStorage.removeItem(this.getScoresKey(roomKey));
  }

  static savePlayers(roomKey, players) {
    localStorage.setItem(this.getPlayersKey(roomKey), JSON.stringify(players));
  }
}
