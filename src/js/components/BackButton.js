import { Button } from "./Button.js";

export class BackButton {
  constructor(callback, text = "Return Home") {
    this.element = document.createElement("div");
    this.element.classList.add("back-btn-container");

    this.btnCircle = new Button({ text: "◄" });
    this.btnCircle.addClass("back-sm", "secondary");

    this.textContent = document.createElement("p");
    this.textContent.textContent = text;

    this.element.append(this.btnCircle.element, this.textContent);

    this.btnCircle.onClick(callback);
  }
}
