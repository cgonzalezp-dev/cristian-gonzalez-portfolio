type ClassValue = string | number | null | boolean | undefined;

/**
 * Minimal classnames joiner — avoids pulling in `clsx`/`tailwind-merge`
 * for a component set with no conflicting Tailwind class collisions.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
