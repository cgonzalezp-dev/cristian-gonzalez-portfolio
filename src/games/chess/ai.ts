/**
 * Chess AI — negamax search with alpha-beta pruning and a material +
 * piece-square evaluation. Search depth is driven by difficulty. This runs
 * synchronously on the main thread, so depths are kept modest to stay
 * responsive for a casual game.
 */

import {
  applyMove,
  generateLegalMoves,
  isInCheck,
  type Board,
  type Color,
  type GameState,
  type Move,
  type PieceType,
} from "./engine";

export type AiLevel = "easy" | "medium" | "hard";

const DEPTH: Record<AiLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const VALUE: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables (from White's perspective, row 0 = top / Black side).
// Encourages sensible development without a full opening book.
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const PST: Record<PieceType, number[][]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_PST,
};

/** Static evaluation from White's perspective (positive favors White). */
function evaluate(board: Board): number {
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      const base = VALUE[piece.type];
      // White reads the table directly; Black mirrors it vertically.
      const pst =
        piece.color === "w" ? PST[piece.type][row][col] : PST[piece.type][7 - row][col];
      const total = base + pst;
      score += piece.color === "w" ? total : -total;
    }
  }
  return score;
}

/** Order captures first to make alpha-beta pruning more effective. */
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const av = a.captured ? VALUE[a.captured] - VALUE[a.piece] / 10 : -1;
    const bv = b.captured ? VALUE[b.captured] - VALUE[b.piece] / 10 : -1;
    return bv - av;
  });
}

function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  color: Color,
): number {
  const sign = color === "w" ? 1 : -1;
  const moves = generateLegalMoves(state);

  if (moves.length === 0) {
    // Checkmate is very bad for the side to move; stalemate is neutral.
    if (isInCheck(state.board, state.turn)) return -100000 - depth;
    return 0;
  }
  if (depth === 0) {
    return sign * evaluate(state.board);
  }

  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, color === "w" ? "b" : "w");
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Picks the best move for the side to move. On "easy" a little randomness is
 * mixed in so the machine is beatable and less repetitive.
 */
export function chooseMove(state: GameState, level: AiLevel): Move | null {
  const moves = generateLegalMoves(state);
  if (moves.length === 0) return null;

  const depth = DEPTH[level];
  const color = state.turn;

  const scored = orderMoves(moves).map((move) => {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -Infinity, Infinity, color === "w" ? "b" : "w");
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (level === "easy") {
    // Choose randomly among the top few moves within a small margin.
    const top = scored[0].score;
    const pool = scored.filter((s) => top - s.score <= 60);
    return pool[Math.floor(Math.random() * pool.length)].move;
  }

  return scored[0].move;
}
