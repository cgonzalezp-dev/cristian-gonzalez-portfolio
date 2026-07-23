import { commercial } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function CommercialModel() {
  return (
    <Section id="commercial" eyebrow={commercial.eyebrow} heading={commercial.heading} description={commercial.description} collapsible>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {commercial.pillars.map((pillar, i) => (
          <Reveal key={pillar.name} delay={(i % 3) * 0.06}>
            <div className="group flex h-full items-start gap-4 rounded-2xl border border-ink-900/[0.06] bg-white p-5 shadow-soft transition-colors hover:border-brass-500/30 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <span className="mt-0.5 font-serif text-2xl font-bold text-brass-500/70 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[15px] font-bold tracking-tight">{pillar.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-paper-200/70">{pillar.description}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
