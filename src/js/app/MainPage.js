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
import { generateCode } from "../utils/index.js";

export class MainPage {
  constructor() {
    this.container = document.querySelector("#app");
    this.api = new LocalHostApi();
    this.gameState = new GameState();

    this.channel = null;

    this.activeModal = null;
    this.activeGame = null;

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
            const key = generateCode();

            try {
              const response = await this.api.createGame(key);
              this.gameState.key = key;
              this.gameState.playerCode = response;
              this.gameState.playerName = playerName;

              GameStorage.createPlayers(key, playerName, response);

              this.openChannel(key);

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
                this.gameState.spectatorId = crypto.randomUUID();
                GameStorage.touchSpectator(
                  key,
                  this.gameState.spectatorId,
                  playerName,
                );
                this.openChannel(key);
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

              this.openChannel(key);

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

            this.closeChannel();
            this.setState(GameState.PAGE_STATES.HOME);
            new Toast("Game room canceled.");
          },
        });

      case GameState.PAGE_STATES.GAME_START:
        return new Game({
          key: this.gameState.key,
          player: this.gameState.playerCode,
          spectatorId: this.gameState.spectatorId,

          onCheckBoard: () => {
            return this.api.checkBoardStatus(this.gameState.key);
          },

          onTurnChange: (currentTurn) => {
            this.gameState.currentTurn = currentTurn;
          },

          onGameEnd: (winner, game) => {
            const modal = new ResetGameModal({
              title: "Game Over!",
              winner,
              player: this.gameState.playerCode,
              isSpectator: this.gameState.playerCode === "spectator",
              key: this.gameState.key,

              onPlayAgain: (modal) => this.playAgain(modal, game),
              onSpectatorLeave: (modal) => this.leaveGame(modal, game),
              onSpectatorStay: (modal) => modal.hide(),
              onQuitGame: (modal) => this.quitGame(modal, game),
            });

            this.activeModal = modal;
            this.activeGame = game;

            modal.show();
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

  async playAgain(modal, game) {
    const key = this.gameState.key;
    if (this.gameState.playerCode !== "X") return;

    try {
      game.destroy();

      await this.api.resetGame(key);
      const response = await this.api.createGame(key);

      if (response !== "X") {
        throw new Error(`Expected X but received ${response}`);
      }

      this.channel.postMessage({ type: "restart-ready" });

      this.activeModal = null;
      this.activeGame = null;

      modal.hide();
      this.setState(GameState.PAGE_STATES.GAME_START);
    } catch (e) {
      console.error(e);
      new Toast("Failed to start a new game." + e);
    }
  }

  async handleRestartReady() {
    const key = this.gameState.key;

    if (!this.activeModal || !this.activeGame) return;

    try {
      const response = await this.api.createGame(key);
      if (response !== "O") return;

      this.activeGame.destroy();

      this.gameState.playerCode = "O";
      GameStorage.setPlayer(key, this.gameState.playerName, "O");

      this.activeModal.hide();
      this.activeModal = null;
      this.activeGame = null;

      this.setState(GameState.PAGE_STATES.GAME_START);
    } catch (e) {
      new Toast("Failed to join the new game.");
    }
  }

  // QUIT / LEAVE
  async quitGame(modal, game) {
    try {
      this.channel.postMessage({
        type: "quit",
        player: this.gameState.playerCode,
      });

      await this.api.resetGame(this.gameState.key);
      this.leaveGame(modal, game);
    } catch (e) {
      new Toast("Failed to quit game.");
    }
  }

  leaveGame(modal, game) {
    game.destroy();

    this.activeModal = null;
    this.activeGame = null;

    this.gameState.clearSession();
    this.gameState.clearData();

    this.closeChannel();

    this.setState(GameState.PAGE_STATES.HOME);

    modal.hide();
  }

  handleOpponentQuit() {
    if (this.activeGame) {
      this.activeGame.destroy();
    }

    if (this.activeModal) {
      this.activeModal.hide();
    }

    this.activeModal = null;
    this.activeGame = null;

    new Toast("The other player left the game.");

    this.gameState.clearSession();
    this.gameState.clearData();

    this.closeChannel();
    this.setState(GameState.PAGE_STATES.HOME);
  }

  // BROADCAST CHANNEL
  openChannel(key) {
    this.closeChannel();

    this.channel = new BroadcastChannel(`tictactoe-${key}`);

    this.channel.onmessage = (event) => {
      const { type, player } = event.data;

      if (type === "quit" && player !== this.gameState.playerCode) {
        this.handleOpponentQuit();
      }

      if (type === "restart-ready" && this.gameState.playerCode === "O") {
        this.handleRestartReady();
      }
    };
  }

  closeChannel() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
