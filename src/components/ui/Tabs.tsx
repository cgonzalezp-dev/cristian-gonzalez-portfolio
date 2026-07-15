import { useId, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export type TabItem = { label: string; content: ReactNode };

export function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();

  return (
    <div>
      <div role="tablist" aria-label="Skill categories" className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const selected = active === index;
          return (
            <button
              key={item.label}
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${index}`}
              onClick={() => setActive(index)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200",
                selected
                  ? "bg-brass-500 text-ink-950"
                  : "bg-ink-900/[0.04] dark:bg-white/5 text-ink-700 dark:text-paper-100/80 hover:bg-ink-900/[0.08] dark:hover:bg-white/10",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => (
        <div
          key={item.label}
          role="tabpanel"
          id={`${baseId}-panel-${index}`}
          aria-labelledby={`${baseId}-tab-${index}`}
          hidden={active !== index}
          className="mt-6"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
