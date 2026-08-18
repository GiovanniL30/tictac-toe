export class Toast {
  constructor(message, duration = 3000) {
    this.container = document.querySelector("body");

    const toast = document.createElement("div");

    toast.textContent = message;
    toast.classList.add("toast");

    this.container.append(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");

      toast.addEventListener("transitionend", () => toast.remove(), {
        once: true,
      });
    }, duration);
  }
}
