import { GameStorage } from "../../state/GameStorage.js";
import { Button } from "../Button.js";
import { Modal } from "./Modal.js";

export class ResetGameModal extends Modal {
  constructor({
    title,
    winner,
    player,
    isSpectator,
    key,
    onPlayAgain,
    onWaitForGame,
    onSpectatorLeave,
    onSpectatorStay,
    onQuitGame,
  }) {
    super({ title });

    this.player = player;
    this.isSpectator = isSpectator;

    this.onPlayAgain = onPlayAgain;
    this.onWaitForGame = onWaitForGame;
    this.onSpectatorLeave = onSpectatorLeave;
    this.onSpectatorStay = onSpectatorStay;
    this.onQuitGame = onQuitGame;

    const players = GameStorage.getPlayers(key);

    let message;
    let imgSrc;

    if (isSpectator) {
      if (winner === "DRAW") {
        message = "It's a Draw!";
      } else {
        const winnerName = players[winner] ?? `Player ${winner}`;
        message = `${winnerName} Wins!`;
      }
    } else if (winner === "DRAW") {
      this.modalContainer.classList.add("blue");
      imgSrc = "/src/assets/icons/draw-face.svg";
      message = "It's a Draw!";
    } else if (winner === player) {
      this.modalContainer.classList.add("blue");
      imgSrc = "/src/assets/icons/win-face.svg";
      message = "You Win!";
    } else {
      this.modalContainer.classList.add("red");
      imgSrc = "/src/assets/icons/lose-face.svg";
      message = "You Lose!";
    }

    this.generateContent(message, imgSrc);
    this.modalContainer.append(this.generateButtons());

    if (player === "O" && !isSpectator) {
      this.onWaitForGame(this);
    }
  }

  generateContent(message, imgSrc) {
    if (this.isSpectator) {
      const p = document.createElement("p");
      p.textContent = message;

      this.modalContainer.append(p);

      return;
    }

    const messageContainer = document.createElement("div");

    messageContainer.classList.add("game-result");

    if (imgSrc) {
      const sticker = document.createElement("img");

      sticker.classList.add("sticker");
      sticker.src = imgSrc;

      messageContainer.append(sticker);
    }

    const p = document.createElement("p");
    p.textContent = message;

    messageContainer.append(p);

    // O gets the waiting message
    if (this.player === "O") {
      const waitingMessage = document.createElement("p");
      waitingMessage.classList.add("waiting-message");
      waitingMessage.textContent = "Waiting for Player X to start a new game.";
      messageContainer.append(waitingMessage);
    }

    this.modalContainer.append(messageContainer);
  }

  generateButtons() {
    const btnContainer = document.createElement("div");

    btnContainer.classList.add("btn-row");

    // SPECTATOR
    if (this.isSpectator) {
      const stayButton = new Button({
        text: "Stay",
        variant: "primary",
      });

      const quitButton = new Button({
        text: "Quit Game",
        variant: "ghost",
      });

      stayButton.onClick(() => this.onSpectatorStay(this));
      quitButton.onClick(() => this.onSpectatorLeave(this));
      btnContainer.append(quitButton.element, stayButton.element);

      return btnContainer;
    }

    // PLAYER O
    if (this.player === "O") {
      const quitButton = new Button({
        text: "Quit Game",
        variant: "ghost",
      });

      quitButton.onClick(() => this.onQuitGame(this));
      btnContainer.append(quitButton.element);

      return btnContainer;
    }

    // PLAYER X
    const playAgainButton = new Button({
      text: "Play Again",
      variant: "primary",
    });

    const quitButton = new Button({
      text: "Quit Game",
      variant: "ghost",
    });

    playAgainButton.onClick(() => this.onPlayAgain(this));
    quitButton.onClick(() => this.onQuitGame(this));
    btnContainer.append(quitButton.element, playAgainButton.element);

    return btnContainer;
  }
}
