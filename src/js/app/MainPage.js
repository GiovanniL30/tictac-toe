import { Modal } from "../components/modal/Modal.js";
import { ResetGameModal } from "../components/modal/ResetGameModal.js";
import { Toast } from "../components/Toast.js";
import { CreateRoom } from "../pages/CreateRoom.js";
import { Game } from "../pages/Game.js";
import { Home } from "../pages/Home.js";
import { JoinRoom } from "../pages/JoinRoom.js";
import { WaitingRoom } from "../pages/WaitingRoom.js";
import { LocalHostApi } from "../services/LocalHostApi.js";
import { GameState } from "../state/GameState.js";
import { GameStorage } from "../state/GameStorage.js";

export class MainPage {
  constructor() {
    this.container = document.querySelector("#app");
    this.api = new LocalHostApi();
    this.gameState = new GameState();

    this.render();
  }

  setState(pageState) {
    this.gameState.pageState = pageState;
    this.render();
  }

  render() {
    this.container.replaceChildren();
    const page = this.createPage();

    this.container.append(page.render());
  }

  createPage() {
    switch (this.gameState.pageState) {
      case GameState.PAGE_STATES.HOME:
        return new Home({
          onCreateRoom: () => this.setState(GameState.PAGE_STATES.CREATE_ROOM),
          onJoinRoom: () => this.setState(GameState.PAGE_STATES.JOIN_ROOM),
        });

      case GameState.PAGE_STATES.CREATE_ROOM:
        return new CreateRoom({
          onBack: () => this.setState(GameState.PAGE_STATES.HOME),
          onRoomCreate: async (playerName) => {
            const key = this.generateCode();

            try {
              const response = await this.api.createGame(key);
              this.gameState.key = key;
              this.gameState.playerCode = response;
              this.gameState.playerName = playerName;

              GameStorage.createPlayers(key, playerName, response);

              this.setState(GameState.PAGE_STATES.WAITING_ROOM);
              new Toast("Created a new room.");
            } catch (e) {
              new Toast("Failed to create new room." + e);
            }
          },
        });

      case GameState.PAGE_STATES.JOIN_ROOM:
        return new JoinRoom({
          onBack: () => this.setState(GameState.PAGE_STATES.HOME),
          onJoin: async (key, playerName) => {
            try {
              const response = await this.api.createGame(key);
              this.gameState.key = key;
              this.gameState.playerName = playerName;

              if (response != "X" && response != "O") {
                this.gameState.playerCode = "spectator";
                this.setState(GameState.PAGE_STATES.GAME_START);
                new Toast("Game already started, joining as spectator.");
                return;
              }

              this.gameState.playerCode = response;

              if (response == "X") {
                GameStorage.createPlayers(key, playerName, response);
              } else {
                GameStorage.setPlayer(key, playerName, response);
              }

              this.setState(GameState.PAGE_STATES.GAME_START);
            } catch (e) {
              new Toast("Failed to join the room.");
            }
          },
        });

      case GameState.PAGE_STATES.WAITING_ROOM:
        return new WaitingRoom({
          key: this.gameState.key,

          onCheckRoom: () => {
            return this.api.checkGameStatus(this.gameState.key);
          },

          onGameStart: () => {
            this.setState(GameState.PAGE_STATES.GAME_START);
            new Toast("Player joined! Starting game.");
          },

          onBack: async () => {
            try {
              await this.api.resetGame(this.gameState.key);
            } catch (e) {}

            this.setState(GameState.PAGE_STATES.HOME);
            new Toast("Game room canceled.");
          },
        });

      case GameState.PAGE_STATES.GAME_START:
        return new Game({
          key: this.gameState.key,
          player: this.gameState.playerCode,

          onCheckBoard: () => {
            return this.api.checkBoardStatus(this.gameState.key);
          },

          onTurnChange: (currentTurn) => {
            this.gameState.currentTurn = currentTurn;
          },

          onGameEnd: (winner, game) => {
            new ResetGameModal({
              title: "Game Over!",
              winner,
              player: this.gameState.playerCode,
              isSpectator: this.gameState.playerCode === "spectator",
              key: this.gameState.key,

              onPlayAgain: (modal) => this.playAgain(modal, game),
              onWaitForGame: (modal) => this.waitForNewGame(modal, game),
              onSpectatorLeave: (modal) => this.leaveGame(modal, game),
              onSpectatorStay: (modal) => modal.hide(),
              onQuitGame: (modal) => this.quitGame(modal, game),
            }).show();
          },
          onCellClick: async (i) => {
            if (this.gameState.currentTurn !== this.gameState.playerCode) {
              return;
            }

            const x = i % 3;
            const y = Math.floor(i / 3);

            try {
              await this.api.addMove({
                key: this.gameState.key,
                tile: this.gameState.playerCode,
                x,
                y,
              });
            } catch (e) {
              console.error(e);
              new Toast("Failed to make move.");
            }
          },
        });

      default:
        throw new Error(`Unknown page state: ${this.gameState.pageState}`);
    }
  }

  generateCode(length = 4) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";

    for (let i = 0; i < length; i++) {
      const index = Math.floor(Math.random() * characters.length);
      code += characters[index];
    }

    return code;
  }

  async playAgain(modal, game) {
    const key = this.gameState.key;

    if (this.gameState.playerCode !== "X") {
      return;
    }

    try {
      game.destroy();

      GameStorage.createReset(key);

      await this.api.resetGame(key);
      const response = await this.api.createGame(key);

      if (response !== "X") {
        throw new Error(`Expected X but received ${response}`);
      }

      modal.hide();
      this.setState(GameState.PAGE_STATES.GAME_START);
    } catch (e) {
      console.error(e);
      GameStorage.clearReset(key);
      new Toast("Failed to start a new game." + e);
    }
  }

  waitForNewGame(modal, game) {
    const key = this.gameState.key;

    const finish = () => {
      console.log("Joining");
      this.stopRestartPolling();
      game.destroy();
      this.gameState.playerCode = "O";
      GameStorage.setPlayer(key, this.gameState.playerName, "O");
      GameStorage.clearReset(key);
      modal.hide();
      this.setState(GameState.PAGE_STATES.GAME_START);
    };

    this.restartPolling = setInterval(async () => {
      const reset = GameStorage.getReset(key);

      console.log(reset);
      console.log("Attempting to join");

      if (!reset || !reset.started) {
        console.log("Failed to join. player x no reset");
        return;
      }

      try {
        const response = await this.api.createGame(key);
        console.log(response);
        if (response === "O") finish();
      } catch (e) {}
    }, 500);
  }

  stopRestartPolling() {
    if (this.restartPolling) {
      clearInterval(this.restartPolling);
      this.restartPolling = null;
    }
  }

  async quitGame(modal, game) {
    try {
      await this.api.resetGame(this.gameState.key);
      this.leaveGame(modal, game);
    } catch (e) {
      new Toast("Failed to quit game.");
    }
  }

  leaveGame(modal, game) {
    this.stopRestartPolling();

    game.destroy();

    this.gameState.clearSession();
    this.gameState.clearData();

    this.setState(GameState.PAGE_STATES.HOME);

    modal.hide();
  }
}
