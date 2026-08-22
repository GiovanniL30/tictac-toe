export class Input {
  constructor({
    type = "text",
    name = "",
    id = "",
    placeholder = "",
    value = "",
    autocomplete = "off",
    required = false,
    disabled = false,
    maxLength = 10,
    alphanumeric = true,
  } = {}) {
    this.element = document.createElement("input");

    this.element.type = type;
    this.element.name = name;
    this.element.id = id;
    this.element.placeholder = placeholder;
    this.element.value = value;
    this.element.autocomplete = autocomplete;
    this.element.required = required;
    this.element.disabled = disabled;
    this.element.minLength = 0;
    this.element.maxLength = maxLength;

    this.element.classList.add("input");

    if (alphanumeric) {
      this.element.addEventListener("keydown", (event) => {
        if (event.key === " ") {
          event.preventDefault();
        }
      });

      this.element.addEventListener("input", () => {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, "");
      });
    }
  }

  get value() {
    return this.element.value;
  }

  set value(value) {
    this.element.value = value;
  }

  focus() {
    this.element.focus();
  }

  clear() {
    this.element.value = "";
  }

  onInput(callback) {
    this.element.addEventListener("input", callback);
  }

  onChange(callback) {
    this.element.addEventListener("change", callback);
  }

  onFocus(callback) {
    this.element.addEventListener("focus", callback);
  }

  onBlur(callback) {
    this.element.addEventListener("blur", callback);
  }
}
