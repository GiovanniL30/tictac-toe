import { Input } from "./Input.js";

export class InputField {
  constructor({ label, id, placeholder = "", isCode = false, maxLength = 7 }) {
    this.element = document.createElement("div");
    this.element.classList.add("field");

    if (isCode) {
      this.element.classList.add("code");
    }

    this.label = document.createElement("label");
    this.label.htmlFor = id;
    this.label.textContent = label;

    this.input = new Input({
      name: id,
      id,
      placeholder,
      maxLength,
      required: true,
    });

    this.element.append(this.label, this.input.element);
  }

  getInputValue() {
    return this.input.value;
  }

  onInputChange(callback) {
    this.input.onChange(callback);
  }
}
