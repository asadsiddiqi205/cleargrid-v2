# Journey Builder — Workshop Feedback Update

Date: 2026-07-28
Deploy: cleargrid-extracted.vercel.app

Multi-part update to the Journey Builder prototype based on workshop
feedback covering validation stack, redial policy, canvas analytics,
Composer synergy, human-agent campaigns, and ergonomics polish.

Part 1.1 (fix broken /simulate page) was **skipped** per confirmation —
no such page exists in the prototype.

## Part 1 — Validation stack (Tier 1)

### 1.2 In-canvas Simulate drawer
- Slide-up drawer at 42vh, replaces the "Open simulator" overflow item.
- Modes: Full audience (uses journey enrolled) / Specific deals (paste
  IDs). Cap input. Rerun.
- Per-node count pills anchored to each node via DOM `data-id` +
  getBoundingClientRect. 300ms re-tick so pan/zoom updates smoothly.
- NodeSampleList side panel — click any pill to see 10 sample borrowers
  that reached that node.
- Deterministic per-node decay (0.72–0.92) so counts fall through the
  flow.

### 1.3 Audience-derived Validate AI Call
- `Validate AI Calls` button in the top toolbar, next to Validate.
- Three sampling modes: random / oldest_dpd / most_recent.
- Renders sampled borrower card + resolved script preview.
- Empty merge tags highlighted red inline; findings list shows every
  attribute that resolves to null/empty across the sample.
- Test-phone override for a dry outbound call (stub, console.info).

### 1.4 Empty-attribute prompt lint
- `src/lib/prompt-attribute-lint.ts` — walks `{{merge_tag}}` matches
  against sampled payloads and reports tags that resolve empty in
  >0% of the sample.
- Wired into the Validate AI Call modal.

### 1.5 Publish gate severity grouping + Fix focus
- `handlePublish` now emits `PublishIssue[]` (severity, title, detail,
  nodeId, field) instead of flat strings.
- Per-node config checks added: ClearVoice project missing, template
  missing, campaign missing, attribute field missing, redial >5.
- Dialog groups by severity (Blockers / Warnings / Info) with tone
  chips. Warning-only journeys can be published from the dialog.
- **Fix button** on each issue closes the dialog, selects the offending
  node, and pulses the specific field red for 3 seconds via
  `data-focus-field` markers + `.journey-focus-pulse` animation.
- Every node's data is stamped with `_error` / `_errorSeverity` so
  badges render on the canvas after a failed publish (Part 6.1).

### 1.6 Recurring-journey deviation alerts
- `src/data/journey-alerts.ts` — deterministic mock deviation alerts
  seeded off journey id (drift %, cause, threshold).
- Banner surfaces on canvas above the flow when active.
- `NotificationSettingsSection` in Journey Settings sheet with
  Slack channel + threshold controls.
- `postAlertToSlack` stub (console.info) fires on active-alert change.

## Part 2 — Redial policy

New `RedialPolicySection` in the Trigger AI Call config panel, sits
under Callback Handling:

- Enable toggle (default on) with summary chip.
- Max attempts 1–5 (hard cap to protect against runaway loops).
- Retry on outcomes: no_answer / busy / voicemail / dropped_by_ai /
  call_failed_technical.
- Interval strategy:
  - fixed: single minutes value.
  - escalating: gentle (30m → 2h → 24h) vs aggressive (10m → 30m → 2h
    → 8h) presets.
  - custom: comma-separated m/h/d schedule.
- Exit conditions: PTP captured / dispute / callback / DNC added /
  settlement. Firing any short-circuits remaining redials.

## Part 3 — Analytics

### 3.1 Canvas count pills
- Analytics time-range selector in top toolbar (24h / 7d / 30d / all).
- `buildAnalyticsCounts` derives per-node counts from BFS depth × range
  multiplier × seeded jitter — deterministic per journey.
- Simulate result overrides analytics pills when active (indigo vs
  emerald tone).
- Pills clickable → NodeSampleList side panel.

### 3.2 Journey Report modal
- Enrollment funnel with 5 metric cards.
- Business metrics matching Campaigns vocabulary: PTPs / RPCs /
  revenue.
- 14-day time-series bar chart.
- Per-node breakdown table with pass-through %.
- CSV export.

## Part 4 — Composer synergy

- Send Email / SMS refactored from hardcoded EMAIL_TEMPLATES /
  SMS_TEMPLATES arrays to a Composer registry adapter.
- `src/data/composer-registry-adapter.ts` unifies rich-email-templates,
  plain templates, and playbooks-v3 — rich wins on duplicates.
- New `ComposerTemplatePicker` component with searchable dropdown,
  playbook selector, template preview, and "Author full template in
  Composer" link (pushes to /email-generator/builder/new with base64
  prefill).
- Every send tagged `source: journey_[id]` and
  `source_node: node_[id]` for reconciliation.
- Variable overrides (journey-scoped merge tag overrides) surfaced as
  an advanced section.

## Part 5 — Human Campaign node

New `trigger_human_campaign` block under Channels / Actions:

- `src/data/campaigns-seed.ts` — 5 seeded human campaigns with
  skillGroup / priorityTier / queueDepth / status.
- `HumanCampaignConfig` component with hybrid mode:
  - Use existing campaign → picker with campaign metadata card + enrollment
    overrides (priority tier, urgency).
  - Create new campaign → name + skill group + priority + link to
    Campaigns page (/campaigns?draft=1).
- Exit conditions: PTP captured / dispute / callback / not reachable
  + timeout N days.
- Journey continues after: Immediate (parallel) vs Wait-for-outcome.
- Enrollment stub tags `source: journey_[id]` and
  `source_node: node_[id]`.

## Part 6 — Ergonomics

### 6.1 Error badges on every node
- Shared `NodeErrorBadge` component dropped into TriggerNode,
  ConditionNode, ActionNode, WaitNode, SplitNode, EndNode, GenericNode.
- Reads `data._error` + `data._errorSeverity`, renders a red / amber
  pill top-left with hover tooltip showing the full message.
- Populated by handlePublish (Part 1.5).

### 6.2 Minimap toggle
- Toolbar icon button next to the time-range selector; active state
  ringed in primary.

### 6.3 Saved indicator normalization
- Replaces "Unsaved edits" / "No edits since open" two-state chip with
  a live `SavedIndicator`:
  - Saving…            (500ms sim after 1.2s debounce off historyIndex)
  - Saved just now     (<5s since save)
  - Saved Ns / Nm / Nh ago  (older)
  - Unsaved changes    (pending)
- Colored by state (amber / sky / emerald / muted) with spinner icon
  during Saving.

### 6.4 Event trigger tooltips
- `src/data/event-trigger-catalog.ts` — 11 events with description /
  origin / payload metadata.
- `EventTriggerInfoIcon` renders an inline Info icon next to the event
  dropdown; hovering reveals the tooltip.
- Event dropdowns (Occurrence-of-Event trigger + Has-Done-Event
  condition) now render from the catalog.

### 6.5 Filter role scaffolding
- `src/data/filter-registry.ts` — 10 filters annotated with
  `requiredRole`.
- `RoleScopedFilterPicker` renders visible filters plus a footer
  count of restricted ones (marked disabled + "restricted" suffix).
- Wired into the Check-Attribute condition field picker.

## Part 7 — Journey GPT

**Deferred.** Journey GPT was not touched this round to keep the
above scope shippable in one deploy. Existing Journey GPT panel
still functions as-is.

## Files touched

New:
- src/data/composer-registry-adapter.ts
- src/lib/prompt-attribute-lint.ts
- src/data/journey-alerts.ts
- src/data/campaigns-seed.ts
- src/data/event-trigger-catalog.ts
- src/data/filter-registry.ts
- src/components/journeys/simulate-drawer.tsx
- src/components/journeys/workshop-panels.tsx
- src/components/journeys/nodes/node-error-badge.tsx

Modified:
- src/data/journeys.ts (added trigger_human_campaign block)
- src/components/journeys/journey-canvas.tsx (major)
- src/components/journeys/node-config-panel.tsx (major)
- src/components/journeys/nodes/{trigger,condition,action,wait,split,end,generic}-node.tsx

## Build

`npm run build` — passes, 30/30 static routes generated. TypeScript
strict clean.
