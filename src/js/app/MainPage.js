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
import { RoomNotFoundError } from "../utils/exceptions/RoomNotFoundError.js";
import { ConfirmationModal } from "../components/modal/ConfirmationModal.js";
import { ServerDownModal } from "../components/modal/ServerDownModal.js";

const OPPONENT_GRACE_MS = 2000;

export class MainPage {
  constructor() {
    this.container = document.querySelector("#app");
    this.api = new LocalHostApi();
    this.gameState = new GameState();

    this.channel = null;

    this.activeModal = null;
    this.activeGame = null;

    this.leaving = false;
    this.pageExitHandler = null;
    this.pageshowHandler = null;
    this.opponentGraceTimer = null;

    this.serverStatusPolling = null;

    this.startServerStatusPolling();
    this.render();
    this.handleReloadRestore();
  }

  async handleReloadRestore() {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    const isReload =
      nav?.type === "reload" || performance.navigation?.type === 1;

    if (!isReload) return;

    if (!this.gameState.restoreSession()) return;

    if (
      this.gameState.playerCode !== "X" &&
      this.gameState.playerCode !== "O"
    ) {
      this.gameState.clearSession();
      return;
    }

    try {
      const status = await this.api.checkGameStatus(this.gameState.key);

      if (status !== "true") {
        this.gameState.clearSession();
        return;
      }

      this.openChannel(this.gameState.key);
      this.registerPageExit();

      this.channel.postMessage({
        type: "back",
        player: this.gameState.playerCode,
      });

      new Toast("Game Session Restored.", 2000);
      this.setState(GameState.PAGE_STATES.GAME_START);
    } catch (e) {
      this.gameState.clearSession();
    }
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
              this.gameState.saveSession();

              GameStorage.createPlayers(key, playerName, response);

              this.openChannel(key);
              this.registerPageExit();

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
            const response = await this.api.createGame(key);

            if (response === "X") {
              await this.api.resetGame(key).catch(() => {});
              throw new RoomNotFoundError();
            }

            this.gameState.key = key;
            this.gameState.playerName = playerName;

            if (response != "O") {
              this.gameState.playerCode = "spectator";
              this.gameState.spectatorId = crypto.randomUUID();
              GameStorage.touchSpectator(
                key,
                this.gameState.spectatorId,
                playerName,
              );
              this.openChannel(key);
              this.registerPageExit();
              this.setState(GameState.PAGE_STATES.GAME_START);
              new Toast("Game already started, joining as spectator.");
              return;
            }

            this.gameState.playerCode = response;
            GameStorage.setPlayer(key, playerName, response);
            this.gameState.saveSession();

            this.openChannel(key);
            this.registerPageExit();

            this.setState(GameState.PAGE_STATES.GAME_START);
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

            this.leaving = true;
            GameStorage.removeRoom(this.gameState.key);
            this.gameState.clearSession();
            this.deregisterPageExit();
            this.closeChannel();
            this.setState(GameState.PAGE_STATES.HOME);
            new Toast("Game room canceled.");
          },
        });

      case GameState.PAGE_STATES.GAME_START:
        const game = new Game({
          key: this.gameState.key,
          player: this.gameState.playerCode,
          spectatorId: this.gameState.spectatorId,

          onCheckBoard: () => {
            return this.api.checkBoardStatus(this.gameState.key);
          },

          onCheckStatus: () => {
            return this.api.checkGameStatus(this.gameState.key);
          },

          onOpponentQuit: () => {
            if (this.activeModal) {
              return;
            }

            this.activeGame = game;
            this.handleOpponentQuit();
          },

          onQuit: () => {
            const isSpectator = this.gameState.playerCode === "spectator";

            const modal = new ConfirmationModal({
              title: isSpectator
                ? "Stop spectating?"
                : "Are you sure you want to quit?",

              message: isSpectator
                ? "You will stop watching the game and return to the home screen."
                : "Quitting the game will end it for all players and return everyone to the home screen.",

              confirmText: isSpectator ? "Stop Spectating" : "Quit Game",
              cancelText: "Cancel",
              onConfirm: (modal) =>
                isSpectator
                  ? this.leaveGame(modal, game)
                  : this.quitGame(modal, game),
              onCancel: (modal) => modal.hide(),
            });

            modal.show();
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

            setTimeout(() => {
              if (this.activeModal === modal) {
                modal.show();
              }
            }, 1200);
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

        this.activeGame = game;

        return game;

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

    this.clearOpponentGrace();

    this.activeModal = null;
    this.activeGame = null;

    this.leaving = true;

    if (this.gameState.playerCode == "X" || this.gameState.playerCode == "O") {
      GameStorage.removeRoom(this.gameState.key);
    }

    this.gameState.clearSession();
    this.gameState.clearData();

    this.deregisterPageExit();
    this.closeChannel();

    this.setState(GameState.PAGE_STATES.HOME);

    modal.hide();
  }

  async handleOpponentQuit() {
    if (this.activeGame) {
      this.activeGame.destroy();
    }

    if (this.activeModal) {
      this.activeModal.hide();
    }

    this.clearOpponentGrace();

    this.activeModal = null;
    this.activeGame = null;

    this.leaving = true;

    try {
      await this.api.resetGame(this.gameState.key);
    } catch (e) {}

    GameStorage.removeRoom(this.gameState.key);

    new Toast("The other player left the game.");

    this.gameState.clearSession();
    this.gameState.clearData();

    this.deregisterPageExit();
    this.closeChannel();
    this.setState(GameState.PAGE_STATES.HOME);
  }

  // OPPONENT GRACE PERIOD (lets a refresh survive without ending the game)
  startOpponentGrace() {
    this.clearOpponentGrace();

    this.opponentGraceTimer = setTimeout(() => {
      this.opponentGraceTimer = null;
      this.handleOpponentQuit();
    }, OPPONENT_GRACE_MS);
  }

  clearOpponentGrace() {
    if (this.opponentGraceTimer) {
      clearTimeout(this.opponentGraceTimer);
      this.opponentGraceTimer = null;
    }
  }

  // PAGE EXIT (refresh / tab quit)
  registerPageExit() {
    if (this.pageExitHandler) {
      return;
    }

    this.pageExitHandler = () => {
      if (this.leaving) {
        return;
      }

      if (!this.gameState.key) {
        return;
      }

      if (
        this.gameState.playerCode !== "X" &&
        this.gameState.playerCode !== "O"
      ) {
        return;
      }

      if (this.gameState.pageState === GameState.PAGE_STATES.WAITING_ROOM) {
        // No opponent yet, safe to always tear down immediately
        this.api
          .resetGame(this.gameState.key, { keepalive: true })
          .catch(() => {});
        GameStorage.removeRoom(this.gameState.key);
        this.gameState.clearSession();
        return;
      }

      // Mid-game: don't end the room, just tell the other tab
      // we're gone for now, and let their grace timer decide.
      if (this.channel) {
        this.channel.postMessage({
          type: "leaving",
          player: this.gameState.playerCode,
        });
      }
    };

    this.pageshowHandler = (event) => {
      if (event.persisted && this.channel && this.gameState.playerCode) {
        this.channel.postMessage({
          type: "back",
          player: this.gameState.playerCode,
        });
      }
    };

    window.addEventListener("pagehide", this.pageExitHandler);
    window.addEventListener("beforeunload", this.pageExitHandler);
    window.addEventListener("pageshow", this.pageshowHandler);
  }

  deregisterPageExit() {
    if (this.pageExitHandler) {
      window.removeEventListener("pagehide", this.pageExitHandler);
      window.removeEventListener("beforeunload", this.pageExitHandler);
      window.removeEventListener("pageshow", this.pageshowHandler);
      this.pageExitHandler = null;
      this.pageshowHandler = null;
    }

    this.clearOpponentGrace();
  }

  // BROADCAST CHANNEL
  openChannel(key) {
    this.closeChannel();

    this.channel = new BroadcastChannel(`tictactoe-${key}`);

    this.channel.onmessage = (event) => {
      const { type, player } = event.data;

      if (player === this.gameState.playerCode) {
        return;
      }

      if (type === "quit") {
        this.clearOpponentGrace();
        this.handleOpponentQuit();
      }

      if (type === "leaving") {
        console.log("a player leaves");
        this.startOpponentGrace();
      }

      if (type === "back") {
        this.clearOpponentGrace();
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

  startServerStatusPolling() {
    this.serverStatusPolling = setInterval(async () => {
      try {
        await this.api.checkGameStatus("1234");
      } catch (e) {
        console.error("Server is down:", e);
        this.stopServerStatusPolling();
        this.handleServerDown();
      }
    }, 500);
  }

  stopServerStatusPolling() {
    if (this.serverStatusPolling) {
      clearInterval(this.serverStatusPolling);
      this.serverStatusPolling = null;
    }
  }

  handleServerDown() {
    if (this.leaving) return;

    if (this.activeModal) {
      this.activeModal.hide();
      this.activeModal = null;
    }

    if (this.activeGame) {
      this.activeGame.destroy();
      this.activeGame = null;
    }

    this.clearOpponentGrace();

    this.leaving = true;

    if (this.gameState.key) {
      GameStorage.removeRoom(this.gameState.key);
    }

    this.gameState.clearSession();
    this.gameState.clearData();

    this.deregisterPageExit();
    this.closeChannel();

    this.setState(GameState.PAGE_STATES.HOME);

    const modal = new ServerDownModal({
      onDismiss: (modal) => {
        modal.hide();
        this.leaving = false;
        this.startServerStatusPolling();
      },
    });

    this.activeModal = modal;
    modal.show();
  }
}
