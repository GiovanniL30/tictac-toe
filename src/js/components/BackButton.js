export class BackButton {
  constructor(callback, text = "← back") {
    this.element = document.createElement("button");
    this.element.textContent = text;
    this.element.classList.add("sm", "link-btn");
    this.element.addEventListener("click", callback);
  }
}
