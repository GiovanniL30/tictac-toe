export class GameStorage {
  static scores = {};

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
    localStorage.setItem(this.getSpectatorsKey(roomKey), JSON.stringify(spectators));
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

    const spectators = this.getSpectators(roomKey).filter((s) => now - s.lastSeen < maxAgeMs);

    if (spectators.length !== this.getSpectators(roomKey).length) {
      this.saveSpectators(roomKey, spectators);
    }

    return spectators.length;
  }

  static removeRoom(roomKey) {
    this.removePlayers(roomKey);
    this.removeScores(roomKey);
    localStorage.removeItem(this.getSpectatorsKey(roomKey));
  }
}
