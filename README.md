# Cristian González — Portfolio

A single-page, premium-feel portfolio built with React, Vite, TypeScript, Tailwind CSS and Framer Motion — designed to deploy on GitHub Pages with zero extra configuration.

Live structure: Hero → About → Philosophy → Experience → Results → Case Study → Skills → Learning → Personal → Testimonials → Contact.

## Stack & why

| Tool | Why |
|---|---|
| **Vite** | Fastest dev loop and the leanest production build for a static SPA — ideal for GitHub Pages. |
| **React + TypeScript** | Component reuse and type safety across a real design system (Button, Card, Timeline, Stat, Tabs, Accordion, Tooltip...). |
| **Tailwind CSS** | Token-driven styling (color/spacing/typography scale) — no ad-hoc CSS drift. |
| **Framer Motion** | Scroll-reveal, hover states and the scroll-progress bar, with `prefers-reduced-motion` respected everywhere through one shared `<Reveal>` primitive. |

This is a **single page with anchor navigation** — no router — which sidesteps the classic GitHub Pages SPA-routing 404 problem entirely.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173/cristian-gonzalez-portfolio/
```

> Note: the dev server (and build) serve the app under the `/cristian-gonzalez-portfolio/` base path — see [Renaming the repo](#renaming-the-repo) if you use a different repo name.

## Available commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload. |
| `npm run build` | Type-checks (`tsc -b`) then builds the production bundle to `dist/`. |
| `npm run preview` | Serves the production build locally, for a final check before deploying. |
| `npm run lint` | Runs ESLint across the project. |

## Deploying to GitHub Pages

This repo ships with `.github/workflows/deploy.yml`, which builds and deploys automatically on every push to `main`.

1. Push this project to a GitHub repository named **`cristian-gonzalez-portfolio`** (or update the base path — see below).
2. In the repo settings: **Settings → Pages → Source → GitHub Actions**.
3. Push to `main`. The workflow builds and publishes `dist/` automatically.
4. Your site will be live at `https://<your-github-username>.github.io/cristian-gonzalez-portfolio/`.

No manual `gh-pages` branch, no committed build output — the Action handles it on every push.

### Renaming the repo

If your repository name isn't `cristian-gonzalez-portfolio`, update the `base` in **`vite.config.ts`**:

```ts
export default defineConfig({
  base: "/your-repo-name/",
  // ...
});
```

Also update the absolute URLs in `index.html` (`canonical`, `og:url`, `og:image`, the JSON-LD `url`) and in `public/robots.txt` / `public/sitemap.xml` to match your final domain.

## Project structure

```
├── public/                    # Static assets served as-is
│   ├── favicon.svg
│   ├── og-image.png           # Social share preview (1200×630)
│   ├── headshot.jpg
│   ├── resume.pdf             # Downloadable résumé (Hero secondary CTA)
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── components/
│   │   ├── ui/                 # Design system primitives (Button, Badge, Card, Stat,
│   │   │                       # Tooltip, Accordion, Tabs, Container, Section, Timeline,
│   │   │                       # Reveal, ScrollProgress, BackToTop)
│   │   └── sections/            # One component per page section
│   ├── layout/                  # Navbar, Footer
│   ├── hooks/                   # useScrollSpy, usePrefersReducedMotion, useTheme
│   ├── data/content.ts          # ⭐ All real copy & numbers — edit here, not in components
│   ├── utils/                   # cn() classnames helper, asset() base-path resolver
│   └── App.tsx
└── .github/workflows/deploy.yml
```

## Personalizing content

**Everything you'll ever want to update lives in [`src/data/content.ts`](src/data/content.ts).** Components never hardcode copy — they just render whatever this file exports. To update your headline, results, timeline, skills, or case study, edit that one file; no component code needs to change.

To swap the headshot or résumé, replace `public/headshot.jpg` / `public/resume.pdf` with same-named files.

## Design system

- **Color:** navy ink (`ink-*`) as the base, warm off-white (`paper-*`) for light mode, and a single restrained brass/amber accent (`brass-*`) — deliberately not another blue/violet SaaS palette. Tokens live in `tailwind.config.ts`.
- **Type:** Inter for everything, with one deliberate serif moment (the Philosophy quote) for contrast.
- **Dark mode is the default** (matches the intended "operations/tech leadership" tone); toggle persists to `localStorage`.
- **Motion:** every animated element goes through the shared `<Reveal>` component, so `prefers-reduced-motion` is honored in exactly one place.

## Accessibility & performance notes

- Semantic landmarks (`header`, `nav`, `main`, `footer`), `aria-*` on all interactive custom components (Accordion, Tabs, Tooltip, mobile menu), and a visible focus ring (`:focus-visible`) throughout.
- Respects `prefers-reduced-motion` globally.
- Vendor code (`react`/`react-dom`) and `framer-motion` are split into their own chunks so repeat visits reuse cached, stable framework code even after content edits.
- No stock imagery; SVG-only icons (Lucide) and CSS-only background accents.

Run a real Lighthouse pass locally before publishing:

```bash
npm run build && npm run preview
# then audit http://localhost:4173/cristian-gonzalez-portfolio/ in Chrome DevTools → Lighthouse
```

## Maintenance

- Bump dependencies periodically with `npm outdated` / `npm update`.
- After editing `src/data/content.ts`, run `npm run build` locally to confirm the type-checked content still matches every component's expected shape before pushing.
