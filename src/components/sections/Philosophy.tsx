import { philosophy } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Philosophy() {
  return (
    <Section id="philosophy" tone="raised">
      <Reveal>
        <blockquote className="mx-auto max-w-3xl text-balance text-center font-serif text-2xl italic leading-relaxed sm:text-3xl">
          &ldquo;{philosophy.quote}&rdquo;
        </blockquote>
      </Reveal>
    </Section>
  );
}
