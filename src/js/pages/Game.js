import { GameStorage } from "../state/GameStorage.js";
import { Mascot } from "../components/Mascot.js";
import { Button } from "../components/Button.js";
import { BackButton } from "../components/BackButton.js";

export class Game {
  constructor(props = {}) {
    this.props = props;

    this.currentBoardState = null;

    this.polling = null;
    this.storageListener = null;

    this.playerTurn = null;
    this.scoreboard = null;
    this.boardContainer = null;
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
    const gameBoard = this.generateBoard();
    const roomKey = this.generateGameKeyTag();
    const spectators = this.generateSpectatorsBadge();

    const quitGame = new BackButton(
      this.props.onQuit,
      this.props.player === "spectator" ? "Stop Spectating" : "Quit Game",
    );

    this.playerTurn = playerTurn;
    this.scoreboard = scoreboard;

    const topbar = this.generateTopbar(roomKey, spectators);

    container.append(
      topbar,
      scoreboard,
      playerTurn,
      gameBoard,
      quitGame.element,
    );

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

  generateTopbar(roomTag, spectators) {
    const topbar = document.createElement("div");
    topbar.classList.add("game-topbar");

    topbar.append(roomTag, spectators);

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

    ["X", "O"].forEach((player, i) => {
      const card = document.createElement("div");
      card.classList.add("score-card");

      const chip = document.createElement("span");
      chip.classList.add("chip", player.toLowerCase());
      chip.textContent = player;

      const scoreInfo = document.createElement("div");
      scoreInfo.classList.add("score-info");

      const name = document.createElement("span");
      name.classList.add("name");
      name.textContent = players[player] ?? "Waiting...";

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

  // SPECTATORS
  generateSpectatorsBadge() {
    const container = document.createElement("div");
    container.classList.add("spectators");

    const dot = document.createElement("div");
    dot.classList.add("dot");

    const p = document.createElement("p");
    p.textContent = "0 spectating";

    container.append(dot, p);

    this.spectatorsElement = container;

    return container;
  }

  updateSpectatorCount() {
    if (!this.spectatorsElement) {
      return;
    }

    if (this.props.player === "spectator" && this.props.spectatorId) {
      GameStorage.touchSpectator(this.props.key, this.props.spectatorId);
    }

    const count = GameStorage.countSpectators(this.props.key);
    this.spectatorsElement.querySelector("p").textContent =
      `${count} spectating`;
  }

  //PLAYER TURN
  generatePlayerTurn() {
    const container = document.createElement("div");
    container.classList.add("turn-indicator");

    const catSlot = document.createElement("div");
    const dogSlot = document.createElement("div");

    Mascot.mount(catSlot, "cat");
    Mascot.mount(dogSlot, "dog");

    this.mascotX = catSlot;
    this.mascotO = dogSlot;

    const text = document.createElement("span");
    text.classList.add("turn-text");
    this.playerTurnText = text;

    container.append(catSlot, text, dogSlot);

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

    this.playerTurnText.textContent = isMyTurn
      ? "Your turn"
      : `Waiting for ${playerName}'s move`;
  }

  // BOARD
  generateBoard() {
    const boardWrapper = document.createElement("div");
    boardWrapper.classList.add("board-wrap");

    const boardContainer = document.createElement("div");
    boardContainer.classList.add("board");

    if (this.props.player == "spectator") {
      boardContainer.classList.add("locked");
    }

    this.boardContainer = boardContainer;

    const totalCells = 9;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");

      cell.classList.add("cell");
      cell.dataset.i = i;

      cell.addEventListener("click", () => {
        if (cell.classList.contains("no-click")) {
          return;
        }

        this.props.onCellClick(i);
      });

      boardContainer.append(cell);
    }

    boardWrapper.append(boardContainer);

    return boardWrapper;
  }

  updateBoard(response) {
    const board = response.split(":").slice(0, 9);
    this.currentBoardState = board;

    const currentTurn = this.getCurrentTurn(board);

    this.props.onTurnChange(currentTurn);

    const winner = this.getWinner(board);

    if (winner && !this.gameOver) {
      this.handleGameEnd(winner);
    }

    if (!winner && this.gameOver) {
      this.gameOver = false;
      this.lastWinner = null;
    }

    this.updatePlayerTurn(currentTurn);

    const isMyTurn = !this.gameOver && currentTurn === this.props.player;

    const cells = this.boardContainer.querySelectorAll(".cell");
    let lastFilled = null;

    cells.forEach((cell, i) => {
      const value = board[i];
      const isEmpty = value !== "X" && value !== "O";

      if (cell.dataset.value === value) {
        if (isEmpty && isMyTurn) {
          cell.classList.remove("no-click");
        } else {
          cell.classList.add("no-click");
        }
        return;
      }

      cell.dataset.value = value;
      cell.replaceChildren();

      if (!isEmpty) {
        lastFilled = value;

        const chip = document.createElement("span");
        chip.classList.add("chip", value.toLowerCase());
        chip.textContent = value;
        cell.append(chip);
      }

      if (isEmpty && isMyTurn) {
        cell.classList.remove("no-click");
      } else {
        cell.classList.add("no-click");
      }

      if (this.props.player == "spectator") {
        cell.classList.add("locked");
      }
    });

    if (lastFilled && !this.gameOver) {
      const host = lastFilled === "X" ? this.mascotX : this.mascotO;
      Mascot.place(host);
    }
  }

  // GAME LOGIC
  getCurrentTurn(board) {
    const xCount = board.filter((value) => value === "X").length;

    const oCount = board.filter((value) => value === "O").length;

    return xCount <= oCount ? "X" : "O";
  }

  getWinner(board) {
    const winningPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of winningPatterns) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    const isDraw = board.every((value) => value === "X" || value === "O");

    if (isDraw) {
      return "DRAW";
    }

    return null;
  }

  handleGameEnd(winner) {
    this.gameOver = true;
    this.lastWinner = winner;

    if (winner !== "DRAW") {
      this.refreshScoreBoard();

      if (this.props.player === "X") {
        GameStorage.incrementWin(this.props.key, winner);
      }
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

    this.polling = setInterval(() => {
      this.checkBoard();
    }, 500);
  }

  stopPolling() {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
    }
  }

  async checkBoard() {
    try {
      const response = await this.props.onCheckBoard();

      this.updateBoard(response);
      this.updateSpectatorCount();

      if (this.props.onCheckStatus) {
        const status = await this.props.onCheckStatus();

        if (status === "true") {
          this.gameStarted = true;
        }

        if (status === "false" && this.gameStarted && !this.quitting) {
          this.quitting = true;
          this.stopPolling();
          this.stopStorageListener();
          this.props.onOpponentQuit();
        }
      }
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

      if (event.key === GameStorage.getScoresKey(this.props.key)) {
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

    if (this.props.player === "spectator" && this.props.spectatorId) {
      GameStorage.removeSpectator(this.props.key, this.props.spectatorId);
    }
  }
}
