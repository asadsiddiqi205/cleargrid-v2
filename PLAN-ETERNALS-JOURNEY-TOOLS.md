# Replication Plan · Eternals (QA Journey Tools) → Command

**Source:** https://eternals.cleargrid.ai (QA-owned)
**Target:** ClearGrid Command prototype — Journey Builder
**Purpose:** Fold every tool below into a single **Validation** surface inside the Journey Builder, retiring the current simulator and adding capabilities we don't yet have. Everything QA does today should be reachable from the journey they're already looking at.

---

## The seven tools · at a glance

| # | Tool | One-liner | Reachable from |
|---|---|---|---|
| 1 | **Simulator** | Dry-run a journey's PREDICTED flow over a sample of the population. Renders full canvas with borrower counts on every node + branch label. | Journey → toolbar → "Dry-run" |
| 2 | **Validator** | REAL vs predicted regression. Fetches audience snapshot, then compares each borrower's actual path to the prediction, node-by-node, branch-by-branch. | Journey → toolbar → "Validate" |
| 3 | **Audiences** | Resolve any tenant audience against BorrowerDeals; each row shows the borrower's value for every filter attribute. | Segments module, plus a shortcut from Journey → trigger node |
| 4 | **Sync** | Filter deals by lender + timestamp window + attribute selection; see exactly what values a sync run wrote per deal, with distinct-value counts. | Lender-config module + shortcut from journey audit log |
| 5 | **Journeys check** | Daily "did each tracked journey run today, and how many PTPs did it produce?" board. Slack-alert integration. | Reports → new Health page |
| 6 | **Check PTP dates** | Find deals whose PTP-date attributes are empty. Count + matching deal ids. | Reports → new Health page |
| 7 | **DNC check** | Paste phones, get the subset that's on the ClearVoice DNC list. | Sender profiles page + shortcut from Trigger AI Call node |

---

## 1 · Simulator (retires our current one)

**What Eternals does**

- Header row: **Journey selector · Refresh · Sample-size selector · Simulate · Demo** (plus tenant pills ENBD / Agency).
- **Sample sizes**: `Fast · 6k` / `Balanced · 20k` / `High · 50k` / `Exact · whole audience (slow)`.
- Deal-header banner: `DEAL · <tenant name> · <N> NODES · 👤 <audience size> members`.
- Right-side **aggregate panel**: AI CALLS · N NODES — for every AI Call node, count of `borrowers · attempts (incl. redials)` with a Total row.
- **Canvas with predicted counts on every node**:
  - Every node card has a top-left pill showing the count that reaches it (e.g. `▲ 29,900`).
  - Every branch on a split has a labelled edge with count (`YES 27,193` / `NO 2,700` in teal/red pills).
  - Wait nodes show `EVENT n / TIMEOUT n` on the outgoing edges.
  - End nodes show `N ended here` as a subline.
  - Global exit triggers rendered separately at the bottom.
- **Color legend** in the corner: Trigger (green) · Condition (violet) · Action (teal) · Flow / Exit (yellow) · Global exit (red).
- Timing shown in the corner (e.g. `(3.6s)`).
- Demo button loads a bundled offline sample so the tool is usable without an API round-trip.

**Where we stand vs the target**

Our current simulator (`src/components/journeys/simulate-drawer.tsx` + `simulation-runner.ts`) is a drawer with a cohort builder, per-node results, outcome-config, trace drill-down. It's fine for what-if hypotheticals but misses the primary Eternals affordance: **canvas overlay of predicted borrower counts on every node + every branch label**.

**Replication plan**

1. **Rename** the current drawer to "Cohort simulator (what-if)" and keep it — it's still useful for hypothetical cohorts.
2. **Build** a new `DryRunSimulator` that does what Eternals does:
   - New route/entry: journey editor toolbar → **Dry-run** button (next to Test run + Publish).
   - Sample-size selector matching Eternals verbatim (Fast · 6k / Balanced · 20k / High · 50k / Exact · whole audience).
   - "Demo" button that loads a hardcoded offline sample so the button always works.
   - Simulation timing shown next to the button.
   - **Canvas overlay** — reuses the existing ReactFlow canvas but decorates every node with a top-left count pill + labelled outgoing edges. When a simulation is loaded, edges get YES/NO/EVENT/TIMEOUT labels + counts.
   - **Right-side aggregate panel** — grouped by node kind. Cards:
     - AI Calls: rows `template · borrowers · attempts (incl. redials)` + a Total.
     - Send Email / SMS / WhatsApp: rows `template · borrowers · messages sent`.
     - Human campaigns: rows `campaign · enrolled`.
     - Costs: SMS segments (GSM-7 vs UCS-2) + AI-call minutes + total AED.
   - **Color legend** in the bottom-left corner using our category colors (Entry / Condition / Action / Flow / Exit).
   - **Node metadata** in a deal-header ribbon at the top: journey name · lender · N nodes · audience size.
3. **Runner extension** — `simulation-runner.ts` needs to compute per-edge counts (currently only per-node). Store them on `SimulationResult.perEdge`.
4. **Kill the count pills we removed earlier** — this replaces them with a proper overlay only shown when a dry-run is loaded.

Files to touch: `simulate-drawer.tsx` (extend), `simulation-runner.ts` (add per-edge counts), `journey-canvas.tsx` (mount the overlay when a run result is set), new `dry-run-toolbar-button.tsx`.

---

## 2 · Validator

**What Eternals does**

Four-stage regression workflow — pointedly labelled **Read-only — this tool never runs the journey**. The dev triggers the journey; the tool only fetches + compares.

- **Step 0 · Account** — tenant selector (ENBD / Agency).
- **Step 1 · Audience** — pick a journey, choose `Count (first N members)` (default 100), click **Fetch Audience**. Snapshots the entry-segment members' data.
- **Step 2 · Validate Borrowers** — button that fetches each borrower's debug-borrower path and validates it against the prediction. Says: "If you haven't fetched the audience yet, this does it first."
- **Step 3 · Real executed flow** — paste a single Borrower UUID / deal id and click **View real flow →**. Opens the Simulator canvas and **highlights the exact nodes this borrower travelled**:
  - Redial loops coloured **per pass** (1st green, 2nd amber, 3rd blue, 4th violet).
  - Failed nodes show **red**.
  - The node they're currently parked at shows a **dashed blue ring**.

**Replication plan**

New surface inside the Journey Builder:

1. **Toolbar button "Validate"** next to Dry-run + Publish + Test run.
2. Opens a **`ValidatorDrawer`** with three stacked sections:
   - **1 Audience snapshot** — journey (pre-filled), count input, "Fetch audience" button. Shows a snapshot table when done (borrower id, name, phone, DPD, product, ...).
   - **2 Validate borrowers** — "Validate audience" button. Shows a results table: each borrower with a match/mismatch chip and a diff (predicted node vs actual node).
   - **3 Trace one borrower** — deal-id input + "View real flow →" button. Renders the current canvas with the **per-pass loop colouring** described above.
3. **Canvas mode: "trace"** — when a validator trace is active, the canvas renders in dimmed mode with the borrower's actual path lit up. Each pass through a loop gets its own colour (green → amber → blue → violet). Failed hops render red; the current node gets a dashed blue ring.
4. **Reuses the existing single-borrower trace synthesizer** from `borrower-traces.ts` — extends it with loop-pass detection so multi-pass hops (redials) get separated per pass.
5. Wire from `/reports/borrower-tracker/[id]` too — "Validate this trace" button that opens the journey with the borrower already loaded.

Files: new `validator-drawer.tsx`, extend `borrower-traces.ts` (loop-pass detection), extend `journey-canvas.tsx` (trace-highlight mode).

---

## 3 · Audiences

**What Eternals does**

- Header: **tenant pills · Refresh · list-size selector (200 default) · reference-date · Run audience**.
- Left rail: **search audiences** input + list of audiences for the current tenant.
- Right pane (post-run): each row = one borrower, showing the borrower's value for every filter attribute the audience uses. **Links into Command** for each row.
- Use case: "does this audience actually resolve to the people we think it does?"

**Replication plan**

1. New route `/segments/audiences` in the Segments module. Not a separate top-level surface — reuses the segment filter engine we already have.
2. Left rail — list of tenant audiences with a search input.
3. Right pane — after clicking Run:
   - Row = borrower
   - Columns = every filter attribute the audience uses (dynamic — read the audience's filter graph).
   - "Open in Command" link on each row → `/borrowers/[id]` in the prototype (= the borrower profile we already have).
4. `list-size` selector (100 / 200 / 500 / 1000) capped so we don't accidentally hydrate 500k rows.
5. **Also add a shortcut from the Journey Builder's trigger node inspector**: when the trigger is Segment Membership, a "Resolve this audience →" button opens this view for the picked segment.

Files: new `/app/(app)/segments/audiences/page.tsx`, entry-point button in the segment-trigger config.

---

## 4 · Sync

**What Eternals does**

- Header: **list-size selector (500 default) · Show values**.
- Left rail:
  - **LENDERS** — check-list, `ALL` / `clear`.
  - **TIMESTAMP** — dropdown to choose which timestamp attribute is filtered, plus **FROM / TO** date-time inputs with **UTC / Dubai +4** toggle and quick pills (`last 24h / 7d / 30d / any`).
  - **ATTRIBUTES** — search input + check-list of attributes; picking N of them drives the right-pane columns.
- Right pane (post-run): every deal that matches the filter, one row per deal, columns = picked attributes. Column headers show the distinct-value count in aggregate (e.g. `dpd_bucket: 6 distinct`).
- Use case: "what values did this sync run actually write to BorrowerDeals?"

**Replication plan**

New route in the Lender Config module: `/lender-config/sync-audit`. Purely a Reports-tier drill-down — read-only.

1. Left rail matches Eternals verbatim: lenders + timestamp window + attribute picker.
2. Right pane: table of deals × chosen attributes with distinct-value counts in the headers.
3. **Also link from the journey audit log** — when the audit log shows a sync-triggered write, add a "See values written" link that pre-fills this page.

Files: new `/app/(app)/lender-config/sync-audit/page.tsx`, new data helper `src/data/sync-audit.ts` (prototype seeds).

---

## 5 · Journeys check

**What Eternals does**

Tenant-scoped daily-health board:

- Header: tenant selector · **check & send alert · check today**.
- **Slack alerts today** banner at the top — `⚠️ 10:00 #allocate-uae-journey-alert missed — no message was sent; the tick may not be running.`
- Table columns: `# | JOURNEY | ID | DUE BY | SLACK CHANNEL | LAST RUN | TODAY | PTP | Edit`.
- Each row is a tracked journey; today's PTP count highlighted in teal.
- Add / remove journeys from the tracked set via an inline input at the bottom (`Add a journey by ID`).
- PTP date range picker (`PTP FROM / TO`) so PTPs can be counted in a custom window.
- Total pill: `327 PTPs · 2026-08-27`.

**Replication plan**

New Reports page: **`/reports/journey-health`**.

1. Configurable "tracked journeys" list per tenant. Prototype: seeded, editable in-page + persisted to localStorage.
2. Same columns as Eternals.
3. **Slack alert schedule** — extend the existing `journey-alerts.ts` seed to carry per-journey alert config (channel, cutoff time, alert-message template).
4. "check today" fires the health check and updates the table cells in place.
5. "check & send alert" also posts to the Slack channel (in prototype: sonner toast pretending it did).
6. PTP FROM / TO date range with a "Show PTPs" button that queries the PTP-conversion event across the tracked journeys.

Files: new `/app/(app)/reports/journey-health/page.tsx`, extend `src/data/journey-alerts.ts` with tracked-journey config + `slack-integration-stub.ts`.

Add a card to the Reports hub linking here.

---

## 6 · Check PTP dates

**What Eternals does**

One-shot data-integrity check: "Borrower deals where `cg_enbd_ptp_date_latest` and `cg_enbd_ptp_date_earliest` are empty (null / blank / '-')."

Single button. Post-run: count + list of matching deal ids.

**Replication plan**

Fold into the same **`/reports/journey-health`** page as its own tile / expandable section. In the prototype:

1. "Check PTP dates" button in a Health-Checks section.
2. On click: show count + a copyable list of deal ids that fail the check.
3. Small config — pick which attributes to null-check (default: the two enbd attributes).

Files: same page as above, new `src/lib/attribute-integrity-checks.ts` for the null/blank/`-` matcher.

---

## 7 · DNC check

**What Eternals does**

- Header: `← Dashboard · [tenant selector] · Check DNC`.
- Big textarea for phone numbers — one per line, commas + spaces work, duplicates dropped, non-digits stripped.
- Post-run: lists the numbers that are on the ClearVoice DNC list.

**Replication plan**

Two entry points because two audiences need this:

1. **`/lender-config/sender-profiles`** — Add a "DNC check" tool card on the sender-profiles page. Textarea + Check button + results list. Ambient tool for compliance ops.
2. **Journey Builder Trigger AI Call node inspector** — Add a "Check numbers against DNC" section inside the Callback Handling block. If a phone is on the DNC list, it's excluded from redial + surfaced in the validation panel.

Files: new `dnc-check.tsx` shared component; use it in both places. New data helper `src/data/dnc-list.ts` (prototype seed matching Eternals's textarea test payloads).

---

## Cross-cutting: what's SHARED

Every tool has the same header pattern: **← Back · title · optional selector · primary CTA · tenant pills · avatar**. That's a good candidate for a shared `EternalsToolShell` primitive. But since we're folding them into Command's existing shell, we don't need to build it — the header just becomes the existing page-shell we already use.

**Sample-size selector** appears in Simulator, Audiences, Sync — same options, same behaviour. Build once:

```
type SampleSize = "6k" | "20k" | "50k" | "exact"
const SAMPLE_SIZE_LABEL = {
  "6k": "Fast · 6k sample",
  "20k": "Balanced · 20k",
  "50k": "High · 50k",
  "exact": "Exact · whole audience (slow)",
}
```

**Tenant scoping** — Eternals uses a top-right tenant selector (ENBD / Agency) that scopes every tool. In Command we already have per-lender scoping via `senderProfileId + lenderConfig`. The Journey Builder validation surface will use the journey's own lender — no extra selector needed.

---

## Delivery plan (phased)

### Phase 1 · Retire the current simulator, ship Dry-run + Validator

Highest-leverage. The two Journey Builder pieces:

- Rebuild the simulator as a canvas overlay with per-node + per-edge counts, aggregate panel, sample-size selector, Demo button — matching Eternals verbatim.
- Ship the Validator drawer: audience snapshot → validate all → trace one borrower with per-pass loop colouring.

### Phase 2 · Reports Journey Health page

Folds tools 5 (Journeys check) + 6 (PTP-dates check) into a single `/reports/journey-health` page.

### Phase 3 · Sync audit + Audiences resolver

Both are reads-of-real-data affordances. Sync goes to `/lender-config/sync-audit`; Audiences resolver goes to `/segments/audiences`.

### Phase 4 · DNC check

Small tool, two entry points (sender-profiles + Trigger AI Call node). Ship last.

---

## Files that will be built or extended

**Phase 1**
- `src/components/journeys/simulate-drawer.tsx` — rebuild
- `src/lib/simulation-runner.ts` — per-edge counts
- `src/components/journeys/journey-canvas.tsx` — canvas overlay + trace highlight mode
- `src/components/journeys/validator-drawer.tsx` — NEW
- `src/data/borrower-traces.ts` — loop-pass detection

**Phase 2**
- `src/app/(app)/reports/journey-health/page.tsx` — NEW
- `src/data/journey-alerts.ts` — extend with tracked-journey + slack config
- `src/lib/attribute-integrity-checks.ts` — NEW

**Phase 3**
- `src/app/(app)/lender-config/sync-audit/page.tsx` — NEW
- `src/data/sync-audit.ts` — NEW
- `src/app/(app)/segments/audiences/page.tsx` — NEW

**Phase 4**
- `src/components/shared/dnc-check.tsx` — NEW
- `src/data/dnc-list.ts` — NEW

---

## Screenshots (captured from Eternals for reference)

- `screenshots/eternals/01-dashboard.png` — the seven-tool hub
- `screenshots/eternals/02-simulator-empty.png` — empty state
- `screenshots/eternals/04-simulator-demo-canvas.png` — full demo output (13 nodes, 30k members, per-node + per-edge counts, aggregate panel)
- `screenshots/eternals/05-validator-empty.png` — the four-step regression workflow
- `screenshots/eternals/06-audiences.png` — tenant audience resolver
- `screenshots/eternals/07-sync.png` — lenders + timestamp + attribute filter
- `screenshots/eternals/08-journeys-check.png` — daily-health board with Slack alerts
- `screenshots/eternals/09-ptp-dates.png` — one-shot attribute null-check
- `screenshots/eternals/10-dnc.png` — phone-number DNC checker
