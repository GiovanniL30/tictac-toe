export class Game {
  constructor(props = {}) {
    this.boardSize = 3;
    this.props = props;
    this.polling = null;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("game-room-container");

    const gameBoard = this.generateBoard();

    container.append(gameBoard);

    this.startPolling();

    return container;
  }

  generateBoard() {
    const boardWrapper = document.createElement("div");
    boardWrapper.classList.add("board-wrap");

    const boardContainer = document.createElement("div");
    boardContainer.classList.add("board");

    this.boardContainer = boardContainer;

    const totalCells = this.boardSize ** 2;

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
    const board = response.split(":");
    const currentTurn = this.getCurrentTurn(board);

    this.props.onTurnChange(currentTurn);

    const isMyTurn = currentTurn === this.props.player;

    const cells = this.boardContainer.querySelectorAll(".cell");

    cells.forEach((cell, i) => {
      const value = board[i];

      const isEmpty = value !== "X" && value !== "O";

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
    });
  }

  getCurrentTurn(board) {
    const xCount = board.filter((value) => value === "X").length;
    const oCount = board.filter((value) => value === "O").length;

    return xCount <= oCount ? "X" : "O";
  }

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
}
