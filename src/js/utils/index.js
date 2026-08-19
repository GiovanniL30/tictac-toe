export const generateCode = (length = 4) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * characters.length);
    code += characters[index];
  }

  return code;
};

export const createLoadingDots = () => {
  const loadingDots = document.createElement("div");
  loadingDots.classList.add("waiting-dots");

  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    loadingDots.append(span);
  }

  return loadingDots;
};

export const createPlayerNote = (playerCode, playerNumber) => {
  const playerNote = document.createElement("div");
  playerNote.classList.add("player-note");

  const playerChip = document.createElement("span");
  playerChip.classList.add("chip", playerCode.toLowerCase(), "mini");
  playerChip.textContent = playerCode;

  const playerNoteText = document.createElement("span");
  playerNoteText.textContent = `You'll be Player ${playerNumber} (${playerCode}) `;
  playerNote.append(playerChip, playerNoteText);
  return playerNote;
};
