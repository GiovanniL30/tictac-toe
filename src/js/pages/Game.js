import { GameStorage } from "../state/GameStorage.js";

export class Game {
  constructor(props = {}) {
    this.props = props;

    this.currentBoardState = null;

    this.polling = null;
    this.storageListener = null;

    this.playerTurn = null;
    this.scoreboard = null;
    this.boardContainer = null;

    this.gameOver = false;
    this.lastWinner = null;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("game-room-container");

    const playerTurn = this.generatePlayerTurn();
    const scoreboard = this.generateScoreBoard();
    const gameBoard = this.generateBoard();
    const roomKey = this.generateGameKeyTag();

    this.playerTurn = playerTurn;
    this.scoreboard = scoreboard;

    container.append(roomKey, scoreboard, playerTurn, gameBoard);

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

  //PLAYER TURN
  generatePlayerTurn() {
    const container = document.createElement("div");
    container.classList.add("turn-indicator");

    return container;
  }

  updatePlayerTurn(currentTurn) {
    const players = GameStorage.getPlayers(this.props.key);
    const playerName = players[currentTurn] ?? `Player ${currentTurn}`;

    this.playerTurn.className = "turn-indicator";
    this.playerTurn.classList.add(currentTurn.toLowerCase());

    // Game is over
    if (this.gameOver) {
      if (this.lastWinner === "DRAW") {
        this.playerTurn.textContent = "It's a draw!";
      } else if (this.lastWinner === this.props.player) {
        this.playerTurn.textContent = "You win!";
      } else {
        this.playerTurn.textContent = `${playerName} wins!`;
      }

      return;
    }

    // Spectator
    if (this.props.player === "spectator") {
      this.playerTurn.textContent = `${playerName}'s turn`;

      return;
    }

    const isMyTurn = currentTurn === this.props.player;

    this.playerTurn.textContent = isMyTurn
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

    this.updatePlayerTurn(currentTurn);

    const isMyTurn = !this.gameOver && currentTurn === this.props.player;

    const cells = this.boardContainer.querySelectorAll(".cell");

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
    }

    GameStorage.incrementWin(this.props.key, winner);
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
  }
}
