import { getWinningPattern } from "../utils/history.js";
import { BackButton } from "../components/BackButton.js";
import { Mascot } from "../components/Mascot.js";

const STEP_MS = 2000;
const CENTERS = [
  [50, 50],
  [150, 50],
  [250, 50],
  [50, 150],
  [150, 150],
  [250, 150],
  [50, 250],
  [150, 250],
  [250, 250],
];

export class HistoryReplay {
  constructor(props = {}) {
    this.props = props;

    this.playTimer = null;
    this.destroyed = false;
    this.game = null;
    this.boardState = null;

    this.titleEl = null;
    this.turnIndicator = null;
    this.turnText = null;
    this.mascotX = null;
    this.mascotO = null;
    this.boardEl = null;
    this.winLineEl = null;
    this.winPathEl = null;
    this.replayBtn = null;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("history-container", "history-replay");

    this.backButton = new BackButton(this.props.onBack, "Loading…");
    this.titleEl = this.backButton.titleEl;
    container.append(this.backButton.element);

    this.turnIndicator = document.createElement("div");
    this.turnIndicator.classList.add("turn-indicator");

    this.mascotX = document.createElement("div");
    this.mascotX.classList.add("side-left");
    Mascot.mount(this.mascotX, "cat");

    this.turnText = document.createElement("span");
    this.turnText.classList.add("turn-text");
    this.turnText.textContent = "…";

    this.mascotO = document.createElement("div");
    this.mascotO.classList.add("side-right");
    Mascot.mount(this.mascotO, "dog");

    this.turnIndicator.append(this.mascotX, this.turnText, this.mascotO);
    container.append(this.turnIndicator);

    const boardWrap = document.createElement("div");
    boardWrap.classList.add("board-wrap");

    this.boardEl = document.createElement("div");
    this.boardEl.classList.add("board");

    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      this.boardEl.append(cell);
    }

    this.winLineEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.winLineEl.classList.add("win-line");
    this.winLineEl.setAttribute("viewBox", "0 0 300 300");

    this.winPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.winPathEl.setAttribute("d", "");

    this.winLineEl.append(this.winPathEl);
    boardWrap.append(this.boardEl, this.winLineEl);

    this.replayBtn = document.createElement("button");
    this.replayBtn.type = "button";
    this.replayBtn.classList.add("replay-btn");
    this.replayBtn.textContent = "↻ Replay";
    this.replayBtn.addEventListener("click", () => this.startReplay());

    container.append(boardWrap, this.replayBtn);

    this.load();

    return container;
  }

  async load() {
    try {
      const game = await this.props.onLoadReplay();

      if (this.destroyed) {
        return;
      }

      this.game = game;
      this.titleEl.textContent = `${game.playerX ?? "Player X"} vs ${game.playerO ?? "Player O"}`;
      this.startReplay();
    } catch (e) {
      console.error("Failed to load replay:", e);

      if (!this.destroyed) {
        this.titleEl.textContent = "Game not found";
        this.turnText.textContent = "Couldn't load this game.";
      }
    }
  }

  startReplay() {
    if (!this.game) {
      return;
    }

    clearTimeout(this.playTimer);

    this.boardEl.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.remove("filled");
      cell.replaceChildren();
    });

    this.winLineEl.classList.remove("show");
    this.winPathEl.setAttribute("d", "");
    this.replayBtn.disabled = true;

    this.resetMascots();
    this.turnIndicator.className = "turn-indicator";
    this.turnText.textContent = "…";
    this.setBoardHighlight(null);

    this.boardState = Array(9).fill(null);

    this.playTimer = setTimeout(() => this.playStep(0), 400);
  }

  playStep(index) {
    if (this.destroyed) {
      return;
    }

    if (index >= this.game.moves.length) {
      this.replayBtn.disabled = false;
      return;
    }

    const move = this.game.moves[index];
    this.boardState[move.cell] = move.mark;

    this.setTurn(move.mark);

    const cellEl = this.boardEl.children[move.cell];
    cellEl.classList.add("filled");
    cellEl.replaceChildren();

    const chip = document.createElement("span");
    chip.classList.add("chip", move.mark.toLowerCase());
    chip.textContent = move.mark;
    cellEl.append(chip);

    Mascot.place(move.mark === "X" ? this.mascotX : this.mascotO);

    const result = getWinningPattern(this.boardState);
    const isLast = index === this.game.moves.length - 1;

    if (result) {
      const [a, , c] = result.pattern;
      const [x1, y1] = CENTERS[a];
      const [x2, y2] = CENTERS[c];

      this.winPathEl.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
      setTimeout(() => {
        if (!this.destroyed) {
          this.winLineEl.classList.add("show");
        }
      }, 150);

      this.showWinner(result.mark);
      this.replayBtn.disabled = false;
      return;
    }

    if (isLast) {
      this.showDraw();
      this.replayBtn.disabled = false;
      return;
    }

    this.setTurn(move.mark === "X" ? "O" : "X");
    this.playTimer = setTimeout(() => this.playStep(index + 1), STEP_MS);
  }

  setTurn(mark) {
    const name = mark === "X" ? this.game.playerX : this.game.playerO;

    this.turnIndicator.className = `turn-indicator ${mark.toLowerCase()}`;
    this.setBoardHighlight(mark);
    Mascot.setTurn(this.mascotX, mark === "X" ? "on" : "off");
    Mascot.setTurn(this.mascotO, mark === "O" ? "on" : "off");
    this.turnText.textContent = `${name}'s turn`;
  }

  setBoardHighlight(mark) {
    this.boardEl.classList.remove("highlight", "x", "o");

    if (mark) {
      this.boardEl.classList.add("highlight", mark.toLowerCase());
    }
  }

  showWinner(mark) {
    const winnerName = mark === "X" ? this.game.playerX : this.game.playerO;

    this.turnIndicator.className = `turn-indicator ${mark.toLowerCase()}`;
    this.setBoardHighlight(mark);
    Mascot.setTurn(this.mascotX, null);
    Mascot.setTurn(this.mascotO, null);
    Mascot.setResult(mark === "X" ? this.mascotX : this.mascotO, "slap");
    Mascot.setResult(mark === "X" ? this.mascotO : this.mascotX, "cry");
    this.turnText.textContent = `${winnerName} wins!`;
  }

  showDraw() {
    this.turnIndicator.className = "turn-indicator";
    this.setBoardHighlight(null);
    Mascot.setTurn(this.mascotX, null);
    Mascot.setTurn(this.mascotO, null);
    Mascot.setResult(this.mascotX, "stare");
    Mascot.setResult(this.mascotO, "stare");
    this.turnText.textContent = "It's a draw!";
  }

  resetMascots() {
    Mascot.setTurn(this.mascotX, null);
    Mascot.setTurn(this.mascotO, null);
    Mascot.setResult(this.mascotX, null);
    Mascot.setResult(this.mascotO, null);
    Mascot.setEmotion(this.mascotX, "smile");
    Mascot.setEmotion(this.mascotO, "smile");
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.playTimer);
    this.playTimer = null;
  }
}
