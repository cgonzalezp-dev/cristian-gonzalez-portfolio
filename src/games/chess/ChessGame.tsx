import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Cpu, Users, Crown } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { chooseMove, type AiLevel } from "./ai";
import {
  applyMove,
  createInitialState,
  generateLegalMoves,
  getStatus,
  legalMovesFrom,
  samePos,
  type Color,
  type GameState,
  type Move,
  type PieceType,
  type Position,
} from "./engine";

type Mode = "ai" | "local";

/** Unicode glyphs for each piece, keyed by color+type. */
const GLYPH: Record<Color, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const PIECE_NAME: Record<PieceType, string> = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
  k: "rey",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function ChessGame() {
  const [mode, setMode] = useState<Mode>("ai");
  const [level, setLevel] = useState<AiLevel>("medium");
  const [humanColor, setHumanColor] = useState<Color>("w");
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [selected, setSelected] = useState<Position | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [captured, setCaptured] = useState<{ w: PieceType[]; b: PieceType[] }>({ w: [], b: [] });
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(null);
  const [thinking, setThinking] = useState(false);

  const status = useMemo(() => getStatus(state), [state]);
  const gameOver = status === "checkmate" || status === "stalemate" || status === "draw";

  const legalForSelected = useMemo(
    () => (selected ? legalMovesFrom(state, selected) : []),
    [state, selected],
  );

  const reset = useCallback(() => {
    setState(createInitialState());
    setSelected(null);
    setLastMove(null);
    setCaptured({ w: [], b: [] });
    setPendingPromotion(null);
    setThinking(false);
  }, []);

  // Restart whenever the setup changes so the board matches the chosen options.
  useEffect(() => {
    reset();
  }, [mode, humanColor, reset]);

  const commitMove = useCallback((current: GameState, move: Move) => {
    const next = applyMove(current, move);
    if (move.captured) {
      // The captured piece belongs to the side that was NOT moving.
      const victim: Color = current.turn === "w" ? "b" : "w";
      setCaptured((prev) => ({ ...prev, [victim]: [...prev[victim], move.captured!] }));
    }
    setState(next);
    setLastMove(move);
    setSelected(null);
    return next;
  }, []);

  // Machine reply: when it's the AI's turn in AI mode, pick and play a move.
  useEffect(() => {
    if (mode !== "ai" || gameOver) return;
    if (state.turn === humanColor) return;

    setThinking(true);
    const timer = setTimeout(() => {
      const move = chooseMove(state, level);
      if (move) commitMove(state, move);
      setThinking(false);
    }, 350);

    return () => {
      clearTimeout(timer);
      setThinking(false);
    };
  }, [state, mode, humanColor, level, gameOver, commitMove]);

  const handleSquareClick = (pos: Position) => {
    if (gameOver || pendingPromotion) return;
    if (mode === "ai" && state.turn !== humanColor) return;

    const piece = state.board[pos.row][pos.col];

    // Selecting one of your own pieces (re)opens its move set.
    if (piece && piece.color === state.turn) {
      setSelected(pos);
      return;
    }

    if (!selected) return;

    const candidates = legalForSelected.filter((m) => samePos(m.to, pos));
    if (candidates.length === 0) {
      setSelected(null);
      return;
    }

    // Promotion produces four candidate moves for the same target square.
    if (candidates.length > 1 && candidates.every((m) => m.promotion)) {
      setPendingPromotion({ from: selected, to: pos });
      return;
    }

    commitMove(state, candidates[0]);
  };

  const choosePromotion = (promotion: PieceType) => {
    if (!pendingPromotion) return;
    const move = generateLegalMoves(state).find(
      (m) =>
        samePos(m.from, pendingPromotion.from) &&
        samePos(m.to, pendingPromotion.to) &&
        m.promotion === promotion,
    );
    if (move) commitMove(state, move);
    setPendingPromotion(null);
  };

  // Board is always rendered from White's side at the bottom, but flipped so
  // the human's pieces sit closest to them when playing Black vs the machine.
  const flipped = mode === "ai" && humanColor === "b";
  const rowOrder = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const colOrder = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const turnLabel = state.turn === "w" ? "Blancas" : "Negras";
  const statusMessage = buildStatusMessage(status, state.turn, mode, humanColor);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Board */}
      <div className="mx-auto w-full max-w-[560px]">
        <div className="relative">
          <div
            className={cn(
              "grid grid-cols-8 overflow-hidden rounded-xl border border-ink-900/10 shadow-soft dark:border-white/10",
              (thinking || (mode === "ai" && state.turn !== humanColor && !gameOver)) && "opacity-95",
            )}
            role="grid"
            aria-label="Tablero de ajedrez"
          >
            {rowOrder.map((row) =>
              colOrder.map((col) => {
                const piece = state.board[row][col];
                const isDark = (row + col) % 2 === 1;
                const isSelected = selected && samePos(selected, { row, col });
                const isTarget = legalForSelected.some((m) => samePos(m.to, { row, col }));
                const isLastFrom = lastMove && samePos(lastMove.from, { row, col });
                const isLastTo = lastMove && samePos(lastMove.to, { row, col });

                return (
                  <button
                    key={`${row}-${col}`}
                    onClick={() => handleSquareClick({ row, col })}
                    role="gridcell"
                    aria-label={`${FILES[col]}${8 - row}${piece ? `, ${piece.color === "w" ? "blancas" : "negras"} ${PIECE_NAME[piece.type]}` : ", vacía"}`}
                    className={cn(
                      "relative flex aspect-square items-center justify-center select-none transition-colors",
                      isDark ? "bg-brass-600/70" : "bg-paper-100",
                      (isLastFrom || isLastTo) && "ring-2 ring-inset ring-brass-400/70",
                      isSelected && "ring-2 ring-inset ring-signal-up",
                    )}
                  >
                    {piece && (
                      <span
                        className={cn(
                          "pointer-events-none text-[8vw] leading-none sm:text-4xl md:text-5xl",
                          piece.color === "w"
                            ? "text-white [text-shadow:0_1px_2px_rgba(8,13,23,0.55)]"
                            : "text-ink-950",
                        )}
                      >
                        {GLYPH[piece.color][piece.type]}
                      </span>
                    )}
                    {isTarget && !piece && (
                      <span className="pointer-events-none absolute h-1/4 w-1/4 rounded-full bg-signal-up/70" />
                    )}
                    {isTarget && piece && (
                      <span className="pointer-events-none absolute inset-1 rounded-full ring-4 ring-signal-up/60" />
                    )}
                  </button>
                );
              }),
            )}
          </div>

          {/* Promotion picker overlay */}
          {pendingPromotion && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm">
              <div className="rounded-xl bg-white p-4 shadow-softLg dark:bg-ink-800">
                <p className="mb-3 text-center text-sm font-semibold text-ink-800 dark:text-paper-100">
                  Coronar peón
                </p>
                <div className="flex gap-2">
                  {(["q", "r", "b", "n"] as PieceType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => choosePromotion(t)}
                      className="flex h-12 w-12 items-center justify-center rounded-lg border border-ink-900/10 text-3xl hover:bg-brass-500/10 dark:border-white/10 dark:text-paper-50"
                    >
                      {GLYPH[state.turn][t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      <div className="flex w-full flex-col gap-5 lg:max-w-xs">
        <div className="rounded-2xl border border-ink-900/[0.06] bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <ModeToggle mode={mode} onChange={setMode} />

          {mode === "ai" && (
            <div className="mt-4 space-y-4">
              <SegmentedControl<AiLevel>
                label="Dificultad"
                value={level}
                onChange={setLevel}
                options={[
                  { value: "easy", label: "Fácil" },
                  { value: "medium", label: "Media" },
                  { value: "hard", label: "Difícil" },
                ]}
              />
              <SegmentedControl<Color>
                label="Tu color"
                value={humanColor}
                onChange={setHumanColor}
                options={[
                  { value: "w", label: "Blancas" },
                  { value: "b", label: "Negras" },
                ]}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ink-900/[0.06] bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <Crown
              className={cn("h-4 w-4", state.turn === "w" ? "text-brass-500" : "text-ink-500")}
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-ink-800 dark:text-paper-100">{statusMessage}</p>
          </div>
          {!gameOver && (
            <p className="mt-1 text-xs text-ink-500 dark:text-paper-200/60">
              {thinking ? "La máquina está pensando…" : `Turno: ${turnLabel}`}
            </p>
          )}

          <CapturedRow label="Capturadas por blancas" pieces={captured.b} color="b" />
          <CapturedRow label="Capturadas por negras" pieces={captured.w} color="w" />
        </div>

        <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
          Reiniciar partida
        </Button>
      </div>
    </div>
  );
}

function CapturedRow({ label, pieces, color }: { label: string; pieces: PieceType[]; color: Color }) {
  if (pieces.length === 0) return null;
  const order: PieceType[] = ["q", "r", "b", "n", "p"];
  const sorted = [...pieces].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-paper-200/50">{label}</p>
      <p className="text-xl leading-tight" aria-hidden="true">
        {sorted.map((t, i) => (
          <span key={i} className={color === "w" ? "text-ink-500" : "text-ink-800 dark:text-paper-200"}>
            {GLYPH[color][t]}
          </span>
        ))}
      </p>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          { value: "ai", label: "Vs Máquina", icon: <Cpu className="h-4 w-4" /> },
          { value: "local", label: "2 Jugadores", icon: <Users className="h-4 w-4" /> },
        ] as const
      ).map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
            mode === opt.value
              ? "bg-brass-500 text-ink-950"
              : "bg-ink-900/[0.04] text-ink-600 hover:bg-ink-900/[0.07] dark:bg-white/5 dark:text-paper-200/70 dark:hover:bg-white/10",
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-400 dark:text-paper-200/50">{label}</p>
      <div className="flex gap-1 rounded-lg bg-ink-900/[0.04] p-1 dark:bg-white/5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              value === opt.value
                ? "bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-paper-50"
                : "text-ink-500 hover:text-ink-800 dark:text-paper-200/60 dark:hover:text-paper-100",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildStatusMessage(
  status: ReturnType<typeof getStatus>,
  turn: Color,
  mode: Mode,
  humanColor: Color,
): string {
  const side = turn === "w" ? "Blancas" : "Negras";
  const winner = turn === "w" ? "Negras" : "Blancas";

  if (status === "checkmate") {
    if (mode === "ai") {
      return winner === (humanColor === "w" ? "Blancas" : "Negras")
        ? "¡Jaque mate! Ganaste 🎉"
        : "Jaque mate. Ganó la máquina.";
    }
    return `¡Jaque mate! Ganan las ${winner}.`;
  }
  if (status === "stalemate") return "Tablas por ahogado.";
  if (status === "draw") return "Tablas (regla de 50 movimientos).";
  if (status === "check") return `¡Jaque a las ${side}!`;
  return "Partida en curso";
}
