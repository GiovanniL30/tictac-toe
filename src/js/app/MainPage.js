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
        });

      case GameState.PAGE_STATES.WAITING_ROOM:
        return new WaitingRoom();

      case GameState.PAGE_STATES.GAME_START:
        return new Game();

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
