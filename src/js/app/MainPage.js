import { Toast } from "../components/Toast.js";
import { CreateRoom } from "../pages/CreateRoom.js";
import { Game } from "../pages/Game.js";
import { Home } from "../pages/Home.js";
import { JoinRoom } from "../pages/JoinRoom.js";
import { WaitingRoom } from "../pages/WaitingRoom.js";
import { LocalHostApi } from "../services/LocalHostApi.js";
import { GameState } from "../state/GameState.js";

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
    // const session = this.gameState.restoreSession();

    // if (session) {
    //   this.setState(GameState.PAGE_STATES.JOIN_ROOM);
    // }

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
              this.gameState.currentPlayer = response;
              this.gameState.playerName = playerName;
              this.gameState.saveSession();
              this.setState(GameState.PAGE_STATES.WAITING_ROOM);
              new Toast("Created a new room.");
            } catch (e) {
              new Toast("Failed to create new room.");
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

              if (response == "X" || response == "O") {
                this.gameState.currentPlayer = response;
              } else {
                this.gameState.currentPlayer = "spectator";
              }

              this.gameState.saveSession();
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
          player: this.gameState.currentPlayer,

          onCheckBoard: () => {
            return this.api.checkBoardStatus(this.gameState.key);
          },

          onTurnChange: (currentTurn) => {
            this.gameState.currentTurn = currentTurn;
          },

          onCellClick: async (i) => {
            if (this.gameState.currentTurn !== this.gameState.currentPlayer) {
              return;
            }

            const x = i % 3;
            const y = Math.floor(i / 3);

            try {
              await this.api.addMove({
                key: this.gameState.key,
                tile: this.gameState.currentPlayer,
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
}
