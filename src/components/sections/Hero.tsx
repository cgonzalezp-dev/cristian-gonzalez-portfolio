import { ArrowDown, ArrowUpRight } from "lucide-react";
import { hero, person } from "@/data/content";
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
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <Reveal>
              <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-brass-500">{hero.eyebrow}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="text-balance max-w-2xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
                {hero.headline} <span className="text-ember-500">{hero.headlineHighlight}</span>{" "}
                {hero.headlineSuffix}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-ink-600 dark:text-paper-200/70">
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
          </div>

          <Reveal delay={0.2} className="order-1 flex justify-center lg:order-2 lg:justify-self-center">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-[28px] bg-ember-500/20"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-3 rounded-[28px] border-2 border-brass-500/50"
              />
              {/* Brand mark straddling the top-right corner of the frame */}
              <img
                src={asset("lsg-mark.png")}
                alt="Lean Solutions Group"
                width={112}
                height={112}
                className="absolute -right-7 -top-9 z-10 h-20 w-20 drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)] sm:-right-9 sm:-top-11 sm:h-28 sm:w-28"
              />
              <img
                src={asset(hero.photo.src)}
                alt={hero.photo.alt}
                width={256}
                height={320}
                className="h-72 w-56 rounded-3xl object-cover shadow-softLg sm:h-80 sm:w-64"
              />
              <p className="mt-5 text-center text-sm font-semibold uppercase tracking-widest text-ink-700 dark:text-paper-100/80">
                {person.name}
              </p>
            </div>
          </Reveal>
        </div>
      </Container>

      <a
        href="#experience"
        aria-label="Scroll to Experience section"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-ink-600/40 dark:text-paper-200/40 hover:text-brass-500 transition-colors animate-bounce"
      >
        <ArrowDown className="h-5 w-5" />
      </a>
    </section>
  );
}
