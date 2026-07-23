import { framework } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export function Framework() {
  return (
    <Section id="framework" eyebrow={framework.eyebrow} heading={framework.heading} description={framework.description}>
      <div className="relative">
        {/* connecting spine on md+ */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[34px] hidden h-px bg-gradient-to-r from-transparent via-brass-500/40 to-transparent md:block"
        />
        <ol className="grid gap-5 md:grid-cols-5">
          {framework.phases.map((p, i) => (
            <Reveal key={p.step} delay={i * 0.06}>
              <li className="relative flex h-full flex-col rounded-2xl border border-ink-900/[0.06] bg-white p-5 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03]">
                <span className="grid h-[68px] w-[68px] place-items-center rounded-full border-2 border-brass-500/40 bg-paper-50 text-lg font-extrabold text-brass-600 dark:bg-ink-900 dark:text-brass-400">
                  {p.step}
                </span>
                <h3 className="mt-4 text-base font-bold tracking-tight">{p.name}</h3>
                <p className="mt-2 text-sm font-medium text-brass-600 dark:text-brass-400">{p.question}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-paper-200/70">{p.detail}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
