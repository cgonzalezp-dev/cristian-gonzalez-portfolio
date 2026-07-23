import { Check, Zap, Gauge, AlertTriangle, Package } from "lucide-react";
import { roadmap, type RoadmapPhase } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Collapsible } from "@/components/ui/Collapsible";

function BulletList({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof Check;
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div>
      <div className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${accent}`}>
        <Icon className="h-4 w-4" strokeWidth={2} />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-600 dark:text-paper-200/70">
            <span className={`mt-2 h-1 w-1 shrink-0 rounded-full ${accent.replace("text-", "bg-")}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChipRow({ icon: Icon, title, items, tone }: { icon: typeof Gauge; title: string; items: string[]; tone: string }) {
  return (
    <div>
      <div className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${tone}`}>
        <Icon className="h-4 w-4" strokeWidth={2} />
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((v) => (
          <span
            key={v}
            className="rounded-full border border-ink-600/20 bg-ink-900/[0.03] px-3 py-1 text-xs font-medium text-ink-700 dark:border-white/10 dark:bg-white/5 dark:text-paper-100/85"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function PhaseItem({ phase, index }: { phase: RoadmapPhase; index: number }) {
  const header = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pr-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass-500 text-base font-extrabold text-ink-950">
        {index + 1}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold tracking-tight sm:text-xl">{phase.title}</h3>
          <Badge>{phase.horizon}</Badge>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-paper-200/70">{phase.objective}</p>
      </div>
    </div>
  );

  return (
    <Reveal delay={index * 0.06}>
      <article className="rounded-2xl border border-ink-900/[0.06] bg-white p-5 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6">
        <Collapsible header={header} defaultOpen={index === 0}>
          <div className="mt-5 grid gap-5 border-t border-ink-900/[0.06] pt-5 dark:border-white/[0.08] lg:grid-cols-2">
            <BulletList icon={Check} title="Actions" items={phase.actions} accent="text-ink-500 dark:text-paper-200/60" />
            <div className="space-y-5">
              <BulletList icon={Zap} title="Quick wins" items={phase.quickWins} accent="text-brass-600 dark:text-brass-400" />
              <BulletList icon={AlertTriangle} title="Risks" items={phase.risks} accent="text-signal-down/90" />
            </div>
          </div>
          <div className="mt-5 grid gap-5 border-t border-ink-900/[0.06] pt-5 dark:border-white/[0.08] sm:grid-cols-2">
            <ChipRow icon={Gauge} title="KPIs" items={phase.kpis} tone="text-signal-up" />
            <ChipRow icon={Package} title="Deliverables" items={phase.deliverables} tone="text-ink-500 dark:text-paper-200/60" />
          </div>
        </Collapsible>
      </article>
    </Reveal>
  );
}

export function Roadmap() {
  return (
    <Section id="roadmap" eyebrow={roadmap.eyebrow} heading={roadmap.heading} description={roadmap.description} tone="raised">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-ink-400 dark:text-paper-200/40">
        Click a phase to expand
      </p>
      <div className="space-y-4">
        {roadmap.phases.map((phase, i) => (
          <PhaseItem key={phase.phase} phase={phase} index={i} />
        ))}
      </div>
    </Section>
  );
}
