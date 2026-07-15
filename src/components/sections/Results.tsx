import { results } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { Reveal } from "@/components/ui/Reveal";

export function Results() {
  return (
    <Section id="results" eyebrow="Results" heading="Numbers, as evidence — not decoration.">
      <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4">
        {results.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.08}>
            <Stat {...stat} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
