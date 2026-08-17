import { BackButton } from "../components/BackButton.js";
import { Button } from "../components/Button.js";
import { Toast } from "../components/Toast.js";

export class WaitingRoom {
  constructor(props = {}) {
    this.props = props;
    this.polling = null;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("waiting-room-container");

    const content = document.createElement("div");
    const codePlate = this.createCodePlate();

    const taglines = this.createTagLines();
    const loadingDots = this.createLoadingDots();
    const backButton = new BackButton(() => this.props.onBack(), "cancel room");

    content.append(
      taglines[0],
      codePlate,
      loadingDots,
      taglines[1],
      backButton.element,
    );

    container.append(content);

    this.startPolling();

    return container;
  }

  startPolling() {
    this.polling = setInterval(async () => {
      try {
        const response = await this.props.onCheckRoom();
        console.log(response);

        if (response && response == "true") {
          this.stopPolling();
          this.props.onGameStart();
        }
      } catch (e) {
        console.error("Failed to check room:", e);
      }
    }, 1000);
  }

  stopPolling() {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
    }
  }

  createLoadingDots() {
    const loadingDots = document.createElement("div");
    loadingDots.classList.add("waiting-dots");

    for (let i = 0; i < 3; i++) {
      const span = document.createElement("span");
      loadingDots.append(span);
    }

    return loadingDots;
  }

  createTagLines() {
    const taglines = [
      "Room ready! Share this key:",
      "waiting for a challenger to join...",
    ].map((line) => {
      const span = document.createElement("span");
      span.classList.add("tagline");
      span.textContent = line;
      return span;
    });

    return taglines;
  }

  createBackButton() {
    const backBtn = document.createElement("button");
    backBtn.textContent = "← back";
    backBtn.classList.add("sm", "link-btn");
    backBtn.addEventListener("click", () => this.props.onBack());

    return backBtn;
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
    copyCodeBtn.onClick(() => {
      navigator.clipboard.writeText(this.props.key);
      new Toast("Room Key copied!");
    });

    codeContainer.append(text, keyContainer, copyCodeBtn.element);

    return codeContainer;
  }
}
