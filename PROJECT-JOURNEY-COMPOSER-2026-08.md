# ClearGrid Prototype · Journey Builder + Composer + HTML Builder

**Window:** 2026-07-27 → 2026-08-27 (past 30 days)
**Deploy:** https://cleargrid-v1-jbfull.vercel.app
**Repo:** [github.com/asadsiddiqi205/cleargrid-v2](https://github.com/asadsiddiqi205/cleargrid-v2)

Consolidated project doc covering every change that landed on the Journey
Builder, Composer, and the HTML email builder over the past month. Groups
work by product surface; commit hashes link to GitHub for provenance.

---

## Table of contents

1. [Journey Builder](#journey-builder) — design system, workshop update,
   simulator, components, single-borrower trace, journey analytics v2,
   per-node run analytics, canvas polish, tracker report
2. [Composer](#composer) — variations UI, recurring campaigns, sender
   overrides, Send confirm, unified previews, per-message analytics
3. [HTML builder (rich email templates)](#html-builder-rich-email-templates)
   — rename + prominence, template picker, Send-node preview, edit flow
4. [Shared analytics + Reports](#shared-analytics--reports)
5. [File map + build state](#file-map--build-state)

---

# Journey Builder

## 1 · Design system token alignment (2026-07-28)

Journey Builder inherits the ClearGrid design system automatically instead of
via per-component Tailwind utilities.

**Tokens + fonts**

- New `src/tokens/colors.ts` — seven primitive scales (`neutral`, `primary`,
  `success`, `warning`, `error`, `info`, `chart`) matching Figma.
- New `src/tokens/typography.ts` — 28-token type scale (`display-2xl` →
  `mono-sm`) with three families (Geist / Tajawal / Geist Mono).
- Rewritten `src/app/globals.css` with 60+ CG primitive CSS variables and
  semantic aliases for both light + dark modes.
- **shadcn rewired** — every shadcn utility resolves to a CG token, zero
  per-component rewrites needed.
- 30 typography utility classes exposed via `@theme inline`.
- Arabic (`dir="rtl"`) auto-swaps to Tajawal with +5% line-height.
- Ported `journey-validate-pulse` animation from raw rgb to
  `var(--cg-primary-500)`.

**Fonts**

- Dropped Inter + JetBrains Mono. Loaded Geist / Geist Mono / Tajawal.
- `defaultTheme="dark"`, `enableSystem={false}`.

**Sweep**

- sed pass across `src/components/journeys/**` + the report route:
  `emerald→primary`, `red→error`, `amber→warning`, `zinc→neutral`,
  `slate→neutral` on every property variant and opacity suffix.
- `violet-500` preserved for **component surfaces**. `indigo` for AI
  features. `sky / cyan / fuchsia` retained for chart series.

## 2 · Workshop-feedback update (2026-07-28)

Broad response to workshop notes across validation, redial, canvas
analytics, Composer synergy, human-agent campaigns, and canvas ergonomics.

### 2.1 Validation stack

- **In-canvas Simulate drawer** — slide-up at 42vh. Modes: Full audience /
  Specific deals. Per-node count pills anchored via DOM `data-id` +
  `getBoundingClientRect`, retick on pan/zoom. Side panel NodeSampleList
  with 10 sample borrowers per node. Deterministic per-node decay 0.72–0.92.
- **Validate AI Calls** button — three sampling modes (`random` /
  `oldest_dpd` / `most_recent`), sampled borrower card + resolved script
  preview, empty merge tags highlighted red, findings list.
- **Empty-attribute prompt lint** — new `src/lib/prompt-attribute-lint.ts`
  walks `{{merge_tag}}` matches against sampled payloads and reports tags
  that resolve empty in >0% of the sample.
- **Publish gate — severity grouping + Fix focus** — `handlePublish`
  emits `PublishIssue[]` with severity + title + detail + nodeId + field.
  Dialog groups by severity (Blockers / Warnings / Info). **Fix** button
  closes the dialog, selects the offending node, pulses the specific field
  red for 3s via `data-focus-field` + `.journey-focus-pulse`.
- **Recurring-journey deviation alerts** — new `src/data/journey-alerts.ts`
  (deterministic mock alerts seeded off journey id). Banner on canvas +
  NotificationSettingsSection with Slack channel + threshold controls.

### 2.2 Redial policy

New `RedialPolicySection` under Callback Handling in Trigger AI Call:

- Enable toggle + Max attempts 1–5 hard cap.
- Retry on outcomes (no_answer / busy / voicemail / dropped_by_ai /
  call_failed_technical).
- **Interval strategy**: `fixed` (single minutes value), `escalating`
  (gentle 30m→2h→24h vs aggressive 10m→30m→2h→8h presets), `custom`
  (comma-separated m/h/d schedule).
- Exit conditions: PTP / dispute / callback / DNC / settlement.

### 2.3 Canvas analytics

- Analytics time-range selector (`24h / 7d / 30d / all`) in top toolbar.
- `buildAnalyticsCounts` derives per-node counts (BFS depth × range ×
  seeded jitter). Simulate result overrides analytics when active (indigo
  vs emerald).
- **Journey Report page** (~1,015 lines) — enrollment funnel, business
  metrics (PTPs / RPCs / revenue), 14-day time-series bar chart, per-node
  breakdown table, CSV export.

### 2.4 Composer synergy

- Send Email / Send SMS refactored from hardcoded template arrays to a
  new `src/data/composer-registry-adapter.ts` unifying rich templates +
  plain templates + playbooks-v3 (rich wins on duplicates).
- New `ComposerTemplatePicker` with searchable dropdown, playbook
  selector, template preview, and "Author full template in Composer" link
  (base64 prefill for the HTML builder).
- Every send tagged `source: journey_[id]` + `source_node: node_[id]`.

### 2.5 Human Campaign node

- New `trigger_human_campaign` block. New `src/data/campaigns-seed.ts`
  with 5 seeded human campaigns.
- Hybrid mode: Use existing campaign vs Create new (name + skill group +
  priority + link to `/campaigns?draft=1`).
- Exit conditions, wait-for-outcome vs immediate continuation.

### 2.6 Ergonomics

- **Error badges** — shared `NodeErrorBadge` on every node type (reads
  `data._error` + `_errorSeverity`, red/amber pill top-left).
- **Minimap toggle** button.
- **Saved indicator** — Saving… / Saved just now / Saved N ago / Unsaved
  changes.
- **Event trigger tooltips** — new `src/data/event-trigger-catalog.ts`
  (11 events with description / origin / payload metadata).
- **Filter role scaffolding** — new `src/data/filter-registry.ts` (10
  filters annotated with `requiredRole`); `RoleScopedFilterPicker` marks
  restricted filters disabled.

## 3 · Simulator rebuild (2026-07-28)

Turned the "Open simulator" moment into a real what-if environment.

**FilterBuilder refactor** — made the segment builder's `FilterBuilder`
reusable across surfaces with `value` / `onValueChange` / `groupJoin` /
`onGroupJoinChange` / `enableCalculatedFields` / `heading` /
`hideHeading` props. Legacy `onChange?: (count: number) => void` still
works.

**Cohort builder**

- Three-mode selector: **Full audience** / **Specific deals** /
  **Filter-built cohort** (reuses `FilterBuilder`).
- Persists per journey via `localStorage[journey-cohort:<id>]`.
- 500ms debounced live count. Preview panel with 10 sample borrowers +
  Trace →.
- Cap input (max 50k, default 30k) with amber over-cap helper.
- **Save as segment** — modal → writes Draft to
  `localStorage[cleargrid:draft-segments]`; toast with "View in Segments"
  action.

**Per-node results**

- Count badges: `1,247 (68%)` combined pill; zero-count in muted zinc;
  dashed-emerald when a simulation is loaded.
- Top-3 branch counts under split nodes; `+N more` expands.
- Attribute-empty warnings (warning icon + tooltip
  `"12% of cohort has empty settlement.options."`).
- Cost estimates: AI Call `3min × AED 0.35`; SMS `AED 0.03/msg`;
  WhatsApp `AED 0.05/msg`; Email free.
- **Outcome config** (`simulator-outcome-config.tsx`) — presets:
  Realistic (defaults) / Best case (90% success) / Worst case (90%
  failure) / Custom (sliders, sum-to-100 required). Runner
  (`simulation-runner.ts`) samples branches from these using a
  deterministic seeded PRNG.
- **Trace drill-down** (`simulation-trace-modal.tsx`) — hop list on the
  left, mini-map with dashed emerald polyline on the right.

**Ambient simulation view**

- `SimulationViewChip` top-right Panel — cohort label + N mins ago +
  Show/Hide overlay · Rerun · Edit · New · Clear.
- Persistence in `localStorage[journey-sim:<id>]` with 7-day TTL.
- `SimulationEditedBanner` when the node set changed since the run.
- **Publish soft-nudge** — `handlePublish` gates final `published` on
  `wasPublishNudgeSeen(journeyId)` when no active simulation. AlertDialog:
  "Publish anyway" / "Simulate now".
- **Deep-link URL** — canvas syncs `?sim=<result.id>` on
  `simulateResult.id` change.

## 4 · Template Blocks / Components (2026-07-28)

Reusable subgraphs on the canvas — masters, instances, per-field
overrides — modelled after Figma components. **Auto-propagate on master
change; every property overridable; overrides always win**.

**Violet-500 reserved for component surfaces** (palette section, instance
card border, master editor chrome, override indicators, Publish button).

**Data model**

- `src/data/components.ts` (~440 lines): `ComponentMaster`,
  `ComponentInstanceData`, localStorage store keyed
  `cleargrid:components:masters` + `cg:components:changed` broadcast.
  `resolveInstance(master, overrides)` applies overrides (locked
  properties always win). `publishMaster(id)` bumps version, appends to
  `publishHistory[]` (capped 20), broadcasts change.

**Expanded-inline rendering**

- Instance = ReactFlow parent node (`type: "component_group"`) with the
  master's inner nodes as `parentId`-linked children.
- Children non-draggable/non-deletable; clicking opens `NodeConfigPanel`
  via `InstanceInnerNodeEditor` which writes edits back as overrides on
  the parent group's `data.overrides`.
- Canvas effect walks group children after each state change and
  re-applies `resolveInstance(master, overrides)`.
- Deleting a `component_group` **cascades to its children**.
- **Detach** strips `parentId` + marker from every child and shifts
  positions.

**Palette + Save-as-component**

- New Components section between Flow Controls and Data / State
  (position 5). Violet Boxes icon + live count + subscribes to
  `cg:components:changed`.
- Category filter chips + search over blocks and components.
- Selection ≥2 → floating action bar with violet "Save as component"
  pill. Modal validates: no triggers, no exit nodes, no nested instances
  (v1 nesting cap = 0), exactly one entry point, ≥1 exit. Auto-detects
  output ports from outgoing edges leaving the selection.

**Master editor** — `/components/[id]/edit`

- Violet-accented header with editable name + category + version chip.
- Right sidebar (`MasterSidebar`): description, ports, locked properties,
  cross-journey usage list, auto-propagate reminder.
- Selecting a node swaps sidebar for `NodeConfigPanel` with
  `masterContext` (per-field lock toggles).
- **Publish** (violet pill) bumps version, appends to `publishHistory[]`,
  broadcasts change → every open journey + palette repaints.
- Version history dropdown (last 20 entries, read-only in v1).
- Delete blocked when instances exist.

**Instance panel + inline edit**

- Right-side panel with 3 tabs: **Subgraph** (inner nodes list), **Overrides**
  (per-path list + Reset all), **Advanced** (Detach + master snapshot).
- `instance-inner-node-editor.tsx` — clicking an inner node resolves
  effective data, mounts NodeConfigPanel with `instanceContext` (amber
  banner + Open master link). `onUpdate` diffs vs master baseline and
  writes overrides for each differing dotted path; auto-removes overrides
  when a field is set back to master.

**Master-change propagation**

- Compressed instance card renders a **violet pulse dot** when
  `master.version > data.componentVersion`.
- On canvas load, one-shot effect scans for drifted instances, auto-bumps
  their snapshot, emits toast: `"<Name>" master updated · Updated to vN
  across K instances · your M overrides preserved.`

**Seed library** — 5 starter components: Callback Handling, Redial with
Escalation, Consent Pre-flight, Preferred Channel Routing, Post-PTP
Follow-up.

## 5 · Single-borrower journey trace (2026-08-25)

The first cut — an 880px right-side drawer + entry points from the
borrower profile and the journey editor.

**Data model** — `src/data/borrower-traces.ts`. Hops carry channel +
events, branches, waits, call outcomes, human-campaign enrolments,
conversion events attached in-window. Helpers: `synthesizeTrace`,
`listJourneysForBorrower`, `listBorrowersInJourney`.

**BorrowerTraceDrawer** (`borrower-trace-drawer.tsx`):

- Left: mini-map with numbered hops, current step pulsing, per-hop
  conversion badge.
- Right: step timeline with per-step message-event chips (SENT /
  DELIVERED / OPENED / CLICKED), branch chip, wait duration, call
  outcome, conversion badges, "View the exact message this borrower
  received" link.
- Header: identity + status + Steps / Conversions / Recovered / Outstanding.

**Entry points**:

- New `/borrowers/[id]` profile with a Journeys section listing enrolments
  + Trace buttons.
- Journey canvas overflow menu → "Trace a borrower" → `BorrowerTracePicker`
  (search over enrolled borrowers) → drawer.

## 6 · Journey analytics v2 (2026-08-26) — commit [`c25987e`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c25987e)

Three-part extension: settings, per-node drill-down, business impact.

### 6.1 Journey Settings

- New `src/data/journey-settings.ts`: per-journey overrides on the
  workspace conversion-event roster (`enabled` / `windowDays` / `model` /
  `priority` / `amountSource`) + configurable business-metric roster +
  per-journey cost inputs.
- **New page** `/journeys/[id]/settings` with two tabs:
  - **Conversion events** — priority (primary/secondary) + window + model
    + amount source + enabled toggle.
  - **Business metrics** — 13-source catalogue
    (`conversions.count / conversions.aed / conversions.event /
    conversions.event_aed / cost.total_aed / cost.per_conversion_aed /
    impact.net_aed / impact.uplift_pct / flow.enrolled / flow.active /
    flow.conversion_rate / flow.time_to_convert_p50 / p90`), per-tile
    label + accent + format, drag-order, enable, delete + Add metric +
    Reset to default.
- Cost inputs pinned below both tabs (SMS per-segment, AI-call per-minute
  + avg minutes).
- Reachable from editor overflow ("Conversion events + business metrics")
  and a primary Settings button on the report toolbar.

### 6.2 Per-node drill-down modal

- New `src/data/journey-analytics.ts` — `buildNodeBorrowerList` +
  `buildNodeBreakdown`. Node classifier walks type / blockType / label
  with fallbacks (exact id → label → kind).
- New `src/components/journeys/node-drilldown-modal.tsx` — opens on any
  per-node breakdown row click. Node-type-aware metric strip:
  - Message: **Delivered / Opened (email only) / Clicked / Converted**
  - Call: **Connected / RPC / PTP captured / No answer**
  - Split: **branch distribution bar chart**
  - Wait: **Currently waiting / median hours**
  - End: **Ended here**
- Search over name / id / phone / product / Emirates ID. Filter chips per
  state (Passed / Waiting / Failed / Skipped / In progress) with live
  counts. Per-borrower rows with message-event / call-outcome / branch /
  wait / end chips. Trace + Profile + CSV export.

### 6.3 Aggregate analytics

- `buildDropOffFunnel` — per-stage reached + exited across the seeded
  template.
- `buildBreakdowns` — groups by DPD segment, inferred lender, channel
  used.
- `buildJourneyAggregate` — enrolled / converted / uplift vs holdout /
  cost / net impact / time-to-convert p50+p90 + 6-bucket histogram.
- `buildPerEventFired` + `computeBusinessMetric` — resolve a
  `BusinessMetricConfig` against the aggregate.
- New `aggregate-analytics-sections.tsx` with four exports:
  `DropOffFunnel`, `TimeToConvertDistribution`, `Breakdowns`,
  `ConfigurableBusinessMetricsBand`.

**Wired into the report page** — configurable metrics band replaces the
three hardcoded PTP/RPC/Revenue tiles. Drop-off + time-to-convert +
breakdowns sit between conversion events and per-node breakdown. Per-node
rows are clickable (cursor + hover + trailing arrow) and open the
drilldown modal.

## 7 · Per-node analytics tab in the canvas node inspector (2026-08-26) — commit [`4e28285`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/4e28285)

**Canvas run picker** — new chip in the top-right toolbar next to the
analytics range chip. Shows "Analytics · pick run" until picked; then
displays label + age. Popover with "Aggregate (no run selected)" and 5
seeded runs (Manual / Scheduled (cron), one may be RUNNING, rest
COMPLETED, each with status pill + age + enrolled/resolved counts).

New `src/data/journey-runs.ts` — `JourneyRun` shape (id, status,
trigger, label, enrolled/resolved counts, timestamps). Deterministic
per-journey seed produces 5 runs. `listRunNodeBorrowers()` samples a
per-run subset of enrolled borrowers so different runs show different
cohorts.

**Analytics tab** on every node inspector, after Advanced:

- **Run header**: Manual / Scheduled chip + RUNNING/COMPLETED pill + age
  + enrolled/resolved counts.
- **Node-type-aware metric strip** (same shape as the report drill-down).
- **Search borrower** input + **filter chips per state** with live counts
  + **CSV export**.
- **Per-borrower list** with state chip, DPD + product context,
  timestamps shifted into the run's window, message-event chips
  (SENT / DELIVERED / OPENED / CLICKED), call outcome / branch / wait /
  end chips, **Trace** button (opens single-borrower drawer), **Profile**
  link.
- Empty state prompts the author to pick a run.

Wired: `journeyId` + `selectedRunId` props threaded through
`NodeConfigPanel` from the canvas.

## 8 · Canvas polish (2026-08-26) — commit [`0669e8d`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/0669e8d)

**Removed floating number pills** from canvas nodes (`NodeCountPillOverlay`)
— the small `2.2k` / `1.7k` badges were visually distracting. Per-node
analytics now lives in two dedicated surfaces (Analytics tab + report
drill-down), so the canvas can stay focused on the flow itself.

## 9 · Borrower Journey Tracker report (2026-08-26) — commit [`61f0ed4`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/61f0ed4)

New Reports surface. Full-page presentation of the borrower's entire
progress through a journey — every node they hit and, crucially, **what
they did after each action node**.

**New routes**

- `/reports/borrower-tracker` — searchable index of every borrower with
  journey count + lifetime AED recovered per row.
- `/reports/borrower-tracker/[id]` — the tracker itself.

**Borrower header** — identity, deal / lender, current status ("In
journey X at Y", "Converted", or "Cross-journey lifecycle view"),
outstanding + lifetime recovered.

**Journey tabs** — "All journeys" cross-view + one per journey with its
status pill.

**Single-journey view** — mini map (numbered nodes, current step pulsing,
per-hop conversion badge) + full-height step timeline.

**Action-response pairing** on every step:

- **Send Email**: OUTREACH row (channel + template + subject) → chip
  ladder (`Sent · Delivered · Opened · Clicked · Pay now`) → narrative
  outcome ("borrower engaged with the email CTA" / "no response yet") →
  link to the exact snapshot.
- **Send SMS**: same but drops Opened; clicked chip shows the short
  link (`cg.link/pay`); snapshot link notes segments + encoding
  recorded.
- **Send WhatsApp**: `Sent · Delivered · Read · Clicked`.
- **AI Call**: OUTREACH row (duration) → `Dialed · Connected · RPC · PTP
  captured` (or Busy / No answer / Voicemail / Dropped) → link to the
  call transcript in Call History
  (`/call-history?borrower=…&at=…`).
- **Condition/split**: branch taken + attribute value that decided it.
- **Wait**: from → to timestamps + duration.
- **End**: outcome tag + previous step exited from.

Conversion events inline: `Conversion: <event> · AED · <time> ·
attributed to <node> in <journey>`.

Each step has a **Per-node aggregate** link opening the journey report so
authors can jump from one borrower's step to the aggregate across every
borrower who hit that node.

**Cross-journey view** — chronological stack of every journey the
borrower has been in; each journey renders as its own timeline card,
prefaced by a KPI band (steps / conversions / recovered / first enrolment).

**Entry points** — Reports hub featured card, Borrower profile "Open
full tracker" button, node drill-down modal "Tracker" button.

---

# Composer

## 1 · Variations UI overhaul (2026-08-03) — commit [`4dcfd17`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/4dcfd17)

Rewrote the A/B/n variations surface.

- **Browser-tab strip** — each tab = variation, with letter-chip avatar +
  subject preview + editable split %. Deletable when >1.
- **Per-variation accent palette** — teal / violet / amber / sky / rose /
  emerald (rotates by index).
- **Diff dots vs A** — small colored dots when a variation differs from
  A on subject / sender / template.
- **Inline rename** — double-click a tab label to edit.
- **Sonner toast** on switch.
- **Full authoring stack per variation** — subject / preheader / body /
  emailMode / richTemplateId / richSlotValues / emailBlocks /
  senderProfileId + custom from-name / email / reply-to.

**Merged panel + editor content** (2026-08-25) — [`d26610c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/d26610c)

The tab strip + editor content live inside **one continuous container**:
active-variation accent flows down the left edge and repaints in
lockstep across the tab, status row, and inner content stripe.

## 2 · Recurring campaigns (2026-08-03 → 2026-08-25)

- Types: `SendMode = "now" | "once" | "recurring"` +
  `RecurrenceFreq` and `RecurrenceEnd`.
- Send Options in the Confirm modal (moved from a side panel).
- Recurring campaigns page: series controls (pause / resume / stop),
  occurrences list, multi-variation render card, variation switcher,
  comparison table, holdout lift.
- **Trimmed to daily | custom** (2026-08-25) — dropped weekly / weekdays
  / monthly. Updated pickers, formatters, and seed data. Added helper
  copy under the picker. Recurring parent + occurrence copies live in
  the same queue as one-off messages; added Type filter (recurring /
  scheduled / immediate).

## 3 · Sender profile picker + Override From identity (2026-08-25) — commit [`c031d7c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c031d7c)

- **Removed both Manage → links** — the top-of-section pill and the
  popover-footer link. Nothing in the composer navigates away to
  lender-config.
- **Staged draft + Confirm button** on the Override From identity form:
  - Typing only mutates a local `draft` — the resolved sender identity
    doesn't flicker.
  - **Live Preview panel** shows what the resolved From line becomes if
    confirmed. Domain-mismatch warning is driven by the draft, so
    SPF/DKIM issues are visible *before* commit.
  - Status label: `Up to date` vs `Unsaved changes` (amber).
  - **Cancel + Confirm changes** buttons — both disabled until dirty.
    Confirm commits + fires sonner toast + auto-collapses the form.
- **Reset to profile** still available; also fires a toast now.
- **Draft syncs on prop change** so variation switches keep the panel
  consistent.

## 4 · Send Options in the Confirm modal (2026-08-03)

Moved the entire Send Options block into the confirm dialog when the user
clicks Send. Send blocker validates **per-variation** sender profile
(fixes a false positive where sender was set on the variation but not
campaign-level).

## 5 · Unified message previews (2026-08-25) — commit [`d26610c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/d26610c)

Single component the Composer and Journey Builder Send-node inspectors
both render.

- **`src/lib/sms-encoding.ts`** — GSM-7 / GSM-7 extension / UCS-2
  detector + segment math (160/153 GSM-7, 70/67 UCS-2) + RTL heuristic
  (Arabic / Hebrew glyph detection).
- **`src/components/shared/sms-device-mockup.tsx`** — iOS + Android
  device shells (status bar + chat header + RTL bubble + tracked-link
  envelope). Live segment counter + **UCS-2 amber warning** that names
  the first three non-GSM triggers and quantifies the carrier-cost
  impact.
- **Taller phone** (2026-08-25) — iOS gained a Dynamic Island stub +
  home indicator; Android gained a punch-hole camera + gesture bar.
  Bubble region 140px → 440px min-height so the aspect ratio reads as a
  real phone (~9:19.5).
- **`src/components/shared/message-preview.tsx`** — email + SMS +
  WhatsApp with RTL awareness on subject / preheader / body.
- **Composer preview panel** delegates to `MessagePreview` (dropped
  three local card copies).
- **Journey Builder** node-config-panel adds `NodeMessagePreview` under
  `send_email / send_sms / whatsapp` — same device mockup + sample
  borrower picker + tracked-link envelope.
- **Searchable borrower picker** (2026-08-25) — replaces the flat
  six-item `<select>` in `NodeMessagePreview` with a popover that
  searches every borrower (name / id / phone / product / Emirates ID).

## 6 · Per-message conversion analytics (2026-08-26) — commit [`c031d7c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c031d7c)

- Composer message analytics page `/email-generator/[id]` gained a
  **CampaignConversionsSection** using the shared conversion-events
  config + `buildCampaignReport` helper — every enabled event shows
  Fired + Recovered, with an "Edit events + attribution" link back to
  Reports → Conversion setup so windows edit through in real time.

---

# HTML builder (rich email templates)

The block-based HTML email builder — the full editor lives at
`/email-generator/builder/[id]` and is the shared authoring surface for
every rich HTML template that shows up in the Journey Builder Send-node
picker, the Composer, the Reports funnel, and the `/templates` library.

This section documents the **entire builder end-to-end**, not just the
past month.

## Architecture at a glance

- **Three-pane app shell**: BlockPalette (left) · BuilderCanvas (centre)
  · PropertiesPanel (right), plus a top BuilderToolbar and a bottom
  PlaybookLintBar.
- **Document model** (`src/data/builder-blocks.ts`): a `BuilderDocument`
  is an ordered list of `BuilderRow`s. Each row has 1 or 2 columns.
  Each column holds `BuilderBlock`s of a typed kind. Rows and blocks
  can be locked. Blocks can carry a `ConditionalConfig` for
  attribute-driven visibility.
- **Twelve block kinds**: `text · image · button · payment_link ·
  divider · spacer · table · social · video · custom_html ·
  saved_module · ai_conditional`.
- **Doc-level state**: language (`en / ar / bilingual`), direction
  (`ltr / rtl`), pageBg, contentWidth.
- **Undo / redo** with `history[]` + `future[]` stacks captured on every
  `commit()`. `dirty` tracked separately so the top-right pill can
  show "Unsaved changes" vs "Saved N ago".
- **Persistence** in prototype terms is in-memory; the sample docs and
  seeded starter docs come from
  `src/data/builder-blocks.ts::SAMPLE_DOCS` and
  `src/data/starter-docs.ts` respectively.

## 1 · Block palette (left rail)

`src/components/composer/builder/block-palette.tsx` (~321 lines)

- Renders the `BLOCK_CATALOG` from `builder-blocks.ts`.
- **Featured blocks pinned at the top**: Text, Image, Payment link,
  Saved module.
- Live search filter over name + description.
- Each palette item is **HTML5-draggable** onto the canvas; drop position
  drives insert (`onInsertBlockAt`) and a `paletteDragActive` flag
  lights up drop zones.
- Also supports **click-to-insert** (`onInsert`) — the new block lands
  after the currently-selected block, or at the end.
- **Saved modules subsection** — pulls from `src/data/saved-modules.ts`
  and offers reusable header / footer / payment_cta / compliance /
  greeting modules to drop in.

## 2 · Builder canvas (centre)

`src/components/composer/builder/builder-canvas.tsx` (~570 lines)

- Renders each row with its columns; each column is a drop target
  (`col`, `rowId`, `index`) so palette blocks can be inserted precisely.
- **Row-level chrome** in author mode: bg picker, padding stepper, RTL
  toggle, Add row / Delete row / Duplicate row buttons; hidden in
  `previewMode`.
- **Block chrome** (via `block-renderers.tsx`): drag handle,
  quick-delete X, `Lock` badge on locked blocks, conditional-branch
  indicator on blocks with a `ConditionalConfig`.
- **Selection**: clicking a block sets `selectedBlockId`; the block
  gains a primary ring. Selection also drives the properties panel.
- **Device toggle**: `desktop | mobile` — mobile clamps the canvas
  width and swaps `<img>` sizing to mobile-safe pixels.
- Exports `insertBlockIntoDoc` + `makeBlock` for the parent page + AI
  dialogs to use the same insert helpers.

## 3 · Block renderers

`src/components/composer/builder/block-renderers.tsx` (~348 lines)

One renderer per block kind. Each renders as inline-styled HTML so what
the author sees on the canvas matches what the borrower receives.

- **`text`** — HTML string; inline align (`left / center / right`) and
  fontSize. Merge tags stay as literal `{{...}}` at authoring time and
  resolve at send.
- **`image`** — src + alt + optional href + max width. Broken image
  fallback shows the `AlertCircle` icon.
- **`button`** — label + href + bg + text color + align.
- **`payment_link`** — the first-class trackable payment button. Points
  at `{{payment_link}}` which resolves per borrower at send. Carries a
  `conversionEvent` (`payment_initiated / ptp_captured /
  settlement_accepted`) so the send auto-attributes conversions when it
  fires. Optional subline (e.g. "Tap to pay AED {{amount_due}}").
- **`divider`** — horizontal line with configurable color + thickness.
- **`spacer`** — configurable vertical whitespace.
- **`table`** — headers + rows arrays; used for payment schedules or
  breakdowns.
- **`social`** — lender social icons row (Facebook / Twitter /
  LinkedIn / Instagram).
- **`video`** — thumbnail + play button overlay + href to the video.
- **`custom_html`** — raw HTML snippet, escape hatch for advanced
  authors.
- **`saved_module`** — embed from `savedModules` (header / footer /
  payment_cta / compliance / greeting). Renders the module's
  `previewHtml`. **Locked embeds** get a violet ring + lock icon and
  can't be edited inline in the embedding template.
- **`ai_conditional`** — two variants (A / B) that swap based on a
  runtime rule; author sees a labelled tab strip inside the canvas
  ("Show variant A if paying customer, else variant B").

## 4 · Properties panel (right rail)

`src/components/composer/builder/properties-panel.tsx` (~435 lines)

- **Page properties** (no block selected): document language,
  direction, page bg, content width, brand-kit picker.
- **Block properties** (block selected): per-kind form.
  - Text: rich-text controls, align, fontSize, "Rewrite with AI" (opens
    `InlineAiDialog`).
  - Image: src, alt, href, width picker.
  - Button + Payment link: label, href, bg + text color, align,
    conversion event (payment_link only).
  - Divider / Spacer / Table / Social / Video / Custom HTML — their own
    lightweight forms.
  - AI Conditional: rule label, plus a Variant switcher.
- **Universal per-block actions** at the top: Duplicate, Move up, Move
  down, Delete, **Lock/Unlock** toggle (`Lock ↔ Unlock` icon), **Set
  conditional** button (opens `ConditionalDialog`), **Insert merge tag**
  button (opens `MergeTagDialog`).

## 5 · Toolbar (top)

`src/components/composer/builder/builder-toolbar.tsx` (~224 lines)

- Back to templates library link.
- **Template name** (inline-editable input).
- **Status pill** — Draft / In review / Active / Archived. Colors + labels
  come from `template-versions.ts`.
- **Undo / Redo** (Cmd+Z / Cmd+Shift+Z).
- **Device toggle** — desktop / mobile icons.
- **Language switcher** — En / Ar / Bilingual. Switching translates the
  doc via `translateDocToArabic` / `translateDocToBilingual`; an English
  snapshot is captured before leaving EN so authors can return to their
  original copy.
- **Composer GPT** (Sparkles button) — opens the AI-generation dialog.
- **A/B test** button — opens `AbTestDialog`.
- **Version history** button — opens `VersionHistoryDialog`.
- **Library** button — opens the saved-modules library.
- **Preview** button — opens `PreviewTestDialog` (multi-device + dark-mode
  preview).
- **Save + Approval CTAs**:
  - Draft → `Save as template` (Save icon)
  - Draft → `Submit for review` (Send icon)
  - In-review → `Approve` (CheckCircle2 icon)
- **Unsaved-changes pill** — "Saved N ago" vs "Unsaved changes"
  (amber).

## 6 · Playbook lint bar (bottom)

`src/lib/playbook-lint.ts` + `PlaybookLintBar` (in
`builder-dialogs.tsx`)

- Every document is linted against its **playbook** (from
  `src/data/playbooks-v3.ts`) — rules cover compliance, brand voice,
  length caps, forbidden words, mandatory disclaimers, RTL handling,
  DPD-bucket-specific escalation rules.
- Findings are returned as `LintFinding[]` with severity
  (`error / warning / info`), location (block id or "subject"/"body"),
  and a suggested fix.
- The bar renders inline at the bottom of the canvas: pass count +
  first N findings + expand to see all.
- **Composer GPT gate**: the playbook lint also runs as a pre-output
  gate on the AI generator — content that fails is regenerated with
  the failing rules fed back as a system prompt.
- **Templates list badges**: if a saved template now fails its own
  playbook (because the playbook was tightened after the template
  went live), the templates library flags it — visible on the list
  card.

## 7 · Dialogs

`src/components/composer/builder/builder-dialogs.tsx` (~1,373 lines)

- **ComposerGptDialog** — AI email generator. Prompt input, playbook
  scope, language, insert-mode (append / replace). Output goes through
  playbook lint gate. Inserts as rows into the doc.
- **InlineAiDialog** — rewrite the currently-selected text block.
  Presets: shorter / longer / friendlier / firmer / translate to
  Arabic. Diffs the old and new HTML.
- **MergeTagDialog** — categorised merge-tag picker (borrower / deal /
  loan / payment / journey / campaign). Insert appends to the currently-
  focused text or button.
- **ConditionalDialog** — attribute-driven visibility. AND/OR combiner
  + rule builder (attributeId + operator + values). `showWhenMatch`
  toggle.
- **PreviewTestDialog** — the "how it looks" moment. Renders in
  desktop / mobile / dark-mode / send-to-test-inbox. Uses the same
  `BuilderCanvas` with `previewMode=true`.
- **AbTestDialog** — wire this template to an A/B variant. Traffic
  split, winner metric, test window.
- **VersionHistoryDialog** — reads `templateAuthoring[templateId].versions`
  (newest first). Version label, timestamp, author, change summary,
  status transition.
- **CreateJourneyDialog** — from-template journey-blueprint picker.
  Choose a blueprint (Reminder 3-step / PTP recovery / Settlement
  push / etc.); pushes to `/journeys/new?from=composer&blueprint=…` with
  the template + playbook + audience carried over as query params.
- **PlaybookLintBar** — see §6.

## 8 · Data model (block schemas)

`src/data/builder-blocks.ts` (~443 lines)

Full typed shape (only key fields listed here):

```
BuilderDocument
  id
  rows: BuilderRow[]
  language: "en" | "ar" | "bilingual"
  dir: "ltr" | "rtl"
  pageBg
  contentWidth

BuilderRow
  id
  columns: 1 | 2
  columnsBlocks: BuilderBlock[][]   // one array per column
  bg?
  padding?
  dir?: "ltr" | "rtl"
  locked?

BuilderBlockBase
  id
  kind: BlockKind
  locked?
  conditional?: ConditionalConfig
  slotKey?

ConditionalConfig
  combine: "AND" | "OR"
  rules: ConditionalRule[]           // attributeId + operator + values
  showWhenMatch: boolean
```

Every block kind extends `BuilderBlockBase` with its own required
fields (see §3). `newBlockId()` and `newRowId()` are monotonic counters.

## 9 · Starter documents (`starter-docs.ts` + `builder-blocks.ts::SAMPLE_DOCS`)

Landing on `/email-generator/builder/new` runs a decision tree:

- If `?from=ai` was set (Composer inline AI generator), call
  `buildAiGeneratedHtmlDoc(lenderId, purpose, name)` — returns a
  **fully decorated email** (hero + spotlight + CTA + footer) already
  branded to the lender and tuned to the purpose.
- Else if `?purpose=…` was set (create-template wizard), call
  `buildStarterDoc(lenderId, purpose, channel, name)` — returns a
  **lean starter** for the purpose (payment_reminder / broken_promise
  / settlement / welcome / hardship / final_notice / ptp_confirmation)
  with the lender's greeting, saved header module, and locked footer
  already in place.
- Else (no context — user opened HTML builder from the composer inline
  CTA), call `newBlankDoc()` — one empty row, one column, blank canvas.

**Existing template edits** land on `getSampleDoc(builderDocId)` where
`builderDocId` is read from `templateAuthoring[templateId]`.

## 10 · Brand kits (`brand-kits.ts`)

- One `BrandKit` per lender. Fields: colours (primary /
  primaryText / secondary / background / surface / text / muted /
  success / danger / border), fonts (heading / body / optional
  cssImport), default header + footer HTML, logo URL.
- Applied automatically when the composer / builder is scoped to that
  lender.
- Per-block overrides always win — but the fallback is always the
  brand kit's palette.
- Seeded kits: Mashreq Bank (orange), Tamara (violet), CashNow (green),
  Emirates NBD (red), FAB (navy), plus a General fallback.
- `getBrandKitByLenderId(lenderId)` + `getBrandKitById(id)` accessors.

## 11 · Saved (synced) modules (`saved-modules.ts`)

- Reusable header / footer / payment_cta / compliance / greeting
  blocks.
- Authored once; embedding templates get the module by reference.
  Update the module → every template that references it updates.
- **Locked embeds** cannot be edited inline in the embedding template
  (violet ring + lock icon in the renderer).
- Palette exposes saved modules in a dedicated subsection; embed as
  `SavedModuleBlock { kind: "saved_module", moduleId }`.

## 12 · Template versioning + approval (`template-versions.ts`)

- `templateAuthoring[templateId]` carries `currentVersion`,
  `versions: TemplateVersionEntry[]` (newest first), `approval`
  (submittedBy + submittedAt + approvedBy + approvedAt +
  `selfApproved` governance flag), `builderDocId`, `playbookId`,
  `brandKitId`, `activeAbTestId`.
- Toolbar CTA transitions:
  - Draft → **Submit for review** → status = `in_review`, appended to
    `versions[]`, toast: "Compliance maker/checker — Rabab Abbas
    notified."
  - In-review → **Approve** → status = `active`, toast: "Now available
    in Journey Builder and the Composer message picker."
- Version-history dialog reads the last N entries; entries include
  free-text `changeSummary` + optional `statusTransition`.

## 13 · Language + RTL (`translate-builder-doc.ts` + `translations-ar.ts`)

- English is the canonical authoring language. Switching to Arabic or
  Bilingual runs `translateDocToArabic()` / `translateDocToBilingual()`.
- **`translateDocToArabic`**:
  - Walks every block, rewrites visible text via the `EN_TO_AR` phrase
    dictionary.
  - Injects RTL + `ARABIC_FONT_STACK` into inline styles.
  - Locked rows (lender header / footer / compliance modules) pass
    through untouched — those modules ship their own bilingual
    variants.
- **`translateDocToBilingual`**:
  - Duplicates each non-locked row into a two-column layout: EN on the
    left, AR on the right.
- **English snapshot** — the page captures the EN doc before leaving,
  so `language: "en" → "ar" → "en"` restores the authored copy
  verbatim (no reliable AR→EN reverse in the prototype).

## 14 · Journey Builder integration

The rich HTML builder is the target of the Journey Builder Send Email
node's template picker + the "Edit template" button. Recent changes
(see [Composer](#composer) and the sections below) tighten this loop:

- **Rename + prominence (2026-08-26)** — commit [`c031d7c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c031d7c)
  - "Open v3 builder" → **"Open HTML builder"** in the composer
    inline editor toolbar.
  - Rebuilt as a **primary-filled teal button** (`bg-primary`,
    `text-primary-foreground`, shadow, hover elevation) with an inline
    subtitle "blocks, rich layout, brand kit". Reads as a first-class
    CTA instead of a footer link.

- **Visual template picker in Journey Send nodes (2026-08-26)** —
  commit [`c031d7c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c031d7c)
  - Rebuilt `ComposerTemplatePicker` inside the Journey Builder Send-
    node inspector.
  - **Category chips** at the top: `All` / `HTML` (with Blocks icon)
    / `Plain text`, each with a live count. HTML gets primary tint,
    plain gets a muted tint.
  - **Live search** over name / lender / subject.
  - Flat `<select>` replaced by a **card list**. Each card carries a
    swatch (HTML → primary-tinted Blocks icon, plain → three neutral
    bars), the template name, an HTML / Plain badge next to it,
    lender + subject preview below.

- **Edit template button (2026-08-26)** — commit [`c031d7c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c031d7c)
  - Appears when a template is picked in a Send node. Routes to
    `/email-generator/builder/{id}` for HTML templates or
    `/templates/editor?id={id}` for plain-text ones. Opens in a new
    tab with an "opens in a new tab" hint.

- **Live HTML preview inside Send-node picker (2026-08-26)** — commit
  [`43063cb`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/43063cb)
  - Rebuilt `ComposerTemplatePreview` so it renders the actual email
    JSX (from `RichEmailTemplate.render`), not a text stub, when the
    picked template is an HTML rich template.
  - Looks up the `RichEmailTemplate` by id via `getRichTemplate(id)`.
  - Mounts `template.render({ slots: template.defaultSlots,
    interactive: false })` inside a `bg-white` container.
  - Scaled 0.44× (`transform: scale(0.44)`; width `227%` so the
    scaled box fills the sidebar) with `max-h-[380px] overflow-y-auto`
    so long templates scroll inside the panel.
  - Plain-text templates keep the line-clamped text preview.

- **Composer registry adapter (existing, extended)** —
  `src/data/composer-registry-adapter.ts` unifies rich HTML + plain
  templates + playbooks under a single `ComposerTemplateEntry` shape:
  - `source: "rich" | "plain"` — drives the badge and picker
    categorization.
  - `getComposerTemplatesForChannel(channel)` combines both sources;
    rich wins on duplicates.
  - `encodeTemplatePrefill(input)` — base64 blob for
    `/email-generator/builder/new?prefill=…` so authors starting a
    template from a journey Send node carry over the channel + a
    starter name.

## 15 · What is NOT built

- No true HTML export/download (send-side email HTML is generated at
  send-time on the back end; the prototype simulates the shape).
- No Litmus / Email on Acid deliverability preview integration —
  `PreviewTestDialog` shows desktop / mobile / dark-mode approximations
  only.
- No per-block A/B test — A/B is doc-level via `AbTestDialog`.
- No real-time collaborative editing.
- No template forking / duplication history graph — versioning is
  linear.
- No component-of-component nesting (blocks inside `saved_module`
  embeds are not recursively editable — the module is atomic).

## 16 · File map

- `src/app/(app)/email-generator/builder/[id]/page.tsx` (~462 lines) —
  the app shell, state, dialogs, save + approval CTAs, journey handoff.
- `src/components/composer/builder/builder-canvas.tsx` (~570 lines)
- `src/components/composer/builder/block-palette.tsx` (~321 lines)
- `src/components/composer/builder/block-renderers.tsx` (~348 lines)
- `src/components/composer/builder/builder-toolbar.tsx` (~224 lines)
- `src/components/composer/builder/properties-panel.tsx` (~435 lines)
- `src/components/composer/builder/builder-dialogs.tsx` (~1,373 lines)
- `src/data/builder-blocks.ts` (~443 lines)
- `src/data/starter-docs.ts` — starter + AI-generated builders.
- `src/data/brand-kits.ts` (~207 lines)
- `src/data/saved-modules.ts` — reusable module library.
- `src/data/template-versions.ts` — authoring + approval metadata.
- `src/data/playbooks-v3.ts` — voice + ruleset.
- `src/data/translations-ar.ts` — EN → AR phrase dictionary + font
  stack.
- `src/lib/playbook-lint.ts` — lint engine (used by canvas + GPT
  gate + templates list).
- `src/lib/translate-builder-doc.ts` — EN → AR / bilingual transform.
- `src/data/composer-registry-adapter.ts` — cross-source template
  picker feed.

---

# Shared analytics + Reports

## Reports section (2026-08-25)

- New route tree: `/reports` (hub), `/reports/conversions` (setup),
  `/reports/campaigns/[channel]` (list), `/reports/campaigns/[channel]/[id]`
  (detail), `/reports/borrower-tracker` (search),
  `/reports/borrower-tracker/[id]` (tracker detail).
- **Conversion events** — `src/data/conversion-events.ts`. Six seeded
  events (Paid, PTP created, PTP kept, Partial payment, Settlement
  accepted, RPC) with per-event window + attribution model.
  localStorage-backed store, defined once, applies across email / SMS
  / journeys.
- **Campaign reports** — `src/data/campaign-reports.ts` aggregates the
  seeded messages list into per-campaign reports: funnel (SMS omits
  opens per PRD), linkClicks, failureReasons, opt-outs, spam,
  variation/segment/lender breakdowns, 14-day series, conversion rows,
  borrower drill-down, plus an SMS-specific carrier-cost breakdown
  (segments × per-segment × recipients, GSM-7 vs UCS-2).
- **Detail report** — funnel band (Apple Mail Privacy caveat tooltip on
  email opens), per-link clicks or failure reasons, SMS carrier-cost
  card with UCS-2 warning, 14-day bar chart, three breakdown tables,
  borrower drill-down linking straight into the profile → trace.

---

# File map + build state

## New files (past 30 days)

**Journey Builder**

- `src/data/borrower-traces.ts`
- `src/data/journey-alerts.ts`
- `src/data/journey-analytics.ts`
- `src/data/journey-runs.ts`
- `src/data/journey-settings.ts`
- `src/data/campaigns-seed.ts`
- `src/data/event-trigger-catalog.ts`
- `src/data/filter-registry.ts`
- `src/data/components.ts`
- `src/data/composer-registry-adapter.ts`
- `src/lib/prompt-attribute-lint.ts`
- `src/lib/simulation.ts`
- `src/lib/simulation-runner.ts`
- `src/components/journeys/simulate-drawer.tsx`
- `src/components/journeys/simulator-outcome-config.tsx`
- `src/components/journeys/simulation-view-chip.tsx`
- `src/components/journeys/simulation-trace-modal.tsx`
- `src/components/journeys/workshop-panels.tsx`
- `src/components/journeys/nodes/node-error-badge.tsx`
- `src/components/journeys/nodes/component-instance-node.tsx`
- `src/components/journeys/save-as-component-modal.tsx`
- `src/components/journeys/component-instance-panel.tsx`
- `src/components/journeys/instance-inner-node-editor.tsx`
- `src/components/journeys/borrower-trace-drawer.tsx`
- `src/components/journeys/borrower-trace-picker.tsx`
- `src/components/journeys/node-drilldown-modal.tsx`
- `src/components/journeys/node-analytics-tab.tsx`
- `src/components/journeys/run-picker.tsx`
- `src/components/journeys/aggregate-analytics-sections.tsx`
- `src/app/(app)/journeys/[id]/report/page.tsx`
- `src/app/(app)/journeys/[id]/settings/page.tsx`
- `src/app/(app)/components/[id]/edit/page.tsx`

**Composer + shared previews**

- `src/lib/sms-encoding.ts`
- `src/components/shared/sms-device-mockup.tsx`
- `src/components/shared/message-preview.tsx`
- `src/components/composer/variations-panel.tsx`
- `src/components/composer/sender-profile-picker.tsx`
- `src/components/composer/recurring-series-strip.tsx`
- `src/components/composer/creation-sheets.tsx`
- `src/components/composer/export-menu.tsx`
- `src/components/composer/funnel-segment-cta.tsx`

**Reports (all new)**

- `src/app/(app)/reports/page.tsx`
- `src/app/(app)/reports/conversions/page.tsx`
- `src/app/(app)/reports/campaigns/[channel]/page.tsx`
- `src/app/(app)/reports/campaigns/[channel]/[id]/page.tsx`
- `src/app/(app)/reports/borrower-tracker/page.tsx`
- `src/app/(app)/reports/borrower-tracker/[id]/page.tsx`
- `src/data/conversion-events.ts`
- `src/data/campaign-reports.ts`

**Design system**

- `src/tokens/colors.ts`
- `src/tokens/typography.ts`

**Borrower profile** (backing the tracker)

- `src/app/(app)/borrowers/[id]/page.tsx`

## Modified files (highlights)

- `src/components/journeys/journey-canvas.tsx` — the epicentre (+ ~2.5k
  lines net).
- `src/components/journeys/node-config-panel.tsx` — Analytics tab,
  Composer registry adapter, redial policy, per-variation preview.
- `src/components/journeys/node-palette.tsx` — Components section.
- `src/components/journeys/block-configs.tsx` — event tooltips, filter
  role scaffolding, human campaign, redial.
- `src/data/journeys.ts` — added `trigger_human_campaign` block.
- `src/components/composer/editor-panel.tsx` — HTML builder CTA,
  VariationsPanel wrapping, per-variation editor content.
- `src/components/composer/preview-panel.tsx` — delegates previews to
  shared component, added Send confirm modal.
- `src/app/(app)/email-generator/[id]/page.tsx` — CampaignConversionsSection.
- `src/data/messages.ts` — RecurringCadence trimmed to daily/custom,
  variation + holdout + recurring metadata.

## Build state

- `npm run build` passes. All routes generate cleanly.
- Live at [`cleargrid-v1-jbfull.vercel.app`](https://cleargrid-v1-jbfull.vercel.app).
- Playwright verification captures live under `screenshots/features-2026-08/`
  (ignored by git; kept locally for regression comparison).

## Commit index (past 30 days · chronological)

| Commit | Date | Summary |
|---|---|---|
| [`4dcfd17`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/4dcfd17) | 2026-08-03 | Composer variations UI, recurring campaigns, sender-profile overrides, journey/simulator/components work |
| [`6bf74ec`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/6bf74ec) | 2026-08-03 | Missing new files: variations-panel, sender-profile-picker, simulator, components, journey GPT, tokens, playbooks |
| [`4425c96`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/4425c96) | 2026-08-03 | `JOURNEY-BUILDER-CHANGES-10-DAYS.md` consolidated changelog |
| [`d26610c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/d26610c) | 2026-08-25 | Unified message previews, single-borrower journey trace, Reports with conversion tracking |
| [`c031d7c`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c031d7c) | 2026-08-26 | Taller phone, HTML builder rename, template card picker, search borrower picker, edit-template button, conversion analytics |
| [`43063cb`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/43063cb) | 2026-08-26 | Render actual HTML template in Send-node preview when a rich template is picked |
| [`c25987e`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/c25987e) | 2026-08-26 | Journey analytics v2: settings, per-node drill-down, drop-off, breakdowns, impact tiles |
| [`4e28285`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/4e28285) | 2026-08-26 | Per-node Analytics tab in the canvas node inspector, driven by a canvas run picker |
| [`0669e8d`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/0669e8d) | 2026-08-26 | Remove floating number pills from canvas nodes |
| [`61f0ed4`](https://github.com/asadsiddiqi205/cleargrid-v2/commit/61f0ed4) | 2026-08-26 | Borrower Journey Tracker report — full-page action-response timeline |

## Parked items

**Components spec**

- No nesting (v1 nesting cap = 0)
- No parameters — overrides are the parameterization mechanism
- No draft/publish separation — master editor is live-editing
- No rollback — version history is read-only
- No cross-workspace sharing
- No component analytics
- No version pinning on instances

**Simulator spec**

- No deterministic execution engine — runner is approximate
- No cross-journey interaction simulation
- No publish gate on simulation (soft nudge only)
- No comparison mode (A vs B cohorts, v1 vs v2)
- No historical simulation storage beyond the last one per journey
- No server-side sharing (deep-links per-browser via localStorage)

**Journey GPT** — deferred in the workshop-feedback round; the existing
panel still functions unchanged.

**Open engineering questions**

- Audit-log surfacing for component master edits — prototype doesn't
  wire component publishes into the per-journey audit log.
- Cross-workspace component IDs — prototype uses raw string IDs; a real
  backend needs namespacing.
- In-flight journey behavior on master change — existing enrolled
  borrowers presumably continue with the old config; confirm with
  engineering.
- Call History detail — prototype links use
  `/call-history?borrower=…&at=…`; the actual transcript view is a
  placeholder page.

