import { Button } from "../components/Button.js";
import { Toast } from "../components/Toast.js";
import { createLoadingDots } from "../utils/index.js";
import { Poller } from "../utils/Poller.js";
import { ROOM_STATUS } from "../utils/constants/RoomStatus.js";

const ROOM_CHECK_INTERVAL_MS = 500;

export class WaitingRoom {
  constructor(props = {}) {
    this.props = props;
    this.poller = new Poller(this.checkRoom, ROOM_CHECK_INTERVAL_MS);
    this.isCheckingRoom = false;
    this.gameStarted = false;
    this.resetTimer = null;
  }

  checkRoom = async () => {
    if (this.isCheckingRoom || this.gameStarted) {
      return;
    }

    this.isCheckingRoom = true;

    try {
      const response = await this.props.onCheckRoom();

      if (response === ROOM_STATUS.ACTIVE && !this.gameStarted) {
        this.gameStarted = true;
        this.stopPolling();
        this.props.onGameStart();
      }
    } catch (e) {
      console.error("Failed to check room:", e);
    } finally {
      this.isCheckingRoom = false;
    }
  };

  render() {
    const container = document.createElement("div");
    container.classList.add("waiting-room-container");

    const content = document.createElement("div");
    const codePlate = this.createCodePlate();

    const taglines = this.createTagLines();
    const loadingDots = createLoadingDots();
    const cancelBtn = new Button({ text: "Cancel Room", variant: "ghost" });
    cancelBtn.onClick(() => this.props.onBack());

    content.append(taglines[0], codePlate, loadingDots, taglines[1], cancelBtn.element);

    container.append(content);

    this.startPolling();

    return container;
  }

  startPolling() {
    this.poller.start();
  }

  stopPolling() {
    this.poller.stop();
  }

  destroy() {
    this.stopPolling();

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  createTagLines() {
    const taglines = ["Room ready! Share this key:", "Waiting for a challenger to join..."].map((line) => {
      const span = document.createElement("span");
      span.classList.add("tagline");
      span.textContent = line;
      return span;
    });

    return taglines;
  }

  createCodePlate() {
    const codeContainer = document.createElement("div");
    codeContainer.classList.add("code-plate");

    const text = document.createElement("p");
    text.textContent = "Room Key";
    text.classList.add("label");

    const keyContainer = document.createElement("div");
    keyContainer.classList.add("code-letters");

    for (let i = 0; i < this.props.key.length; i++) {
      const span = document.createElement("span");
      span.textContent = this.props.key.charAt(i);
      keyContainer.append(span);
    }

    const copyCodeBtn = new Button({ text: "Copy Key", variant: "secondary" });

    copyCodeBtn.onClick(async () => {
      try {
        await navigator.clipboard.writeText(this.props.key);

        copyCodeBtn.text = "Copied!";
        copyCodeBtn.addClass("copied");
        new Toast("Room Key copied!", 1800);

        if (this.resetTimer) {
          clearTimeout(this.resetTimer);
        }

        this.resetTimer = setTimeout(() => {
          copyCodeBtn.removeClass("copied");
          copyCodeBtn.text = "Copy Key";
        }, 1800);
      } catch (error) {}
    });

    codeContainer.append(text, keyContainer, copyCodeBtn.element);

    return codeContainer;
  }
}
