export class GameStorage {
  static scores = {};
  static streaks = {};

  static getPlayersKey(roomKey) {
    return `tictactoe-players-${roomKey}`;
  }

  // PLAYERS
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

  static savePlayers(roomKey, players) {
    localStorage.setItem(this.getPlayersKey(roomKey), JSON.stringify(players));
  }

  // SCORES - MEMORY ONLY
  static createScores(roomKey) {
    this.scores[roomKey] = {
      X: 0,
      O: 0,
    };

    return this.scores[roomKey];
  }

  static getScores(roomKey) {
    if (!this.scores[roomKey]) {
      this.createScores(roomKey);
    }

    return this.scores[roomKey];
  }

  static incrementWin(roomKey, player) {
    if (player !== "X" && player !== "O") {
      return;
    }

    const scores = this.getScores(roomKey);

    scores[player]++;

    return scores;
  }

  static removeScores(roomKey) {
    delete this.scores[roomKey];
  }

  // STREAKS - MEMORY ONLY
  static createStreaks(roomKey) {
    this.streaks[roomKey] = {
      X: 0,
      O: 0,
    };

    return this.streaks[roomKey];
  }

  static getStreaks(roomKey) {
    if (!this.streaks[roomKey]) {
      this.createStreaks(roomKey);
    }

    return this.streaks[roomKey];
  }

  static incrementStreak(roomKey, player) {
    if (player !== "X" && player !== "O") {
      return;
    }

    const streaks = this.getStreaks(roomKey);

    streaks[player]++;

    return streaks;
  }

  static resetStreak(roomKey, player) {
    if (player !== "X" && player !== "O") {
      return;
    }

    const streaks = this.getStreaks(roomKey);

    streaks[player] = 0;

    return streaks;
  }

  static removeStreaks(roomKey) {
    delete this.streaks[roomKey];
  }

  static removeRoom(roomKey) {
    this.removePlayers(roomKey);
    this.removeScores(roomKey);
    this.removeStreaks(roomKey);
  }
}
