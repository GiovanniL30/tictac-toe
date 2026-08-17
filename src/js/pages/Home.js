import { Button } from "../components/Button.js";

export class Home {
  constructor(props = {}) {
    this.props = props;
  }

  render() {
    const container = document.createElement("div");
    container.classList.add("home-container");

    const contents = document.createElement("div");
    contents.classList.add("contents");

    const header = this.createHeader();
    const buttons = this.createActionButtons();

    contents.append(header, buttons);
    container.append(contents);

    return container;
  }

  createActionButtons() {
    const btnContainers = document.createElement("div");
    btnContainers.classList.add("btn-row");

    const createRoomBtn = new Button({
      text: "CREATE A ROOM",
      variant: "blue",
    });
    const joinRoomBtn = new Button({
      text: "JOIN A ROOM",
      variant: "secondary",
    });

    createRoomBtn.onClick(() => {
      this.props.onCreateRoom();
    });

    joinRoomBtn.onClick(() => {
      this.props.onJoinRoom();
    });

    btnContainers.append(createRoomBtn.element, joinRoomBtn.element);

    return btnContainers;
  }

  createHeader() {
    const headerContainer = document.createElement("div");
    headerContainer.classList.add("header-container");

    const tictactoeContainer = document.createElement("div");
    tictactoeContainer.classList.add("hero-sticker");

    const titleH1 = document.createElement("h1");
    const title = ["TIC", "TAC", "TOE"];

    for (let i = 0; i < title.length; i++) {
      const span = document.createElement("span");
      span.textContent = title[i];
      titleH1.append(span);
    }

    const tagline = document.createElement("p");
    tagline.textContent = "grab a friend, share a code, play";
    tagline.classList.add("tagline");

    tictactoeContainer.append(titleH1);
    headerContainer.append(tictactoeContainer, tagline);

    return headerContainer;
  }
}
