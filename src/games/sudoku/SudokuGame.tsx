import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Cpu, Users, User, Lightbulb, Eraser } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import {
  colOf,
  emptyCells,
  generatePuzzle,
  isValidPlacement,
  rowOf,
  type Difficulty,
  type Puzzle,
} from "./engine";

type Mode = "solo" | "ai" | "local";
type Player = 0 | 1;

/** Probability the machine deliberately misses its turn, by difficulty. */
const MISS_CHANCE: Record<Difficulty, number> = {
  easy: 0.3,
  medium: 0.1,
  hard: 0,
};

export function SudokuGame() {
  const [mode, setMode] = useState<Mode>("solo");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle("easy"));
  const [grid, setGrid] = useState<number[]>(() => [...puzzle.puzzle]);
  const [selected, setSelected] = useState<number | null>(null);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [turn, setTurn] = useState<Player>(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  const turnBased = mode === "ai" || mode === "local";

  const startGame = useCallback((diff: Difficulty) => {
    const fresh = generatePuzzle(diff);
    setPuzzle(fresh);
    setGrid([...fresh.puzzle]);
    setSelected(null);
    setErrors(new Set());
    setScores([0, 0]);
    setTurn(0);
    setNotice(null);
    setThinking(false);
  }, []);

  // Rebuild the puzzle whenever difficulty or mode changes.
  useEffect(() => {
    startGame(difficulty);
  }, [difficulty, mode, startGame]);

  const remaining = useMemo(() => emptyCells(grid).length, [grid]);
  const solved = remaining === 0;

  const placeValue = useCallback(
    (cell: number, value: number) => {
      if (puzzle.givens[cell]) return;
      const correct = puzzle.solution[cell];

      if (turnBased) {
        // In turn-based modes a wrong entry costs your turn; a correct one
        // locks the cell and scores a point.
        if (value === correct) {
          setGrid((g) => {
            const next = [...g];
            next[cell] = value;
            return next;
          });
          setScores((s) => {
            const next: [number, number] = [...s];
            next[turn] += 1;
            return next;
          });
          setNotice(null);
        } else {
          setErrors((e) => new Set(e).add(cell));
          setNotice(`${playerName(turn, mode)} falló. Cambio de turno.`);
          setTimeout(() => {
            setErrors((e) => {
              const next = new Set(e);
              next.delete(cell);
              return next;
            });
          }, 700);
        }
        setTurn((t) => (t === 0 ? 1 : 0));
        setSelected(null);
        return;
      }

      // Solo mode: free placement with live error highlighting.
      setGrid((g) => {
        const next = [...g];
        next[cell] = value;
        return next;
      });
      setErrors((e) => {
        const next = new Set(e);
        if (value !== 0 && !isValidPlacement(replaceAt(grid, cell, value), cell, value)) {
          next.add(cell);
        } else {
          next.delete(cell);
        }
        return next;
      });
    },
    [puzzle, turnBased, turn, mode, grid],
  );

  const handleNumber = (value: number) => {
    if (selected === null || solved) return;
    if (mode === "ai" && turn === 1) return; // machine's turn
    placeValue(selected, value);
  };

  const handleErase = () => {
    if (selected === null || turnBased) return;
    if (puzzle.givens[selected]) return;
    setGrid((g) => replaceAt(g, selected, 0));
    setErrors((e) => {
      const next = new Set(e);
      next.delete(selected);
      return next;
    });
  };

  const handleHint = () => {
    if (turnBased || solved) return;
    const empties = emptyCells(grid).filter((i) => grid[i] !== puzzle.solution[i] || grid[i] === 0);
    const target = selected !== null && grid[selected] !== puzzle.solution[selected] ? selected : empties[0];
    if (target === undefined) return;
    setGrid((g) => replaceAt(g, target, puzzle.solution[target]));
    setErrors((e) => {
      const next = new Set(e);
      next.delete(target);
      return next;
    });
  };

  // Machine turn in AI mode.
  useEffect(() => {
    if (mode !== "ai" || turn !== 1 || solved) return;

    setThinking(true);
    const timer = setTimeout(() => {
      const empties = emptyCells(grid);
      if (empties.length === 0) {
        setThinking(false);
        return;
      }
      const cell = empties[Math.floor(Math.random() * empties.length)];

      if (Math.random() < MISS_CHANCE[difficulty]) {
        setNotice("La máquina falló. ¡Tu turno!");
      } else {
        setGrid((g) => replaceAt(g, cell, puzzle.solution[cell]));
        setScores((s) => [s[0], s[1] + 1]);
        setNotice(null);
      }
      setTurn(0);
      setThinking(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [mode, turn, solved, grid, puzzle, difficulty]);

  // Keyboard input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "9") handleNumber(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") handleErase();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, solved, turn, mode, grid, puzzle]);

  const winner = useMemo(() => {
    if (!solved || !turnBased) return null;
    if (scores[0] === scores[1]) return "tie";
    return scores[0] > scores[1] ? 0 : 1;
  }, [solved, turnBased, scores]);

  const selectedValue = selected !== null ? grid[selected] : 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Board */}
      <div className="mx-auto w-full max-w-[520px]">
        <div className="grid grid-cols-9 overflow-hidden rounded-xl border-2 border-ink-900/70 shadow-soft dark:border-white/40">
          {grid.map((value, i) => {
            const r = rowOf(i);
            const c = colOf(i);
            const isGiven = puzzle.givens[i];
            const isSelected = selected === i;
            const isError = errors.has(i);
            const sameRowCol =
              selected !== null && (rowOf(selected) === r || colOf(selected) === c);
            const sameValue = selectedValue !== 0 && value === selectedValue;
            const thickRight = c % 3 === 2 && c !== 8;
            const thickBottom = r % 3 === 2 && r !== 8;

            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                aria-label={`Fila ${r + 1}, columna ${c + 1}${value ? `, valor ${value}` : ", vacía"}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center text-lg font-semibold transition-colors sm:text-2xl",
                  "border border-ink-900/15 dark:border-white/15",
                  thickRight && "border-r-2 border-r-ink-900/70 dark:border-r-white/40",
                  thickBottom && "border-b-2 border-b-ink-900/70 dark:border-b-white/40",
                  isGiven
                    ? "text-ink-900 dark:text-paper-50"
                    : "text-brass-600 dark:text-brass-400",
                  isError && "bg-signal-down/25 text-signal-down",
                  !isError && isSelected && "bg-brass-500/25",
                  !isError && !isSelected && sameValue && value !== 0 && "bg-brass-500/10",
                  !isError && !isSelected && !sameValue && sameRowCol && "bg-ink-900/[0.04] dark:bg-white/[0.05]",
                  !isError && !isSelected && !sameValue && !sameRowCol && "bg-white dark:bg-white/[0.02]",
                )}
              >
                {value !== 0 ? value : ""}
              </button>
            );
          })}
        </div>

        {/* Number pad */}
        <div className="mt-4 grid grid-cols-9 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleNumber(n)}
              disabled={solved || (mode === "ai" && turn === 1)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-lg font-semibold transition-colors sm:text-xl",
                "bg-ink-900/[0.04] text-ink-800 hover:bg-brass-500/20 disabled:opacity-40 dark:bg-white/5 dark:text-paper-100 dark:hover:bg-brass-500/20",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Side panel */}
      <div className="flex w-full flex-col gap-5 lg:max-w-xs">
        <div className="rounded-2xl border border-ink-900/[0.06] bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "solo", label: "Solo", icon: <User className="h-4 w-4" /> },
                { value: "ai", label: "Máquina", icon: <Cpu className="h-4 w-4" /> },
                { value: "local", label: "2 Jug.", icon: <Users className="h-4 w-4" /> },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors",
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

          <div className="mt-4">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-400 dark:text-paper-200/50">
              Dificultad
            </p>
            <div className="flex gap-1 rounded-lg bg-ink-900/[0.04] p-1 dark:bg-white/5">
              {(
                [
                  { value: "easy", label: "Fácil" },
                  { value: "medium", label: "Media" },
                  { value: "hard", label: "Difícil" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    difficulty === opt.value
                      ? "bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-paper-50"
                      : "text-ink-500 hover:text-ink-800 dark:text-paper-200/60 dark:hover:text-paper-100",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-2xl border border-ink-900/[0.06] bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
          {turnBased ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ScoreCard
                  name={playerName(0, mode)}
                  score={scores[0]}
                  active={turn === 0 && !solved}
                />
                <ScoreCard
                  name={playerName(1, mode)}
                  score={scores[1]}
                  active={turn === 1 && !solved}
                />
              </div>
              <p className="mt-3 text-center text-xs text-ink-500 dark:text-paper-200/60">
                {solved
                  ? winner === "tie"
                    ? "¡Empate!"
                    : `Ganó ${playerName(winner as Player, mode)} 🎉`
                  : thinking
                    ? "La máquina está pensando…"
                    : notice ?? `Turno de ${playerName(turn, mode)}`}
              </p>
            </>
          ) : (
            <div className="text-center">
              <p className="text-2xl font-bold text-ink-900 dark:text-paper-50">
                {solved ? "¡Resuelto! 🎉" : remaining}
              </p>
              <p className="text-xs text-ink-500 dark:text-paper-200/60">
                {solved ? "Muy bien jugado" : "casillas restantes"}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {mode === "solo" && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={<Lightbulb className="h-4 w-4" />} onClick={handleHint}>
              Pista
            </Button>
            <Button variant="secondary" icon={<Eraser className="h-4 w-4" />} onClick={handleErase}>
              Borrar
            </Button>
          </div>
        )}
        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => startGame(difficulty)}
        >
          Nuevo juego
        </Button>
      </div>
    </div>
  );
}

function ScoreCard({ name, score, active }: { name: string; score: number; active: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-center transition-colors",
        active
          ? "border-brass-500/60 bg-brass-500/10"
          : "border-ink-900/[0.06] bg-ink-900/[0.02] dark:border-white/[0.06] dark:bg-white/[0.02]",
      )}
    >
      <p className="truncate text-xs font-medium text-ink-600 dark:text-paper-200/70">{name}</p>
      <p className="text-2xl font-bold text-ink-900 dark:text-paper-50">{score}</p>
    </div>
  );
}

function playerName(player: Player, mode: Mode): string {
  if (mode === "ai") return player === 0 ? "Tú" : "Máquina";
  return player === 0 ? "Jugador 1" : "Jugador 2";
}

function replaceAt(arr: number[], i: number, value: number): number[] {
  const next = [...arr];
  next[i] = value;
  return next;
}
