import { AlertTriangle, TrendingDown, Users } from "lucide-react";
import { currentState } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

const iconByDimension: Record<string, typeof Users> = {
  Customer: TrendingDown,
  Company: AlertTriangle,
  People: Users,
};

export function CurrentState() {
  return (
    <Section
      id="current-state"
      eyebrow={currentState.eyebrow}
      heading={currentState.heading}
      description={currentState.description}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {currentState.cards.map((card, i) => {
          const Icon = iconByDimension[card.dimension] ?? Users;
          return (
            <Reveal key={card.dimension} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl border border-ink-900/[0.06] bg-white p-6 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brass-500/10 text-brass-600 dark:text-brass-400">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="text-lg font-bold tracking-tight">{card.dimension}</h3>
                </div>

                <p className="mt-4 text-[15px] leading-relaxed text-ink-700 dark:text-paper-100/85">{card.painPoint}</p>

                <div className="mt-5 space-y-3 border-t border-ink-900/[0.06] pt-4 dark:border-white/[0.08]">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-paper-200/50">
                      Business impact
                    </span>
                    <p className="mt-1 text-sm text-ink-600 dark:text-paper-200/70">{card.businessImpact}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-signal-down/90">Risk</span>
                    <p className="mt-1 text-sm text-ink-600 dark:text-paper-200/70">{card.risk}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
