export class BackButton {
  constructor(callback, text = "Return Home") {
    this.element = document.createElement("div");
    this.element.classList.add("back-btn-container");

    this.btnCircle = document.createElement("button");
    this.btnCircle.type = "button";
    this.btnCircle.classList.add("back-btn");
    this.btnCircle.textContent = "◄";
    this.btnCircle.addEventListener("click", callback);

    this.titleEl = document.createElement("p");
    this.titleEl.classList.add("back-title");
    this.titleEl.textContent = text;

    this.element.append(this.btnCircle, this.titleEl);
  }
}
