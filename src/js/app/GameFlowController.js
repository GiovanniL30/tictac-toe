import { ServerDownModal } from "../components/modal/ServerDownModal.js";
import { Toast } from "../components/Toast.js";
import { WaitForOpponentModal } from "../components/modal/WaitForOpponentModal.js";
import { Modal } from "../components/modal/Modal.js";
import { GameState } from "../state/GameState.js";
import { PLAYER_ROLE } from "../utils/constants/PlayerRoles.js";
import { ROOM_STATUS } from "../utils/constants/RoomStatus.js";

const OPPONENT_GRACE_PERIOD_MS = 1500;

export class GameFlowController {
  constructor(context) {
    this.context = context;
  }

  async quitGame(modal) {
    try {
      await this.context.api.resetGame(this.context.gameState.key);
      this.leaveGame(modal);
    } catch (e) {
      new Toast("Failed to quit game.");
    }
  }

  leaveGame(modal) {
    this.context.teardownActiveGame();
    this.context.polling.stopQuitPolling();

    this.context.leaving = true;

    const isPlayer =
      this.context.gameState.playerCode === PLAYER_ROLE.X || this.context.gameState.playerCode === PLAYER_ROLE.O;

    this.context.session.clearRoomAndSession(isPlayer);
    this.context.session.deregisterPageExit();

    this.context.modals.hide(modal);

    this.context.setState(GameState.PAGE_STATES.HOME);
  }

  handleOpponentQuit() {
    this.context.teardownActiveGame();
    this.context.modals.closeActive();

    this.context.polling.stopQuitPolling();
    this.context.reconnect.stopOpponentGracePeriod();

    this.context.leaving = true;
    this.context.session.clearRoomAndSession(true);

    new Toast("A player left the game. Exiting...");

    this.context.setState(GameState.PAGE_STATES.HOME);
  }

  async playAgain(modal) {
    if (this.context.gameState.playerCode !== PLAYER_ROLE.X) {
      return;
    }

    if (modal && modal instanceof Modal) {
      modal.disableButtons();
    }

    const key = this.context.gameState.key;

    const serverStatus = await this.context.api.checkGameStatus(key);

    if (serverStatus === ROOM_STATUS.GONE) {
      new Toast("Your opponent left, cannot play again");
      this.handleOpponentQuit();
      return;
    }

    this.context.polling.stopQuitPolling();
    this.context.reconnect.stopOpponentGracePeriod();

    try {
      this.context.teardownActiveGame();

      await this.context.api.resetGame(key);
      const response = await this.context.api.createGame(key);

      if (response !== PLAYER_ROLE.X) {
        await this.context.api.resetGame(key).catch(() => {});
        throw new Error(`Expected X but received ${response}`);
      }

      this.context.modals.hide(modal);

      const waitModal = new WaitForOpponentModal();
      waitModal.show();
      this.context.waitForOpponent = true;

      setTimeout(() => {
        this.context.modals.hide(waitModal);
        this.context.setState(GameState.PAGE_STATES.GAME_START);
      }, OPPONENT_GRACE_PERIOD_MS + 250);
    } catch (e) {
      console.error(e);
      new Toast("Failed to start a new game." + e);
    }
  }

  handleServerDown() {
    if (this.context.leaving) {
      return;
    }

    this.context.modals.closeActive();
    this.context.teardownActiveGame();
    this.context.polling.stopQuitPolling();

    this.context.leaving = true;
    this.context.session.clearRoomAndSession(Boolean(this.context.gameState.key));

    this.context.setState(GameState.PAGE_STATES.HOME);

    const modal = new ServerDownModal({
      onDismiss: (modal) => {
        modal.hide();
        this.context.leaving = false;
        this.context.polling.stopServerStatusPolling();
      },
    });

    this.context.modals.show(modal);
  }
}
