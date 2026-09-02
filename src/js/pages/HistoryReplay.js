import { getWinningPattern } from "../utils/history.js";
import { BackButton } from "../components/BackButton.js";

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
    this.boardEl = null;
    this.dotsEl = null;
    this.moveNumEl = null;
    this.moveTotalEl = null;
    this.winLineEl = null;
    this.winPathEl = null;
    this.resultBannerEl = null;
    this.replayBtn = null;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("history-container", "history-replay");

    this.backButton = new BackButton(this.props.onBack, "Loading…");
    this.titleEl = this.backButton.titleEl;
    container.append(this.backButton.element);

    const tracker = document.createElement("div");
    tracker.classList.add("move-tracker");

    const trackerText = document.createElement("span");
    trackerText.textContent = "Move ";

    this.moveNumEl = document.createElement("span");
    this.moveNumEl.textContent = "0";

    const slash = document.createElement("span");
    slash.textContent = "/";

    this.moveTotalEl = document.createElement("span");
    this.moveTotalEl.textContent = "0";

    this.dotsEl = document.createElement("div");
    this.dotsEl.classList.add("move-dots");

    tracker.append(trackerText, this.moveNumEl, slash, this.moveTotalEl, this.dotsEl);

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

    this.resultBannerEl = document.createElement("div");
    this.resultBannerEl.classList.add("result-banner");

    this.replayBtn = document.createElement("button");
    this.replayBtn.type = "button";
    this.replayBtn.classList.add("replay-btn");
    this.replayBtn.textContent = "↻ Replay";
    this.replayBtn.addEventListener("click", () => this.startReplay());

    container.append(tracker, boardWrap, this.resultBannerEl, this.replayBtn);

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
        this.resultBannerEl.textContent = "Couldn't load this game.";
        this.resultBannerEl.classList.add("show");
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

    this.dotsEl.replaceChildren();
    this.game.moves.forEach(() => this.dotsEl.append(document.createElement("span")));

    this.moveTotalEl.textContent = String(this.game.moves.length);
    this.moveNumEl.textContent = "0";

    this.winLineEl.classList.remove("show");
    this.winPathEl.setAttribute("d", "");
    this.resultBannerEl.classList.remove("show");
    this.resultBannerEl.textContent = "";
    this.replayBtn.disabled = true;

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

    const cellEl = this.boardEl.children[move.cell];
    cellEl.classList.add("filled");
    cellEl.replaceChildren();

    const chip = document.createElement("span");
    chip.classList.add("chip", move.mark.toLowerCase());
    chip.textContent = move.mark;
    cellEl.append(chip);

    this.dotsEl.children[index].classList.add("done", move.mark.toLowerCase());
    this.moveNumEl.textContent = String(index + 1);

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

      const winnerName = result.mark === "X" ? this.game.playerX : this.game.playerO;
      const icon = result.mark === "X" ? "🐱" : "🐶";
      this.resultBannerEl.textContent = `${icon} ${winnerName} wins!`;
      setTimeout(() => {
        if (!this.destroyed) {
          this.resultBannerEl.classList.add("show");
        }
      }, 300);

      this.replayBtn.disabled = false;
      return;
    }

    if (isLast) {
      this.resultBannerEl.textContent = "🤝 It's a draw!";
      setTimeout(() => {
        if (!this.destroyed) {
          this.resultBannerEl.classList.add("show");
        }
      }, 300);

      this.replayBtn.disabled = false;
      return;
    }

    this.playTimer = setTimeout(() => this.playStep(index + 1), STEP_MS);
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.playTimer);
    this.playTimer = null;
  }
}
