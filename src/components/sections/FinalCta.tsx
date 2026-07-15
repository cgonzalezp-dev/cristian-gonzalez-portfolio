import { finalCta } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCta() {
  return (
    <Section id="contact">
      <Reveal>
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-balance max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            {finalCta.heading}
          </h2>
          <p className="max-w-md text-ink-600 dark:text-paper-200/70">{finalCta.subhead}</p>
          <Button variant="primary" href={finalCta.cta.href}>
            {finalCta.cta.label}
          </Button>
        </div>
      </Reveal>
    </Section>
  );
}
