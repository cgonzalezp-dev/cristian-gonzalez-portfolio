import { Heart } from "lucide-react";
import { personal } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Personal() {
  return (
    <Section id="personal" tone="raised" eyebrow="Beyond the role" heading={personal.description}>
      <div className="grid gap-6 sm:grid-cols-3">
        {personal.items.map((item, index) => (
          <Reveal key={item.label} delay={index * 0.08}>
            <div className="flex items-start gap-3">
              <Heart className="mt-1 h-4 w-4 shrink-0 text-brass-500" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-ink-600 dark:text-paper-200/60">{item.detail}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
