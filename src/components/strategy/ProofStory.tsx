import { proof } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function ProofStory() {
  return (
    <Section id="proof" eyebrow={proof.eyebrow} heading={proof.heading}>
      <Reveal>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-700 dark:text-paper-100/85">{proof.lede}</p>
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {proof.steps.map((step, i) => {
          const isResult = step.tag === "Result";
          return (
            <Reveal key={step.tag} delay={i * 0.07}>
              <div
                className={
                  isResult
                    ? "h-full rounded-2xl border-2 border-signal-up/30 bg-signal-up/[0.06] p-6 shadow-soft"
                    : "h-full rounded-2xl border border-ink-900/[0.06] bg-white p-6 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03]"
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      isResult
                        ? "grid h-8 w-8 place-items-center rounded-full bg-signal-up text-sm font-bold text-ink-950"
                        : "grid h-8 w-8 place-items-center rounded-full border border-brass-500/40 text-sm font-bold text-brass-600 dark:text-brass-400"
                    }
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-xs font-semibold uppercase tracking-widest ${
                      isResult ? "text-signal-up" : "text-brass-500"
                    }`}
                  >
                    {step.tag}
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-700 dark:text-paper-100/85">{step.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.2}>
        <p className="mt-6 rounded-xl border border-ink-900/[0.06] bg-ink-900/[0.02] px-5 py-4 text-sm leading-relaxed text-ink-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-paper-200/70">
          {proof.footnote}
        </p>
      </Reveal>
    </Section>
  );
}
