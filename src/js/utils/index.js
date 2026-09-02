export const createLoadingDots = () => {
  const loadingDots = document.createElement("div");
  loadingDots.classList.add("waiting-dots");

  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    loadingDots.append(span);
  }

  return loadingDots;
};

export const getCurrentDateTime = () => {
  return new Date()
    .toLocaleString("sv-SE", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
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
