export class Modal {
  constructor({ title }) {
    this.overlay = document.createElement("div");
    this.overlay.classList.add("overlay");

    this.modalContainer = document.createElement("div");
    this.modalContainer.classList.add("modal");

    this.overlay.append(this.modalContainer);

    const modalTitle = document.createElement("h2");
    modalTitle.textContent = title;

    this.modalContainer.append(modalTitle);
  }

  show() {
    document.body.append(this.overlay);
    this.overlay.classList.add("show");
  }

  hide() {
    this.overlay.remove();
  }
}
