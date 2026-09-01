# Changes — last 48 hours

Range: **2026-09-01 13:06 → 18:40** (all local time). 12 commits, all on `main`.
Live at [cleargrid-v1-jb.netlify.app](https://cleargrid-v1-jb.netlify.app).

---

## Part 1 · Trace overlay + analytics (six commits)

### `8e2f874` fix(analytics): condition nodes evaluate to Yes/No, not free-form branches
Has Done Event / Check Attribute nodes were inheriting `action_split` branch labels from the trace synthesiser, so the per-node analytics rendered nonsense multi-branch distributions. Now:
- `buildNodeBorrowerList` + `listRunNodeBorrowers` override `branchLabel` to `Yes` / `No` deterministically per `(borrower, nodeId)` when the node kind is `condition`.
- `buildNodeBreakdown` returns a two-entry `{Yes, No}` distribution (both entries, even if one side is 0) plus `Evaluated / Yes / No` metric tiles.
- `NodeAnalyticsTab` renders Yes/No as two clickable tiles and pipes a new `branchFilter` into the row filter so the borrower list below segments by side.

Files: [`journey-analytics.ts`](src/data/journey-analytics.ts), [`journey-runs.ts`](src/data/journey-runs.ts), [`node-analytics-tab.tsx`](src/components/journeys/node-analytics-tab.tsx).

### `cd7e192` feat(trace): running-playback trace overlay + per-borrower analytics; validator predicts outcome
Rebuilt `?trace=<borrowerId>` on the canvas. Added a playback engine (auto-advance, play/pause/restart/skip, 0.5×/1×/2×/4× speed, scrubber), a traversed-edge SVG layer that mirrors ReactFlow's edges in the pass palette with an animated dash, a "Borrower is here" chip under the current node, an analytics header (4 tiles + opened/clicked/RPC/PTP chips), and a clickable hop-by-hop timeline.

Validator matched-row prediction: replaced `same path — N hops` with predicted end **status pill + terminal-node label + channels used + predicted recovered AED**. Divergent rows still show the divergence pair but now declare where the predicted path was going to end up.

Files: [`trace-overlay.tsx`](src/components/journeys/trace-overlay.tsx), [`validator/page.tsx`](src/app/(app)/journeys/[id]/validator/page.tsx), [`journey-canvas.tsx`](src/components/journeys/journey-canvas.tsx).

### `41a04d0` trace: drop playback controls — just auto-walk the path
Removed Play/Pause/Restart/Skip/speed/slider. Trace now auto-walks node-by-node at a fixed ~1.4 s/hop. Timeline and analytics kept.

### `c156c43` canvas: don't auto-load cached sim; hide dry-run overlay while tracing
Two related fixes:
- Opening a journey re-rendered the last cached dry-run from localStorage on every mount. Now the sim only hydrates when the URL carries `?sim=<id>` (a deep-linked share). Cache stays in localStorage — running Dry-run again picks up the same id.
- With `?trace=<borrowerId>` active, the dry-run overlay was competing with the trace overlay for the same canvas. `DryRunOverlay` now hides entirely while tracing so the trace has the canvas to itself.

File: [`journey-canvas.tsx`](src/components/journeys/journey-canvas.tsx).

### `90ed2a3` fix(trace): remap synthesised trace ids to real canvas node ids
Root cause of "trace auto-walk not showing on the canvas": the trace synthesiser used seeded template ids (`n-trigger`, `n-email-1`, …) that predate the actual canvas ids (`trigger-1`, `action-email-1`, …). Every `hop.nodeId` pointed at a `data-id` that doesn't exist on the DOM, so `anchors.get(...)` returned `undefined` and every badge was skipped. Added a `remapTraceToCanvas` step that buckets canvas nodes by role (trigger / wait / end / condition / action-email / sms / whatsapp / call) and walks the trace hops picking the next unused canvas node of matching role.

File: [`journey-canvas.tsx`](src/components/journeys/journey-canvas.tsx).

---

## Part 2 · Campaigns app (six commits)

### `2e93bd0` feat(campaigns): full list + detail pages with journey source
The Campaigns app was a *"coming soon"* stub. Built out both pages to match the reference ClearGrid design, with a new **Source** field added on top:

- Each `HumanCampaign` now carries a `source`: either `{ kind: "manual", createdBy }` or `{ kind: "journey", journeyId, journeyName, nodeId, nodeLabel, createdBy }`. Seeded 3 journey-sourced campaigns (High DPD, Broken Promise, Escalation Auto-Route).
- `/campaigns` list — Campaigns / Live agent activity tabs, search, filter, Create Campaign button, table columns match the reference plus a new **Source** column showing `Journey · <name>` or `Manual · <creator>`.
- `/campaigns/[id]` detail — header + status pills, KPI tiles, details block, Analytics section (At-a-glance tiles + Pickup outcomes bar + Connection donut SVG), Agent performance, an **Audience** section listing borrowers arriving from the campaign's source node (each row Traces to the canvas), Call messages, collapsible Schedule & redial + Dial order.
- Journey-sourced campaigns get a headline **Source card** above the KPIs linking **Open journey** / **Show node on canvas**.
- Model changes: added `dialerName`, `gateway`, `agentGroup`, `dialSpeed`, `mode`, `type`, `totalContacts`/`initialQueued`/`queued`/`completed`/`successful`/`failed`, `callMessages`, `schedule`. Renamed `queueDepth` → `queued`. Expanded `status` enum.

Files: [`campaigns-seed.ts`](src/data/campaigns-seed.ts), [`campaigns/page.tsx`](src/app/(app)/campaigns/page.tsx), [`campaigns/[id]/page.tsx`](src/app/(app)/campaigns/[id]/page.tsx), [`node-config-panel.tsx`](src/components/journeys/node-config-panel.tsx).

### `9b15994` feat(editor): full-page editor for message nodes + campaigns; template editing in modal

**Journey Builder:** new `MessageNodeFullEditor` takes over the viewport when a Send Email / Send SMS / Send WhatsApp action node is selected. Left column is the form; right column is the shared `MessagePreview` sticky at the top. Header carries Save & Close, Delete, X. Trigger / condition / wait / call / human / end nodes still use the right-side panel.

**Campaigns:** new `/campaigns/[id]/edit` route — same layout, tabs (Basics / Audience / Schedule / Messages) with a live campaign preview on the right (config summary + call-flow bubbles). Detail page's Call messages block gains an **Edit messages** button routing here.

Files: [`message-node-full-editor.tsx`](src/components/journeys/message-node-full-editor.tsx) (new), [`campaigns/[id]/edit/page.tsx`](src/app/(app)/campaigns/[id]/edit/page.tsx) (new), [`campaigns/[id]/page.tsx`](src/app/(app)/campaigns/[id]/page.tsx), [`journey-canvas.tsx`](src/components/journeys/journey-canvas.tsx).

### `3f2f116` journey/campaigns editors: composer builder in modal + human campaign full page

- Message node "Edit template" → hosts the composer builder route (`/email-generator/builder/[id]?embedded=1`) inside a Dialog via iframe.
- New `HumanCampaignNodeFullEditor` takes over the viewport when the Trigger Human Campaign action node is selected. Same tab layout as the campaign creation modal (Basics / Audience / Schedule / Messages) plus a live campaign-summary preview + a call-flow preview under Messages. Audience tab shows a journey-source card explaining the audience is inherited from the upstream node. State stored on the node's data as `campaignConfig`; the node label mirrors `campaignName`.

Files: [`human-campaign-full-editor.tsx`](src/components/journeys/human-campaign-full-editor.tsx) (new), [`journey-canvas.tsx`](src/components/journeys/journey-canvas.tsx), [`message-node-full-editor.tsx`](src/components/journeys/message-node-full-editor.tsx).

### `c877624` message editor: rich template picker + open `TemplateEditor` (not composer builder)

Template picker is no longer a native `<select>`. Popover-based card picker:
- Trigger button shows selected template name + purpose + lender + Active/Draft badge + snippet, or a "Choose a {channel} template" placeholder.
- Popover has a search box and a scrolling list of cards.
- Seeded 5 email, 4 SMS, 4 WhatsApp templates with realistic subject + snippet copy.

Also reverted **Edit template** modal to host the standalone `TemplateEditor` component instead of an iframe of the composer builder. Smaller, faster, scoped to template editing.

File: [`message-node-full-editor.tsx`](src/components/journeys/message-node-full-editor.tsx).

### `a2c4a69` message editor: HTML/Text template split, inline HTML builder, add-variable, SMS channel pin

1. **HTML vs Text distinction** — email templates now carry a `type` (html / text). Picker groups them under *Rich HTML templates* and *Plain-text templates* with descriptions. Each row/selected chip shows an HTML / TEXT pill.
2. **Inline HTML builder in Manual mode** — new **Design in HTML builder** button next to the HTML body field. Opens the standalone `TemplateEditor` (pinned to email) inside a modal. No redirect to the composer.
3. **SMS channel pin** — `TemplateEditor` now accepts `initialChannel` and the node editor passes the current channel. Opening "Edit template" from an SMS node lands on the SMS editor.
4. **Add variable button** — every manual field (email subject, HTML body, plain-text fallback, SMS body, WhatsApp body) gained a small **Add variable** popover. Search-filterable, grouped list of `{{borrower.first_name}}`, `{{amount}}`, `{{payment_link}}`, `{{ptp_date}}`, and 8 more. Insert lands at the caret and restores focus + selection.

Files: [`message-node-full-editor.tsx`](src/components/journeys/message-node-full-editor.tsx), [`template-editor.tsx`](src/components/templates/template-editor.tsx).

### `2317d73` campaigns: schedule tab matches reference — end time, calling hours, recurring, redial rounds

Extended `CampaignSchedule` with everything the reference screenshots show:
- `setEndTime` + `endsAt` (revealed by a warn-toned toggle)
- `callingHoursOnly` (9 AM – 6 PM auto-pause)
- `recurring: { enabled, weekdays[], dailyTime, endDate }`
- `redial: { enabled, maxAttemptsPerContact, tryMultipleNumbers, rounds[], repeatLastRound }`
- Each round has `contacts` (Contact 1–5, draggable chips) + `waitBeforeMin`

New shared `CampaignScheduleTab` component renders all of it: When-to-run radios, date/time pickers, toggle rows for calling hours + recurring + pause, weekdays chip strip, redial section with max-attempts stepper, draggable Round sequence builder (Add contact popover from remaining slots, per-round wait selector after round 1), Repeat-last-round toggle, fallback info banner. Shared between `/campaigns/[id]/edit` and the Trigger Human Campaign node's full-page editor.

Also added `/campaigns/new` — seeds a blank draft campaign and redirects to the edit route so blank creation uses the same UI as editing.

Files: [`campaign-schedule-tab.tsx`](src/components/campaigns/campaign-schedule-tab.tsx) (new), [`campaigns/new/page.tsx`](src/app/(app)/campaigns/new/page.tsx) (new), [`campaigns-seed.ts`](src/data/campaigns-seed.ts), [`campaigns/[id]/edit/page.tsx`](src/app/(app)/campaigns/[id]/edit/page.tsx), [`human-campaign-full-editor.tsx`](src/components/journeys/human-campaign-full-editor.tsx).

### `240c913` campaign editor: dropdowns for Dialer/Gateway/Agent group/Secondary/Dial speed, "Manage user groups" link

Basics tab now uses proper dropdowns backed by shared lists (`AGENT_GROUPS`, `DIALER_OPTIONS`, `GATEWAY_OPTIONS`, `DIAL_SPEED_OPTIONS`) in [`campaigns-seed.ts`](src/data/campaigns-seed.ts) instead of free-form inputs. Agent group carries the required marker + a **Manage user groups** link. Applies to both `/campaigns/[id]/edit` and the Trigger Human Campaign node editor.

Files: [`campaigns-seed.ts`](src/data/campaigns-seed.ts), [`campaigns/[id]/edit/page.tsx`](src/app/(app)/campaigns/[id]/edit/page.tsx), [`human-campaign-full-editor.tsx`](src/components/journeys/human-campaign-full-editor.tsx).

---

## New files created

- `src/app/(app)/campaigns/[id]/page.tsx` — campaign detail page
- `src/app/(app)/campaigns/[id]/edit/page.tsx` — full-page campaign editor
- `src/app/(app)/campaigns/new/page.tsx` — blank-draft creation route
- `src/components/campaigns/campaign-schedule-tab.tsx` — shared Schedule tab
- `src/components/journeys/message-node-full-editor.tsx` — full-page email/SMS/WhatsApp editor
- `src/components/journeys/human-campaign-full-editor.tsx` — full-page Trigger Human Campaign editor

## Files with major changes

- `src/data/campaigns-seed.ts` — new source model + expanded schedule shape + agent-group / dialer / gateway / dial-speed option lists
- `src/data/journey-analytics.ts` — Yes/No condition branch analytics
- `src/data/journey-runs.ts` — same condition-branch fix applied to per-run rows
- `src/components/journeys/journey-canvas.tsx` — trace remapping, sim hydration guard, dry-run hiding while tracing, wiring for the two new full-page editors
- `src/components/journeys/trace-overlay.tsx` — rebuilt for auto-walk + analytics
- `src/components/journeys/node-analytics-tab.tsx` — Yes/No branch tiles + filter
- `src/app/(app)/journeys/[id]/validator/page.tsx` — predicted outcome instead of "N hops"
- `src/app/(app)/campaigns/page.tsx` — full list page
- `src/components/templates/template-editor.tsx` — accepts `initialChannel` + `initialTemplateName`

## Deployment

All commits are pushed to `main` on GitHub (`asadsiddiqi205/cleargrid-v2`) and each was deployed to the Netlify site `cleargrid-v1-jb` after building. Netlify's live production URL is [`https://cleargrid-v1-jb.netlify.app`](https://cleargrid-v1-jb.netlify.app).

Vercel (`cleargrid-v1-jbfull.vercel.app`) hasn't been redeployed since the daily deploy quota was hit — that alias points at the pre-Netlify build (commit `504d060`). To bring Vercel current: hit **Redeploy** on the Vercel dashboard once the quota resets, or trigger a fresh deploy via `vercel --prod --yes` in the project directory.
