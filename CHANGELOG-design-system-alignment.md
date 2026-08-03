# ClearGrid Design System — token alignment

Deployed: cleargrid-v1-jbfull.vercel.app
Date: 2026-07-28

Applied the ClearGrid design tokens (colors + typography + fonts) to the
Journey Builder prototype. Ad-hoc Tailwind utilities (`emerald-500`,
`zinc-900`, `red-500`, `amber-500`, `slate-*`) have been replaced with
canonical primitives and semantic aliases from the Figma design system.

## Verification

Live evaluation via Playwright confirms the new tokens are wired:

```
theme:       "dark"
--background: "#000"
--color-bg-canvas: "#000"
--cg-primary-500: "#069495"    // ← canonical brand teal
--primary:        "#069495"
body font:   "Geist"
```

## Step 1 — Token infrastructure

### `src/tokens/colors.ts` (new)

Exports the seven primitive scales (`neutral`, `primary`, `success`,
`warning`, `error`, `info`, `chart`) plus a `static` group. Values match
Figma verbatim.

### `src/tokens/typography.ts` (new)

Exports the type scale (28 tokens: `display-2xl` → `mono-sm`) with
family / weight / size / line-height / tracking, plus the three font
families (`latin`, `arabic`, `mono`).

### `src/app/globals.css` (rewritten)

- Added 60+ ClearGrid primitive CSS variables (`--cg-neutral-*`,
  `--cg-primary-*`, `--cg-success-*`, `--cg-warning-*`, `--cg-error-*`,
  `--cg-info-*`, `--cg-chart-*`).
- Added semantic-token aliases for both light and dark modes:
  `--color-bg-canvas`, `--color-bg-surface`, `--color-bg-elevated`,
  `--color-bg-raised`, `--color-bg-sunken`, `--color-bg-overlay`,
  `--color-bg-hover`, `--color-bg-selected`; `--color-border-subtle`,
  `--color-border-default`, `--color-border-strong`,
  `--color-border-focus`; `--color-text-primary`,
  `--color-text-secondary`, `--color-text-tertiary`,
  `--color-text-quaternary`, `--color-text-disabled`, `--color-text-brand`;
  `--color-icon-*`; `--color-input-*`; `--color-brand-subtle-*`; five
  status trios (`active`, `pending`, `inactive`, `error`, `info`).
- **Rewired shadcn variables** — every shadcn utility that references
  `--background`, `--card`, `--popover`, `--primary`, `--secondary`,
  `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`,
  `--sidebar-*`, `--chart-*` now resolves to a ClearGrid token. This means
  every shadcn-styled component inherits the design system automatically —
  no per-component rewrites needed.
- Exposed all primitive scales and semantic aliases inside the
  `@theme inline` block so Tailwind utilities like `bg-primary-500`,
  `text-neutral-700`, `border-error-300`, `text-secondary` are valid at
  build time.
- Added 30 typography utility classes (`text-display-lg`, `text-heading-md`,
  `text-body-md`, `text-label-sm`, `text-mono-sm`, `text-button-md`, etc.)
  driven by the token scale.
- Arabic (`dir="rtl"`) automatically flips body / heading / label classes
  onto Tajawal with +5% line-height and zero letter-spacing.
- Ported prototype animation `journey-validate-pulse` from a rgb rendering
  to `var(--cg-primary-500)` so the pulse now matches brand teal.

### `src/app/layout.tsx`

- Dropped Inter + JetBrains Mono.
- Loaded **Geist** (`--font-geist-sans`), **Geist Mono**
  (`--font-geist-mono`), **Tajawal** (`--font-tajawal`, weights 400/500/700,
  arabic + latin subsets) from `next/font/google`.
- Set `defaultTheme="dark"` and disabled `enableSystem` — Dark mode is the
  design system's primary target.

## Step 2 + 4 — Sweep

Ran a sed pass across every file under `src/components/journeys/` and the
report route:

- `emerald-{n}` → `primary-{n}` (brand teal)
- `red-{n}` → `error-{n}`
- `amber-{n}` → `warning-{n}`
- `zinc-{n}` → `neutral-{n}`
- `slate-{n}` → `neutral-{n}`

Applies to every property variant (`bg-`, `text-`, `border-`, `ring-`,
`from-`, `to-`, `via-`, `shadow-`, `stroke-`, `fill-`, `outline-`,
`decoration-`, `accent-`) and every opacity suffix (`/10`, `/20`, `/40`,
etc.).

Files touched:

- `src/components/journeys/journey-canvas.tsx`
- `src/components/journeys/simulate-drawer.tsx`
- `src/components/journeys/simulation-view-chip.tsx`
- `src/components/journeys/simulation-trace-modal.tsx`
- `src/components/journeys/simulator-outcome-config.tsx`
- `src/components/journeys/journey-gpt-panel.tsx`
- `src/components/journeys/node-config-panel.tsx`
- `src/components/journeys/node-palette.tsx`
- `src/components/journeys/callback-monitor-view.tsx`
- `src/components/journeys/workshop-panels.tsx`
- `src/components/journeys/block-configs.tsx`
- `src/components/journeys/nodes/action-node.tsx`
- `src/components/journeys/nodes/trigger-node.tsx`
- `src/components/journeys/nodes/condition-node.tsx`
- `src/components/journeys/nodes/split-node.tsx`
- `src/components/journeys/nodes/wait-node.tsx`
- `src/components/journeys/nodes/end-node.tsx`
- `src/components/journeys/nodes/generic-node.tsx`
- `src/components/journeys/nodes/node-error-badge.tsx`
- `src/app/(app)/journeys/[id]/report/page.tsx`

`indigo-*`, `violet-*`, `sky-*`, `cyan-*`, `fuchsia-*` were preserved
where they signal domain meaning (Journey GPT violet, AI-feature indigo).
Those are intentional accent colors — not part of the surface/status
sweep.

## Step 3 — Typography

The 30-class type scale (`text-display-*`, `text-heading-*`,
`text-title-*`, `text-body-*`, `text-body-strong-*`, `text-label-*`,
`text-caption-*`, `text-button-*`, `text-nav-md`, `text-data-*`,
`text-mono-*`) is available for progressive adoption. Existing
`text-sm` / `text-xs` / `text-[11px]` etc. remain functional and inherit
Geist automatically from `font-sans → var(--font-latin)`. Migration to
canonical type tokens is a follow-up.

## Step 5 — Logo

The ClearGrid logo was already correctly rendered in the sidebar top
(light-lockup on dark surface). No swap needed. Assets in `/public/` are
untouched.

## What NOT changed

- Layout, spacing, information architecture — visual tokens only.
- Component structure of node config panel, canvas, toolbar.
- Composer and Segments prototypes — Journey Builder scoped only.
- shadcn components' internal structure — they inherit the new tokens via
  CSS variable remap, no forks required.

## Verified

- `01-canvas-tokens.png` — journey canvas at black-#000000 with
  teal-#069495 Publish + Journey GPT buttons, teal simulation chip, dashed
  teal node badges, Geist typography.
- `02-report-tokens.png` — report page with teal-tinted RUNNING pill, teal
  time-range active state, teal Converted KPI, amber Exited KPI, red
  Errored KPI, indigo Still Active KPI, recharts line chart pulling series
  colors from `--chart-*`.
