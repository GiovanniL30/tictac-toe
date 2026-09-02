import { ReconnectingModal } from "../components/modal/ReconnectingModal.js";
import { WaitForOpponentModal } from "../components/modal/WaitForOpponentModal.js";
import { Modal } from "../components/modal/Modal.js";
import { GameState } from "../state/GameState.js";
import { PLAYER_ROLE } from "../utils/constants/PlayerRoles.js";
import { ROOM_STATUS } from "../utils/constants/RoomStatus.js";

const OPPONENT_GRACE_PERIOD_MS = 1500;
const SPECTATOR_RETURN_ATTEMPTS = 3;
const SPECTATOR_RETURN_DELAY_MS = 500;

export class ReconnectionManager {
  constructor(context) {
    this.context = context;

    this.opponentGraceTimer = null;
    this.reconnectModal = null;
    this.spectatorReconnectModal = null;
  }

  startOpponentGracePeriod() {
    if (this.opponentGraceTimer) {
      return;
    }

    console.log("Starting opponent grace period...");

    this.context.polling.stopQuitPolling();
    this.showReconnecting();
    this.context.modals.disableActive();

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
    if (this.context.waitForOpponent) {
      return;
    }

    if (this.context.modals.activeModal) {
      this.context.modals.activeModal.hide();
      this.context.modals.activeModal.disableButtons();
    }

    const modal = new ReconnectingModal({
      message: "Checking if your opponent is still there…",
    });

    this.context.modals.show(modal);
    this.reconnectModal = modal;
  }

  hideReconnecting() {
    if (!this.reconnectModal) {
      return;
    }

    this.reconnectModal.hide();

    if (this.context.modals.activeModal === this.reconnectModal) {
      this.context.modals.activeModal = null;
    }

    this.reconnectModal = null;
  }

  async handleRestartOrQuit() {
    const gameKey = this.context.gameState.key;
    const isSpectator = this.context.gameState.playerCode === PLAYER_ROLE.SPECTATOR;

    try {
      if (isSpectator) {
        const status = await this.pollForSpectatorReturn();

        if (status === ROOM_STATUS.ACTIVE) {
          this.context.polling.stopQuitPolling();
          this.stopOpponentGracePeriod();

          this.context.teardownActiveGame();
          this.context.modals.closeActive();

          this.context.setState(GameState.PAGE_STATES.GAME_START);
          return;
        }

        console.log("Room still gone after retries. Ending spectate session.");
        this.showPlayerLeftModal();
        return;
      }

      // avoids player x to steal slot of player O
      const response = this.context.waitForOpponent
        ? ROOM_STATUS.WAIT
        : await this.context.api.createGame(gameKey);
      console.log("createGame response:", response);

      if (this.context.gameState.playerCode === PLAYER_ROLE.O && response === PLAYER_ROLE.O) {
        this.context.polling.stopQuitPolling();
        this.stopOpponentGracePeriod();

        this.context.teardownActiveGame();
        this.context.modals.closeActive();

        this.context.gameState.playerCode = PLAYER_ROLE.O;

        this.context.setState(GameState.PAGE_STATES.GAME_START);
        return;
      }

      let gameStatus = "";

      // play again wait
      if (response === ROOM_STATUS.WAIT) {
        const waitModal = new WaitForOpponentModal();

        this.context.modals.closeActive();
        this.context.modals.show(waitModal);

        for (let i = 0; i < 3; i++) {
          gameStatus = await this.context.api.checkGameStatus(gameKey);

          if (gameStatus !== ROOM_STATUS.GONE) {
            break;
          }

          if (i < 2) {
            await new Promise((resolve) => setTimeout(resolve, OPPONENT_GRACE_PERIOD_MS));
          }
        }

        this.context.modals.hide(waitModal);
      }

      this.context.waitForOpponent = false;

      // end if the response is X (first player because the lobby is already reset) / while playing again the opponent left
      if (response === PLAYER_ROLE.X || gameStatus === ROOM_STATUS.GONE) {
        await this.context.api.resetGame(gameKey).catch(() => {});
        console.log("Opponent actually quit.");
        this.context.gameFlow.handleOpponentQuit();
      }
    } catch (e) {
      this.context.modals.closeActive();
      console.error("Failed to determine opponent status:", e);
    }
  }

  async pollForSpectatorReturn(attempts = SPECTATOR_RETURN_ATTEMPTS, delayMs = SPECTATOR_RETURN_DELAY_MS) {
    const gameKey = this.context.gameState.key;
    this.showSpectatorReconnecting();

    try {
      for (let i = 0; i < attempts; i++) {
        try {
          const status = await this.context.api.checkGameStatus(gameKey);

          if (status === ROOM_STATUS.ACTIVE) {
            return ROOM_STATUS.ACTIVE;
          }
        } catch (e) {}

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      return ROOM_STATUS.GONE;
    } finally {
      this.hideSpectatorReconnecting();
    }
  }

  showSpectatorReconnecting() {
    if (this.spectatorReconnectModal) {
      return;
    }

    if (this.context.modals.activeModal) {
      this.context.modals.activeModal.hide();
    }

    const modal = new ReconnectingModal({
      message: "Checking if the match is still live…",
    });

    this.context.modals.show(modal);
    this.spectatorReconnectModal = modal;
  }

  hideSpectatorReconnecting() {
    if (!this.spectatorReconnectModal) {
      return;
    }

    this.spectatorReconnectModal.hide();

    if (this.context.modals.activeModal === this.spectatorReconnectModal) {
      this.context.modals.activeModal = null;
    }

    this.spectatorReconnectModal = null;
  }

  showPlayerLeftModal() {
    this.context.polling.stopQuitPolling();
    this.stopOpponentGracePeriod();

    this.context.teardownActiveGame();
    this.context.modals.closeActive();

    const isSpectator = this.context.gameState.playerCode === PLAYER_ROLE.SPECTATOR;

    const modal = new Modal({
      title: isSpectator ? "Game Ended" : "Opponent Left",
    });

    modal.modalContainer.append(
      Object.assign(document.createElement("p"), {
        textContent: isSpectator
          ? "A player left the game. Spectating has ended."
          : "The other player left the game.",
      }),
    );

    modal.modalContainer.classList.add("center", "white");

    this.context.modals.show(modal);

    this.context.gameFlow.handleOpponentQuit();
  }
}
