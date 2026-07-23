import { ArrowRight } from "lucide-react";
import { businessImpact } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function BusinessImpact() {
  return (
    <Section
      id="business-impact"
      eyebrow={businessImpact.eyebrow}
      heading={businessImpact.heading}
      description={businessImpact.description}
    >
      <div className="overflow-hidden rounded-2xl border border-ink-900/[0.06] bg-white shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03]">
        {/* header row (md+) */}
        <div className="hidden grid-cols-[140px_1fr_40px_1fr] items-center gap-4 border-b border-ink-900/[0.06] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-ink-500 dark:border-white/[0.08] dark:text-paper-200/50 md:grid">
          <span>Lever</span>
          <span>Current state</span>
          <span />
          <span className="text-brass-600 dark:text-brass-400">Future state</span>
        </div>
        {businessImpact.rows.map((row, i) => (
          <Reveal key={row.lever} delay={i * 0.05}>
            <div className="grid grid-cols-1 gap-2 border-b border-ink-900/[0.06] px-6 py-4 last:border-b-0 dark:border-white/[0.08] md:grid-cols-[140px_1fr_40px_1fr] md:items-center md:gap-4">
              <span className="text-sm font-bold tracking-tight">{row.lever}</span>
              <span className="text-sm text-ink-600 dark:text-paper-200/65">{row.current}</span>
              <ArrowRight className="hidden h-4 w-4 text-brass-500 md:block" />
              <span className="text-sm font-medium text-ink-800 dark:text-paper-100/90">
                <span className="text-brass-600 dark:text-brass-400 md:hidden">→ </span>
                {row.future}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
