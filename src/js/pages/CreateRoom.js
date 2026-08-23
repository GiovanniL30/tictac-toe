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

    this.backButton = new BackButton(() => this.props.onBack());
    this.nameField = new InputField({
      label: "Your Name",
      id: "playerName",
      placeholder: "e.g. Gio",
    });
    const form = this.createForm();

    container.append(form, this.backButton.element);
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

    this.nameField.onInputChange(() => {
      if (this.nameField.getInputValue().length >= 3) {
        clearError();
      }
    });

    const createRoomBtn = new Button({
      variant: "blue",
      text: "Create Room",
      type: "submit",
    });

    createRoomBtn.addClass("block");

    form.append(createPlayerNote("X", "1"), this.nameField.element, errorMessage, createRoomBtn.element);

    //submit form handler
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = this.nameField.getInputValue().trim();
      clearError();

      if (name.length < 3) {
        showError("Player Name should be at least 3 characters");
        return;
      }

      createRoomBtn.disabled = true;
      createRoomBtn.text = "Creating Room...";
      this.backButton.element.disabled = true;
      this.nameField.input.element.disabled = true;

      try {
        await this.props.onRoomCreate(name);
      } catch (e) {
      } finally {
        createRoomBtn.disabled = false;
        createRoomBtn.text = "Create Room";
        this.backButton.element.disabled = false;
        this.nameField.input.element.disabled = false;
      }
    });

    return form;
  }
}
