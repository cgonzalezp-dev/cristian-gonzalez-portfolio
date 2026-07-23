import { execSummary } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function ExecutiveSummary() {
  return (
    <Section id="exec-summary" eyebrow={execSummary.eyebrow} heading={execSummary.heading} tone="raised">
      <div className="grid gap-4 sm:grid-cols-2">
        {execSummary.blocks.map((block, i) => (
          <Reveal key={block.tag} delay={i * 0.06}>
            <div className="h-full rounded-2xl border border-ink-900/[0.06] bg-white p-6 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03]">
              <span className="text-xs font-semibold uppercase tracking-widest text-brass-500">{block.tag}</span>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700 dark:text-paper-100/85">{block.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
