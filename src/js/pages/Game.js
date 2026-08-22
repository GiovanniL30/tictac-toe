import { GameStorage } from "../state/GameStorage.js";
import { Mascot } from "../components/Mascot.js";
import { BackButton } from "../components/BackButton.js";
import { Board } from "../components/Board.js";
import { Poller } from "../utils/Poller.js";

export class Game {
  constructor(props = {}) {
    this.props = props;

    this.board = new Board({
      player: this.props.player,
      onCellClick: this.props.onCellClick,
    });

    this.poller = new Poller(() => this.checkBoard(), 500);
    this.storageListener = null;

    this.playerTurn = null;
    this.scoreboard = null;
    this.spectatorsElement = null;

    this.gameOver = false;
    this.lastWinner = null;
    this.gameStarted = false;
    this.quitting = false;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("game-room-container");

    const playerTurn = this.generatePlayerTurn();
    const scoreboard = this.generateScoreBoard();
    const gameBoard = this.board.render();
    const roomKey = this.generateGameKeyTag();

    const quitGame = new BackButton(this.props.onQuit, this.props.player === "spectator" ? "Stop Spectating" : "Quit Game");

    this.playerTurn = playerTurn;
    this.scoreboard = scoreboard;

    const topbar = this.generateTopbar(roomKey);

    container.append(topbar, scoreboard, playerTurn, gameBoard, quitGame.element);

    if (this.props.player === "spectator") {
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

  generateTopbar(roomTag) {
    const topbar = document.createElement("div");
    topbar.classList.add("game-topbar");

    topbar.append(roomTag);

    return topbar;
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

    const order = this.props.player === "O" ? ["O", "X"] : ["X", "O"];

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

  //PLAYER TURN
  generatePlayerTurn() {
    const container = document.createElement("div");
    container.classList.add("turn-indicator");

    const catSlot = document.createElement("div");
    const dogSlot = document.createElement("div");

    // Current player is always on the left (spectator defaults to X on the left)
    const flipped = this.props.player === "O";

    catSlot.classList.add(flipped ? "side-right" : "side-left");
    dogSlot.classList.add(flipped ? "side-left" : "side-right");

    Mascot.mount(catSlot, "cat");
    Mascot.mount(dogSlot, "dog");

    this.mascotX = catSlot;
    this.mascotO = dogSlot;

    const text = document.createElement("span");
    text.classList.add("turn-text");
    this.playerTurnText = text;

    if (this.props.player === "O") {
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
    if (this.props.player === "spectator") {
      Mascot.setTurn(this.mascotX, currentTurn === "X" ? "on" : "off");
      Mascot.setTurn(this.mascotO, currentTurn === "O" ? "on" : "off");

      this.playerTurnText.textContent = `${playerName}'s turn`;

      return;
    }

    const isMyTurn = currentTurn === this.props.player;

    Mascot.setTurn(this.mascotX, currentTurn === "X" ? "on" : "off");
    Mascot.setTurn(this.mascotO, currentTurn === "O" ? "on" : "off");

    this.playerTurnText.textContent = isMyTurn ? "Your turn" : `Waiting for ${playerName}'s move`;
  }

  // BOARD SYNC
  updateBoard(response) {
    const { board, currentTurn, winner, lastFilled } = this.board.update(response, {
      player: this.props.player,
      gameOver: this.gameOver,
    });

    this.props.onTurnChange(currentTurn);

    this.board.setHighlight(this.props.player === currentTurn, currentTurn);

    if (winner && !this.gameOver) {
      this.handleGameEnd(winner);
    }

    if (!winner && this.gameOver) {
      this.gameOver = false;
      this.lastWinner = null;
    }

    this.updatePlayerTurn(currentTurn);

    if (lastFilled && !this.gameOver) {
      const host = lastFilled === "X" ? this.mascotX : this.mascotO;
      Mascot.place(host);
    }
  }

  handleGameEnd(winner) {
    this.gameOver = true;
    this.lastWinner = winner;
    this.board.lock();

    if (winner !== "DRAW") {
      this.refreshScoreBoard();

      GameStorage.incrementWin(this.props.key, winner);
    }

    if (winner === "DRAW") {
      Mascot.setResult(this.mascotX, "stare");
      Mascot.setResult(this.mascotO, "stare");
    } else {
      Mascot.setResult(winner === "X" ? this.mascotX : this.mascotO, "slap");
      Mascot.setResult(winner === "X" ? this.mascotO : this.mascotX, "cry");
    }

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
    try {
      const response = await this.props.onCheckBoard();

      this.updateBoard(response);
      this.updateSpectatorCount();
    } catch (error) {
      console.error("Failed to synchronize board:", error);
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
