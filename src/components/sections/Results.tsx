import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { results } from "@/data/content";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/utils/cn";

export function Results() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const panelId = useId();
  const active = openIndex !== null ? results[openIndex] : null;

  return (
    <Section
      id="results"
      eyebrow="Results"
      heading="Numbers, as evidence — not decoration."
      description="Click a result for the story behind it."
    >
      <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
        {results.map((stat, index) => {
          const hasDetail = Boolean(stat.detail);
          const isOpen = openIndex === index;

          return (
            <Reveal key={stat.label} delay={index * 0.08}>
              {hasDetail ? (
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className={cn(
                    "group w-full rounded-xl p-2 -m-2 text-left transition-colors",
                    "hover:bg-ink-900/[0.03] dark:hover:bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Stat {...stat} />
                    <Plus
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-brass-500 transition-transform duration-300",
                        isOpen && "rotate-45",
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </button>
              ) : (
                <Stat {...stat} />
              )}
            </Reveal>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {active?.detail && (
          <motion.div
            id={panelId}
            key={openIndex}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-10 rounded-2xl border border-ink-900/[0.06] dark:border-white/[0.08] bg-ink-900/[0.03] dark:bg-white/[0.03] p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-brass-600 dark:text-brass-400">
                {active.detail.title}
              </p>
              <p className="mt-3 text-base leading-relaxed text-ink-700 dark:text-paper-100/80">
                {active.detail.body}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
