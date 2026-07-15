import type { TimelineEntry } from "@/data/content";
import { Reveal } from "./Reveal";

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative border-l border-ink-900/10 dark:border-white/10 pl-8">
      {entries.map((entry, index) => (
        <li key={entry.role} className="mb-12 last:mb-0">
          <Reveal delay={index * 0.05}>
            <span
              className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-paper-50 dark:border-ink-900 bg-brass-500"
              aria-hidden="true"
            />
            <p className="text-xs font-semibold uppercase tracking-widest text-brass-500">{entry.period}</p>
            <h3 className="mt-1 text-xl font-bold">{entry.role}</h3>
            <p className="text-sm text-ink-600 dark:text-paper-200/60">{entry.org}</p>
            <ul className="mt-3 space-y-2">
              {entry.bullets.map((bullet) => (
                <li key={bullet} className="text-sm leading-relaxed text-ink-700 dark:text-paper-100/80">
                  {bullet}
                </li>
              ))}
            </ul>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
