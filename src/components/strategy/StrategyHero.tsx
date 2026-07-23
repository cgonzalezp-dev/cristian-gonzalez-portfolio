import { ArrowRight } from "lucide-react";
import { strategyHero } from "@/data/strategy";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { scrollToId } from "@/utils/scrollToId";
import { cn } from "@/utils/cn";

const jump = (href: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  scrollToId(href);
};

const toneClass = {
  up: "text-signal-up",
  down: "text-signal-down",
  neutral: "text-brass-500",
} as const;

export function StrategyHero() {
  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(199,154,75,0.10),transparent_70%)]"
      />
      <Container className="relative">
        <Reveal>
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-brass-500">
            {strategyHero.eyebrow}
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            {strategyHero.headline}
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-lg text-ink-600 dark:text-paper-200/75 sm:text-xl">
            {strategyHero.subhead}
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-5 max-w-2xl border-l-2 border-brass-500/50 pl-4 text-base italic text-ink-500 dark:text-paper-200/60">
            {strategyHero.positioning}
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 grid grid-cols-3 gap-3 sm:max-w-lg sm:gap-4">
            {strategyHero.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-ink-900/[0.06] bg-white p-4 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03]"
              >
                <div className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl", toneClass[m.tone])}>
                  {m.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-ink-600 dark:text-paper-200/60">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="#exec-summary" onClick={jump("#exec-summary")} variant="primary" icon={<ArrowRight className="h-4 w-4" />}>
              Read the case
            </Button>
            <Button href="#roadmap" onClick={jump("#roadmap")} variant="secondary">
              Jump to the roadmap
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
