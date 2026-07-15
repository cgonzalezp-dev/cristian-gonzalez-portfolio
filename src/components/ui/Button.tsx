import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brass-500 text-ink-950 hover:bg-brass-400 shadow-soft hover:shadow-softLg",
  secondary:
    "bg-transparent border border-ink-600/30 dark:border-white/15 text-ink-900 dark:text-paper-50 hover:border-brass-500/60 hover:bg-brass-500/5",
  ghost: "bg-transparent text-ink-900 dark:text-paper-50 hover:bg-ink-900/5 dark:hover:bg-white/5",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none";

type CommonProps = { variant?: Variant; icon?: ReactNode; children: ReactNode };

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsAnchor = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button({ variant = "primary", icon, children, className, ...props }: ButtonAsButton | ButtonAsAnchor) {
  const classes = cn(base, variantClasses[variant], className);

  if ("href" in props && props.href) {
    return (
      <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
        {icon}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
      {icon}
    </button>
  );
}
