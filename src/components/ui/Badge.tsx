import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-ink-600/20 dark:border-white/10 bg-ink-900/[0.03] dark:bg-white/5 px-3 py-1 text-xs font-medium text-ink-700 dark:text-paper-100/90",
        className,
      )}
      {...props}
    />
  );
}
