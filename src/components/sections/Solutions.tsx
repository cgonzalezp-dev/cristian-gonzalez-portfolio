import { ClipboardCheck, Workflow, Activity } from "lucide-react";
import { solutions } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";

const icons = [ClipboardCheck, Workflow, Activity];

export function Solutions() {
  return (
    <Section
      id="solutions"
      eyebrow={solutions.eyebrow}
      heading={solutions.heading}
      description={solutions.description}
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {solutions.items.map((item, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Reveal key={item.title} delay={index * 0.1}>
              <Card className="h-full">
                <Icon className="h-6 w-6 text-brass-500" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-ink-900 dark:text-paper-50">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-paper-100/80">{item.text}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
      {solutions.impact && solutions.impact.length > 0 && (
        <Reveal delay={0.35}>
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-paper-200/60">
              Impact — first four weeks
            </p>
            <div className="flex flex-wrap gap-2">
              {solutions.impact.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
        </Reveal>
      )}
    </Section>
  );
}
