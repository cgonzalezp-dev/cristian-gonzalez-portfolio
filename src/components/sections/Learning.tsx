import { GraduationCap } from "lucide-react";
import { learning } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";

export function Learning() {
  return (
    <Section id="learning" eyebrow="Always learning" heading="What I'm building next.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {learning.map((item, index) => (
          <Reveal key={item.label} delay={index * 0.06}>
            <Card className="flex items-start gap-4">
              <GraduationCap className="h-5 w-5 shrink-0 text-brass-500" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-ink-600 dark:text-paper-200/60">{item.detail}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
