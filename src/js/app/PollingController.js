import { Poller } from "../utils/Poller.js";
import { ROOM_STATUS } from "../utils/constants/RoomStatus.js";

const SERVER_HEALTH_CHECK_KEY = "1234";
const QUIT_POLL_INTERVAL_MS = 1000;
const SERVER_POLL_INTERVAL_MS = 1000;

export class PollingController {
  constructor(context) {
    this.context = context;

    this.quitPoller = new Poller(this.checkOpponentPresence, QUIT_POLL_INTERVAL_MS);
    this.serverStatusPoller = new Poller(this.checkServerStatus, SERVER_POLL_INTERVAL_MS);

    this.isCheckingServerStatus = false;
    this.isCheckingOpponentPresence = false;
  }

  checkOpponentPresence = async () => {
    if (this.isCheckingOpponentPresence) {
      return;
    }

    try {
      this.isCheckingOpponentPresence = true;

      const response = await this.context.api.checkGameStatus(this.context.gameState.key);

      if (response === ROOM_STATUS.GONE) {
        this.context.reconnect.startOpponentGracePeriod();
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.isCheckingOpponentPresence = false;
    }
  };

  checkServerStatus = async () => {
    if (this.isCheckingServerStatus) {
      return;
    }

    try {
      this.isCheckingServerStatus = true;
      await this.context.api.checkGameStatus(SERVER_HEALTH_CHECK_KEY);
    } catch (e) {
      console.error("Server is down:", e);
      this.context.gameFlow.handleServerDown();
    } finally {
      this.isCheckingServerStatus = false;
    }
  };

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
}
