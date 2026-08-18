export class GameStorage {
  static getPlayersKey(roomKey) {
    return `tictactoe-players-${roomKey}`;
  }

  static getScoresKey(roomKey) {
    return `tictactoe-scores-${roomKey}`;
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

  // SCORES
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

  // SPECTATORS
  static getSpectatorsKey(roomKey) {
    return `tictactoe-spectators-${roomKey}`;
  }

  static getSpectators(roomKey) {
    const data = localStorage.getItem(this.getSpectatorsKey(roomKey));

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  }

  static saveSpectators(roomKey, spectators) {
    localStorage.setItem(
      this.getSpectatorsKey(roomKey),
      JSON.stringify(spectators),
    );
  }

  static touchSpectator(roomKey, spectatorId, playerName) {
    const spectators = this.getSpectators(roomKey);
    const existing = spectators.find((s) => s.id === spectatorId);

    if (existing) {
      existing.lastSeen = Date.now();
    } else {
      spectators.push({
        id: spectatorId,
        name: playerName ?? "Spectator",
        lastSeen: Date.now(),
      });
    }

    this.saveSpectators(roomKey, spectators);

    return spectators;
  }

  static removeSpectator(roomKey, spectatorId) {
    this.saveSpectators(
      roomKey,
      this.getSpectators(roomKey).filter((s) => s.id !== spectatorId),
    );
  }

  static countSpectators(roomKey, maxAgeMs = 3000) {
    const now = Date.now();
    const spectators = this.getSpectators(roomKey).filter(
      (s) => now - s.lastSeen < maxAgeMs,
    );

    if (spectators.length !== this.getSpectators(roomKey).length) {
      this.saveSpectators(roomKey, spectators);
    }

    return spectators.length;
  }
}
