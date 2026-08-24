import { createLoadingDots } from "../../utils/index.js";
import { Modal } from "./Modal.js";

export class WaitForOpponentModal extends Modal {
  constructor() {
    super({ title: "Waiting for opponent to reconnnect..." });
    this.modalContainer.append(createLoadingDots());
    this.modalContainer.classList.add("white", "center");
  }
}
