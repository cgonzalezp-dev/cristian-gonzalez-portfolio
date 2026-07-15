import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TimelineEntry } from "@/data/content";
import { cn } from "@/utils/cn";
import { Reveal } from "./Reveal";

function TimelineItem({ entry, delay }: { entry: TimelineEntry; delay: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <li className="pb-8 last:pb-0">
      <Reveal delay={delay}>
        <span
          className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-paper-50 dark:border-ink-900 bg-brass-500"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="group flex w-full items-start justify-between gap-4 rounded-lg p-2 -m-2 text-left transition-colors hover:bg-ink-900/[0.03] dark:hover:bg-white/[0.04]"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass-500">{entry.period}</p>
            <h3 className="mt-1 text-xl font-bold">{entry.role}</h3>
            <p className="text-sm text-ink-600 dark:text-paper-200/60">{entry.org}</p>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-brass-500 transition-transform duration-300",
              isOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
        <div
          id={panelId}
          className={cn(
            "grid overflow-hidden transition-all duration-300 ease-out",
            isOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <ul className="min-h-0 space-y-2">
            {entry.bullets.map((bullet) => (
              <li key={bullet} className="text-sm leading-relaxed text-ink-700 dark:text-paper-100/80">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </li>
  );
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative border-l border-ink-900/10 dark:border-white/10 pl-8">
      {entries.map((entry, index) => (
        <TimelineItem key={entry.role} entry={entry} delay={index * 0.05} />
      ))}
    </ol>
  );
}
