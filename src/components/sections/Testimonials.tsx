import { Quote } from "lucide-react";
import { testimonials } from "@/data/content";
import { Section } from "@/components/ui/Section";

export function Testimonials() {
  return (
    <Section id="testimonials" eyebrow={testimonials.heading} heading="What people say — soon.">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/15 dark:border-white/15 px-8 py-16 text-center">
        <Quote className="h-6 w-6 text-ink-600/40 dark:text-paper-200/30" aria-hidden="true" />
        <p className="mt-4 max-w-md text-sm text-ink-600 dark:text-paper-200/60">{testimonials.emptyState}</p>
      </div>
    </Section>
  );
}
