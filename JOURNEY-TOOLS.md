# Journey Tools — Eternals Parity Reference

Reference for the validation + dry-run stack I built into the Journey Builder
prototype. Everything here mirrors `eternals.cleargrid.ai`, but scoped
**inside each journey** so you never have to pick a journey twice.

Live: [cleargrid-v1-jb.netlify.app/journeys/high-dpd](https://cleargrid-v1-jb.netlify.app/journeys/high-dpd)

---

## Sub-nav — the pinned strip at the top of every journey page

Five tabs, pinned to every `/journeys/[id]/*` route:

| Tab | URL | What's there |
|---|---|---|
| Editor | `/journeys/[id]` | Canvas — hosts the Dry-run + Trace overlays |
| Validator | `/journeys/[id]/validator` | Fetch audience → validate paths → open real executed flow |
| Borrowers | `/journeys/[id]/borrowers` | Per-journey borrower list, deep-links to the trace overlay |
| Settings | `/journeys/[id]/settings` | Existing journey settings |
| Report | `/journeys/[id]/report` | Existing per-journey report |

Files:
- Component: [`src/components/journeys/journey-sub-nav.tsx`](src/components/journeys/journey-sub-nav.tsx)
- Mounted from: the editor toolbar (compact variant), plus every non-editor page below.

---

## Validator — `/journeys/[id]/validator`

Eternals-parity, three steps stacked on a single page. No journey picker
or tenant selector — the page already knows both from the URL.

1. **Audience** — pick `count` → **Fetch Audience** → snapshot table of the
   first N members (name / deal id / phone / product / DPD).
2. **Validate Borrowers** — synthesizes each borrower's executed path, compares
   it to the prediction, shows matched / diverged rows with a **Trace** button
   per row that jumps to the executed-flow overlay on the canvas.
3. **Real executed flow** — paste a borrower UUID or deal id → **View real
   flow** → navigates to `/journeys/[id]?trace=<borrowerId>`.

Read-only. Never triggers the journey.

Files:
- Page: [`src/app/(app)/journeys/[id]/validator/page.tsx`](src/app/(app)/journeys/[id]/validator/page.tsx)
- Synth helpers: [`src/data/borrower-traces.ts`](src/data/borrower-traces.ts) —
  `synthesizeTrace(borrowerId, journeyId)`

---

## Real executed flow — `?trace=<borrowerId>` on the canvas

Query-param-driven overlay that lights up one borrower's exact executed path
on the canvas. Same visual language as Eternals verbatim:

- **1st pass = green, 2nd = amber, 3rd = blue, 4th+ = violet** — badges stacked
  on each visited node so redial loops read left-to-right.
- **Red badge** for failed hops (bounced / no-answer / dropped).
- **Dashed blue outline ring** around the node the borrower is currently parked at.
- Floating info card top-right with borrower name, hop count, live status,
  legend, and a **Back to Validator** link.

Reached from three places: the Validator's "Trace" buttons, the Borrowers
page's "Trace on canvas" button per row, and any hand-typed URL.

Files:
- Overlay: [`src/components/journeys/trace-overlay.tsx`](src/components/journeys/trace-overlay.tsx)
- Wired into the canvas at
  [`src/components/journeys/journey-canvas.tsx`](src/components/journeys/journey-canvas.tsx)
  (search for `traceOverlayData`).

---

## Dry-run — the one-click simulator on the canvas

**Dry-run** button in the editor toolbar runs a full-audience simulation with
realistic outcome defaults — no cohort or outcome-config screen in between.
Matches `eternals.cleargrid.ai/simulator`'s Simulate button exactly.

What decorates the canvas after a run:

- **Count pill on every node** — small badge at the node's top-left with a
  Users icon + count. Clickable.
- **Branch labels on every edge** — YES / NO / EVENT / TIMEOUT with the count
  that took that branch, coloured by branch type.
- **Right-side aggregate panel** — grouped by node kind (EMAILS / WHATSAPP / AI
  CALLS / SMS), each row clickable to open the borrowers panel for that node.
- **Colour legend bottom-left** — Trigger / Condition / Action / Flow-Exit /
  Global exit.

Click a node's pill (or a row in the aggregate) → **NodeBorrowersPanel** slides
in on the right: node label, total count, search box, table of sampled
borrowers (name, id, DPD, deal id, product), per-row Trace icon that deep-links
to the executed-flow overlay.

Files:
- Overlay: [`src/components/journeys/dry-run-overlay.tsx`](src/components/journeys/dry-run-overlay.tsx)
  — contains `DryRunOverlay`, `DryRunAggregatePanel`, `NodeBorrowersPanel`, `DryRunLegend`.
- One-click runner + wiring: `runDryRun` in
  [`src/components/journeys/journey-canvas.tsx`](src/components/journeys/journey-canvas.tsx).
- Simulation engine: [`src/lib/simulation-runner.ts`](src/lib/simulation-runner.ts) —
  `runSimulation({journeyId, cohort, cohortLabel, cohortMode, cap, nodes, edges, outcomeChoices})`.
- Result type + localStorage cache: [`src/lib/simulation.ts`](src/lib/simulation.ts).

Advanced flow (custom cohort, outcome presets per action) stays available via
the editor toolbar's overflow menu → **Open simulator** → `SimulateDrawer`.

Anchoring detail (in case anyone touches the overlay): pill coordinates are
measured against `.react-flow` (not `.react-flow__viewport`, which ReactFlow
CSS-transforms with pan/zoom). Positioning context is the wrapper that contains
ReactFlow; a 100 ms poll re-measures with a change-guarded `setState` so the
pills follow pan/zoom without spamming re-renders.

---

## Borrowers — `/journeys/[id]/borrowers`

Per-journey borrower list. Replaces the top-down `/reports/borrower-tracker`
for anything scoped to one journey.

- Search box + status chips (active / converted / exited / errored) with counts
- Table: borrower / product / enrolled / current step / status / recovered
- Per-row **Trace on canvas** → same `?trace=<borrowerId>` overlay
- CSV export

Files:
- Page: [`src/app/(app)/journeys/[id]/borrowers/page.tsx`](src/app/(app)/journeys/[id]/borrowers/page.tsx)
- Row source: `listBorrowersInJourney(journeyId, 200)` in
  [`src/data/borrower-traces.ts`](src/data/borrower-traces.ts).

---

## End-to-end flow

1. Open any journey — sub-nav is at the top.
2. Editor tab → click **Dry-run** → the canvas gets count pills + aggregate + legend.
3. Click a count pill (or an aggregate row) → borrowers panel opens with the
   list of who reached that node.
4. Click a row's trace icon → `?trace=<borrowerId>` overlay lights up that
   borrower's exact path across the graph.
5. Validator tab → same behaviour from a table view.
6. Borrowers tab → same behaviour from a list view.

Everything is deterministic (seeded PRNG in `borrower-traces.ts`), so a shared
link always shows the same result.

---

## Where to touch if something needs changing

| Change | File |
|---|---|
| New sub-nav tab | `src/components/journeys/journey-sub-nav.tsx` |
| Validator steps | `src/app/(app)/journeys/[id]/validator/page.tsx` |
| Trace visuals (pass colours, current-ring) | `src/components/journeys/trace-overlay.tsx` |
| Dry-run pill / aggregate / node borrowers panel | `src/components/journeys/dry-run-overlay.tsx` |
| Sim engine (branch splits, sampling, cost) | `src/lib/simulation-runner.ts` |
| Result shape / localStorage cache | `src/lib/simulation.ts` |
| Borrower/trace data source | `src/data/borrower-traces.ts` |
