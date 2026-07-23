import { ArrowRight } from "lucide-react";
import { strategyCta } from "@/data/strategy";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

export function StrategyCta() {
  return (
    <section id="contact" className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-ink-900/[0.06] bg-white p-8 shadow-softLg dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,rgba(199,154,75,0.12),transparent_60%)]"
            />
            <div className="relative max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{strategyCta.heading}</h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-paper-200/75">{strategyCta.text}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={strategyCta.primary.href} variant="primary" icon={<ArrowRight className="h-4 w-4" />}>
                  {strategyCta.primary.label}
                </Button>
                <Button href={strategyCta.secondary.href} variant="secondary">
                  {strategyCta.secondary.label}
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
