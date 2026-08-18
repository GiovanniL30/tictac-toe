export class Modal {
  constructor({ title }) {
    const appContainer = document.querySelector("body");

    this.overlay = document.createElement("div");
    this.overlay.classList.add("overlay");

    this.modalContainer = document.createElement("div");
    this.modalContainer.classList.add("modal");

    this.overlay.append(this.modalContainer);

    const modalTitle = document.createElement("h2");
    modalTitle.textContent = title;

    this.modalContainer.append(modalTitle);

    appContainer.append(this.overlay);
  }

  show() {
    this.overlay.classList.add("show");
  }

  hide() {
    this.overlay.classList.remove("show");
  }
}
