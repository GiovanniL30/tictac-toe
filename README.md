## Architecture Overview

The client follows a layered controller driven design. There is no router library and no virtual DOM. One orchestrating class owns navigation, side effects and lifecycle while pages and components stay presentational.

```
index.html
   |
   v
app.js  (bootstrap, duplicate tab guard)
   |
   v
MainPage  (controller, finite state machine, all API side effects)
   |
   +-- Pages        Home, CreateRoom, JoinRoom, WaitingRoom, Game
   +-- Components   Button, Input, InputField, BackButton, Toast,
   |                Modal family, Board, Mascot, VsEntrance, Confetti
   +-- Services     ApiClient, LocalHostApi
   +-- State        GameState, GameStorage
   +-- Utils        Poller, svg loader, generators, constants, exceptions
```

### Core Architectural Decisions

1. Single controller pattern. `MainPage` is instantiated once from `app.js` and lives for the entire tab session. It is the only class that talks to the API, decides which page mounts next, manages modals, timers and pollers, and reacts to page exit events.

2. Finite state machine navigation. `GameState.PAGE_STATES` defines five screens: `home`, `create-room`, `join-room`, `waiting-room` and `game-start`. Spectating is not a separate screen, it is a role inside `game-start`. Calling `setState` stores the new state and triggers a full rerender.

3. Full remount rendering. Every transition calls `container.replaceChildren()` then asks the new page to render itself into a detached DOM tree which is appended once. This keeps transitions simple and leak free because an old page simply disappears with its timers.

4. Unidirectional data flow through callback props. Pages never navigate and never call the API. They receive intent callbacks such as `onRoomCreate`, `onJoin`, `onCellClick` or `onQuit` and raise them upward. `MainPage` supplies these callbacks when constructing a page, performs the actual work, then changes state if the work succeeded. Data flows down as props, decisions flow up as callbacks.

5. Derived game logic on the client. The server only stores raw cell values. Turn order, win detection and draw detection are recomputed by the `Board` class from the board string on every poll, so every connected client independently agrees on the match state without the server sending structured turns or results.

6. Polling instead of sockets. Realtime behavior is implemented with small interval based pollers rather than websockets, which matches the deliberately simple stateless style of the text based server.

## Project Structure

```
tictac-toe/
  index.html                      Entry document, mounts #app, loads css and js module
  README.md

  src/
    favicon.ico

    assets/icons/                 Mascot and result artwork (SVG)
      cat-mascot.svg              Cat avatar, plays X
      cat-mascot-cry.svg          Cat crying variant
      dog-mascot.svg              Dog avatar, plays O
      dog-mascot-cry.svg          Dog crying variant
      draw-face.svg lose-face.svg win-face.svg

    css/
      index.css                   Import manifest for all styles
      global.css                  Reset, design tokens, shared layout helpers
      styles/
        home.css input.css button.css card.css chips.css
        game.css mascot.css room.css modal.css toast.css confetti.css vs.css

    js/
      app.js                      Bootstrap: creates MainPage, guards duplicate tabs

      app/
        MainPage.js               Controller: routing, API effects, polling, lifecycle

      pages/
        Home.js                   Landing screen with mascots and mode selection
        CreateRoom.js             Name form for the host (Player X)
        JoinRoom.js               Name plus room code form for the guest (Player O)
        WaitingRoom.js            Room key display, polls until opponent joins
        Game.js                   Board screen: scoreboard, turn indicator, play area

      components/
        Board.js                  Board DOM, move locking, parsing, win detection
        Mascot.js                 SVG mascot mounting and emotional states
        VsEntrance.js             Timed full screen VS overlay before a match
        Confetti.js               Canvas particle celebration
        Toast.js                  Self removing notification pill
        BackButton.js             Shared back navigation button
        Button.js Input.js InputField.js
        modal/
          Modal.js                Base overlay with show, hide, disableButtons
          ConfirmationModal.js    Generic confirm and cancel dialog
          ResetGameModal.js       Game over dialog, role aware buttons
          WaitForOpponentModal.js Shown while Player X recreates a room
          ReconnectingModal.js    Opponent presence check dialog
          ServerDownModal.js      Fatal connectivity dialog
          HowToPlayModal.js       Rules walkthrough

      services/
        ApiClient.js              Fetch wrapper with error normalization
        LocalHostApi.js           Concrete endpoints for the tic tac toe server

      state/
        GameState.js              Session identity and current page state
        GameStorage.js            Room rosters in localStorage, scores in memory

      utils/
        Poller.js                 Interval wrapper with start, stop, isRunning
        svg.js                    fetch plus Map cache for SVG assets
        index.js                  generateCode, createLoadingDots, createPlayerNote
        constants/PlayerRoles.js  PLAYER_ROLE = X, O, spectator
        exceptions/RoomNotFoundError.js  Control flow signal for bad room codes
```

## Server API Contract

All communication uses GET requests returning plain text strings, never JSON. `ApiClient` inspects the `content-type` header, parses JSON only if it is declared, and otherwise returns raw text. Non OK responses throw an `Error` that carries the numeric status so callers can react to failures uniformly.

Base URL: `http://localhost:8080/tictactoe/tictactoeserver`

| Endpoint      | Parameters              | Returns                        | Purpose                              |
| ------------- | ----------------------- | ------------------------------ | ------------------------------------ |
| `/createGame` | `key`                   | `"X"`, `"O"` or any other text | Create a room or claim a seat        |
| `/move`       | `key`, `tile`, `x`, `y` | unspecified text               | Submit a move                        |
| `/reset`      | `key`                   | unspecified text               | Destroy the room                     |
| `/check`      | `key`                   | `"true"` or `"false"`          | Is the room active with both players |
| `/board`      | `key`                   | colon separated cell string    | Current board contents               |

### createGame

Returns `"X"` when the caller created a brand new room and became Player X. Returns `"O"` when the room existed with only Player X and the caller claimed the open seat. Returns anything else when a match is already running, meaning the caller can only spectate.

This single endpoint powers four different flows:

1. Hosting. The Create Room flow generates a random key via `generateCode` and expects `"X"` back. Any other answer aborts creation with a toast.
2. Joining. Join Room submits the entered code. If it receives `"X"` the server just created a fresh room, which proves the code matched no existing room, so the client immediately calls `/reset` to clean up after itself and throws `RoomNotFoundError` to show an inline validation message.
3. Spectator fallback. If joining returns neither `"X"` nor `"O"` the match already started, so the client assigns itself the `spectator` role with a random `spectatorId` and enters the game screen directly.
4. Reclaiming a seat after abandonment. During opponent loss detection the surviving player probes the room by calling this endpoint. Receiving `"O"` means the guest seat is free, so the caller takes it over and continues playing. Receiving `"X"` means the room was already destroyed, confirming the opponent quit for good.

### move

Sends `tile` (`X` or `O`) plus zero indexed grid coordinates. The response body is not interpreted, only success or failure matters. The `Game` page raises this through `onCellClick`, and `Board` locks every cell while the request is in flight so double submissions cannot happen. A failure unlocks the board again and shows a toast.

### reset

Destroys the room on the server. It is called when quitting, when canceling a waiting room, during the Play Again handoff, as cleanup after failed joins, and critically on page exit where it is sent with `keepalive: true` so the request survives the tab closing.

### check

Answers `"true"` or `"false"` as text. Three consumers rely on it:

1. The Waiting Room polls it every 300 ms and starts the match on `"true"`.
2. The controller polls it every 300 ms during a match as an opponent presence monitor, reacting to `"false"`.
3. The same endpoint doubles as a health probe. It is called with a constant dummy key `1234`; any thrown error means the server is unreachable and triggers the fatal server down handling.

### board

Returns nine colon separated cell values such as `X::O::::X:`. `Board.parse` splits on the colon character and takes the first nine entries, producing an array where each slot is `X`, `O` or empty. From that array the client derives everything else:

1. Current turn: X moves first, so whoever has made fewer or equal moves is next, computed as X turn when the count of X marks is less than or equal to the count of O marks.
2. Winner: eight winning line patterns are checked; a filled board with no line yields `DRAW`.

## Application Lifecycle

### Bootstrap

`index.html` provides the `#app` mount point and loads the module entry `app.js`. That script instantiates `MainPage`, then runs a duplicate tab guard. Because `sessionStorage` is shared across tabs of the same origin, two game tabs would otherwise fight over one identity. The guard writes a random name into `window.name` and sets an `IS_SESSION_ACTIVE` flag; a second tab without its own window name detects the collision and clears session storage before starting fresh.

`MainPage` construction wires the API client, the game state, two pollers (opponent presence at 300 ms, server health at 300 ms) and renders the first page.

### Page Transitions

Every screen change goes through `setState`, which updates `GameState.pageState` and rerenders:

```
HOME
 |-- CREATE_ROOM --(POST /createGame returns X)-- WAITING_ROOM --(check true)-- GAME_START
 |-- JOIN_ROOM ----(returns O)---------------------------------> GAME_START
                    (returns other)----------------------------> GAME_START as spectator
```

Leaving `game-start` always passes through `teardownActiveGame`, which calls `destroy` on the `Game` instance. That stops its board poller and removes the cross tab storage listener, then destroys confetti and the VS overlay if present.

### Host Flow

The host enters a name of at least three characters, the client generates a four character alphanumeric room key and registers itself as X with the server. The roster `{ X: hostName, O: null }` is written to `localStorage` under `tictactoe-players-KEY`. The Waiting Room displays the key letter by letter with a copy to clipboard button and polls until the check endpoint answers `"true"`, at which point the VS entrance overlay plays and the Game page mounts.

### Guest Flow

The guest submits a name and room code. Valid joins receive `"O"`, merge their name into the stored roster, save the session and enter the game with the VS entrance. Invalid codes trigger the reset and throw path described above. Late joiners become spectators and skip straight into the running match.

### Match Flow

Once mounted, the Game page starts a 500 ms board poller. Each cycle:

1. Fetch the board string and parse it into nine cells.
2. Diff against the previous render, rewriting only cells whose value changed and recording the most recent fill.
3. Derive turn, winner and draw states locally.
4. Update lock states: cells are clickable only when the board is not in flight, the game is not over and it is the local player's turn. Spectators never get clickable cells.
5. Drive presentation: the active player's mascot bounces while the idle one dims, the most recent placer does a placing animation, and a glow around the board signals whose turn it is.

Clicking a cell checks turn ownership in the controller, sends the move, and relies on the next poll cycle to reveal the accepted mark. Optimistic locking prevents any interaction until confirmation arrives.

When the derived winner appears, `handleGameEnd` runs once per completed game:

1. The winner's mascot performs a slap toward its opponent and the loser recoils into a cry animation, both direction aware relative to their side of the screen. A draw makes both mascots stare at each other instead.
2. Scores increment in the in memory store and the scoreboard refreshes.
3. After 1200 ms the game over dialog appears. Only the human winner gets confetti.

### Game Over Dialog Roles

The dialog is role aware. Player X sees Play Again and Quit. Player O sees Quit plus a waiting indicator explaining that only X can start the next round. Spectators see Stay and Quit with neutral result messaging.

Play Again belongs exclusively to X. It tears down the current game, resets the room, reclaims the X seat via `createGame`, shows a brief waiting dialog, and remounts the Game page. Player O simply keeps polling; the emptied board announces the new round naturally.

### Departure Handling

Several overlapping mechanisms keep rooms consistent when players disappear:

1. Voluntary quit. A confirmation dialog leads to `/reset`, local teardown of pollers, storage, session, and return to Home.
2. Tab or browser close. Registered `pagehide` and `beforeunload` handlers fire `/reset` with `keepalive: true` and wipe local data. These handlers deregister on normal exit paths to avoid double resets.
3. Opponent vanishing. The presence poller noticing `"false"` opens a one second grace period showing a reconnecting dialog. When the grace timer expires the controller probes `createGame` to distinguish takeover from permanent departure, as described under the API section. Takeover remounts the game under the new role, departure shows a toast and returns everyone still present to Home.
4. Spectator interruption. When the spectated room dies, the client retries the check endpoint up to three times half a second apart before concluding the match ended.
5. Server death. The health probe failing closes everything, clears state, lands on Home and presents the server down dialog. Dismissing it resumes health monitoring.

## State Management

State lives in three deliberate tiers:

1. `GameState` holds identity (`key`, `playerCode`, `playerName`, `spectatorId`) and the current page. It persists identity to `sessionStorage` under `tictactoe-session` so a refresh within one tab can restore who you are, and validates that the stored role is X or O before trusting it.
2. `GameStorage` persists room rosters in `localStorage` keyed by room so both browser tabs see both names. Score tallies are intentionally kept in a static in-memory map only, since they describe a single sitting and die with the tab.
3. Cross tab freshness comes from the standard `storage` event. The Game page listens for changes to its room roster key and rebuilds the scoreboard when the opponent's name arrives.

## Component Model

Components are classes whose constructor takes a props object and whose `render` returns detached DOM nodes. They expose small imperative helpers instead of a reactive system: `Button` has `text` and `disabled` accessors plus `onClick`, `Input` wraps event registration, `Toast` schedules its own removal, `Confetti` manages a canvas and requestAnimationFrame loop with a proper `destroy`.

Modals form the only inheritance chain. Base `Modal` owns the overlay element with `show`, `hide` and `disableButtons`, and each concrete dialog composes its own content and buttons while delegating decisions upward through callbacks. Modals attach to `document.body` rather than the page tree so page transitions never orphan them.

`Mascot` deserves special mention. Mounting fetches an SVG once through a Map cache and stamps the host element with type and emotion metadata. Emotional states are pure CSS classes (`placing`, `slap`, `cry`, `stare`, `on-turn`, `off-turn`) animated with keyframes. Directional animations key off positional classes `side-left` and `side-right` assigned by the Game page, so the current player always sits on the left of the turn indicator, opponents sit right, spectators default to X left and O right, and every gesture faces correctly regardless of perspective.

`VsEntrance` builds a fixed duration full screen overlay (1700 ms play, 450 ms exit) with fighter mascots and nameplates read from the room roster.

## Styling Architecture

One CSS entry file imports thirteen concern-scoped stylesheets. `global.css` defines the palette tokens, typography (Baloo 2 for display, Space Grotesk for body) and shared primitives like chips and cards. Each screen and each component owns one stylesheet, and state driven visuals such as mascot emotions, turn highlights and overlays are expressed purely as class toggles driven from JS, keeping animation concerns out of application logic.
