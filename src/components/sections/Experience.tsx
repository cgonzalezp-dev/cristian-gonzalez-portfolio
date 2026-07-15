import { experience } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Timeline } from "@/components/ui/Timeline";

export function Experience() {
  return (
    <Section
      id="experience"
      eyebrow="Experience"
      heading="Eight years, one company, five promotions."
      description="Every step here was earned internally — not a lateral hire."
    >
      <Timeline entries={experience} />
    </Section>
  );
}
