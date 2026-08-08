/**
 * Sudoku engine — generation, solving and validation.
 *
 * The board is a flat array of 81 numbers (row-major). A value of `0` marks an
 * empty cell. Generation builds a full solved grid via randomized backtracking,
 * then removes cells while keeping a puzzle solvable; difficulty controls how
 * many clues remain.
 */

export type Grid = number[]; // length 81, values 0-9 (0 = empty)

export type Difficulty = "easy" | "medium" | "hard";

export type Puzzle = {
  puzzle: Grid; // starting board with some cells removed
  solution: Grid; // the unique complete solution
  givens: boolean[]; // true where the cell is a fixed clue
};

const SIZE = 9;
const CELLS = 81;

/** Clues left on the board per difficulty (higher = easier). */
const CLUES: Record<Difficulty, number> = {
  easy: 44,
  medium: 34,
  hard: 28,
};

export function index(row: number, col: number): number {
  return row * SIZE + col;
}

export function rowOf(i: number): number {
  return Math.floor(i / SIZE);
}

export function colOf(i: number): number {
  return i % SIZE;
}

/** Returns true if placing `value` at cell `i` breaks no Sudoku constraint. */
export function isValidPlacement(grid: Grid, i: number, value: number): boolean {
  if (value === 0) return true;
  const row = rowOf(i);
  const col = colOf(i);

  for (let c = 0; c < SIZE; c++) {
    const j = index(row, c);
    if (j !== i && grid[j] === value) return false;
  }
  for (let r = 0; r < SIZE; r++) {
    const j = index(r, col);
    if (j !== i && grid[j] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const j = index(r, c);
      if (j !== i && grid[j] === value) return false;
    }
  }
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fills `grid` in place with a valid complete solution. */
function fillGrid(grid: Grid): boolean {
  const empty = grid.indexOf(0);
  if (empty === -1) return true;

  for (const value of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValidPlacement(grid, empty, value)) {
      grid[empty] = value;
      if (fillGrid(grid)) return true;
      grid[empty] = 0;
    }
  }
  return false;
}

/**
 * Counts solutions up to `limit` (used to check uniqueness). Stops early once
 * `limit` is reached so it never explores the whole tree unnecessarily.
 */
function countSolutions(grid: Grid, limit = 2): number {
  const empty = grid.indexOf(0);
  if (empty === -1) return 1;

  let count = 0;
  for (let value = 1; value <= 9; value++) {
    if (isValidPlacement(grid, empty, value)) {
      grid[empty] = value;
      count += countSolutions(grid, limit);
      grid[empty] = 0;
      if (count >= limit) break;
    }
  }
  return count;
}

/** Solves a grid (returns a filled copy) or null if unsolvable. */
export function solve(grid: Grid): Grid | null {
  const copy = [...grid];
  return fillGrid(copy) ? copy : null;
}

export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const solution = new Array<number>(CELLS).fill(0);
  fillGrid(solution);

  const puzzle = [...solution];
  const target = CLUES[difficulty];
  const order = shuffle(Array.from({ length: CELLS }, (_, i) => i));

  let clues = CELLS;
  for (const i of order) {
    if (clues <= target) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    // Keep removal only if the puzzle still has exactly one solution.
    const probe = [...puzzle];
    if (countSolutions(probe, 2) !== 1) {
      puzzle[i] = backup;
    } else {
      clues--;
    }
  }

  const givens = puzzle.map((v) => v !== 0);
  return { puzzle, solution, givens };
}

/** All empty cell indices in the grid. */
export function emptyCells(grid: Grid): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) if (grid[i] === 0) out.push(i);
  return out;
}

/** True when every cell is filled and consistent. */
export function isComplete(grid: Grid): boolean {
  for (let i = 0; i < CELLS; i++) {
    if (grid[i] === 0) return false;
    if (!isValidPlacement(grid, i, grid[i])) return false;
  }
  return true;
}

export { SIZE, CELLS };
