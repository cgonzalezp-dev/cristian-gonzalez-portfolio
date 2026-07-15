import { AlertTriangle, Wrench, TrendingUp } from "lucide-react";
import { caseStudy } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";

const steps = [
  { icon: AlertTriangle, label: "Situation", text: caseStudy.situation },
  { icon: Wrench, label: "Action", text: caseStudy.action },
  { icon: TrendingUp, label: "Result", text: caseStudy.result },
];

export function CaseStudy() {
  return (
    <Section id="case-study" tone="raised" eyebrow={caseStudy.heading} heading={caseStudy.title}>
      {caseStudy.methodology && caseStudy.methodology.length > 0 && (
        <Reveal delay={0.05}>
          <div className="mb-6 flex flex-wrap gap-2">
            {caseStudy.methodology.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </Reveal>
      )}
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step.label} delay={index * 0.1}>
            <Card className="h-full hover:-translate-y-1">
              <step.icon className="h-6 w-6 text-brass-500" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="mt-4 text-sm font-semibold uppercase tracking-widest text-brass-600 dark:text-brass-400">
                {step.label}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-paper-100/80">{step.text}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
