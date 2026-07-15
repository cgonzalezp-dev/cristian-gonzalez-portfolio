import { Quote } from "lucide-react";
import { testimonials } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";

export function Testimonials() {
  const hasTestimonials = testimonials.items.length > 0;

  return (
    <Section id="testimonials" eyebrow={testimonials.heading} heading="What people say.">
      {hasTestimonials ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {testimonials.items.map((item, index) => (
            <Reveal key={item.name} delay={index * 0.08}>
              <Card className="h-full hover:-translate-y-1">
                <Quote className="h-5 w-5 text-brass-500" strokeWidth={1.75} aria-hidden="true" />
                <p className="mt-4 text-base leading-relaxed text-ink-700 dark:text-paper-100/85">
                  {item.quote}
                </p>
                <p className="mt-4 text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-ink-600 dark:text-paper-200/60">{item.title}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/15 dark:border-white/15 px-8 py-16 text-center">
          <Quote className="h-6 w-6 text-ink-600/40 dark:text-paper-200/30" aria-hidden="true" />
          <p className="mt-4 max-w-md text-sm text-ink-600 dark:text-paper-200/60">{testimonials.emptyState}</p>
        </div>
      )}
    </Section>
  );
}
