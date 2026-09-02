import { createLoadingDots } from "../utils/index.js";
import { formatDate } from "../utils/history.js";
import { BackButton } from "../components/BackButton.js";

export class HistoryGames {
  constructor(props = {}) {
    this.props = props;
    this.listEl = null;
    this.destroyed = false;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("history-container");

    container.append(new BackButton(this.props.onBack, `Room ${this.props.roomCode}`).element);

    const list = document.createElement("div");
    list.classList.add("list");
    this.listEl = list;
    container.append(list);

    this.loadGames();

    return container;
  }

  async loadGames() {
    this.showLoading();

    try {
      const games = await this.props.onLoadGames();

      if (this.destroyed) {
        return;
      }

      this.renderGames(games);
    } catch (e) {
      console.error("Failed to load games:", e);

      if (!this.destroyed) {
        this.showEmpty();
      }
    }
  }

  showLoading() {
    this.listEl.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.classList.add("history-loading");
    wrapper.append(createLoadingDots());

    this.listEl.append(wrapper);
  }

  showEmpty() {
    this.listEl.replaceChildren();

    const empty = document.createElement("div");
    empty.classList.add("empty-state");
    empty.textContent = "No games recorded for this room.";

    this.listEl.append(empty);
  }

  renderGames(games) {
    this.listEl.replaceChildren();

    if (!games.length) {
      this.showEmpty();
      return;
    }

    games.forEach((game) => {
      const card = document.createElement("div");
      card.classList.add("game-card");

      const chip = document.createElement("div");
      chip.classList.add("result-chip");
      chip.classList.add(game.winner === "X" ? "x" : game.winner === "O" ? "o" : "draw");
      chip.textContent = game.winner === "DRAW" ? "=" : game.winner ?? "…";

      const meta = document.createElement("div");
      meta.classList.add("game-meta");

      const resultText = document.createElement("div");
      resultText.classList.add("result-text");
      resultText.textContent =
        game.winner === "DRAW"
          ? "Draw"
          : game.winner === "X"
            ? `${game.playerX} won`
            : game.winner === "O"
              ? `${game.playerO} won`
              : "Incomplete";

      const date = document.createElement("div");
      date.classList.add("date");
      date.textContent = formatDate(game.date);

      meta.append(resultText, date);

      const play = document.createElement("div");
      play.classList.add("play-icon");
      play.textContent = "▶";

      card.append(chip, meta, play);
      card.addEventListener("click", () => this.props.onOpenGame(game));
      this.listEl.append(card);
    });
  }

  destroy() {
    this.destroyed = true;
  }
}
