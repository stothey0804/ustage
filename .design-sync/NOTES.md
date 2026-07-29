# design-sync notes — ustage

Repo-specific gotchas for future syncs. Read this before re-running the converter.

## What this repo is

- **Not a published component library.** `ustage` is a private Next.js 16 app
  (`"private": true`, no `main`/`module`/`exports`, no `dist/`). The "design
  system" is `src/components/ui/*` (shadcn primitives) plus four brand/display
  components at `src/components/*`.
- The synced surface is therefore defined by **`.design-sync/entry.tsx`**, a
  hand-written barrel, and pinned name-by-name in `cfg.componentSrcMap` (75
  exports). Both are committed. Add a component by adding it to *both*.

## Why the app-feature components are excluded

`src/components/{auth,booking,dashboard}/*` are deliberately **out of the
bundle**. They import server actions and `@/lib/supabase/server`, which pull
`next/dist/server/...` into the browser bundle. A first attempt with
`srcDir: "src/components"` and no `--entry` failed hard:

```
✘ Could not resolve "@opentelemetry/api"   (next/dist/server/lib/trace/tracer.js)
✘ Could not resolve "@/types/kakao.d.ts"   (dashboard/KakaoAddressSearch.tsx)
```

Marking those external would not help — Next server code cannot run in a
browser IIFE. Feature components are app screens, not design-system parts; the
design agent should compose them out of the primitives instead. **Don't
"fix" this by widening the entry.**

## `node_modules/ustage` symlink

`package-build.mjs` derives `PKG_DIR` from `--entry`'s nearest `package.json`,
which lands on the repo root — good. But authored previews `import { X } from
"ustage"`, so node still needs the name to resolve:

```sh
ln -sfn ../. node_modules/ustage
```

Recreate it after any `npm ci` / `npm install` (it is not in the lockfile).

## Tailwind v4 — the CSS has to be compiled first

`src/app/globals.css` is `@import "tailwindcss"` + `@theme`, so it cannot ship
as `cssEntry`. `cfg.buildCmd` compiles `.design-sync/tailwind-entry.css` (which
imports globals.css and adds `@source` lines for `src/` and the authored
previews) into `.design-sync/.cache/ds-styles.css`. **Run `buildCmd` before
every converter run** — a new utility class used in a preview does not exist in
the stylesheet until Tailwind is recompiled.

## Fonts — the one non-obvious fix

The app gets Inter and Geist Mono from `next/font/google` in
`src/app/layout.tsx`. The design system has no layout, and `@theme inline` maps
`--font-sans: var(--font-sans)` — self-referential. Left alone, **every card
and every design renders in the browser's default serif**, and nothing flags it.

Two halves of the fix, both required:

1. `.design-sync/fonts/ustage-fonts.css` + four `.woff2` files (Inter and Geist
   Mono, latin + latin-ext, from Google Fonts; both are variable fonts so one
   file per subset covers all weights) — wired via `cfg.extraFonts`. Only the
   `@font-face` rules survive extraction.
2. The `:root { --font-sans: …; --font-geist-mono: … }` block at the bottom of
   `.design-sync/tailwind-entry.css`. `extraFonts` extraction **drops
   everything that isn't an `@font-face` rule**, so the variable binding has to
   live in the compiled stylesheet instead. It is unlayered on purpose, so it
   beats the `@layer theme` self-reference.

Korean text has no shipped face and falls through to the system stack — same as
the app, which only requests `subsets: ["latin"]`.

## Preview conventions used here

- Overlay components render open via `defaultOpen` (Dialog, DropdownMenu,
  Popover) or `open` (Select), always with `modal={false}` so the card doesn't
  trap focus, plus `onOpenAutoFocus`/`onCloseAutoFocus` prevented so no focus
  ring shows up in the screenshot.
- The Dialog family uses `cfg.overrides.<Name> = {cardMode: "single", viewport:
  "640x420", primaryStory: …}` — dialogs are `position: fixed` and escape a
  grid cell otherwise.
- Content is real ustage domain content in Korean (event titles, deposit
  accounts, booking statuses), never `foo`/`bar`.
- Avatar images are inline SVG data URIs so no card depends on the network.

## Known render warns

- `[RENDER_THIN] BrandMark` — legitimate. BrandMark is a pure SVG logo with no
  text nodes; the card renders correctly (verified visually).

## Toaster cannot show a live toast

`Toaster` is sonner's, driven by `toast()` from the `sonner` package — which the
design system does not re-export. A preview importing `sonner` gets its own copy
of sonner's module-level toast state, so it cannot drive the bundled Toaster.
The card therefore shows the mount + wiring pattern and the toast surface
tokens, not a live toast. This is a real constraint, not a broken preview.

## Re-sync risks

- **`node_modules/ustage` symlink and `.design-sync/.cache/ds-styles.css` are
  both gitignored/ephemeral.** A fresh clone has neither. Re-create the symlink
  and run `cfg.buildCmd` before the converter, or the build fails or ships a
  stale stylesheet.
- **`cfg.componentSrcMap` is a full enumeration, not a sparse override.** That
  is forced by `--entry` mode (no `.d.ts` tree to discover from). It goes stale
  the moment someone adds or renames a file under `src/components/ui/`. Re-derive
  it by re-running the ts-morph scan over `src/components/ui/*.tsx` plus the four
  brand components, and update `.design-sync/entry.tsx` to match.
- **Fonts were fetched from Google Fonts over the network** at sync time
  (`fonts.gstatic.com`, Geist Mono v6 / Inter). The `.woff2` files are committed,
  so a re-sync needs no network — but if you ever refresh them, keep the
  `:root` variable block in step.
- **The app's own design is still being iterated** (see the teal-token refresh
  work). Token values in `globals.css` changing means a re-sync re-renders every
  card; that is expected and cheap.
- Playwright/chromium live in `.ds-sync/node_modules` (gitignored) — a fresh
  clone re-downloads ~200MB before the render check can run.
