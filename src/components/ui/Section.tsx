import { useId, useState, type HTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { Container } from "./Container";
import { Reveal } from "./Reveal";

type SectionProps = HTMLAttributes<HTMLElement> & {
  id?: string;
  eyebrow?: string;
  heading?: string;
  description?: string;
  children: ReactNode;
  tone?: "base" | "raised";
  /** When true, the heading toggles the section body open/closed. */
  collapsible?: boolean;
  /** Initial open state when collapsible (defaults to collapsed). */
  defaultOpen?: boolean;
};

export function Section({
  id,
  eyebrow,
  heading,
  description,
  children,
  tone = "base",
  collapsible = false,
  defaultOpen = false,
  className,
  ...props
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const sectionClass = cn(
    "py-12 sm:py-16 scroll-mt-20",
    tone === "raised" && "bg-ink-900/[0.03] dark:bg-white/[0.02]",
    className,
  );

  if (collapsible) {
    return (
      <section id={id} className={sectionClass} {...props}>
        <Container>
          <Reveal>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <div className="max-w-2xl">
                {eyebrow && (
                  <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brass-500">{eyebrow}</p>
                )}
                {heading && (
                  <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "mt-1 h-6 w-6 shrink-0 text-ink-400 transition-transform duration-300 dark:text-paper-200/50",
                  open && "rotate-180 text-brass-500 dark:text-brass-400",
                )}
                aria-hidden="true"
              />
            </button>
            <div
              id={panelId}
              role="region"
              className={cn(
                "grid overflow-hidden transition-all duration-300 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0">
                {description && (
                  <p className="mt-4 max-w-2xl text-lg text-ink-600 dark:text-paper-200/70">{description}</p>
                )}
                <div className="mt-8">{children}</div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    );
  }

  return (
    <section id={id} className={sectionClass} {...props}>
      <Container>
        {(eyebrow || heading || description) && (
          <Reveal className="mb-8 max-w-2xl">
            {eyebrow && (
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brass-500">{eyebrow}</p>
            )}
            {heading && (
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-ink-600 dark:text-paper-200/70">{description}</p>
            )}
          </Reveal>
        )}
        {children}
      </Container>
    </section>
  );
}
