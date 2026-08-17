import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { InputField } from "../components/InputField.js";

export class JoinRoom {
  constructor(props = {}) {
    this.props = props;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("join-room-container");

    const form = this.createForm();
    const backButton = this.createBackButton();

    container.append(form, backButton);
    return container;
  }

  createForm() {
    const form = document.createElement("form");
    form.classList.add("card");

    const nameField = new InputField({
      label: "Your Name",
      id: "playerName",
      placeholder: "e.g. Gio",
    });

    const roomCodeField = new InputField({
      label: "Room Code",
      id: "roomCode",
      placeholder: "",
      isCode: true,
      maxLength: 4,
    });

    const createRoomBtn = new Button({
      variant: "blue",
      text: "Join Room",
    });

    createRoomBtn.addClass("block");

    form.append(
      nameField.element,
      roomCodeField.element,
      createRoomBtn.element,
    );

    return form;
  }

  createBackButton() {
    const backBtn = document.createElement("button");
    backBtn.textContent = "← back";
    backBtn.classList.add("sm", "link-btn");
    backBtn.addEventListener("click", () => this.props.onBack());

    return backBtn;
  }
}
