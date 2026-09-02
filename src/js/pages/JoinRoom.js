import { BackButton } from "../components/BackButton.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { InputField } from "../components/InputField.js";
import { RoomNotFoundError } from "../utils/exceptions/RoomNotFoundError.js";
import { Toast } from "../components/Toast.js";
import { createPlayerNote } from "../utils/index.js";

export class JoinRoom {
  constructor(props = {}) {
    this.props = props;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("join-room-container");

    const form = this.createForm();
    this.backButton = new BackButton(() => this.props.onBack());

    container.append(form, this.backButton.element);
    return container;
  }

  createForm() {
    const nameError = this.createErrorMsg();
    const codeError = this.createErrorMsg();

    const showError = (el, message) => {
      el.textContent = message;
      el.classList.add("show");
    };

    const clearError = (el) => {
      el.textContent = "";
      el.classList.remove("show");
    };

    const form = document.createElement("form");
    form.classList.add("card");

    this.nameField = new InputField({
      label: "Your Name",
      id: "playerName",
      placeholder: "e.g. Gio",
    });

    this.nameField.onInputChange(() => {
      if (this.nameField.getInputValue().length >= 3) {
        clearError(nameError);
      }
    });

    this.roomCodeField = new InputField({
      label: "Room Code",
      id: "roomCode",
      placeholder: "",
      isCode: true,
      maxLength: 4,
    });

    this.roomCodeField.onInputChange(() => {
      if (this.roomCodeField.getInputValue().length === 4) {
        clearError(codeError);
      }
    });

    const joinRoomBtn = new Button({
      variant: "blue",
      text: "Join Room",
      type: "submit",
    });

    joinRoomBtn.addClass("block");

    form.append(
      createPlayerNote("O", "2"),
      this.nameField.element,
      nameError,
      this.roomCodeField.element,
      codeError,
      joinRoomBtn.element,
    );

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = this.nameField.getInputValue().trim();
      const roomCode = this.roomCodeField.getInputValue().trim().toUpperCase();

      clearError(nameError);
      clearError(codeError);

      if (name.length < 3) {
        showError(nameError, "Player Name should be at least 3 characters");
        return;
      }

      if (roomCode.length !== 4) {
        showError(codeError, "Room Code should be exactly 4 characters");
        return;
      }

      try {
        joinRoomBtn.disabled = true;
        joinRoomBtn.text = "Joining Room...";
        this.backButton.element.disabled = true;
        this.nameField.input.element.disabled = true;
        this.roomCodeField.input.element.disabled = true;

        await this.props.onJoin(roomCode, name);
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          const message = "Room not found. Please check the room code.";
          showError(codeError, message);
          new Toast(message);
        } else {
          new Toast(error.message || "Failed to join the room");
        }
      } finally {
        joinRoomBtn.disabled = false;
        joinRoomBtn.text = "Join Room";
        this.backButton.element.disabled = false;
        this.nameField.input.element.disabled = false;
        this.roomCodeField.input.element.disabled = false;
      }
    });

    return form;
  }

  createErrorMsg() {
    const errorMessage = document.createElement("div");
    errorMessage.classList.add("error-msg");
    return errorMessage;
  }
}
