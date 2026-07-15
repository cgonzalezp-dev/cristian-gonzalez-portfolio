import type { HTMLAttributes, ReactNode } from "react";
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
};

export function Section({
  id,
  eyebrow,
  heading,
  description,
  children,
  tone = "base",
  className,
  ...props
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 sm:py-28 scroll-mt-20",
        tone === "raised" && "bg-ink-900/[0.03] dark:bg-white/[0.02]",
        className,
      )}
      {...props}
    >
      <Container>
        {(eyebrow || heading || description) && (
          <Reveal className="mb-12 max-w-2xl">
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
