import { ArrowDown } from "lucide-react";
import { hero } from "@/data/content";
import { asset } from "@/utils/asset";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden pt-16">
      {/* Subtle radial glow — no stock imagery, pure CSS accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(217,179,108,0.12),transparent_60%)]"
      />
      <Container>
        <Reveal>
          <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-brass-500">{hero.eyebrow}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-balance max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            {hero.headline}
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600 dark:text-paper-200/70">
            {hero.subhead}
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button variant="primary" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </Button>
            <Button variant="secondary" href={asset(hero.secondaryCta.href)} download>
              {hero.secondaryCta.label}
            </Button>
          </div>
        </Reveal>
      </Container>

      <a
        href="#about"
        aria-label="Scroll to About section"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-ink-600/40 dark:text-paper-200/40 hover:text-brass-500 transition-colors animate-bounce"
      >
        <ArrowDown className="h-5 w-5" />
      </a>
    </section>
  );
}
