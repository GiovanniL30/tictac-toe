import { createLoadingDots } from "../utils/index.js";
import { formatDate } from "../utils/history.js";
import { BackButton } from "../components/BackButton.js";

const ROOM_COLORS = ["var(--yellow)", "var(--pink)", "var(--blue)", "var(--green)"];
const PLAYER_COLORS = ["var(--pink)", "var(--blue)", "var(--green)", "var(--yellow)"];

const TAB_ROOMS = "rooms";
const TAB_PLAYERS = "players";

export class HistoryRooms {
  constructor(props = {}) {
    this.props = props;
    this.listEl = null;
    this.roomListEl = null;
    this.playerListEl = null;
    this.activeTab = props.initialTab === TAB_PLAYERS ? TAB_PLAYERS : TAB_ROOMS;
    this.destroyed = false;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("history-container");

    container.append(new BackButton(this.props.onBack, "Match History").element);

    const toggle = document.createElement("div");
    toggle.classList.add("mode-toggle");

    this.roomsTabBtn = document.createElement("button");
    this.roomsTabBtn.type = "button";
    this.roomsTabBtn.textContent = "By Room";

    this.playersTabBtn = document.createElement("button");
    this.playersTabBtn.type = "button";
    this.playersTabBtn.textContent = "By Player";

    toggle.append(this.roomsTabBtn, this.playersTabBtn);
    container.append(toggle);

    const roomsList = document.createElement("div");
    roomsList.classList.add("list");
    this.roomListEl = roomsList;

    const playersList = document.createElement("div");
    playersList.classList.add("list");
    this.playerListEl = playersList;

    container.append(roomsList, playersList);

    this.roomsTabBtn.addEventListener("click", () => this.setTab(TAB_ROOMS));
    this.playersTabBtn.addEventListener("click", () => this.setTab(TAB_PLAYERS));

    this.setTab(this.activeTab);

    this.loadRooms();
    this.loadPlayers();

    return container;
  }

  setTab(tab) {
    this.activeTab = tab;

    const isRooms = tab === TAB_ROOMS;

    this.roomsTabBtn.classList.toggle("active", isRooms);
    this.playersTabBtn.classList.toggle("active", !isRooms);

    this.roomListEl.style.display = isRooms ? "flex" : "none";
    this.playerListEl.style.display = isRooms ? "none" : "flex";

    this.props.onTabChange?.(tab);
  }

  async loadRooms() {
    this.showLoading(this.roomListEl);

    try {
      const rooms = await this.props.onLoadRooms();

      if (this.destroyed) {
        return;
      }

      this.renderRooms(rooms);
    } catch (e) {
      console.error("Failed to load rooms:", e);

      if (!this.destroyed) {
        this.showEmpty(this.roomListEl);
      }
    }
  }

  async loadPlayers() {
    this.showLoading(this.playerListEl);

    try {
      const players = await this.props.onLoadPlayers();

      if (this.destroyed) {
        return;
      }

      this.renderPlayers(players);
    } catch (e) {
      console.error("Failed to load players:", e);

      if (!this.destroyed) {
        this.showEmpty(this.playerListEl, "No players found yet.");
      }
    }
  }

  showLoading(listEl) {
    listEl.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.classList.add("history-loading");
    wrapper.append(createLoadingDots());

    listEl.append(wrapper);
  }

  showEmpty(listEl, message = "No games played yet. Start a room to build your history!") {
    listEl.replaceChildren();

    const empty = document.createElement("div");
    empty.classList.add("empty-state");
    empty.textContent = message;

    listEl.append(empty);
  }

  renderRooms(rooms) {
    this.roomListEl.replaceChildren();

    if (!rooms.length) {
      this.showEmpty(this.roomListEl);
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
      this.roomListEl.append(card);
    });
  }

  renderPlayers(players) {
    this.playerListEl.replaceChildren();

    if (!players.length) {
      this.showEmpty(this.playerListEl, "No players found yet.");
      return;
    }

    players.forEach((player, i) => {
      const card = document.createElement("div");
      card.classList.add("room-card");

      const chip = document.createElement("div");
      chip.classList.add("player-chip");
      chip.style.background = PLAYER_COLORS[i % PLAYER_COLORS.length];
      chip.textContent = (player.playerId ?? "?").charAt(0).toUpperCase();

      const meta = document.createElement("div");
      meta.classList.add("room-meta");

      const code = document.createElement("div");
      code.classList.add("code");
      code.textContent = player.playerId;

      const sub = document.createElement("div");
      sub.classList.add("sub");
      sub.textContent = `${player.gameCount} game${player.gameCount === 1 ? "" : "s"} played`;

      meta.append(code, sub);

      const chev = document.createElement("div");
      chev.classList.add("chev");
      chev.textContent = "›";

      card.append(chip, meta, chev);
      card.addEventListener("click", () => this.props.onOpenPlayer(player.playerId));
      this.playerListEl.append(card);
    });
  }

  destroy() {
    this.destroyed = true;
  }
}
