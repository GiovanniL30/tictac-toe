import { createLoadingDots } from "../utils/index.js";
import { formatDate } from "../utils/history.js";
import { BackButton } from "../components/BackButton.js";

export class HistoryPlayerGames {
  constructor(props = {}) {
    this.props = props;
    this.listEl = null;
    this.destroyed = false;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("history-container");

    const title = this.props.playerId ? `Player ${this.props.playerId}` : "Player";
    container.append(new BackButton(this.props.onBack, title).element);

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
    empty.textContent = "No games recorded for this player.";

    this.listEl.append(empty);
  }

  renderGames(games) {
    this.listEl.replaceChildren();

    if (!games.length) {
      this.showEmpty();
      return;
    }

    const playerId = this.props.playerId;

    games.forEach((game) => {
      const isDraw = game.winner === "DRAW";
      const isIncomplete = !game.winner;
      const playerWon =
        !isDraw &&
        !isIncomplete &&
        ((game.winner === "X" && game.playerX === playerId) ||
          (game.winner === "O" && game.playerO === playerId));
      const opponent = game.playerX === playerId ? game.playerO : game.playerX;

      const card = document.createElement("div");
      card.classList.add("game-card");

      const chip = document.createElement("div");
      chip.classList.add("result-chip");
      chip.classList.add(isDraw || isIncomplete ? "draw" : playerWon ? "win" : "lose");
      chip.textContent = isDraw ? "=" : isIncomplete ? "…" : playerWon ? "W" : "L";

      const meta = document.createElement("div");
      meta.classList.add("game-meta");

      const resultText = document.createElement("div");
      resultText.classList.add("result-text");

      const resultLabel = document.createElement("span");
      resultLabel.textContent = isIncomplete
        ? "Incomplete"
        : isDraw
          ? `Draw vs ${opponent ?? "?"}`
          : playerWon
            ? `Beat ${opponent ?? "?"}`
            : `Lost to ${opponent ?? "?"}`;

      resultText.append(resultLabel);

      if (game.roomCode) {
        const tag = document.createElement("span");
        tag.classList.add("room-tag-mini");
        tag.textContent = game.roomCode;
        resultText.append(tag);
      }

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
