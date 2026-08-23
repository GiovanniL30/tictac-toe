export class Board {
  constructor(props = {}) {
    this.props = props;

    this.container = null;
    this.boardContainer = null;

    this.state = null; // array of 9 cell values ("X" | "O" | "" | undefined)
    this.moveInFlight = false;
    this.pendingCellIndex = null;
  }

  // RENDER
  render() {
    const boardWrapper = document.createElement("div");
    boardWrapper.classList.add("board-wrap");

    const boardContainer = document.createElement("div");
    boardContainer.classList.add("board");

    if (this.props.player === "spectator") {
      boardContainer.classList.add("locked");
    }

    this.boardContainer = boardContainer;

    const totalCells = 9;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");

      cell.classList.add("cell");
      cell.dataset.i = i;

      cell.addEventListener("click", () => {
        if (this.moveInFlight || cell.classList.contains("no-click")) {
          return;
        }

        this.moveInFlight = true;
        this.pendingCellIndex = i;
        this.lock();
        this.showPendingMove(cell);
        this.props.onMoveStart();

        this.props.onCellClick(i).then((ok) => {
          if (!ok) {
            this.moveInFlight = false;
            this.pendingCellIndex = null;
            this.clearPendingMove(cell);
            this.unlock(this.isMyTurn());
          }

          this.props.onMoveEnd(ok);
        });
      });

      boardContainer.append(cell);
    }

    boardWrapper.append(boardContainer);
    this.container = boardWrapper;

    return boardWrapper;
  }

  // PARSING
  static parse(response) {
    return response.split(":").slice(0, 9);
  }

  // GAME LOGIC
  getCurrentTurn(board = this.state) {
    const xCount = board.filter((value) => value === "X").length;
    const oCount = board.filter((value) => value === "O").length;

    return xCount <= oCount ? "X" : "O";
  }

  getWinner(board = this.state) {
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

    return isDraw ? "DRAW" : null;
  }

  isMyTurn() {
    if (!this.state) {
      return false;
    }

    return this.getCurrentTurn(this.state) === this.props.player;
  }

  // LOCK / UNLOCK
  lock() {
    this.boardContainer.classList.add("locked");

    this.boardContainer.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.add("no-click");
    });
  }

  unlock(isMyTurn) {
    this.boardContainer.classList.remove("locked");

    this.boardContainer.querySelectorAll(".cell").forEach((cell) => {
      const value = cell.dataset.value;
      const isEmpty = value !== "X" && value !== "O";

      cell.classList.toggle("no-click", !(isEmpty && isMyTurn));
    });
  }

  // TURN HIGHLIGHT
  setHighlight(active, player) {
    if (active) {
      this.boardContainer.classList.add("highlight", player.toLowerCase());
    } else {
      this.boardContainer.classList.remove("highlight", "x", "o");
    }
  }

  // OPTIMISTIC UI
  showPendingMove(cell) {
    cell.replaceChildren();

    const chip = document.createElement("span");
    chip.classList.add("chip", this.props.player.toLowerCase(), "pending");
    chip.textContent = this.props.player;

    cell.append(chip);
  }

  clearPendingMove(cell) {
    const value = cell.dataset.value;
    const isEmpty = value !== "X" && value !== "O";

    cell.replaceChildren();

    if (!isEmpty) {
      const chip = document.createElement("span");
      chip.classList.add("chip", value.toLowerCase());
      chip.textContent = value;
      cell.append(chip);
    }
  }

  update(response, { player, gameOver }) {
    const board = Board.parse(response);
    this.state = board;

    const currentTurn = this.getCurrentTurn(board);
    const winner = this.getWinner(board);

    if (this.moveInFlight && !gameOver && this.pendingCellIndex != null && (currentTurn !== player || this.state[this.pendingCellIndex] === player)) {
      this.moveInFlight = false;
      this.pendingCellIndex = null;
    }

    const isMyTurn = !gameOver && !this.moveInFlight && currentTurn === player;

    this.boardContainer.classList.toggle("locked", this.moveInFlight || player === "spectator");

    let lastFilled = null;

    const cells = this.boardContainer.querySelectorAll(".cell");

    cells.forEach((cell, i) => {
      const value = board[i];
      const isEmpty = value !== "X" && value !== "O";

      if (cell.dataset.value === value) {
        cell.classList.toggle("no-click", !(isEmpty && isMyTurn));
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

      cell.classList.toggle("no-click", !(isEmpty && isMyTurn));

      if (player === "spectator") {
        cell.classList.add("locked");
      }
    });

    return { board, currentTurn, winner, lastFilled };
  }

  reset() {
    this.state = null;
    this.moveInFlight = false;
    this.pendingCellIndex = null;
  }
}
