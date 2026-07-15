import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-900/[0.06] dark:border-white/[0.08]",
        "bg-white dark:bg-white/[0.03]",
        "p-6 sm:p-8 shadow-soft transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-softLg hover:border-brass-500/30",
        className,
      )}
      {...props}
    />
  );
}
