import { metrics, type MetricGroup } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Collapsible } from "@/components/ui/Collapsible";
import { CountUp } from "@/components/ui/CountUp";

function GroupBlock({ group, index }: { group: MetricGroup; index: number }) {
  const isRecord = group.key === "track-record";
  const valueClass = isRecord ? "text-signal-up" : "text-ink-900 dark:text-paper-50";
  const dotClass = isRecord ? "bg-signal-up" : "bg-brass-500";

  const header = (
    <div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <h3 className="text-base font-bold tracking-tight sm:text-lg">{group.title}</h3>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-paper-200/70">{group.summary}</p>
    </div>
  );

  return (
    <Reveal delay={index * 0.08}>
      <div className="rounded-2xl border border-ink-900/[0.06] bg-white p-5 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6">
        <Collapsible header={header} defaultOpen={index === 0}>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-ink-900/[0.06] pt-5 dark:border-white/[0.08] lg:grid-cols-4">
            {group.items.map((m) => (
              <div key={m.label}>
                <div className={`text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl ${valueClass}`}>
                  <CountUp to={m.value} decimals={m.decimals ?? 0} prefix={m.prefix} suffix={m.suffix} />
                </div>
                <div className="mt-1.5 text-xs font-semibold text-ink-800 dark:text-paper-100/90">{m.label}</div>
                <div className="mt-0.5 text-xs leading-snug text-ink-500 dark:text-paper-200/55">{m.note}</div>
              </div>
            ))}
          </div>
        </Collapsible>
      </div>
    </Reveal>
  );
}

export function Metrics() {
  return (
    <Section id="metrics" eyebrow={metrics.eyebrow} heading={metrics.heading} description={metrics.description} tone="raised" collapsible>
      <div className="space-y-4">
        {metrics.groups.map((group, i) => (
          <GroupBlock key={group.key} group={group} index={i} />
        ))}
      </div>
    </Section>
  );
}
