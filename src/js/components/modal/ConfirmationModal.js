import { Button } from "../Button.js";
import { Modal } from "./Modal.js";

export class ConfirmationModal extends Modal {
  constructor({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
  }) {
    super({ title });

    const p = document.createElement("p");
    p.textContent = message;

    const btnContainer = document.createElement("div");
    btnContainer.classList.add("btn-row");

    const confirmButton = new Button({
      text: confirmText,
      variant: "secondary",
    });
    const cancelButton = new Button({ text: cancelText, variant: "ghost" });

    confirmButton.onClick(() => onConfirm(this));
    cancelButton.onClick(() => onCancel(this));

    btnContainer.append(cancelButton.element, confirmButton.element);
    this.modalContainer.append(p, btnContainer);
  }
}
