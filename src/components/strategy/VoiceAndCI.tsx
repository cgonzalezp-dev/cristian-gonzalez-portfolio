import { Radio, RefreshCw, Check } from "lucide-react";
import { voc, type VocBlock } from "@/data/strategy";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Collapsible } from "@/components/ui/Collapsible";

const iconByKey: Record<string, typeof Radio> = {
  voc: Radio,
  ci: RefreshCw,
};

function Block({ block, index }: { block: VocBlock; index: number }) {
  const Icon = iconByKey[block.key] ?? Radio;
  const header = (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brass-500/10 text-brass-600 dark:text-brass-400">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div>
        <h3 className="text-base font-bold tracking-tight sm:text-lg">{block.title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-600 dark:text-paper-200/70">{block.summary}</p>
      </div>
    </div>
  );

  return (
    <Reveal delay={index * 0.08}>
      <div className="rounded-2xl border border-ink-900/[0.06] bg-white p-5 shadow-soft dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6">
        <Collapsible header={header} defaultOpen={index === 0}>
          <ul className="mt-5 space-y-2.5 border-t border-ink-900/[0.06] pt-5 dark:border-white/[0.08]">
            {block.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-ink-700 dark:text-paper-100/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" strokeWidth={2.25} />
                {item}
              </li>
            ))}
          </ul>
        </Collapsible>
      </div>
    </Reveal>
  );
}

export function VoiceAndCI() {
  return (
    <Section id="voc" eyebrow={voc.eyebrow} heading={voc.heading} description={voc.description} collapsible>
      <div className="grid gap-4 md:grid-cols-2">
        {voc.blocks.map((block, i) => (
          <Block key={block.key} block={block} index={i} />
        ))}
      </div>
    </Section>
  );
}
