import { GameStorage } from "../../state/GameStorage.js";
import { Button } from "../Button.js";
import { Modal } from "./Modal.js";

export class ResetGameModal extends Modal {
  constructor({ title, winner, player, isSpectator, key }) {
    super({ title });

    this.isSpectator = isSpectator;

    const players = GameStorage.getPlayers(key);

    let message;
    let imgSrc;

    if (winner === "DRAW") {
      message = "It's a Draw!";
    } else if (isSpectator) {
      const winnerName = players[winner] ?? `Player ${winner}`;
      message = `${winnerName} Wins!`;
    } else if (winner === player) {
      this.modalContainer.classList.add("blue");
      imgSrc = "/src/assets/icons/win-face.svg";
      message = "You Win!";
    } else {
      this.modalContainer.classList.add("red");
      imgSrc = "/src/assets/icons/lose-face.svg";
      message = "You Lose!";
    }

    const p = document.createElement("p");
    p.textContent = message;

    if (isSpectator) {
      this.modalContainer.append(p);
    } else {
      const messageContainer = document.createElement("div");
      const sticker = document.createElement("img");
      sticker.classList.add("sticker");
      sticker.src = imgSrc;

      messageContainer.append(sticker, p);
      this.modalContainer.append(messageContainer);
    }

    this.modalContainer.append(this.generateButtons());
  }

  generateButtons() {
    const btnContainer = document.createElement("div");
    btnContainer.classList.add("btn-row");

    const playAgain = new Button({
      text: this.isSpectator ? "Stay" : "Play Again",
      variant: "primary",
    });
    const quitGame = new Button({ text: "Quit Game", variant: "ghost" });

    btnContainer.append(quitGame.element, playAgain.element);
    return btnContainer;
  }
}
