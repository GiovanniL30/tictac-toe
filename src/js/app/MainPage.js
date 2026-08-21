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
import { Confetti } from "../components/Confetti.js";
import { VsEntrance } from "../components/VsEntrance.js";

export class MainPage {
  constructor() {
    this.container = document.querySelector("#app");
    this.api = new LocalHostApi();
    this.gameState = new GameState();

    this.activeModal = null;
    this.activeGame = null;
    this.confetti = null;
    this.vsEntrance = null;

    this.leaving = false;
    this.pageExitHandler = null;
    this.opponentGraceTimer = null;

    this.serverStatusPolling = null;
    this.gameQuitPolling = null;

    this.startServerStatusPolling();
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
              this.gameState.saveSession();

              GameStorage.createPlayers(key, playerName, response);

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
              GameStorage.touchSpectator(key, this.gameState.spectatorId, playerName);
              this.registerPageExit();
              this.setState(GameState.PAGE_STATES.GAME_START);
              new Toast("Game already started, joining as spectator.");
              return;
            }

            this.gameState.playerCode = response;
            GameStorage.setPlayer(key, playerName, response);
            this.gameState.saveSession();

            this.registerPageExit();
            this.startQuitPolling(key);

            this.setState(GameState.PAGE_STATES.GAME_START);
            this.playVsEntrance();
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
            this.playVsEntrance();
          },

          onBack: async () => {
            try {
              await this.api.resetGame(this.gameState.key);
            } catch (e) {}

            this.leaving = true;
            GameStorage.removeRoom(this.gameState.key);
            this.gameState.clearSession();

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

          onQuit: () => {
            this.startQuitPolling(this.gameState.key);
            const isSpectator = this.gameState.playerCode === "spectator";

            const modal = new ConfirmationModal({
              title: isSpectator ? "Stop spectating?" : "Are you sure you want to quit?",

              message: isSpectator
                ? "You will stop watching the game and return to the home screen."
                : "Quitting the game will end it for all players and return everyone to the home screen.",

              confirmText: isSpectator ? "Stop Spectating" : "Quit Game",
              cancelText: "Cancel",
              onConfirm: (modal) => {
                if (isSpectator) {
                  this.leaveGame(modal, game);
                } else {
                  this.quitGame(modal, game);
                }
              },
              onCancel: (modal) => modal.hide(),
            });

            modal.show();
          },

          onTurnChange: (currentTurn) => {
            this.gameState.currentTurn = currentTurn;
          },

          onGameEnd: (winner, game) => {
            this.activeGame = game;
            this.startQuitPolling(this.gameState.key);

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

            setTimeout(() => {
              this.celebrateWinner(winner, modal);
            }, 1200);

            setTimeout(() => {
              if (this.activeModal === modal) {
                modal.show();
              }
            }, 1200);
          },

          onCellClick: async (i) => {
            if (this.gameState.currentTurn !== this.gameState.playerCode) {
              return false;
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

              return true;
            } catch (e) {
              console.error(e);
              new Toast("Failed to make move.");
              return false;
            }
          },
        });

        this.activeGame = game;
        this.startQuitPolling(this.gameState.key);

        return game;

      default:
        throw new Error(`Unknown page state: ${this.gameState.pageState}`);
    }
  }

  // CONFETTI
  celebrateWinner(winner, modal) {
    this.destroyConfetti();

    if (winner === "DRAW" || winner !== this.gameState.playerCode) {
      return;
    }

    const parent = modal?.overlay ?? document.body;
    this.confetti = new Confetti(parent, 2000);
    this.confetti.start();
  }

  destroyConfetti() {
    if (this.confetti) {
      this.confetti.destroy();
      this.confetti = null;
    }
  }

  // VS ENTRANCE
  playVsEntrance() {
    this.destroyVsEntrance();

    const players = GameStorage.getPlayers(this.gameState.key);

    this.vsEntrance = new VsEntrance({
      playerX: players.X ?? "Player X",
      playerO: players.O ?? "Player O",
      onComplete: () => {
        this.vsEntrance = null;
      },
    });

    this.vsEntrance.show();
  }

  destroyVsEntrance() {
    if (this.vsEntrance) {
      this.vsEntrance.destroy();
      this.vsEntrance = null;
    }
  }

  async playAgain(modal, game) {
    const key = this.gameState.key;
    if (this.gameState.playerCode !== "X") return;

    this.stopQuitPolling();
    this.stopOpponentGracePeriod();

    try {
      game.destroy();
      this.destroyConfetti();
      this.destroyVsEntrance();

      await this.api.resetGame(key);
      const response = await this.api.createGame(key);

      if (response !== "X") {
        throw new Error(`Expected X but received ${response}`);
      }

      this.activeModal = null;
      this.activeGame = null;

      modal.hide();
      this.setState(GameState.PAGE_STATES.GAME_START);
    } catch (e) {
      console.error(e);
      new Toast("Failed to start a new game." + e);
    }
  }

  // QUIT / LEAVE
  async quitGame(modal, game) {
    try {
      await this.api.resetGame(this.gameState.key);
      this.leaveGame(modal, game);
    } catch (e) {
      new Toast("Failed to quit game.");
    }
  }

  leaveGame(modal, game) {
    game.destroy();
    this.destroyConfetti();
    this.destroyVsEntrance();

    this.stopQuitPolling();

    this.activeModal = null;
    this.activeGame = null;

    this.leaving = true;

    if (this.gameState.playerCode == "X" || this.gameState.playerCode == "O") {
      GameStorage.removeRoom(this.gameState.key);
    }

    this.gameState.clearSession();
    this.gameState.clearData();

    this.deregisterPageExit();

    this.setState(GameState.PAGE_STATES.HOME);

    modal.hide();
  }

  async handleOpponentQuit() {
    if (this.activeGame) {
      this.activeGame.destroy();
    }

    this.destroyConfetti();
    this.destroyVsEntrance();

    if (this.activeModal) {
      this.activeModal.hide();
    }

    this.stopQuitPolling();
    this.stopOpponentGracePeriod();

    this.activeModal = null;
    this.activeGame = null;

    this.leaving = true;

    GameStorage.removeRoom(this.gameState.key);

    new Toast("The other player left the game.");

    this.gameState.clearSession();
    this.gameState.clearData();

    this.setState(GameState.PAGE_STATES.HOME);
  }

  // PAGE EXIT (refresh / tab quit)
  registerPageExit() {
    this.pageExitHandler = () => {
      if (this.gameState.playerCode !== "X" && this.gameState.playerCode !== "O") {
        return;
      }

      const key = this.gameState.key;
      this.api.resetGame(key, { keepalive: true }).catch((e) => console.error("Exit reset failed:", e));
      GameStorage.removeRoom(key);
      this.gameState.clearSession();
    };

    window.addEventListener("pagehide", this.pageExitHandler);
    window.addEventListener("beforeunload", this.pageExitHandler);
  }

  deregisterPageExit() {
    window.removeEventListener("pagehide", this.pageExitHandler);
    window.removeEventListener("beforeunload", this.pageExitHandler);

    this.pageExitHandler = null;
  }

  startQuitPolling(gameKey) {
    this.stopQuitPolling();

    this.gameQuitPolling = setInterval(async () => {
      try {
        const response = await this.api.checkGameStatus(gameKey);
        console.log("quit polling");

        if (response === "false") {
          console.log("Opponent may have left.");
          this.startOpponentGracePeriod(gameKey);
        }
      } catch (e) {
        console.log(e);
      }
    }, 500);
  }

  stopQuitPolling() {
    if (this.gameQuitPolling) {
      clearInterval(this.gameQuitPolling);
      this.gameQuitPolling = null;
    }
  }

  startOpponentGracePeriod(gameKey) {
    if (this.opponentGraceTimer) {
      return;
    }

    console.log("Starting opponent grace period...");

    this.opponentGraceTimer = setTimeout(() => {
      this.opponentGraceTimer = null;

      this.handleRestartOrQuit(gameKey);
    }, 1500);
  }

  async handleRestartOrQuit(gameKey) {
    try {
      console.log("Checking if X restarted...");

      const response = await this.api.createGame(gameKey);

      console.log("createGame response:", response);

      if (response === "O") {
        // X restarted, so become O
        this.stopQuitPolling();
        this.stopOpponentGracePeriod();

        this.activeGame?.destroy();

        this.destroyConfetti();
        this.destroyVsEntrance();

        this.gameState.playerCode = "O";

        GameStorage.setPlayer(gameKey, this.gameState.playerName, "O");

        this.activeModal?.hide();

        this.activeModal = null;
        this.activeGame = null;

        this.setState(GameState.PAGE_STATES.GAME_START);
        return;
      }

      // createGame returned X
      // Therefore the room was actually reset/abandoned.
      console.log("Opponent actually quit.");

      if (response === "X") {
        this.handleOpponentQuit();
      }
    } catch (e) {
      console.error("Failed to determine opponent status:", e);
    }
  }

  stopOpponentGracePeriod() {
    if (this.opponentGraceTimer) {
      clearTimeout(this.opponentGraceTimer);
      this.opponentGraceTimer = null;
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

    this.destroyConfetti();
    this.destroyVsEntrance();

    this.stopQuitPolling();

    this.leaving = true;

    if (this.gameState.key) {
      GameStorage.removeRoom(this.gameState.key);
    }

    this.gameState.clearSession();
    this.gameState.clearData();

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
