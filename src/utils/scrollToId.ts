/**
 * Smooth-scroll to a section by id WITHOUT writing to location.hash.
 *
 * The top-level view is encoded in the hash (`#/strategy`); if an in-page
 * anchor overwrote it with `#section-id`, the router would flip back to the
 * profile view. So section navigation scrolls imperatively and leaves the
 * route hash untouched.
 */
export function scrollToId(hash: string) {
  const id = hash.replace(/^#\/?/, "");
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
