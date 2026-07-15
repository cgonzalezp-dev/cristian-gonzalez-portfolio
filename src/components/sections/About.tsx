import { about, person } from "@/data/content";
import { asset } from "@/utils/asset";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function About() {
  return (
    <Section id="about" eyebrow="About" heading={`Hi, I'm ${person.name.split(" ")[0]}.`}>
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:items-start">
        <Reveal delay={0.1}>
          <div className="aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-ink-900/[0.04] dark:bg-white/5 shadow-soft">
            <img
              src={asset("headshot.jpg")}
              alt={`Portrait of ${person.name}`}
              className="h-full w-full object-cover"
              loading="lazy"
              width={480}
              height={480}
            />
          </div>
        </Reveal>
        <div className="space-y-5">
          {about.paragraphs.map((paragraph, index) => (
            <Reveal key={paragraph.slice(0, 20)} delay={0.15 + index * 0.05}>
              <p className="text-base leading-relaxed text-ink-700 dark:text-paper-100/80">{paragraph}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
