import { Modal } from "./Modal.js";

export class ServerDownModal extends Modal {
  constructor({ onDismiss }) {
    super({ title: "Connection Lost" });

    this.modalContainer.classList.add("server-down-modal");

    this.modalContainer.append(
      this.createIcon(),
      this.createMessage(),
      this.createButton(onDismiss),
    );
  }

  createIcon() {
    const icon = document.createElement("div");
    icon.classList.add("modal-badge", "warn");
    icon.textContent = "!";
    return icon;
  }

  createMessage() {
    const p = document.createElement("p");
    p.textContent =
      "The server can't be reached right now. Your game session has ended and you've been returned home.";
    return p;
  }

  createButton(onDismiss) {
    const btn = document.createElement("button");
    btn.classList.add("btn", "block");
    btn.textContent = "Okay";
    btn.addEventListener("click", () => onDismiss(this));
    return btn;
  }
}
