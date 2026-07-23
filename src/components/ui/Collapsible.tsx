import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

type CollapsibleProps = {
  /** Always-visible clickable summary row. */
  header: ReactNode;
  /** Detail revealed on expand. */
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Executive drill-down: a high-level summary stays visible; detail expands on
 * click. Uses the same grid-rows [0fr]→[1fr] technique as the site's Accordion
 * so height animates smoothly without measuring, and honors reduced motion via
 * the global transition-duration override in index.css.
 */
export function Collapsible({ header, children, defaultOpen = false, className }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 text-left"
      >
        <span className="min-w-0 flex-1">{header}</span>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-ink-400 transition-transform duration-300 dark:text-paper-200/50",
            open && "rotate-180 text-brass-500 dark:text-brass-400",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">{children}</div>
      </div>
    </div>
  );
}
