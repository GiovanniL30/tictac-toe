export const WIN_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const getWinningPattern = (board) => {
  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a], pattern };
    }
  }

  return null;
};

export const getWinner = (board) => {
  const win = getWinningPattern(board);

  if (win) {
    return win.mark;
  }

  const isDraw = board.every((value) => value === "X" || value === "O");

  return isDraw ? "DRAW" : null;
};

export const shapeGame = (list = []) => {
  const sorted = [...list].sort((a, b) =>
    String(a.datasaved ?? "").localeCompare(String(b.datasaved ?? "")),
  );

  const moves = sorted
    .map((move) => ({
      cell: Number(move.location),
      mark: move.symbol,
    }))
    .filter((move) => Number.isInteger(move.cell) && move.cell >= 0 && move.cell < 9);

  const board = Array(9).fill(null);
  let winner = null;
  let winningMoveIndex = moves.length;

  for (let i = 0; i < moves.length; i++) {
    board[moves[i].cell] = moves[i].mark;
    winner = getWinner(board);

    if (winner) {
      winningMoveIndex = i + 1;
      break;
    }
  }

  const finalMoves = winner ? moves.slice(0, winningMoveIndex) : moves;

  const playerX = sorted.find((move) => move.symbol === "X")?.playerid ?? null;
  const playerO = sorted.find((move) => move.symbol === "O")?.playerid ?? null;
  const date = sorted.length ? sorted[sorted.length - 1].datasaved ?? null : null;
  const gameId = sorted.length ? sorted[0].id ?? null : null;

  return {
    gameId,
    playerX,
    playerO,
    winner,
    date,
    moves: finalMoves,
  };
};

export const formatDate = (dateSaved) => {
  if (!dateSaved) {
    return "";
  }

  const str = String(dateSaved);
  const [datePart, timePart] = str.split(" ");
  const [year, month, day] = (datePart ?? "").split("-").map(Number);

  let timeLabel = "";

  if (timePart) {
    const [h, m] = timePart.split(":").map(Number);

    if (Number.isInteger(h) && Number.isInteger(m)) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;

      timeLabel = ` · ${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
    }
  }

  if (!year || !month || !day) {
    return str;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(year, month - 1, day);
  const diffDays = Math.round((today - that) / 86400000);

  let dateLabel;

  if (diffDays === 0) {
    dateLabel = "Today";
  } else if (diffDays === 1) {
    dateLabel = "Yesterday";
  } else {
    dateLabel = `${month}-${day}-${year}`;
  }

  return `${dateLabel}${timeLabel}`;
};
