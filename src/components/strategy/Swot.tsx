import { Shield, AlertOctagon, Sprout, Swords } from "lucide-react";
import { swot, type SwotQuadrant } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/utils/cn";

const meta: Record<SwotQuadrant["key"], { icon: typeof Shield; accent: string; ring: string }> = {
  strengths: { icon: Shield, accent: "text-signal-up", ring: "border-signal-up/25" },
  weaknesses: { icon: AlertOctagon, accent: "text-signal-down", ring: "border-signal-down/25" },
  opportunities: { icon: Sprout, accent: "text-brass-500", ring: "border-brass-500/30" },
  threats: { icon: Swords, accent: "text-ink-500 dark:text-paper-200/60", ring: "border-ink-600/20 dark:border-white/10" },
};

export function Swot() {
  return (
    <Section id="swot" eyebrow={swot.eyebrow} heading={swot.heading} description={swot.description} tone="raised">
      <div className="grid gap-4 md:grid-cols-2">
        {swot.quadrants.map((q, i) => {
          const { icon: Icon, accent, ring } = meta[q.key];
          return (
            <Reveal key={q.key} delay={i * 0.07}>
              <div className={cn("flex h-full flex-col rounded-2xl border-2 bg-white p-6 shadow-soft dark:bg-white/[0.03]", ring)}>
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5", accent)} strokeWidth={1.75} />
                  <h3 className="text-lg font-bold tracking-tight">{q.title}</h3>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-700 dark:text-paper-100/85">{q.insight}</p>
                <dl className="mt-5 space-y-3 border-t border-ink-900/[0.06] pt-4 text-sm dark:border-white/[0.08]">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-paper-200/50">
                      Implication
                    </dt>
                    <dd className="mt-1 text-ink-600 dark:text-paper-200/70">{q.implication}</dd>
                  </div>
                  <div>
                    <dt className={cn("text-xs font-semibold uppercase tracking-widest", accent)}>Move</dt>
                    <dd className="mt-1 font-medium text-ink-800 dark:text-paper-100/90">{q.move}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
