import { ArrowDown, ArrowUpRight } from "lucide-react";
import { hero } from "@/data/content";
import { asset } from "@/utils/asset";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden pt-16">
      {/* Brand glow — LSG blue + orange, no stock imagery, pure CSS accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(0,110,241,0.18),transparent_55%),radial-gradient(circle_at_85%_80%,rgba(255,131,34,0.14),transparent_55%)]"
      />
      <Container>
        <Reveal>
          <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-brass-500">{hero.eyebrow}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-balance max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            {hero.headline} <span className="text-ember-500">{hero.headlineHighlight}</span>{" "}
            {hero.headlineSuffix}
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-ink-600 dark:text-paper-200/70">
            {hero.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.24}>
          <dl className="mt-8 flex flex-wrap gap-3">
            {hero.stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-baseline gap-2 rounded-full border border-ink-600/15 bg-white/60 px-4 py-2 shadow-soft dark:border-white/10 dark:bg-white/5"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-sm font-bold text-brass-500">{stat.value}</dd>
                <dd className="text-xs text-ink-600 dark:text-paper-200/60">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal delay={0.32}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button variant="primary" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </Button>
            <Button variant="secondary" href={asset(hero.secondaryCta.href)} download>
              {hero.secondaryCta.label}
            </Button>
            <Button variant="ghost" href={hero.tertiaryCta.href} icon={<ArrowUpRight className="h-4 w-4" />}>
              {hero.tertiaryCta.label}
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
