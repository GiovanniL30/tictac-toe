import { Confetti } from "../components/Confetti.js";
import { IdleNudge } from "../components/IdleNudge.js";
import { Toast } from "../components/Toast.js";
import { VsEntrance } from "../components/VsEntrance.js";
import { ConfirmationModal } from "../components/modal/ConfirmationModal.js";
import { ResetGameModal } from "../components/modal/ResetGameModal.js";
import { CreateRoom } from "../pages/CreateRoom.js";
import { Game } from "../pages/Game.js";
import { Home } from "../pages/Home.js";
import { JoinRoom } from "../pages/JoinRoom.js";
import { WaitingRoom } from "../pages/WaitingRoom.js";
import { TicTacToePayaraApi } from "../services/TicTacToePayaraApi.js";
import { GameState } from "../state/GameState.js";
import { GameStorage } from "../state/GameStorage.js";
import { RoomNotFoundError } from "../utils/exceptions/RoomNotFoundError.js";
import { PLAYER_ROLE } from "../utils/constants/PlayerRoles.js";
import { GameFlowController } from "./GameFlowController.js";
import { ModalController } from "./ModalController.js";
import { PollingController } from "./PollingController.js";
import { ReconnectionManager } from "./ReconnectionManager.js";
import { SessionManager } from "../state/SessionManager.js";
import { TicTacToeWebService } from "../services/TicTacToeWebService.js";
import { getCurrentDateTime } from "../utils/index.js";

export class AppController {
  constructor() {
    this.container = document.querySelector("#app");
    this.api = new TicTacToePayaraApi();
    this.webserviceApi = new TicTacToeWebService();
    this.gameState = new GameState();

    this.activeGame = null;
    this.confetti = null;
    this.vsEntrance = null;
    this.idleNudge = null;

    this.context = {
      api: this.api,
      gameState: this.gameState,
      leaving: false,
      waitForOpponent: false,
      modals: null,
      session: null,
      polling: null,
      gameFlow: null,
      reconnect: null,
      setState: null,
      teardownActiveGame: null,
      playVsEntrance: null,
      celebrateWinner: null,
    };

    this.context.setState = (pageState) => this.setState(pageState);
    this.context.teardownActiveGame = () => this.teardownActiveGame();
    this.context.playVsEntrance = () => this.playVsEntrance();
    this.context.celebrateWinner = (winner, modal) =>
      this.celebrateWinner(winner, modal);
    this.context.modals = new ModalController();
    this.context.session = new SessionManager(this.context);
    this.context.polling = new PollingController(this.context);
    this.context.gameFlow = new GameFlowController(this.context);
    this.context.reconnect = new ReconnectionManager(this.context);

    this.render();
  }

  setState(pageState) {
    this.gameState.pageState = pageState;
    this.render();
  }

  render() {
    this.destroyIdleNudge();
    this.container.replaceChildren();
    const page = this.createPage();

    this.container.append(page.render());
  }

  createPage() {
    switch (this.gameState.pageState) {
      case GameState.PAGE_STATES.HOME:
        this.context.polling.stopServerStatusPolling();
        return this.createHomePage();

      case GameState.PAGE_STATES.CREATE_ROOM:
        return this.createCreateRoomPage();

      case GameState.PAGE_STATES.JOIN_ROOM:
        return this.createJoinRoomPage();

      case GameState.PAGE_STATES.WAITING_ROOM:
        return this.createWaitingRoomPage();

      case GameState.PAGE_STATES.GAME_START:
        return this.createGamePage();

      default:
        throw new Error(`Unknown page state: ${this.gameState.pageState}`);
    }
  }

  createHomePage() {
    this.idleNudge = new IdleNudge({ delay: 1000 });
    this.idleNudge.mount();

    return new Home({
      onCreateRoom: () => this.setState(GameState.PAGE_STATES.CREATE_ROOM),
      onJoinRoom: () => this.setState(GameState.PAGE_STATES.JOIN_ROOM),
    });
  }

  createCreateRoomPage() {
    const createRoom = new CreateRoom({
      onBack: () => this.setState(GameState.PAGE_STATES.HOME),
      onRoomCreate: (playerName) => this.onRoomCreate(playerName),
    });

    this.context.polling.startServerStatusPolling();
    return createRoom;
  }

  createJoinRoomPage() {
    const joinRoom = new JoinRoom({
      onBack: () => this.setState(GameState.PAGE_STATES.HOME),
      onJoin: (key, playerName) => this.onJoin(key, playerName),
    });

    this.context.polling.startServerStatusPolling();
    return joinRoom;
  }

  createWaitingRoomPage() {
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
          await this.webserviceApi.deleteGame(this.gameState.key);
        } catch (e) {
          console.log(e);
        }

        this.context.polling.stopServerStatusPolling();
        this.context.polling.stopQuitPolling();
        this.context.leaving = true;
        this.context.session.clearRoomAndSession(true);

        this.setState(GameState.PAGE_STATES.HOME);
        new Toast("Game room canceled.");
      },
    });

    this.context.polling.startServerStatusPolling();
    return waitingRoom;
  }

  createGamePage() {
    if (this.gameState.key == null) {
      this.context.polling.stopQuitPolling();
      this.context.polling.stopServerStatusPolling();
      new Toast("Failed to start, a opponent suddenly left the game.");
      return this.createHomePage();
    }

    const isSpectator = this.gameState.playerCode === PLAYER_ROLE.SPECTATOR;

    const game = new Game({
      key: this.gameState.key,
      player: this.gameState.playerCode,
      spectatorId: this.gameState.spectatorId,

      onCheckBoard: () => {
        return this.api.checkBoardStatus(this.gameState.key);
      },

      onQuit: () => this.onQuit(isSpectator),

      onTurnChange: (currentTurn) => {
        this.gameState.currentTurn = currentTurn;
      },

      onGameEnd: (winner) => this.onGameEnd(winner, isSpectator),

      onCellClick: (i) => this.onCellClick(i),
    });

    this.activeGame = game;
    this.context.polling.startQuitPolling();
    this.context.polling.startServerStatusPolling();
    return game;
  }

  onRoomCreate = async (playerName) => {
    console.log(playerName);

    try {
      const gameKey = await this.webserviceApi.generateRoomKey();
      const key = gameKey.gameKey.roomCode;
      const gameId = gameKey.gameKey.gameId;

      await this.webserviceApi.addPlayer(
        {
          playerid: playerName,
          symbol: PLAYER_ROLE.X,
        },
        key,
      );

      const response = await this.api.createGame(key);

      if (response !== PLAYER_ROLE.X) {
        throw new Error(`Game key ${key} already exists`);
      }

      this.context.session.saveNewRoom(key, gameId, response, playerName);
      this.context.session.registerPageExit();

      this.setState(GameState.PAGE_STATES.WAITING_ROOM);
      new Toast("Created a new room.");
    } catch (e) {
      new Toast("Failed to create new room: " + e);
    }
  };

  onJoin = async (key, playerName) => {
    const gameKey = await this.webserviceApi.getRoomUUID(key);
    const gameId = gameKey.gameKey.gameId;

    try {
      const players = await this.webserviceApi.getPlayersOnTheGame(key);

      if (players.players.length < 2) {
        await this.webserviceApi.addPlayer(
          { playerid: playerName, symbol: PLAYER_ROLE.O },
          key,
        );
      }
    } catch (e) {
      new Toast(e.message);
      return;
    }

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

      this.context.session.registerPageExit();
      this.setState(GameState.PAGE_STATES.GAME_START);
      this.context.polling.startQuitPolling();
      new Toast("Game already started, joining as spectator.");
      return;
    }

    this.context.session.saveJoinedRoom(key, gameId, playerName, response);
    this.context.session.registerPageExit();
    this.context.polling.startQuitPolling();

    this.setState(GameState.PAGE_STATES.GAME_START);
    this.playVsEntrance();
  };

  onQuit(isSpectator) {
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
          ? this.context.gameFlow.leaveGame(modal)
          : this.context.gameFlow.quitGame(modal),
      onCancel: (modal) => modal.hide(),
    });

    this.context.modals.show(modal);
  }

  onGameEnd(winner, isSpectator) {
    const modal = new ResetGameModal({
      title: "Game Over!",
      winner,
      player: this.gameState.playerCode,
      isSpectator,
      key: this.gameState.key,

      onPlayAgain: (modal) => this.context.gameFlow.playAgain(modal),
      onSpectatorLeave: (modal) => this.context.gameFlow.leaveGame(modal),
      onSpectatorStay: (modal) => modal.hide(),
      onQuitGame: (modal) => this.context.gameFlow.quitGame(modal),
    });

    this.context.modals.setActive(modal);

    setTimeout(() => {
      this.celebrateWinner(winner, modal);
    }, 1200);

    setTimeout(() => {
      if (this.context.modals.activeModal === modal) {
        modal.show();
      }
    }, 1200);
  }

  onCellClick = async (i) => {
    if (this.gameState.currentTurn !== this.gameState.playerCode) {
      return false;
    }

    const x = i % 3;
    const y = Math.floor(i / 3);

    let registeringToast = null;

    const slowRequestToast = setTimeout(() => {
      registeringToast = new Toast("Registering your move…", null);
    }, 1000);

    try {
      await this.api.addMove({
        key: this.gameState.key,
        tile: this.gameState.playerCode,
        x,
        y,
      });

      await this.webserviceApi.saveMove({
        gameid: this.gameState.gameId,
        roomcode: this.gameState.key,
        symbol: this.gameState.playerCode,
        location: i,
        playerid: this.gameState.playerName,
        datesave: getCurrentDateTime(),
      });

      return true;
    } catch (e) {
      console.error(e);
      new Toast("Failed to make move.");
      return false;
    } finally {
      if (registeringToast) {
        registeringToast.hide();
      }
      clearTimeout(slowRequestToast);
    }
  };

  teardownActiveGame() {
    this.activeGame?.destroy();
    this.activeGame = null;

    this.destroyConfetti();
    this.destroyVsEntrance();
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
      playerCode: this.gameState.playerCode,
    });

    this.vsEntrance.show();
  }

  destroyVsEntrance() {
    if (this.vsEntrance) {
      this.vsEntrance.destroy();
      this.vsEntrance = null;
    }
  }

  destroyIdleNudge() {
    if (this.idleNudge) {
      this.idleNudge.destroy();
      this.idleNudge = null;
    }
  }
}
