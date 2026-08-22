export class Toast {
  constructor(message, duration = 3000) {
    this.container = document.querySelector("body");

    this.element = document.createElement("div");
    this.element.textContent = message;
    this.element.classList.add("toast");

    this.container.append(this.element);

    this.autoHideTimer = null;
    this.isHidden = false;

    requestAnimationFrame(() => {
      this.element.classList.add("show");
    });

    if (duration !== null && duration !== Infinity) {
      this.autoHideTimer = setTimeout(() => this.hide(), duration);
    }
  }

  updateMessage(message) {
    this.element.textContent = message;
  }

  hide() {
    if (this.isHidden) {
      return;
    }

    this.isHidden = true;

    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    this.element.classList.remove("show");

    this.element.addEventListener(
      "transitionend",
      () => {
        this.element.remove();
      },
      { once: true },
    );
  }
}
