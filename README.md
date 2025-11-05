# DadTech — minimal Tailwind starter

A tiny starter that demonstrates using Tailwind CSS in a plain HTML project.

Contents
- `index.html` — the main page (already includes a small Tailwind-based example).
- `src/styles.css` — Tailwind entry file with `@tailwind` directives.
- `dist/styles.css` — generated CSS output (built by PostCSS + Tailwind).
- `tailwind.config.cjs` & `postcss.config.cjs` — build configuration.

Prerequisites
- Node.js (16+) and npm installed.

Quick commands
- Install dev dependencies (if not already done):

```bash
cd /Users/trentross/Documents/dadtech
npm install
```

- Build the production CSS once:

```bash
npm run build:css
```

- Run a watcher during development (rebuilds on change):

```bash
npm run dev:css
```

How it works
- `src/styles.css` contains Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`).
- We compile that with PostCSS (which loads the `@tailwindcss/postcss` plugin and Autoprefixer) and write the result to `dist/styles.css`.
- `index.html` links `dist/styles.css` so you can open the page in a browser and see Tailwind utilities applied.

Notes
- A small `.container` rule is defined in `src/styles.css` as plain CSS for simplicity. If you prefer to use Tailwind's `@apply`, I can change the config and entry file to support it.
- If you add new HTML files or move markup, update `tailwind.config.cjs`'s `content` array so Tailwind includes those files when purging unused styles.

Need anything else?
- I can add a tiny dev server (e.g. `live-server` or `vite`) so you can browse `index.html` at a local URL, or convert this into a simple npm-powered site scaffold.
