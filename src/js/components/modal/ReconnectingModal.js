import { createLoadingDots } from "../../utils/index.js";
import { Modal } from "./Modal.js";

export class ReconnectingModal extends Modal {
  constructor({ message, title = "Reconnecting…" }) {
    super({ title });

    this.modalContainer.append(Object.assign(document.createElement("p"), { textContent: message }), createLoadingDots());

    this.modalContainer.classList.add("center", "white");
  }
}
