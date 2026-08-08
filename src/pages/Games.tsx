import { useState } from "react";
import { Grid3x3, Crown } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/utils/cn";
import { SudokuGame } from "@/games/sudoku/SudokuGame";
import { ChessGame } from "@/games/chess/ChessGame";

type Game = "sudoku" | "chess";

const GAMES: { value: Game; label: string; icon: typeof Grid3x3; blurb: string }[] = [
  {
    value: "sudoku",
    label: "Sudoku",
    icon: Grid3x3,
    blurb: "Resuelve en solitario, compite contra la máquina o juega por turnos con un amigo.",
  },
  {
    value: "chess",
    label: "Ajedrez",
    icon: Crown,
    blurb: "Enfréntate a la máquina en tres niveles o juega una partida local a dos jugadores.",
  },
];

export function Games() {
  const [game, setGame] = useState<Game>("sudoku");

  return (
    <main id="games" className="min-h-screen pt-24 pb-20">
      <Container>
        <Reveal className="mb-8 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brass-500">
            Zona de juegos
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Sudoku y Ajedrez
          </h1>
          <p className="mt-4 text-lg text-ink-600 dark:text-paper-200/70">
            Un par de clásicos para desconectar. Juega contra la máquina o en multijugador local
            (mismo dispositivo, por turnos).
          </p>
        </Reveal>

        {/* Game switch */}
        <Reveal className="mb-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {GAMES.map((g) => {
              const Icon = g.icon;
              const active = game === g.value;
              return (
                <button
                  key={g.value}
                  onClick={() => setGame(g.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200",
                    active
                      ? "border-brass-500/60 bg-brass-500/[0.07] shadow-soft"
                      : "border-ink-900/[0.06] bg-white hover:-translate-y-0.5 hover:border-brass-500/30 hover:shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      active
                        ? "bg-brass-500 text-ink-950"
                        : "bg-ink-900/[0.05] text-ink-600 dark:bg-white/10 dark:text-paper-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-base font-bold text-ink-900 dark:text-paper-50">
                      {g.label}
                    </span>
                    <span className="mt-1 block text-sm text-ink-600 dark:text-paper-200/70">
                      {g.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal key={game}>{game === "sudoku" ? <SudokuGame /> : <ChessGame />}</Reveal>
      </Container>
    </main>
  );
}
