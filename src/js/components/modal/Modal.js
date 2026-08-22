export class Modal {
  constructor({ title }) {
    this.overlay = document.createElement("div");
    this.overlay.classList.add("overlay");

    this.modalContainer = document.createElement("div");
    this.modalContainer.classList.add("modal");

    this.overlay.append(this.modalContainer);

    this.modalTitle = document.createElement("h2");
    this.modalTitle.textContent = title;

    this.modalContainer.append(this.modalTitle);
  }

  setTitle(title) {
    if (!document.querySelector(".modal h2")) {
      this.modalTitle = title;
      this.modalContainer.append(this.modalTitle);
    }
  }

  show() {
    document.body.append(this.overlay);
    this.overlay.classList.add("show");
  }

  hide() {
    this.overlay.remove();
  }

  disableButtons() {
    const buttons = this.modalContainer.querySelectorAll("button");

    buttons.forEach((button) => {
      if (button.dataset.prevDisplay === undefined) {
        button.dataset.prevDisplay = button.style.display || "";
      }

      button.disabled = true;
      button.style.display = "none";
    });
  }

  enableButtons() {
    const buttons = this.modalContainer.querySelectorAll("button");

    buttons.forEach((button) => {
      button.disabled = false;
      button.style.display = button.dataset.prevDisplay ?? "";
      delete button.dataset.prevDisplay;
    });
  }
}
