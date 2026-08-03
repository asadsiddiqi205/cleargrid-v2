# Journey Builder — Changes in the last 10 days

**Window:** 2026-07-24 → 2026-08-03
**Deploy:** https://cleargrid-v1-jbfull.vercel.app
**Commits:** [`ccd2dbb`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/ccd2dbb) → [`4dcfd17`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/4dcfd17) → [`6bf74ec`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/6bf74ec) on `main`

Four major bodies of work landed on the Journey Builder in this window:

1. **Design-system token alignment** — the whole canvas + node surface + report
   route swapped from ad-hoc Tailwind (`emerald`/`red`/`amber`/`zinc`/`slate`)
   to ClearGrid semantic tokens (`primary`/`error`/`warning`/`neutral`), and
   shadcn variables were rewired to resolve to the design system underneath.
   Geist + Tajawal fonts, dark-mode default.
2. **Workshop-feedback update** — a broad response to workshop notes across
   validation, redial policy, canvas analytics, Composer synergy, human-agent
   campaigns, and canvas ergonomics.
3. **Simulator rebuild** — the "Open simulator" moment turned into a real
   what-if environment: cohort builder (three modes), per-node results with
   cost + attribute-empty warnings + branch preview, trace drill-down, and an
   ambient "simulation loaded" chrome that keeps the run visible while the
   author navigates.
4. **Template Blocks (Components)** — reusable subgraphs with masters,
   instances, per-field overrides, publish/version history, expanded-inline
   rendering on the canvas, palette section, and a dedicated master editor
   route.

Below is the section-by-section teardown, followed by a file map and the
list of parked items.

---

## 1 — Design system alignment (2026-07-28)

Applied the ClearGrid design tokens (colors + typography + fonts) so the
Journey Builder inherits the brand system automatically instead of via
per-component Tailwind utilities.

### 1.1 — Token infrastructure

- New `src/tokens/colors.ts` — seven primitive scales (`neutral`, `primary`,
  `success`, `warning`, `error`, `info`, `chart`) + `static` group, matching
  Figma verbatim.
- New `src/tokens/typography.ts` — 28-token type scale
  (`display-2xl` → `mono-sm`) with family / weight / size / line-height /
  tracking, plus three families (`latin` = Geist, `arabic` = Tajawal, `mono` =
  Geist Mono).
- Rewritten `src/app/globals.css` with 60+ ClearGrid primitive CSS variables
  (`--cg-neutral-*`, `--cg-primary-*`, etc.) and semantic aliases for both
  light and dark modes (`--color-bg-canvas`, `--color-border-subtle`,
  `--color-text-brand`, etc.).
- **shadcn rewire** — every shadcn utility that references `--background`,
  `--card`, `--popover`, `--primary`, `--muted`, `--accent`, `--destructive`,
  `--border`, `--ring`, `--sidebar-*`, `--chart-*` now resolves to a ClearGrid
  token. Zero per-component rewrites needed.
- 30 typography utility classes (`text-display-lg`, `text-heading-md`,
  `text-body-md`, `text-label-sm`, etc.) exposed via `@theme inline`.
- Arabic (`dir="rtl"`) automatically switches body / heading / label classes
  onto Tajawal with +5% line-height and zero letter-spacing.
- Ported `journey-validate-pulse` animation from raw rgb to
  `var(--cg-primary-500)` so the pulse matches brand teal.

### 1.2 — Fonts

- Dropped Inter + JetBrains Mono.
- Loaded **Geist** (`--font-geist-sans`), **Geist Mono** (`--font-geist-mono`),
  and **Tajawal** (`--font-tajawal`, weights 400/500/700, arabic + latin
  subsets) via `next/font/google`.
- `defaultTheme="dark"`, `enableSystem={false}` — dark is the design system's
  primary target.

### 1.3 — Sweep

A sed pass across every file under `src/components/journeys/` and the report
route:

- `emerald-{n}` → `primary-{n}` (brand teal)
- `red-{n}` → `error-{n}`
- `amber-{n}` → `warning-{n}`
- `zinc-{n}` → `neutral-{n}`
- `slate-{n}` → `neutral-{n}`

Applied to every property variant (`bg-`, `text-`, `border-`, `ring-`,
`from-`, `to-`, `via-`, `shadow-`, `stroke-`, `fill-`, `outline-`,
`decoration-`, `accent-`) and every opacity suffix.

`indigo-*`, `violet-*`, `sky-*`, `cyan-*`, `fuchsia-*` were **preserved**
where they signal domain meaning:

- **violet-500** — reserved exclusively for component surfaces (palette
  section, instance card border, master editor chrome, override indicators)
- **indigo** — AI-feature accents
- **sky / cyan / fuchsia** — retained for chart series and secondary
  branding

### 1.4 — What did NOT change

Layout, spacing, IA, component structure — visual tokens only. No shadcn
forks. Composer and Segments are scoped separately.

---

## 2 — Workshop-feedback update (2026-07-28)

### 2.1 — Validation stack (Tier 1)

#### 2.1.1 · In-canvas Simulate drawer

- Slide-up drawer at 42vh (replaces the "Open simulator" overflow item).
- Modes: **Full audience** (uses the journey's enrolled cohort) /
  **Specific deals** (paste IDs). Cap input. Rerun button.
- Per-node **count pills** anchored to each node via DOM `data-id` +
  `getBoundingClientRect`. 300ms re-tick so pan/zoom keeps them aligned.
- Side panel **NodeSampleList** — click any pill to see 10 sample borrowers
  that reached that node.
- Deterministic per-node decay (0.72–0.92) so counts fall through the flow
  in a realistic way without a real runner.

#### 2.1.2 · Audience-derived Validate AI Call

- `Validate AI Calls` button in the top toolbar.
- Three sampling modes: `random` / `oldest_dpd` / `most_recent`.
- Renders sampled borrower card + resolved script preview.
- Empty merge tags highlighted red inline; findings list shows every
  attribute that resolves to null/empty across the sample.
- Test-phone override for a dry outbound call (stub, logs to `console.info`).

#### 2.1.3 · Empty-attribute prompt lint

- New `src/lib/prompt-attribute-lint.ts` — walks `{{merge_tag}}` matches
  against sampled payloads and reports tags that resolve empty in >0% of the
  sample.
- Wired into the Validate AI Call modal.

#### 2.1.4 · Publish gate — severity grouping + Fix focus

- `handlePublish` now emits `PublishIssue[]` (severity + title + detail +
  nodeId + field) instead of flat strings.
- New per-node config checks: ClearVoice project missing, template missing,
  campaign missing, attribute field missing, redial >5.
- Dialog groups by severity: **Blockers** / **Warnings** / **Info** with
  tone chips. Warning-only journeys can be published from the dialog.
- **Fix** button on each issue closes the dialog, selects the offending
  node, and pulses the specific field red for 3 seconds via
  `data-focus-field` markers + `.journey-focus-pulse` animation.
- Every node's data is stamped with `_error` + `_errorSeverity` so the
  badges from §2.6.1 keep rendering on the canvas after a failed publish.

#### 2.1.5 · Recurring-journey deviation alerts

- New `src/data/journey-alerts.ts` — deterministic mock deviation alerts
  seeded off journey id (drift %, cause, threshold).
- Banner surfaces on canvas above the flow when active.
- `NotificationSettingsSection` in Journey Settings sheet — Slack channel +
  threshold controls.
- `postAlertToSlack` stub (console.info) fires on active-alert change.

### 2.2 — Redial policy

New `RedialPolicySection` in the **Trigger AI Call** config, sits under
Callback Handling:

- Enable toggle (default on) + summary chip.
- **Max attempts** — 1–5 (hard cap to protect against runaway loops).
- **Retry on outcomes** — `no_answer` / `busy` / `voicemail` /
  `dropped_by_ai` / `call_failed_technical`.
- **Interval strategy** — three modes:
  - `fixed` — single minutes value.
  - `escalating` — presets: `gentle` (30m → 2h → 24h) vs `aggressive`
    (10m → 30m → 2h → 8h).
  - `custom` — comma-separated `m/h/d` schedule.
- **Exit conditions** — PTP captured / dispute / callback / DNC added /
  settlement. Firing any short-circuits remaining redials.

### 2.3 — Analytics

#### 2.3.1 · Canvas count pills

- Analytics time-range selector in top toolbar: **24h / 7d / 30d / all**.
- `buildAnalyticsCounts` derives per-node counts from BFS depth × range
  multiplier × seeded jitter — deterministic per journey.
- Simulate result overrides analytics pills when active (indigo vs emerald
  tone).
- Pills are clickable → opens NodeSampleList side panel.

#### 2.3.2 · Journey Report page

New route `/journeys/[id]/report` (~1,015 lines):

- **Enrollment funnel** — 5 metric cards.
- **Business metrics** matching the Campaigns vocabulary — PTPs / RPCs /
  revenue.
- **14-day time-series** bar chart.
- **Per-node breakdown** table with pass-through %.
- **CSV export**.

### 2.4 — Composer synergy

- **Send Email** / **Send SMS** refactored from hardcoded
  `EMAIL_TEMPLATES` / `SMS_TEMPLATES` arrays to a **Composer registry
  adapter**.
- New `src/data/composer-registry-adapter.ts` unifies
  `rich-email-templates` + plain templates + `playbooks-v3` — rich wins on
  duplicates.
- New `ComposerTemplatePicker` component — searchable dropdown, playbook
  selector, template preview, and an **Author full template in Composer**
  link (pushes to `/email-generator/builder/new` with base64 prefill).
- Every send is tagged `source: journey_[id]` and
  `source_node: node_[id]` for reconciliation.
- Variable overrides (journey-scoped merge tag overrides) surfaced as an
  advanced section.

### 2.5 — Human Campaign node

New `trigger_human_campaign` block under Channels / Actions:

- New `src/data/campaigns-seed.ts` — 5 seeded human campaigns with
  `skillGroup` / `priorityTier` / `queueDepth` / `status`.
- `HumanCampaignConfig` supports a **hybrid mode**:
  - **Use existing campaign** — picker with campaign metadata card +
    enrollment overrides (priority tier, urgency).
  - **Create new campaign** — name + skill group + priority + link to the
    Campaigns page (`/campaigns?draft=1`).
- **Exit conditions** — PTP captured / dispute / callback / not reachable /
  timeout N days.
- **Journey continues after** — Immediate (parallel) vs Wait-for-outcome.
- Enrollment stub tags `source: journey_[id]` and
  `source_node: node_[id]`.

### 2.6 — Ergonomics

#### 2.6.1 · Error badges on every node

- New shared `NodeErrorBadge` dropped into `TriggerNode`, `ConditionNode`,
  `ActionNode`, `WaitNode`, `SplitNode`, `EndNode`, `GenericNode`.
- Reads `data._error` + `data._errorSeverity`, renders a red / amber pill
  top-left with hover tooltip showing the full message.
- Populated by the publish gate from §2.1.4.

#### 2.6.2 · Minimap toggle

- Toolbar icon button next to the time-range selector; active state ringed
  in primary.

#### 2.6.3 · Saved indicator normalization

Replaces the two-state "Unsaved edits" / "No edits since open" chip with a
live `SavedIndicator`:

- **Saving…** (500ms sim after 1.2s debounce off `historyIndex`)
- **Saved just now** (<5s since save)
- **Saved Ns / Nm / Nh ago** (older)
- **Unsaved changes** (pending)

Colored by state (amber / sky / emerald / muted) with a spinner icon during
Saving.

#### 2.6.4 · Event trigger tooltips

- New `src/data/event-trigger-catalog.ts` — 11 events with description /
  origin / payload metadata.
- `EventTriggerInfoIcon` renders an inline Info icon next to the event
  dropdown; hovering reveals the tooltip.
- Event dropdowns (Occurrence-of-Event trigger + Has-Done-Event condition)
  now render from the catalog.

#### 2.6.5 · Filter role scaffolding

- New `src/data/filter-registry.ts` — 10 filters annotated with
  `requiredRole`.
- `RoleScopedFilterPicker` renders visible filters plus a footer count of
  restricted ones (marked disabled + `restricted` suffix).
- Wired into the Check-Attribute condition field picker.

### 2.7 — Journey GPT

Deferred this round to keep the update shippable in one deploy. The
existing panel still functions unchanged (and was file-relocated as part of
commit `6bf74ec` — see §4).

---

## 3 — Simulator rebuild (2026-07-28)

Rebuilt the simulator from a modal moment into a real what-if environment.
Authors construct hypothetical cohorts, see how the journey behaves per
node, and catch runtime issues before publishing.

### 3.0 — FilterBuilder refactor (foundation)

Made the segment builder's `FilterBuilder` reusable across surfaces:

- New props on `src/components/segments/filter-builder.tsx`:
  `value: FilterGroup[]`, `onValueChange`, `groupJoin`, `onGroupJoinChange`,
  `enableCalculatedFields`, `heading`, `hideHeading`.
- **Backwards-compatible** — legacy `onChange?: (count: number) => void`
  still works; the segment-builder consumer needed no changes.
- Calculated-Fields button + saved-fields strip are gated behind
  `enableCalculatedFields` (default `true`).
- `createGroup` / `createFilter` factories exported.

### 3.1 — Cohort builder

**Three-mode selector:**

- **Full audience** — runs against the journey's audience filter.
- **Specific deals** — paste borrower_deal_ids (existing behavior).
- **Filter-built cohort** — opens the reused `FilterBuilder` inline with
  `enableCalculatedFields={false}` and `heading="Cohort filters"`.

Persists per journey via `localStorage[journey-cohort:<id>]`. Default is
Full audience.

**Live count + preview:**

- 500ms debounced live count: `[N] borrowers match this cohort.`
- **Preview cohort** button opens an inline panel with 10 sample borrowers
  — name, DPD, product, status, outstanding + a `Trace →` button per row.
- View-more link at the bottom deep-links to the Borrowers page.

**Cap + safeguards:**

- Cap input (max 50,000, default 30,000) at the bottom of the cohort card.
- Amber helper when filter matches > cap: `Filter matches N borrowers.
  Simulation will run against a random sample of [cap] to protect
  performance.`
- Zero-match message in muted neutral: `No borrowers match this filter.
  Broaden your conditions or check attribute values.`

**Save as segment:**

- Modal with name (required) + description.
- Writes a Draft segment payload to
  `localStorage[cleargrid:draft-segments]` (real Segments module can
  hydrate from this).
- Toast confirms with a **View in Segments** action.

### 3.2 — Per-node results

- **Count badges** — primary count + `(percent%)` on the same badge —
  e.g. `1,247 (68%)`. Zero-count nodes show `0 (—)` in muted zinc. Badge is
  dashed-emerald when a simulation is loaded (see §3.3).
- **Branch preview** — top 3 branch counts rendered below the primary
  badge for split nodes. `+N more` chip when >3 branches; expands in place.
- **Attribute-empty warnings** — warning icon at top-left of the badge
  fires when the runner detects a merge tag that resolves empty against a
  sampled borrower. Tooltip: `12% of cohort has empty
  settlement.options.` Clicking the badge opens the sample panel; clicking
  the icon opens the Trace modal.
- **Cost estimates** — rates in `src/lib/simulation.ts::COST_ESTIMATES`:
  - AI Call — 3 min/call × AED 0.35/min
  - SMS — AED 0.03/msg
  - WhatsApp — AED 0.05/msg
  - Email — free (skipped)
  - Human Campaign — enrollment count, no cost
  Per-node badge line: `~AED N`. Drawer footer shows the total.
- **Outcome config** — `simulator-outcome-config.tsx` renders a
  collapsible section listing every action node whose outcomes drive
  branching. Each row is a preset chip → clicking opens a modal:
  - **Realistic** (default) — fallback distribution in `OUTCOME_DEFAULTS`.
  - **Best case** — 90% success outcome, rest neutral.
  - **Worst case** — 90% failure outcome, rest neutral.
  - **Custom** — sliders per outcome; save disabled until total = 100%.
  The runner samples branches from these distributions per borrower using a
  deterministic seeded PRNG so results are stable across reruns.
- **Trace drill-down** — `simulation-trace-modal.tsx` renders a two-column
  modal per borrower:
  - Left — ordered hop list with node label, branch taken (if split),
    outcome (if action node), and time offset from enrollment.
  - Right — mini-map SVG showing every canvas node in position, with the
    borrower's path drawn as a dashed emerald polyline through hop centers.
  - Bottom banner — converted / exited / errored / still active.
  Opened via the `Trace →` button in either the sample side-panel or the
  Cohort preview panel.

### 3.3 — Simulation view (ambient mode)

- **Persistent view chip** — `SimulationViewChip` renders as a top-right
  ReactFlow Panel whenever `simulateResult` is set. Shows the cohort label
  + `N mins ago`, with a dropdown: Show/Hide overlay · Rerun · Edit cohort
  · New simulation · Clear simulation.
- **Persistence** — `saveSimulation` / `loadSimulation` /
  `clearSimulation` on `localStorage[journey-sim:<id>]` with a 7-day TTL.
  Cohort inputs persist under `journey-cohort:<id>`. When the drawer opens
  with a cached simulation and the node set has changed since it ran, the
  drawer shows a `SimulationEditedBanner` prompting a rerun.
- **Visual differentiation:**
  - Simulation badges — dashed emerald border, `zinc-900/95` background.
  - Analytics badges — solid emerald border, filled `emerald-600/85`.
  - `OverlayLegend` renders top-left with a small key when either overlay
    is active: `━ Real (last 7d)` / `┅ Simulated`.
  - When both are active they stack: analytics top-right of node,
    simulation top-left.
- **Publish soft-nudge** — `handlePublish` gates the final
  `setStatus("published")` on `wasPublishNudgeSeen(journeyId)` when there's
  no active simulation. When gated, an `AlertDialog` fires:
  `"Consider running a simulation before publishing"` with **Publish
  anyway** and **Simulate now** actions. Choice recorded in
  `localStorage[journey-sim-nudge:<id>]` so it fires at most once per
  journey.
- **Deep-link URL** — canvas syncs `?sim=<result.id>` on `simulateResult.id`
  change via `history.replaceState`. Sharing the URL with a colleague loads
  the same simulation from local cache (prototype-scoped; a real
  implementation would use a server-side store).

---

## 4 — Template Blocks (Components) (2026-07-28)

Reusable subgraphs on the canvas — masters, instances, overrides — all
live. Modeled after Figma components: **auto-propagate on master change**,
**every property overridable by default** (with per-field locks),
**overrides always win** against master changes.

Violet-500 is **reserved exclusively for component surfaces** across the
whole app (palette section, instance card border, master editor chrome,
override indicators, Publish button). Authors see violet, they know
they're touching shared state.

### 4.1 — Data model + storage

New `src/data/components.ts` (~440 lines):

- **`ComponentMaster`** — id, name, description, category, version, nodes,
  edges, `lockedProperties[]`, `inputPort`, `outputPorts[]`, publish
  history.
- **`ComponentInstanceData`** — the `node.data` shape for a
  `component_instance` node on a canvas. Carries `componentId`,
  `componentVersion` (snapshot), `overrides[]`, `expanded`, denormalized
  name/category/ports.
- **`localStorage` store** keyed under `cleargrid:components:masters` plus
  a `cg:components:changed` custom-event broadcast so panels update live
  after publish.
- **`resolveInstance(master, overrides)`** applies overrides onto master
  node data; locked properties always keep the master value and silently
  drop overrides on them.
- `upsertOverride` / `removeOverride` / `getOverride` / `isPropertyLocked`
  helpers.
- **Publish flow** — `publishMaster(id)` bumps `version`, appends to
  `publishHistory[]` (capped at 20), broadcasts the change.
- **`indexInstancesAcross(journeys)`** — scans a set of journeys and groups
  instance usage by `componentId`. Used by the master editor sidebar
  ("used in N journeys") and the palette delete-guard.

### 4.2 — Expanded-inline rendering

Components render as their **full subgraph** on the canvas, wrapped in a
violet-dashed frame with a header showing the component name/version and
an **Open master** button.

- The frame is a real ReactFlow parent node (`type: "component_group"`),
  and the master's inner nodes are placed as its `parentId`-linked
  children — each rendered with its normal node renderer
  (TriggerNode/ActionNode/WaitNode/etc.), positioned relative to the
  parent, and marked with
  `data._componentInstance = { componentInstanceId, masterNodeId, componentId }`.
- Child nodes are **non-draggable and non-deletable** directly (the group
  is the movable unit).
- Clicking a child opens `NodeConfigPanel` via `InstanceInnerNodeEditor`,
  which writes edits back as overrides on the parent group's
  `data.overrides`.
- A canvas effect walks every group's children after each nodes-state
  change and re-applies `resolveInstance(master, overrides)` — keeps
  children in sync with master + overrides.
- Deleting a `component_group` **cascades to its children** via the
  ReactFlow `onNodesDelete` handler.
- **Detach** strips `parentId` + `extent` + the marker from every child
  and shifts positions from group-relative → canvas-relative, then drops
  the group node.
- **Save-as-component** takes the selected nodes, extracts them into a new
  master, places a fresh `component_group` at the selection's centroid,
  and rebuilds the children with parent references + a marker payload.
  External edges (incoming / outgoing across the selection boundary) are
  rewired to point at the group node.

The initial rebuild used a single compressed "instance card" node with a
right-side panel; that model worked interaction-wise but didn't read as a
component visually — authors couldn't see what was inside without opening
a panel. The expanded-inline model shows the real nodes directly, which
was the design intent.

### 4.3 — Palette

- New **Components** section in `node-palette.tsx`, injected between Flow
  Controls and Data / State (position 5 per spec).
- Violet Boxes icon + live count badge sourced from `listMasters()`.
- Palette subscribes to `cg:components:changed` so a publish anywhere
  triggers immediate rerender.
- Category filter chips (multi-select) below the section header.
- Search filters both blocks and components by name / description /
  category.
- Each component card — violet border, small Boxes icon, name + version
  badge, muted description, uppercase category tag. Draggable to canvas +
  clickable to insert.
- Hover reveals per-card actions: **Edit master** (pencil → route to
  `/components/[id]/edit`) and **Delete component** (trash).
- Empty state — violet-tinted panel with the exact copy from the spec.

### 4.4 — Save-as-component

New `save-as-component-modal.tsx`:

- ReactFlow's `onSelectionChange` fires into a debounced `selectedNodeIds`
  state (guarded against reference-only changes to prevent max-update
  loops).
- When `selectedNodeIds.length >= 2`, a **floating action bar** renders as
  a bottom-center Panel: `N selected · Save as component · Duplicate ·
  Delete`. Save-as-component is a violet-500 pill.
- The Create Component modal validates:
  - No trigger nodes (`trigger`/`event_trigger`/…/`journey_handoff_entry`).
  - No exit nodes (`end`/`end_journey`).
  - No nested component instances (v1 nesting cap = 0).
  - Exactly one entry point (single node with no upstream edge from the
    selection).
  - At least one exit (edge leaving to outside, or a default "Exit" port).
- **Auto-detects output ports** from outgoing edges leaving the selection
  with editable labels.
- Mini preview panel on the right shows Input port · listed inner nodes ·
  Output ports.
- On Save:
  - `ComponentMaster` is persisted.
  - Selected nodes are removed from the journey.
  - Their internal edges are dropped (they now live in the master).
  - External edges are rewired to point at the new `component_instance`
    node placed at the selection's centroid.

### 4.5 — Master editor

New route `/components/[id]/edit`:

- Distinct **violet-accented header** (subtle horizontal gradient from
  `violet-500/0.08`).
- Header — Back button · Boxes icon · inline-editable name · category
  dropdown · **version chip with instance-count**
  (`v3 · 47 instances across 12 journeys`, count derived by scanning the
  seeded journey library on demand).
- Right sidebar (`MasterSidebar`) when no node selected:
  - Editable description.
  - Ports summary (input + labeled outputs).
  - **Locked properties** list (from `master.lockedProperties`).
  - Cross-journey usage list with links.
  - Auto-propagate reminder box.
- When a node is selected, `NodeConfigPanel` takes the sidebar's place
  with a `masterContext` prop that surfaces the violet "master editor"
  hint at the top.
- **Save draft** persists edits without bumping version.
- **Publish** button (violet pill) increments `master.version`, appends to
  `publishHistory[]`, and broadcasts `cg:components:changed` — every open
  journey canvas + palette repaints. Toast confirms count affected.
- **Version history** dropdown reads the last 20 entries · read-only per
  v1.
- **Delete** (red trash) — blocks with a toast when instances exist in the
  seeded journey library; otherwise confirms and removes.

### 4.6 — Instance panel + inline edit

- New `component-instance-panel.tsx` — selecting an instance opens a
  380px right-side panel with three tabs:
  - **Subgraph** — describes the master, lists every inner node (violet
    dot · label · type · override count · lock count), each clickable to
    edit. Footer link opens the master.
  - **Overrides** — flat list grouped by inner node showing
    `propertyPath · value · Reset` rows. Header **Reset all** button.
  - **Advanced** — Detach action + master version snapshot info.
- New `instance-inner-node-editor.tsx` — clicking an inner-node from the
  Subgraph tab:
  - Resolves the effective node data via
    `resolveInstance(master, overrides)`.
  - Mounts `NodeConfigPanel` with the resolved node.
  - Passes `instanceContext` so the panel renders the **amber banner** at
    the top (`You're editing an instance of …`) with an Open master link.
  - On every `onUpdate`, diffs the new data vs the master baseline and
    writes an `overrides[]` entry for each differing dotted-path. When a
    property is edited back to the master value, its override is
    auto-removed.

### 4.7 — Property locking

Locked properties live on the master and are enforced by
`resolveInstance` — overrides on locked paths are silently ignored (they
also don't get written by the inner-node editor because the panel is
running with `instanceContext.lockedProperties`, which UI code can read to
render fields read-only).

`NodeConfigPanel` was extended with two optional props:

- `masterContext` — surfaces the violet "master editor" hint banner.
- `instanceContext` — surfaces the amber "editing an instance" banner and
  carries `overriddenPaths` + `onResetOverride` for the per-field
  indicator UI. Fields that appear in `lockedProperties` are treated as
  read-only.

### 4.8 — Master-change propagation

- Compressed instance card renders a **violet pulse dot** in the top-right
  when `master.version > data.componentVersion`. Tooltip: `Master updated
  to vN. Your overrides are preserved.`
- On canvas first-load a one-shot `useEffect` scans for drifted instances
  and:
  1. Auto-bumps their `componentVersion` snapshot + refreshes denormalized
     name/category/ports.
  2. Emits a preserve-overrides toast per drifted component:
     `"<Name>" master updated · Updated to vN across K instances · your M
     overrides preserved.`
- When the master changes a property that the instance overrides, the
  override still wins (per the locked design decision).

### 4.9 — Seed component library

Five starter components ship on first-run via `seedComponentsIfEmpty()`
called from the canvas mount:

1. **Callback Handling** — Wait until callback time → Compliance guard →
   Trigger AI call. Three locked properties on the guard (`checks.dnd` /
   `checks.contactWindow` / `checks.dnc`) with lender-config reasons.
2. **Redial with Escalation** — Trigger AI Call (retryEnabled, gentle
   preset) → Action Path Split. No locks — a tuning scaffold.
3. **Consent Pre-flight** — DNC gate → Consent check. Two locked
   properties on the DNC gate (`list` + `matchMode`) with regulatory
   reasons.
4. **Preferred Channel Routing** — Best Channel node with four channel
   outputs. No locks.
5. **Post-PTP Follow-up** — Wait for PTP date → SMS reminder → Wait 1d →
   Has Done Event check → Escalate to human. No locks.

Every seed uses realistic default configs on each inner node.

---

## 5 — Journey GPT panel

Existing panel was file-relocated + brought under the token sweep in this
window (`src/components/journeys/journey-gpt-panel.tsx`, ~231 lines).
Functionally unchanged from the pre-window behavior; violet accent
preserved.

---

## 6 — Node + block-config changes rolled into this window

Beyond the four bodies of work above, the recent commits also touched the
individual node renderers and the shared node-config panel:

- **`node-config-panel.tsx`** — extended with `masterContext` and
  `instanceContext` optional props (see §4.7), the amber instance-editing
  banner + violet master-editor hint at the top of the panel, publish-gate
  `data-focus-field` + `.journey-focus-pulse` markers wired into every
  field so the Fix button from §2.1.4 can highlight them, and rework
  across the Trigger AI Call / Send Email / Send SMS / Action Path Split
  configs to fold in the Composer registry adapter (§2.4) and the redial
  policy section (§2.2). Net delta: +1,466 / −57 lines.
- **`journey-canvas.tsx`** — the epicenter. Registered `component_group`,
  `component_instance` node types. Wired palette handlers, save-as-
  component selection action bar, right-panel selection logic (Journey
  GPT / Instance panel / Inner-node editor / Node config). Added the
  in-canvas Simulate drawer (§2.1.1), overlay legend + simulation view
  chip + `?sim=` URL sync (§3.3), analytics count pills (§2.3.1), publish
  gate + Fix focus (§2.1.4), deviation-alert banner (§2.1.5), master-drift
  on-load handling (§4.8), the `SavedIndicator` (§2.6.3), the minimap
  toggle (§2.6.2), and marquee/shift-multi-select fixes. Net delta:
  +2,065 / −0 lines against the previous file.
- **`node-palette.tsx`** — the Components section between Flow Controls
  and Data / State, category filter chips, live subscribe to
  `cg:components:changed`. Net delta: +299 lines.
- **All node types** (`trigger` / `condition` / `action` / `wait` / `split`
  / `end` / `generic`) — dropped in the shared `NodeErrorBadge` (§2.6.1)
  and updated their surface tokens to the design-system aliases.
- **`callback-monitor-view.tsx`** / **`ai-callbacks-settings.tsx`** /
  **`callback-handling.tsx`** — token sweep + small readability touches
  from workshop feedback.
- **`journeys-table.tsx`** — small list-view refinements.
- **`data/journeys.ts`** — added `trigger_human_campaign` block (§2.5),
  and touched-up seeds. Net delta: +98 lines.
- **`block-configs.tsx`** — the Redial policy section (§2.2), Event
  trigger info icons (§2.6.4), the Role-scoped filter picker (§2.6.5),
  Human Campaign form (§2.5). Net delta: +17 lines *relative to the state
  after prior 2026-05-10 v1 node updates*; the substantive additions from
  this window sit inside the new files.

---

## 7 — File map

### New files in this window

**Components (Template Blocks):**
- `src/data/components.ts`
- `src/components/journeys/nodes/component-instance-node.tsx`
- `src/components/journeys/save-as-component-modal.tsx`
- `src/components/journeys/component-instance-panel.tsx`
- `src/components/journeys/instance-inner-node-editor.tsx`
- `src/app/(app)/components/page.tsx`
- `src/app/(app)/components/[id]/edit/page.tsx`

**Simulator:**
- `src/lib/simulation.ts`
- `src/lib/simulation-runner.ts`
- `src/components/journeys/simulate-drawer.tsx`
- `src/components/journeys/simulator-outcome-config.tsx`
- `src/components/journeys/simulation-view-chip.tsx`
- `src/components/journeys/simulation-trace-modal.tsx`

**Workshop-feedback:**
- `src/components/journeys/workshop-panels.tsx`
- `src/components/journeys/nodes/node-error-badge.tsx`
- `src/data/journey-alerts.ts`
- `src/data/campaigns-seed.ts`
- `src/data/event-trigger-catalog.ts`
- `src/data/filter-registry.ts`
- `src/data/composer-registry-adapter.ts`
- `src/lib/prompt-attribute-lint.ts`

**Design system:**
- `src/tokens/colors.ts`
- `src/tokens/typography.ts`

**Report route:**
- `src/app/(app)/journeys/[id]/report/page.tsx` (~1,015 lines)

**Journey GPT (moved into this window's tree):**
- `src/components/journeys/journey-gpt-panel.tsx`

### Modified files in this window

- `src/components/journeys/journey-canvas.tsx` (+2,065 lines)
- `src/components/journeys/node-config-panel.tsx` (+1,466 lines)
- `src/components/journeys/node-palette.tsx` (+299 lines)
- `src/components/journeys/block-configs.tsx` (+17 lines)
- `src/components/journeys/callback-monitor-view.tsx`
- `src/components/journeys/callback-handling.tsx`
- `src/components/journeys/ai-callbacks-settings.tsx`
- `src/components/journeys/journeys-table.tsx`
- `src/components/journeys/nodes/action-node.tsx`
- `src/components/journeys/nodes/condition-node.tsx`
- `src/components/journeys/nodes/end-node.tsx`
- `src/components/journeys/nodes/generic-node.tsx`
- `src/components/journeys/nodes/split-node.tsx`
- `src/components/journeys/nodes/trigger-node.tsx`
- `src/components/journeys/nodes/wait-node.tsx`
- `src/data/journeys.ts` (+98 lines)
- `src/app/globals.css` (rewritten with 60+ CG variables + shadcn rewire)
- `src/app/layout.tsx` (Geist + Tajawal fonts, dark default)

Excludes composer/segments changes and screenshot artifacts.

---

## 8 — What is NOT built (parked)

### From the Components spec

- No nesting (v1 nesting cap = 0).
- No parameters — overrides are the parameterization mechanism.
- No draft/publish separation — master editor is live-editing.
- No rollback — version history is read-only.
- No cross-workspace sharing.
- No component analytics.
- No version pinning on instances (instances always follow latest master
  with the preserve-overrides toast on load).

### From the Simulator spec

- No deterministic execution engine — the runner is approximate.
- No cross-journey interaction simulation.
- No publish gate on simulation (soft nudge only).
- No comparison mode (A vs B cohorts, v1 vs v2).
- No historical simulation storage beyond the last one per journey.
- No server-side sharing (deep-links are per-browser via localStorage).

### From the Workshop-feedback update

- **Journey GPT** — deferred this round to keep the update shippable. The
  existing panel functions unchanged.

### Open questions flagged in the Components changelog

- **Audit-log surfacing** — where do component master edits appear? The
  prototype doesn't wire component publishes into the per-journey audit
  log; product decision needed.
- **Cross-workspace component IDs** — prototype uses raw string IDs; a
  real backend needs namespacing when multi-workspace ships.
- **In-flight journey behavior on master change** — existing enrolled
  borrowers presumably continue with the old config, new enrolments get
  the new. Confirm with engineering.

---

## 9 — Build state

- `npm run build` — passes, 30/30 static routes generated. TypeScript
  strict clean.
- Deployed to `https://cleargrid-v1-jbfull.vercel.app` from `main`.
- Playwright captures for each of the four bodies of work sit under
  `screenshots/` locally; excluded from git via `.gitignore` (added in
  commit `6bf74ec`).
