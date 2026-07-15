import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Stat as StatType } from "@/data/content";
import { cn } from "@/utils/cn";

const iconByDirection = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
} as const;

const colorByDirection = {
  up: "text-signal-up",
  down: "text-signal-down",
  neutral: "text-brass-500",
} as const;

/**
 * Unifies what would otherwise be two near-identical components
 * ("KPI Card" and "Statistic Card") — same shape, direction changes
 * only the accent color and icon.
 */
export function Stat({ value, label, direction }: StatType) {
  const Icon = iconByDirection[direction];
  return (
    <div className="flex flex-col gap-2">
      <Icon className={cn("h-5 w-5", colorByDirection[direction])} strokeWidth={1.75} aria-hidden="true" />
      <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">{value}</span>
      <span className="text-sm uppercase tracking-wide text-ink-600 dark:text-paper-200/60">{label}</span>
    </div>
  );
}
