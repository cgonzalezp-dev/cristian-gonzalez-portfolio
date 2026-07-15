import { useId, useState, type ReactNode } from "react";

type TooltipProps = { label: string; children: ReactNode };

export function Tooltip({ label, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} tabIndex={0}>
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute -top-2 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-lg bg-ink-950 px-3 py-1.5 text-xs font-medium text-paper-50 shadow-softLg"
        >
          {label}
        </span>
      )}
    </span>
  );
}
