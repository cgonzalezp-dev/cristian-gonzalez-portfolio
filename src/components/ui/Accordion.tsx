import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export type AccordionItem = { title: string; content: string };

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="divide-y divide-ink-900/[0.08] dark:divide-white/[0.08]">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.title}>
            <h3>
              <button
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold"
              >
                {item.title}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform duration-300", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid overflow-hidden transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] pb-4 opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <p className="min-h-0 text-sm text-ink-600 dark:text-paper-200/70">{item.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
