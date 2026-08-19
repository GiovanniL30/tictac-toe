import { GameStorage } from "../../state/GameStorage.js";
import { createLoadingDots } from "../../utils/index.js";
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
    onSpectatorLeave,
    onSpectatorStay,
    onQuitGame,
  }) {
    super({ title });

    this.player = player;
    this.isSpectator = isSpectator;

    this.onPlayAgain = onPlayAgain;
    this.onSpectatorLeave = onSpectatorLeave;
    this.onSpectatorStay = onSpectatorStay;
    this.onQuitGame = onQuitGame;

    const players = GameStorage.getPlayers(key);

    let message;
    let imgSrc = null;
    let drawMascots = false;

    if (isSpectator) {
      if (winner === "DRAW") {
        message = "It's a Draw!";
      } else {
        const winnerName = players[winner] ?? `Player ${winner}`;
        message = `${winnerName} Wins!`;
      }
    } else if (winner === "DRAW") {
      this.modalContainer.classList.add("blue");
      drawMascots = true;
      message = "It's a Draw!";
    } else {
      const myMascot = player === "X" ? "cat" : "dog";

      if (winner === player) {
        this.modalContainer.classList.add("blue");
        imgSrc = `/src/assets/icons/${myMascot}-mascot.svg`;
        message = "You Win!";
      } else {
        this.modalContainer.classList.add("red");
        imgSrc = `/src/assets/icons/${myMascot}-mascot-cry.svg`;
        message = "You Lose!";
      }
    }

    this.drawMascots = drawMascots;

    this.modalContainer.querySelector("h2").textContent = message;

    this.generateContent(message, imgSrc);
    this.modalContainer.append(this.generateButtons());
  }

  generateContent(message, imgSrc) {
    if (this.isSpectator) {
      return;
    }

    const messageContainer = document.createElement("div");

    messageContainer.classList.add("game-result");

    if (this.drawMascots) {
      const mascotsRow = document.createElement("div");
      mascotsRow.classList.add("draw-mascots");

      const catSticker = document.createElement("img");
      catSticker.classList.add("sticker");
      catSticker.src = "/src/assets/icons/cat-mascot.svg";

      const dogSticker = document.createElement("img");
      dogSticker.classList.add("sticker");
      dogSticker.src = "/src/assets/icons/dog-mascot.svg";

      mascotsRow.append(catSticker, dogSticker);
      messageContainer.append(mascotsRow);
    } else if (imgSrc) {
      const sticker = document.createElement("img");

      sticker.classList.add("sticker");
      sticker.src = imgSrc;

      messageContainer.append(sticker);
    }

    // O gets the waiting message
    if (this.player === "O") {
      const waitingContainer = document.createElement("div");
      waitingContainer.classList.add("waiting-container");

      const loadingDots = createLoadingDots();

      const waitingMessage = document.createElement("p");
      waitingMessage.classList.add("waiting-message");
      waitingMessage.textContent = "Waiting for Player X to start a new game.";

      waitingContainer.append(loadingDots, waitingMessage);
      messageContainer.append(waitingContainer);
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
        variant: "secondary",
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
