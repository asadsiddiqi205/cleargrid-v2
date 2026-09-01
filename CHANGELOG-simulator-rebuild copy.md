# Journey Builder — Simulator rebuild

Deployed: cleargrid-v1-jbfull.vercel.app
Date: 2026-07-28

Rebuilt the simulator from a modal moment into a real what-if environment.
Authors construct hypothetical cohorts, see how the journey behaves per node,
and catch runtime issues before publishing.

## Phase A — FilterBuilder refactor (foundation)

The segment builder's `FilterBuilder` was uncontrolled (only emitted a filter
count via `onChange`). Refactored it to be reusable across surfaces without
building a parallel filter component.

- `src/components/segments/filter-builder.tsx`
  - New props: `value: FilterGroup[]`, `onValueChange`, `groupJoin`,
    `onGroupJoinChange`, `enableCalculatedFields`, `heading`, `hideHeading`.
  - Backwards-compatible: legacy `onChange?: (count: number) => void` still
    works; segment builder consumer needed no changes.
  - Calculated-Fields button + saved-fields strip now gated behind
    `enableCalculatedFields` (default `true`).
  - `createGroup` and `createFilter` factories exported.

## Part 1 — Cohort builder

### 1.1 Three-mode selector

Replaced the two-mode toggle with a three-mode segmented control:

- **Full audience** — runs against the journey's actual audience filter.
- **Specific deals** — paste borrower_deal_ids (existing behavior).
- **Filter-built cohort** — opens the FilterBuilder inline.

Persists per journey via `localStorage[journey-cohort:<id>]`. Default is
Full audience.

### 1.2 Filter builder for Mode 3

Reuses the segment builder's `FilterBuilder` in controlled mode with:

- `enableCalculatedFields={false}` — hides the Create-calculation button;
  segment authors reach that from the Segments module.
- `heading="Cohort filters"` — flavored copy ("cohort" vs "segment").
- Same field catalog, operators, chip picker, value editors, AND/OR
  combinator, +Add condition, +Add filter group.

### 1.3 Live count + preview

- 500ms debounced live count: `[N] borrowers match this cohort.`
- **Preview cohort** button opens an inline panel with 10 sample borrowers;
  each row has name, DPD, product, status, outstanding + a Trace → button.
- View more link at the bottom of the preview panel deep-links to the
  Borrowers page.

### 1.4 Cap + safeguards

- Cap input (max 50,000, default 30,000) at the bottom of the cohort card.
- Amber helper when filter matches > cap: "Filter matches N borrowers.
  Simulation will run against a random sample of [cap] to protect
  performance."
- Zinc-500 zero-match message: "No borrowers match this filter. Broaden your
  conditions or check attribute values."

### 1.5 Save as segment

- Modal with name (required) + description.
- On save, writes a Draft segment payload to localStorage under
  `cleargrid:draft-segments` (real Segments module can hydrate from this).
- Toast confirms with "View in Segments" action.

## Part 2 — Per-node results

### 2.1 Count badges

- Primary count + `(percent%)` on the same badge — e.g. `1,247 (68%)`.
- Zero-count nodes show `0 (—)` in muted zinc.
- Badge is dashed-emerald when a simulation is loaded (see Part 3.3).

### 2.2 Branch preview

- Top 3 branch counts rendered below the primary badge for split nodes.
- `+N more` chip when >3 branches; clicking expands the full list in place.

### 2.3 Attribute-empty warnings

- Warning icon (top-left of the badge) fires when the runner detects a merge
  tag that resolves empty against a sampled borrower.
- Native tooltip shows: "12% of cohort has empty settlement.options."
- Clicking the badge opens the sample panel; clicking the icon opens the
  Trace modal so authors can see which borrowers hit the empty state.

### 2.4 Cost estimates

- Rate defaults live in `src/lib/simulation.ts` (`COST_ESTIMATES`):
  - AI Call: 3 min/call × AED 0.35/min
  - SMS: AED 0.03/msg
  - WhatsApp: AED 0.05/msg
  - Email: skipped (free)
  - Human Campaign: shows enrollment count, no cost
- Per-node badge line: `~AED N` (zinc-500).
- Drawer footer shows total: "Estimated cost of running this journey against
  the cohort: ~AED N".

### 2.5 Outcome config

`src/components/journeys/simulator-outcome-config.tsx` renders a collapsible
section listing every action node whose outcomes drive branching. Each row
shows a preset chip; clicking opens a modal with:

- **Realistic** (default) — fallback distribution defined in
  `OUTCOME_DEFAULTS`.
- **Best case** — 90% success outcome, rest neutral.
- **Worst case** — 90% failure outcome, rest neutral.
- **Custom** — sliders per outcome; save disabled until total = 100%.

The runner (`simulation-runner.ts`) samples branches from these
distributions per borrower using a deterministic seeded PRNG so results are
stable across reruns.

### 2.6 Trace drill-down

`src/components/journeys/simulation-trace-modal.tsx` renders a two-column
modal per borrower:

- Left: ordered hop list with node label, branch taken (if split), outcome
  (if action node), and time offset from enrollment.
- Right: mini-map SVG showing every canvas node in position, with the
  borrower's path drawn as a dashed emerald polyline through hop centers.
- Final banner at the bottom: converted / exited / errored / still active.

Opened via the `Trace →` button in either the sample side-panel or the
Cohort preview panel.

## Part 3 — Simulation view (ambient mode)

### 3.1 Persistent view chip

`SimulationViewChip` renders as a top-right ReactFlow Panel whenever
`simulateResult` is set. It shows the cohort label and "N mins ago" and
provides a dropdown with:

- Show/Hide overlay
- Rerun (opens drawer prefilled with the current cohort)
- Edit cohort (same)
- New simulation (clears + reopens drawer fresh)
- Clear simulation (removes cache + strips `?sim=` from URL)

### 3.2 Persistence

- `src/lib/simulation.ts` exposes `saveSimulation` / `loadSimulation` /
  `clearSimulation` on `localStorage[journey-sim:<id>]` with a 7-day TTL.
- Cohort inputs persist under `journey-cohort:<id>`.
- When the drawer opens with a cached simulation and the node set has
  changed since it ran, the drawer shows a `SimulationEditedBanner` prompting
  the author to rerun.

### 3.3 Visual differentiation

- Simulation badges: **dashed emerald border**, `zinc-900/95` background.
- Analytics badges (existing): solid emerald border, filled `emerald-600/85`.
- `OverlayLegend` renders top-left with a small key when either overlay is
  active: `━ Real (last 7d)` / `┅ Simulated`.
- If both are active, they stack: analytics top-right of node, simulation
  top-left.

### 3.4 Publish soft-nudge

- `handlePublish` gates the final `setStatus("published")` on
  `wasPublishNudgeSeen(journeyId)` when there's no active simulation.
- When gated, an `AlertDialog` fires: "Consider running a simulation before
  publishing" with **Publish anyway** and **Simulate now** actions.
- Choice recorded in `localStorage[journey-sim-nudge:<id>]` so it fires at
  most once per journey.

### 3.5 Deep-link URL

- Canvas syncs `?sim=<result.id>` on `simulateResult.id` change via
  `history.replaceState`.
- Sharing the URL with a colleague loads the same simulation from the local
  cache. Since the cache is per-browser this is prototype-scoped; a real
  implementation would fetch from a server-side simulation store.

## Files touched

New:
- `src/lib/simulation.ts` — data model, cost rates, filter evaluation,
  localStorage helpers, outcome-preset defaults.
- `src/lib/simulation-runner.ts` — deterministic runner producing the full
  `SimulationResult` shape.
- `src/components/journeys/simulator-outcome-config.tsx` — Part 2.5.
- `src/components/journeys/simulation-view-chip.tsx` — Parts 3.1 / 3.3 /
  3.2 (edit-since banner).
- `src/components/journeys/simulation-trace-modal.tsx` — Part 2.6.
- `screenshots/simulator-rebuild/*.png` — verification captures.

Modified:
- `src/components/segments/filter-builder.tsx` — controlled-component
  refactor + gate flags.
- `src/components/journeys/simulate-drawer.tsx` — rebuilt to consume the new
  `SimulationResult` shape, three-mode selector, cohort preview, save-as-
  segment modal, outcome-config integration, deep-link init.
- `src/components/journeys/journey-canvas.tsx` — new badge overlay with
  branch counts, cost, empty-attribute warnings; simulation view chip +
  legend; publish nudge; deep-link URL sync; trace modal wiring.

## Verified via Playwright at 1440×900

- 01 — Three-mode selector default (Full audience) ✓
- 02 — Filter-built cohort with the reused FilterBuilder ✓
- 03 — Canvas with simulation badges + dashed borders + chip + legend ✓
- 04 — Sample drill-down side panel with 10 borrowers + Trace links ✓
- 05 — Trace modal with hop list + mini-map path highlight ✓

## What's NOT built (per prompt)

- No deterministic execution engine — the runner is approximate.
- No cross-journey interaction simulation.
- No publish gate on simulation (nudge only).
- No comparison mode (A vs B cohorts, v1 vs v2).
- No historical simulation storage beyond the last one per journey.
- No server-side sharing (deep-links are per-browser via localStorage).
