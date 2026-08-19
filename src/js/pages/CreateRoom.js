import { BackButton } from "../components/BackButton.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { InputField } from "../components/InputField.js";
import { createPlayerNote } from "../utils/index.js";

export class CreateRoom {
  constructor(props = {}) {
    this.props = props;
  }
  render() {
    const container = document.createElement("div");
    container.classList.add("create-room-container");

    const form = this.createForm();
    const backButton = new BackButton(() => this.props.onBack());

    container.append(form, backButton.element);
    return container;
  }

  createForm() {
    const errorMessage = document.createElement("div");
    errorMessage.classList.add("error-msg");

    const showError = (message) => {
      errorMessage.textContent = message;
      errorMessage.classList.add("show");
    };

    const clearError = () => {
      errorMessage.textContent = "";
      errorMessage.classList.remove("show");
    };

    const form = document.createElement("form");
    form.classList.add("card");

    const nameField = new InputField({
      label: "Your Name",
      id: "playerName",
      placeholder: "e.g. Gio",
    });

    nameField.onInputChange(() => {
      if (nameField.getInputValue().length >= 3) {
        clearError();
      }
    });

    const createRoomBtn = new Button({
      variant: "blue",
      text: "Create Room",
      type: "submit",
    });

    createRoomBtn.addClass("block");

    form.append(
      createPlayerNote("X", "1"),
      nameField.element,
      errorMessage,
      createRoomBtn.element,
    );

    //submit form handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = nameField.getInputValue().trim();
      clearError();

      if (name.length < 3) {
        showError("Player Name should be at least 3 characters");
        return;
      }

      this.props.onRoomCreate(name);
    });

    return form;
  }
}
