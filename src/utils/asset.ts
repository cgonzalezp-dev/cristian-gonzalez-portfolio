/**
 * Resolves a public/ asset path against Vite's configured `base`.
 * Plain string paths in JSX (e.g. src="/headshot.jpg") do NOT get
 * rewritten for GitHub Pages' /<repo-name>/ base path — only assets
 * referenced through this helper (or actual imports) do.
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.replace(/^\//, "")}`;
}
