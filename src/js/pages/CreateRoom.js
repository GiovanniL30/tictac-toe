import { BackButton } from "../components/BackButton.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { InputField } from "../components/InputField.js";

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

    const form = document.createElement("form");
    form.classList.add("card");

    const nameField = new InputField({
      label: "Your Name",
      id: "playerName",
      placeholder: "e.g. Gio",
    });

    nameField.onInputChange(() => {
      if (nameField.getInputValue().length >= 3) {
        errorMessage.textContent = "";
        errorMessage.classList.remove("show");
      }
    });

    const createRoomBtn = new Button({
      variant: "blue",
      text: "Create Room",
      type: "submit",
    });

    createRoomBtn.addClass("block");
    form.append(nameField.element, errorMessage, createRoomBtn.element);

    //submit form handler
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = nameField.getInputValue().trim();

      if (name.length < 3) {
        errorMessage.textContent =
          "Player Name should be at least 3 characters";

        errorMessage.classList.add("show");
        return;
      }

      errorMessage.classList.remove("show");

      this.props.onRoomCreate(name);
    });

    return form;
  }
}
