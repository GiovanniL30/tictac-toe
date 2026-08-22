import { ResetGameModal } from "../components/modal/ResetGameModal.js";
import { ReconnectingModal } from "../components/modal/ReconnectingModal.js";
import { Toast } from "../components/Toast.js";
import { CreateRoom } from "../pages/CreateRoom.js";
import { Game } from "../pages/Game.js";
import { Home } from "../pages/Home.js";
import { JoinRoom } from "../pages/JoinRoom.js";
import { WaitingRoom } from "../pages/WaitingRoom.js";
import { LocalHostApi } from "../services/LocalHostApi.js";
import { GameState } from "../state/GameState.js";
import { GameStorage } from "../state/GameStorage.js";
import { createLoadingDots, generateCode } from "../utils/index.js";
import { Poller } from "../utils/Poller.js";
import { RoomNotFoundError } from "../utils/exceptions/RoomNotFoundError.js";
import { ConfirmationModal } from "../components/modal/ConfirmationModal.js";
import { ServerDownModal } from "../components/modal/ServerDownModal.js";
import { Confetti } from "../components/Confetti.js";
import { VsEntrance } from "../components/VsEntrance.js";
import { PLAYER_ROLE } from "../utils/constants/PlayerRoles.js";
import { WaitForOpponentModal } from "../components/modal/WaitForOpponentModal.js";
import { Modal } from "../components/modal/Modal.js";

const QUIT_POLL_INTERVAL_MS = 300;
const SERVER_POLL_INTERVAL_MS = 300;
const OPPONENT_GRACE_PERIOD_MS = 1000;
const SPECTATOR_RETURN_ATTEMPTS = 3;
const SPECTATOR_RETURN_DELAY_MS = 500;
const SERVER_HEALTH_CHECK_KEY = "1234";

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

    this.reconnectModal = null;
    this.spectatorReconnectModal = null;
    this.waitForOpponent = false;

    this.quitPoller = new Poller(this.checkOpponentPresence, QUIT_POLL_INTERVAL_MS);
    this.serverStatusPoller = new Poller(this.checkServerStatus, SERVER_POLL_INTERVAL_MS);

    this.render();
  }

  checkOpponentPresence = async () => {
    try {
      const response = await this.api.checkGameStatus(this.gameState.key);

      if (response === "false") {
        this.startOpponentGracePeriod();
      }
    } catch (e) {
      console.error(e);
    }
  };

  checkServerStatus = async () => {
    try {
      await this.api.checkGameStatus(SERVER_HEALTH_CHECK_KEY);
    } catch (e) {
      console.error("Server is down:", e);
      this.stopServerStatusPolling();
      this.handleServerDown();
    }
  };

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
        const home = new Home({
          onCreateRoom: () => this.setState(GameState.PAGE_STATES.CREATE_ROOM),
          onJoinRoom: () => this.setState(GameState.PAGE_STATES.JOIN_ROOM),
        });

        this.stopServerStatusPolling();
        return home;

      case GameState.PAGE_STATES.CREATE_ROOM:
        const createRoom = new CreateRoom({
          onBack: () => this.setState(GameState.PAGE_STATES.HOME),
          onRoomCreate: async (playerName) => {
            const key = generateCode();

            try {
              const response = await this.api.createGame(key);

              if (response !== "X") {
                throw new Error(`Game key ${key} already exists`);
              }

              this.gameState.key = key;
              this.gameState.playerCode = response;
              this.gameState.playerName = playerName;
              this.gameState.saveSession();

              GameStorage.createPlayers(key, playerName, response);

              this.registerPageExit();

              this.setState(GameState.PAGE_STATES.WAITING_ROOM);
              new Toast("Created a new room.");
            } catch (e) {
              this.api.request(key);
              new Toast("Failed to create new room: " + e);
            }
          },
        });

        this.startServerStatusPolling();
        return createRoom;

      case GameState.PAGE_STATES.JOIN_ROOM:
        const joinRoom = new JoinRoom({
          onBack: () => this.setState(GameState.PAGE_STATES.HOME),
          onJoin: async (key, playerName) => {
            const response = await this.api.createGame(key);

            if (response === PLAYER_ROLE.X) {
              await this.api.resetGame(key).catch(() => {});
              throw new RoomNotFoundError();
            }

            this.gameState.key = key;
            this.gameState.playerName = playerName;

            if (response !== PLAYER_ROLE.O) {
              this.gameState.playerCode = PLAYER_ROLE.SPECTATOR;
              this.gameState.spectatorId = crypto.randomUUID();
              this.registerPageExit();
              this.setState(GameState.PAGE_STATES.GAME_START);
              this.startQuitPolling();
              new Toast("Game already started, joining as spectator.");
              return;
            }

            this.gameState.playerCode = response;
            GameStorage.setPlayer(key, playerName, response);
            this.gameState.saveSession();

            this.registerPageExit();
            this.startQuitPolling();

            this.setState(GameState.PAGE_STATES.GAME_START);
            this.playVsEntrance();
          },
        });

        this.startServerStatusPolling();
        return joinRoom;

      case GameState.PAGE_STATES.WAITING_ROOM:
        const waitingRoom = new WaitingRoom({
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

        this.startServerStatusPolling();
        return waitingRoom;

      case GameState.PAGE_STATES.GAME_START: {
        const isSpectator = this.gameState.playerCode === PLAYER_ROLE.SPECTATOR;

        const game = new Game({
          key: this.gameState.key,
          player: this.gameState.playerCode,
          spectatorId: this.gameState.spectatorId,

          onCheckBoard: () => {
            return this.api.checkBoardStatus(this.gameState.key);
          },

          onQuit: () => {
            const modal = new ConfirmationModal({
              title: isSpectator ? "Stop spectating?" : "Are you sure you want to quit?",

              message: isSpectator
                ? "You will stop watching the game and return to the home screen."
                : "Quitting the game will end it for all players and return everyone to the home screen.",

              confirmText: isSpectator ? "Stop Spectating" : "Quit Game",
              cancelText: "Cancel",
              onConfirm: (modal) => (isSpectator ? this.leaveGame(modal) : this.quitGame(modal)),
              onCancel: (modal) => modal.hide(),
            });

            this.activeModal = modal;
            modal.show();
          },

          onTurnChange: (currentTurn) => {
            this.gameState.currentTurn = currentTurn;
          },

          onGameEnd: (winner) => {
            const modal = new ResetGameModal({
              title: "Game Over!",
              winner,
              player: this.gameState.playerCode,
              isSpectator,
              key: this.gameState.key,

              onPlayAgain: (modal) => this.playAgain(modal),
              onSpectatorLeave: (modal) => this.leaveGame(modal),
              onSpectatorStay: (modal) => modal.hide(),
              onQuitGame: (modal) => this.quitGame(modal),
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
        this.startQuitPolling();
        this.startServerStatusPolling();

        return game;
      }

      default:
        throw new Error(`Unknown page state: ${this.gameState.pageState}`);
    }
  }

  closeActiveModal() {
    if (this.activeModal) {
      this.activeModal.hide();
      this.activeModal = null;
    }
  }

  dismissModal(modal) {
    modal.hide();

    if (this.activeModal === modal) {
      this.activeModal = null;
    }
  }

  teardownActiveGame() {
    this.activeGame?.destroy();
    this.activeGame = null;

    this.destroyConfetti();
    this.destroyVsEntrance();
  }

  clearRoomAndSession(shouldRemoveRoom) {
    if (shouldRemoveRoom && this.gameState.key) {
      GameStorage.removeRoom(this.gameState.key);
    }

    this.gameState.clearSession();
    this.gameState.clearData();
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

  async playAgain(modal) {
    if (this.gameState.playerCode !== PLAYER_ROLE.X) return;

    const key = this.gameState.key;

    this.stopQuitPolling();
    this.stopOpponentGracePeriod();

    try {
      this.teardownActiveGame();

      await this.api.resetGame(key);
      const response = await this.api.createGame(key);

      if (response !== PLAYER_ROLE.X) {
        await this.api.resetGame(key).catch(() => {});
        throw new Error(`Expected X but received ${response}`);
      }

      this.dismissModal(modal);

      const waitModal = new WaitForOpponentModal();
      waitModal.show();
      this.waitForOpponent = true;

      setTimeout(() => {
        this.waitForOpponent = false;
        this.dismissModal(waitModal);
        this.setState(GameState.PAGE_STATES.GAME_START);
      }, OPPONENT_GRACE_PERIOD_MS + 250);
    } catch (e) {
      console.error(e);
      new Toast("Failed to start a new game." + e);
    }
  }

  // QUIT / LEAVE
  async quitGame(modal) {
    try {
      await this.api.resetGame(this.gameState.key);
      this.leaveGame(modal);
    } catch (e) {
      new Toast("Failed to quit game.");
    }
  }

  leaveGame(modal) {
    this.teardownActiveGame();
    this.stopQuitPolling();

    this.leaving = true;

    const isPlayer = this.gameState.playerCode === PLAYER_ROLE.X || this.gameState.playerCode === PLAYER_ROLE.O;
    this.clearRoomAndSession(isPlayer);

    this.deregisterPageExit();
    this.dismissModal(modal);

    this.setState(GameState.PAGE_STATES.HOME);
  }

  handleOpponentQuit() {
    this.teardownActiveGame();
    this.closeActiveModal();

    this.stopQuitPolling();
    this.stopOpponentGracePeriod();

    this.leaving = true;
    this.clearRoomAndSession(true);

    new Toast("A player left the game. Exiting...");

    this.setState(GameState.PAGE_STATES.HOME);
  }

  // PAGE EXIT (refresh / tab quit)
  registerPageExit() {
    this.pageExitHandler = () => {
      if (this.gameState.playerCode !== PLAYER_ROLE.X && this.gameState.playerCode !== PLAYER_ROLE.O) {
        return;
      }

      console.log("Register page exit");
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

  // POLLING

  startQuitPolling() {
    this.quitPoller.start();
  }

  stopQuitPolling() {
    this.quitPoller.stop();
  }

  startServerStatusPolling() {
    this.serverStatusPoller.start();
  }

  stopServerStatusPolling() {
    this.serverStatusPoller.stop();
  }

  // OPPONENT GRACE PERIOD
  startOpponentGracePeriod() {
    if (this.opponentGraceTimer) {
      return;
    }

    console.log("Starting opponent grace period...");

    this.stopQuitPolling();
    this.showReconnecting();

    if (this.activeModal) {
      this.activeModal.disableButtons();
    }

    this.opponentGraceTimer = setTimeout(() => {
      this.opponentGraceTimer = null;
      this.handleRestartOrQuit();
    }, OPPONENT_GRACE_PERIOD_MS);
  }

  stopOpponentGracePeriod() {
    if (this.opponentGraceTimer) {
      clearTimeout(this.opponentGraceTimer);
      this.opponentGraceTimer = null;
    }

    this.hideReconnecting();
  }

  showReconnecting() {
    if (this.waitForOpponent) return;

    if (this.activeModal) {
      this.activeModal.hide();
      this.activeModal.disableButtons();
    }

    const modal = new ReconnectingModal({
      message: "Checking if your opponent is still there…",
    });

    modal.show();

    this.reconnectModal = modal;
    this.activeModal = modal;
  }

  hideReconnecting() {
    if (!this.reconnectModal) {
      return;
    }

    this.reconnectModal.hide();

    if (this.activeModal === this.reconnectModal) {
      this.activeModal = null;
    }

    this.reconnectModal = null;
  }

  async handleRestartOrQuit() {
    const gameKey = this.gameState.key;
    const isSpectator = this.gameState.playerCode === PLAYER_ROLE.SPECTATOR;

    try {
      if (isSpectator) {
        const status = await this.pollForSpectatorReturn();

        if (status === "true") {
          this.stopQuitPolling();
          this.stopOpponentGracePeriod();

          this.teardownActiveGame();
          this.closeActiveModal();

          this.setState(GameState.PAGE_STATES.GAME_START);
          return;
        }

        console.log("Room still gone after retries. Ending spectate session.");
        this.showPlayerLeftModal();
        return;
      }

      const response = await this.api.createGame(gameKey);
      console.log("createGame response:", response);

      if (this.gameState.playerCode === PLAYER_ROLE.O && response === PLAYER_ROLE.O) {
        this.stopQuitPolling();
        this.stopOpponentGracePeriod();

        this.teardownActiveGame();
        this.closeActiveModal();

        this.gameState.playerCode = PLAYER_ROLE.O;
        GameStorage.setPlayer(gameKey, this.gameState.playerName, PLAYER_ROLE.O);

        this.setState(GameState.PAGE_STATES.GAME_START);
        return;
      }

      if (response === PLAYER_ROLE.X) {
        await this.api.resetGame(gameKey).catch(() => {});
        console.log("Opponent actually quit.");
        this.handleOpponentQuit();
      }
    } catch (e) {
      console.error("Failed to determine opponent status:", e);
    }
  }

  async pollForSpectatorReturn(attempts = SPECTATOR_RETURN_ATTEMPTS, delayMs = SPECTATOR_RETURN_DELAY_MS) {
    const gameKey = this.gameState.key;
    this.showSpectatorReconnecting();

    try {
      for (let i = 0; i < attempts; i++) {
        try {
          const status = await this.api.checkGameStatus(gameKey);

          if (status === "true") {
            return "true";
          }
        } catch (e) {}

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      return "false";
    } finally {
      this.hideSpectatorReconnecting();
    }
  }

  showSpectatorReconnecting() {
    if (this.spectatorReconnectModal) {
      return;
    }

    if (this.activeModal) {
      this.activeModal.hide();
    }

    const modal = new ReconnectingModal({
      message: "Checking if the match is still live…",
    });

    modal.show();

    this.spectatorReconnectModal = modal;
    this.activeModal = modal;
  }

  hideSpectatorReconnecting() {
    if (!this.spectatorReconnectModal) {
      return;
    }

    this.spectatorReconnectModal.hide();

    if (this.activeModal === this.spectatorReconnectModal) {
      this.activeModal = null;
    }

    this.spectatorReconnectModal = null;
  }

  showPlayerLeftModal() {
    this.stopQuitPolling();
    this.stopOpponentGracePeriod();

    this.teardownActiveGame();
    this.closeActiveModal();

    const isSpectator = this.gameState.playerCode === PLAYER_ROLE.SPECTATOR;

    const modal = new Modal({
      title: isSpectator ? "Game Ended" : "Opponent Left",
    });

    modal.show();

    modal.modalContainer.append(
      Object.assign(document.createElement("p"), {
        textContent: isSpectator ? "A player left the game. Spectating has ended." : "The other player left the game.",
      }),
    );

    modal.modalContainer.classList.add("center", "white");

    this.activeModal = modal;

    this.handleOpponentQuit();
  }

  handleServerDown() {
    if (this.leaving) return;

    this.closeActiveModal();
    this.teardownActiveGame();
    this.stopQuitPolling();

    this.leaving = true;
    this.clearRoomAndSession(Boolean(this.gameState.key));

    this.setState(GameState.PAGE_STATES.HOME);

    const modal = new ServerDownModal({
      onDismiss: (modal) => {
        modal.hide();
        this.leaving = false;
        this.stopServerStatusPolling();
      },
    });

    this.activeModal = modal;
    modal.show();
  }
}
