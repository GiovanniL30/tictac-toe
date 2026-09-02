import { createLoadingDots } from "../utils/index.js";
import { formatDate } from "../utils/history.js";
import { BackButton } from "../components/BackButton.js";

const ROOM_COLORS = ["var(--yellow)", "var(--pink)", "var(--blue)", "var(--green)"];

export class HistoryRooms {
  constructor(props = {}) {
    this.props = props;
    this.listEl = null;
    this.destroyed = false;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("history-container");

    container.append(new BackButton(this.props.onBack, "Match History").element);

    const list = document.createElement("div");
    list.classList.add("list");
    this.listEl = list;
    container.append(list);

    this.loadRooms();

    return container;
  }

  async loadRooms() {
    this.showLoading();

    try {
      const rooms = await this.props.onLoadRooms();

      if (this.destroyed) {
        return;
      }

      this.renderRooms(rooms);
    } catch (e) {
      console.error("Failed to load rooms:", e);

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
    empty.textContent = "No games played yet — start a room to build your history!";

    this.listEl.append(empty);
  }

  renderRooms(rooms) {
    this.listEl.replaceChildren();

    if (!rooms.length) {
      this.showEmpty();
      return;
    }

    rooms.forEach((room, i) => {
      const card = document.createElement("div");
      card.classList.add("room-card");

      const chip = document.createElement("div");
      chip.classList.add("room-code-chip");
      chip.style.background = ROOM_COLORS[i % ROOM_COLORS.length];
      chip.textContent = room.roomCode;

      const meta = document.createElement("div");
      meta.classList.add("room-meta");

      const code = document.createElement("div");
      code.classList.add("code");
      code.textContent = `Room ${room.roomCode}`;

      const sub = document.createElement("div");
      sub.classList.add("sub");
      sub.textContent = room.lastPlayed ? `Last played ${formatDate(room.lastPlayed)}` : "No games yet";

      meta.append(code, sub);

      const count = document.createElement("div");
      count.classList.add("room-count");
      count.textContent = `${room.gameCount} game${room.gameCount === 1 ? "" : "s"}`;

      const chev = document.createElement("div");
      chev.classList.add("chev");
      chev.textContent = "›";

      card.append(chip, meta, count, chev);
      card.addEventListener("click", () => this.props.onOpenRoom(room.roomCode));
      this.listEl.append(card);
    });
  }

  destroy() {
    this.destroyed = true;
  }
}
