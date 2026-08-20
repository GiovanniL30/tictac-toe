export class Button {
  constructor({
    text = "",
    type = "button",
    variant = null,
    disabled = false,
  } = {}) {
    this.element = document.createElement("button");

    this.element.type = type;
    this.element.textContent = text;
    this.element.disabled = disabled;

    this.element.classList.add("btn");

    if (variant) {
      this.element.classList.add(variant);
    }
  }

  get disabled() {
    return this.element.disabled;
  }

  set disabled(value) {
    this.element.disabled = value;
  }

  get text() {
    return this.element.textContent;
  }

  set text(value) {
    this.element.textContent = value;
  }

  addClass(...classes) {
    this.element.classList.add(...classes);
  }

  removeClass(...classes) {
    this.element.classList.remove(...classes);
  }

  append(component) {
    this.element.append(component.element);
  }

  clear() {
    this.element.replaceChildren();
  }

  onClick(callback) {
    this.element.addEventListener("click", callback);
  }
}
