/**
 * Chess engine — board state, legal move generation and rules.
 *
 * Board is an 8x8 array of squares indexed `[row][col]` with row 0 at the top
 * (Black's back rank) and row 7 at the bottom (White's back rank), matching how
 * the board is rendered. Moves are only ever exposed after being filtered for
 * king safety, so the UI can trust that any move it receives is legal.
 */

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export type Piece = { type: PieceType; color: Color };

export type Square = Piece | null;
export type Board = Square[][]; // [row][col]

export type Position = { row: number; col: number };

export type Move = {
  from: Position;
  to: Position;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  /** "K" king-side, "Q" queen-side. */
  castle?: "K" | "Q";
  /** En passant capture. */
  enPassant?: boolean;
};

export type GameState = {
  board: Board;
  turn: Color;
  /** Castling availability: [white K, white Q, black K, black Q]. */
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  /** Target square available for en passant capture, if any. */
  enPassant: Position | null;
  halfmove: number; // for the 50-move rule
  fullmove: number;
};

const START_BACK: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

export function createInitialState(): GameState {
  const board: Board = Array.from({ length: 8 }, () => new Array<Square>(8).fill(null));

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: START_BACK[col], color: "b" };
    board[1][col] = { type: "p", color: "b" };
    board[6][col] = { type: "p", color: "w" };
    board[7][col] = { type: START_BACK[col], color: "w" };
  }

  return {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
  };
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((sq) => (sq ? { ...sq } : null)));
}

export function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * Pseudo-legal moves for the side to move — does not filter moves that leave
 * the mover's own king in check. `generateLegalMoves` handles that.
 */
function pseudoMoves(state: GameState, color: Color): Move[] {
  const moves: Move[] = [];
  const { board } = state;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;
      const from = { row, col };

      switch (piece.type) {
        case "p":
          pawnMoves(state, from, piece.color, moves);
          break;
        case "n":
          for (const [dr, dc] of KNIGHT_DELTAS) {
            addStep(board, from, row + dr, col + dc, color, "n", moves);
          }
          break;
        case "k":
          for (const [dr, dc] of KING_DELTAS) {
            addStep(board, from, row + dr, col + dc, color, "k", moves);
          }
          castleMoves(state, color, moves);
          break;
        case "b":
          slide(board, from, BISHOP_DIRS, color, "b", moves);
          break;
        case "r":
          slide(board, from, ROOK_DIRS, color, "r", moves);
          break;
        case "q":
          slide(board, from, [...BISHOP_DIRS, ...ROOK_DIRS], color, "q", moves);
          break;
      }
    }
  }
  return moves;
}

function addStep(
  board: Board,
  from: Position,
  row: number,
  col: number,
  color: Color,
  piece: PieceType,
  moves: Move[],
): void {
  if (!inBounds(row, col)) return;
  const target = board[row][col];
  if (target && target.color === color) return;
  moves.push({ from, to: { row, col }, piece, captured: target?.type });
}

function slide(
  board: Board,
  from: Position,
  dirs: number[][],
  color: Color,
  piece: PieceType,
  moves: Move[],
): void {
  for (const [dr, dc] of dirs) {
    let row = from.row + dr;
    let col = from.col + dc;
    while (inBounds(row, col)) {
      const target = board[row][col];
      if (!target) {
        moves.push({ from, to: { row, col }, piece });
      } else {
        if (target.color !== color) {
          moves.push({ from, to: { row, col }, piece, captured: target.type });
        }
        break;
      }
      row += dr;
      col += dc;
    }
  }
}

function pawnMoves(state: GameState, from: Position, color: Color, moves: Move[]): void {
  const { board, enPassant } = state;
  const dir = color === "w" ? -1 : 1; // white moves up (toward row 0)
  const startRow = color === "w" ? 6 : 1;
  const promoteRow = color === "w" ? 0 : 7;
  const { row, col } = from;

  const oneRow = row + dir;
  if (inBounds(oneRow, col) && !board[oneRow][col]) {
    pushPawn(from, { row: oneRow, col }, promoteRow, moves);
    const twoRow = row + dir * 2;
    if (row === startRow && !board[twoRow][col]) {
      moves.push({ from, to: { row: twoRow, col }, piece: "p" });
    }
  }

  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (!inBounds(oneRow, c)) continue;
    const target = board[oneRow][c];
    if (target && target.color !== color) {
      pushPawn(from, { row: oneRow, col: c }, promoteRow, moves, target.type);
    } else if (enPassant && enPassant.row === oneRow && enPassant.col === c) {
      moves.push({ from, to: { row: oneRow, col: c }, piece: "p", captured: "p", enPassant: true });
    }
  }
}

function pushPawn(
  from: Position,
  to: Position,
  promoteRow: number,
  moves: Move[],
  captured?: PieceType,
): void {
  if (to.row === promoteRow) {
    for (const promotion of ["q", "r", "b", "n"] as PieceType[]) {
      moves.push({ from, to, piece: "p", captured, promotion });
    }
  } else {
    moves.push({ from, to, piece: "p", captured });
  }
}

function castleMoves(state: GameState, color: Color, moves: Move[]): void {
  const { board, castling } = state;
  const row = color === "w" ? 7 : 0;
  if (isSquareAttacked(board, { row, col: 4 }, color === "w" ? "b" : "w")) return;

  const kingSide = color === "w" ? castling.wK : castling.bK;
  const queenSide = color === "w" ? castling.wQ : castling.bQ;
  const enemy = color === "w" ? "b" : "w";

  if (kingSide && !board[row][5] && !board[row][6]) {
    if (
      !isSquareAttacked(board, { row, col: 5 }, enemy) &&
      !isSquareAttacked(board, { row, col: 6 }, enemy)
    ) {
      moves.push({ from: { row, col: 4 }, to: { row, col: 6 }, piece: "k", castle: "K" });
    }
  }
  if (queenSide && !board[row][3] && !board[row][2] && !board[row][1]) {
    if (
      !isSquareAttacked(board, { row, col: 3 }, enemy) &&
      !isSquareAttacked(board, { row, col: 2 }, enemy)
    ) {
      moves.push({ from: { row, col: 4 }, to: { row, col: 2 }, piece: "k", castle: "Q" });
    }
  }
}

/** True if `pos` is attacked by any piece of color `by`. */
export function isSquareAttacked(board: Board, pos: Position, by: Color): boolean {
  const { row, col } = pos;

  // Pawns: they attack diagonally forward. A `by`-colored pawn attacks `pos`
  // if it sits one rank "behind" the attack direction.
  const pawnDir = by === "w" ? -1 : 1;
  for (const dc of [-1, 1]) {
    const r = row - pawnDir;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === by && p.type === "p") return true;
    }
  }

  for (const [dr, dc] of KNIGHT_DELTAS) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === by && p.type === "n") return true;
    }
  }

  for (const [dr, dc] of KING_DELTAS) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === by && p.type === "k") return true;
    }
  }

  for (const [dr, dc] of BISHOP_DIRS) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === by && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (const [dr, dc] of ROOK_DIRS) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === by && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

function findKing(board: Board, color: Color): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (p && p.color === color && p.type === "k") return { row, col };
    }
  }
  return null;
}

export function isInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king, color === "w" ? "b" : "w");
}

/**
 * Applies `move` to `state` and returns a new state. Assumes the move is legal.
 */
export function applyMove(state: GameState, move: Move): GameState {
  const board = cloneBoard(state.board);
  const piece = board[move.from.row][move.from.col]!;
  const color = piece.color;

  const castling = { ...state.castling };
  let enPassant: Position | null = null;

  // Move the piece.
  board[move.to.row][move.to.col] = move.promotion
    ? { type: move.promotion, color }
    : piece;
  board[move.from.row][move.from.col] = null;

  // En passant capture removes the pawn behind the target square.
  if (move.enPassant) {
    board[move.from.row][move.to.col] = null;
  }

  // Set a new en passant target on a two-square pawn advance.
  if (piece.type === "p" && Math.abs(move.to.row - move.from.row) === 2) {
    enPassant = { row: (move.to.row + move.from.row) / 2, col: move.from.col };
  }

  // Move the rook when castling.
  if (move.castle) {
    const row = move.from.row;
    if (move.castle === "K") {
      board[row][5] = board[row][7];
      board[row][7] = null;
    } else {
      board[row][3] = board[row][0];
      board[row][0] = null;
    }
  }

  // Update castling rights.
  if (piece.type === "k") {
    if (color === "w") {
      castling.wK = false;
      castling.wQ = false;
    } else {
      castling.bK = false;
      castling.bQ = false;
    }
  }
  const touchRook = (row: number, col: number) => {
    if (row === 7 && col === 0) castling.wQ = false;
    if (row === 7 && col === 7) castling.wK = false;
    if (row === 0 && col === 0) castling.bQ = false;
    if (row === 0 && col === 7) castling.bK = false;
  };
  touchRook(move.from.row, move.from.col);
  touchRook(move.to.row, move.to.col);

  const halfmove = piece.type === "p" || move.captured ? 0 : state.halfmove + 1;
  const fullmove = color === "b" ? state.fullmove + 1 : state.fullmove;

  return {
    board,
    turn: color === "w" ? "b" : "w",
    castling,
    enPassant,
    halfmove,
    fullmove,
  };
}

/** Legal moves for the side to move (own king never left in check). */
export function generateLegalMoves(state: GameState): Move[] {
  const legal: Move[] = [];
  for (const move of pseudoMoves(state, state.turn)) {
    const next = applyMove(state, move);
    if (!isInCheck(next.board, state.turn)) {
      legal.push(move);
    }
  }
  return legal;
}

export function legalMovesFrom(state: GameState, from: Position): Move[] {
  return generateLegalMoves(state).filter((m) => samePos(m.from, from));
}

export type Status = "playing" | "check" | "checkmate" | "stalemate" | "draw";

export function getStatus(state: GameState): Status {
  const moves = generateLegalMoves(state);
  const check = isInCheck(state.board, state.turn);
  if (moves.length === 0) return check ? "checkmate" : "stalemate";
  if (state.halfmove >= 100) return "draw";
  return check ? "check" : "playing";
}

export { inBounds };
