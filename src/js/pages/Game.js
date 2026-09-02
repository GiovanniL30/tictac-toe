import { GameStorage } from "../state/GameStorage.js";
import { Mascot } from "../components/Mascot.js";
import { Board } from "../components/Board.js";
import { Poller } from "../utils/Poller.js";
import { loadSvg } from "../utils/svg.js";
import { PLAYER_ROLE } from "../utils/constants/PlayerRoles.js";

export class Game {
  constructor(props = {}) {
    this.props = props;

    this.board = new Board({
      player: this.props.player,
      onCellClick: this.props.onCellClick,
      onMoveStart: () => this.handleMoveStart(),
      onMoveEnd: () => this.handleMoveEnd(),
    });

    this.poller = new Poller(() => this.checkBoard(), 500);
    this.storageListener = null;

    this.playerTurn = null;
    this.scoreboard = null;
    this.spectatorsElement = null;
    this.currentTurn = null;

    this.gameOver = false;
    this.lastWinner = null;
    this.gameStarted = false;
    this.quitting = false;

    this.checkingBoard = false;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("game-room-container");

    const playerTurn = this.generatePlayerTurn();
    const scoreboard = this.generateScoreBoard();
    const gameBoard = this.board.render();
    const roomKey = this.generateGameKeyTag();

    this.playerTurn = playerTurn;
    this.scoreboard = scoreboard;

    const topbar = this.generateTopbar(roomKey, this.createQuitButton());

    container.append(topbar, scoreboard, playerTurn, gameBoard);

    if (this.props.player === PLAYER_ROLE.SPECTATOR) {
      const spectator = this.generateSpectatorBanner();
      container.append(spectator);
    }

    this.startStorageListener();
    this.startPolling();

    return container;
  }

  // GAME KEY
  generateGameKeyTag() {
    const container = document.createElement("div");
    container.classList.add("room-tag");

    const dot = document.createElement("div");
    dot.classList.add("dot");

    const p = document.createElement("p");
    p.textContent = "Room " + this.props.key;

    container.append(dot, p);

    return container;
  }

  generateTopbar(roomTag, quitButton) {
    const topbar = document.createElement("div");
    topbar.classList.add("game-topbar");

    topbar.append(roomTag, quitButton);

    return topbar;
  }

  createQuitButton() {
    const label = this.props.player === PLAYER_ROLE.SPECTATOR ? "Stop Spectating" : "Quit Game";

    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("quit-btn");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);

    loadSvg("./src/assets/icons/quit.svg").then((svg) => {
      button.innerHTML = svg;
    });

    button.addEventListener("click", this.props.onQuit);

    return button;
  }

  // SPECTATOR BANNER
  generateSpectatorBanner() {
    const container = document.createElement("div");
    container.classList.add("spectator-banner");
    container.textContent = "You're spectating, sit back and enjoy the match";

    return container;
  }

  // SCOREBOARD
  generateScoreBoard() {
    const container = document.createElement("div");
    container.classList.add("scoreboard");

    const vsBadge = document.createElement("div");
    vsBadge.classList.add("vs-badge");
    vsBadge.textContent = "vs";

    const players = GameStorage.getPlayers(this.props.key);
    const scores = GameStorage.getScores(this.props.key);
    const streaks = GameStorage.getStreaks(this.props.key);

    const order = this.props.player === PLAYER_ROLE.O ? [PLAYER_ROLE.O, PLAYER_ROLE.X] : [PLAYER_ROLE.X, PLAYER_ROLE.O];

    order.forEach((player, i) => {
      const card = document.createElement("div");
      card.classList.add("score-card");

      const chip = document.createElement("span");
      chip.classList.add("chip", player.toLowerCase());
      chip.textContent = player;

      const scoreInfo = document.createElement("div");
      scoreInfo.classList.add("score-info");

      const name = document.createElement("span");
      name.classList.add("name");
      let playerName = players[player] ?? `Player ${order[i]}`;

      if (this.props.player === player) {
        playerName += " (You)";
        name.classList.add("bold");
      }

      name.textContent = playerName;

      const wins = document.createElement("span");
      wins.classList.add("wins");
      wins.textContent = scores[player] ?? 0;

      scoreInfo.append(name, wins);

      card.append(chip, scoreInfo);

      const badge = this.createStreakBadge(streaks[player] ?? 0);
      if (badge) {
        card.append(badge);
      }

      container.append(card);

      if (i === 0) {
        container.append(vsBadge);
      }
    });

    return container;
  }

  refreshScoreBoard() {
    const newScoreboard = this.generateScoreBoard();
    this.scoreboard.replaceWith(newScoreboard);

    this.scoreboard = newScoreboard;
  }

  createStreakBadge(streak) {
    if (streak < 2) {
      return null;
    }

    const badge = document.createElement("div");
    badge.classList.add("streak-badge", "pop");
    if (streak >= 3) {
      badge.classList.add("hot");
    }

    const flame = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    flame.setAttribute("class", "flame");
    flame.setAttribute("viewBox", "0 0 24 24");
    flame.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 2c1 3-2 4-2 7a4 4 0 108 0c0-1-1-2-1-2 2 1 3 3 3 5a6 6 0 11-12 0c0-4 3-5 4-10z");
    path.setAttribute("fill", "currentColor");
    flame.append(path);

    badge.append(flame, document.createTextNode(streak));
    return badge;
  }

  //PLAYER TURN
  generatePlayerTurn() {
    const container = document.createElement("div");
    container.classList.add("turn-indicator");

    const catSlot = document.createElement("div");
    const dogSlot = document.createElement("div");

    // Current player is always on the left (spectator defaults to X on the left)
    const flipped = this.props.player === PLAYER_ROLE.O;

    catSlot.classList.add(flipped ? "side-right" : "side-left");
    dogSlot.classList.add(flipped ? "side-left" : "side-right");

    Mascot.mount(catSlot, "cat");
    Mascot.mount(dogSlot, "dog");

    this.mascotX = catSlot;
    this.mascotO = dogSlot;

    const text = document.createElement("span");
    text.classList.add("turn-text");
    this.playerTurnText = text;

    if (this.props.player === PLAYER_ROLE.O) {
      container.append(dogSlot, text, catSlot);
    } else {
      container.append(catSlot, text, dogSlot);
    }

    return container;
  }

  updatePlayerTurn(currentTurn) {
    const players = GameStorage.getPlayers(this.props.key);
    const playerName = players[currentTurn] ?? `Player ${currentTurn}`;

    this.playerTurn.className = "turn-indicator";
    this.playerTurn.classList.add(currentTurn.toLowerCase());

    // Game is over
    if (this.gameOver) {
      Mascot.setTurn(this.mascotX, null);
      Mascot.setTurn(this.mascotO, null);

      if (this.lastWinner === "DRAW") {
        this.playerTurnText.textContent = "It's a draw!";
      } else if (this.lastWinner === this.props.player) {
        this.playerTurnText.textContent = "You win!";
      } else {
        this.playerTurnText.textContent = `${playerName} wins!`;
      }

      return;
    }

    // Spectator
    if (this.props.player === PLAYER_ROLE.SPECTATOR) {
      Mascot.setTurn(this.mascotX, currentTurn === PLAYER_ROLE.X ? "on" : "off");
      Mascot.setTurn(this.mascotO, currentTurn === PLAYER_ROLE.O ? "on" : "off");

      this.playerTurnText.textContent = `${playerName}'s turn`;

      return;
    }

    // Move is still being registered
    if (this.board.moveInFlight) {
      Mascot.setTurn(this.mascotX, currentTurn === PLAYER_ROLE.X ? "on" : "off");
      Mascot.setTurn(this.mascotO, currentTurn === PLAYER_ROLE.O ? "on" : "off");

      this.playerTurnText.textContent = "Registering your move…";

      return;
    }

    const isMyTurn = currentTurn === this.props.player;

    Mascot.setTurn(this.mascotX, currentTurn === PLAYER_ROLE.X ? "on" : "off");
    Mascot.setTurn(this.mascotO, currentTurn === PLAYER_ROLE.O ? "on" : "off");

    this.playerTurnText.textContent = isMyTurn ? "Your turn" : `Waiting for ${playerName}'s move`;
  }

  refreshTurnState() {
    const isMyTurn = this.props.player === this.currentTurn && !this.board.moveInFlight;

    this.board.setHighlight(isMyTurn, this.currentTurn);
    this.updatePlayerTurn(this.currentTurn);
  }

  handleMoveStart() {
    this.refreshTurnState();
  }

  handleMoveEnd() {
    this.refreshTurnState();
  }

  // BOARD SYNC
  updateBoard(response) {
    const { board, currentTurn, winner, lastFilled } = this.board.update(response, {
      player: this.props.player,
      gameOver: this.gameOver,
    });

    this.currentTurn = currentTurn;

    this.props.onTurnChange(currentTurn);

    if (winner && !this.gameOver) {
      this.handleGameEnd(winner);
    }

    if (!winner && this.gameOver) {
      this.gameOver = false;
      this.lastWinner = null;
    }

    this.refreshTurnState();

    if (lastFilled && !this.gameOver) {
      const host = lastFilled === PLAYER_ROLE.X ? this.mascotX : this.mascotO;
      Mascot.place(host);
    }
  }

  handleGameEnd(winner) {
    this.gameOver = true;
    this.lastWinner = winner;
    this.board.lock();

    if (winner !== "DRAW") {
      const loser = winner === PLAYER_ROLE.X ? PLAYER_ROLE.O : PLAYER_ROLE.X;

      GameStorage.incrementWin(this.props.key, winner);
      GameStorage.incrementStreak(this.props.key, winner);
      GameStorage.resetStreak(this.props.key, loser);

      this.refreshScoreBoard();
    }

    if (winner === "DRAW") {
      Mascot.setResult(this.mascotX, "stare");
      Mascot.setResult(this.mascotO, "stare");
    } else {
      Mascot.setResult(winner === PLAYER_ROLE.X ? this.mascotX : this.mascotO, "slap");
      Mascot.setResult(winner === PLAYER_ROLE.X ? this.mascotO : this.mascotX, "cry");
    }

    this.destroy();
    this.props.onGameEnd(winner, this);
  }

  // POLLING
  startPolling() {
    this.checkBoard();
    this.poller.start();
  }

  stopPolling() {
    this.poller.stop();
  }

  async checkBoard() {
    if (this.checkingBoard) {
      return;
    }

    this.checkingBoard = true;

    try {
      const response = await this.props.onCheckBoard();
      this.updateBoard(response);
    } catch (error) {
      console.error("Failed to synchronize board:", error);
    } finally {
      this.checkingBoard = false;
    }
  }

  // LOCAL STORAGE SYNC
  startStorageListener() {
    this.storageListener = (event) => {
      if (event.key === GameStorage.getPlayersKey(this.props.key)) {
        this.refreshScoreBoard();
      }
    };

    window.addEventListener("storage", this.storageListener);
  }

  stopStorageListener() {
    if (this.storageListener) {
      window.removeEventListener("storage", this.storageListener);

      this.storageListener = null;
    }
  }

  //CLEAN UP
  destroy() {
    this.stopPolling();
    this.stopStorageListener();
  }
}
