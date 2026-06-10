# AI Callback — Trigger AI Call Node Feature

Date: 2026-06-09

Borrower-requested AI callbacks as a built-in capability of the existing **Trigger AI Call** node. Not a separate journey, not a new template, not a new branch on Action Path Split.

---

## (a) Node config — Callback Handling section

**File:** `src/components/journeys/callback-handling.tsx` (new), wired into `node-config-panel.tsx` under the existing AI Call config.

- Collapsible section labeled **Callback Handling** with phone-incoming icon and `On` / `Off` badge in the header.
- Four controls:
  1. **Allow callback capture** — toggle (default on). When off, the dependent controls render muted/disabled but stay visible.
  2. **Compliance rules** — read-only block listing DND hours, contact window, 7-in-7 cap (all "Holds when blocked", amber) + DNC list ("Cancels when blocked", red). Clicking the block dispatches a `journey:open-settings` event that the canvas listens for, opening the Journey Settings sheet scrolled to AI Callbacks.
  3. **Max callbacks per borrower (this journey)** — number input, default 3, min 1, max 10.
  4. **If callback time has already passed when committed** — radio with "Fire immediately at next allowed window" (default) and "Skip and log".
- Dev affordance: **Simulate callback commit** button that calls `simulateCallbackCommit(...)` against the runtime stub, scheduling a mock callback 30 min in the future.

**Files touched:**
- `src/components/journeys/callback-handling.tsx` (new)
- `src/components/journeys/node-config-panel.tsx` — imports + renders `<CallbackHandlingSection>` inside the AI Call block

---

## (a) Canvas badge

**File:** `src/components/journeys/nodes/action-node.tsx`

- When `actionType === "call"` and `callbackEnabled !== false`, renders a small pill in the top-right corner of the node: phone-incoming icon + "Callbacks N" where N is the per-borrower cap. Style: `bg-zinc-800 text-zinc-300 border-zinc-700`.
- Tooltip: "Callbacks enabled. Max N per borrower. Holds on DND, contact window, 7-in-7. Cancels on DNC, opt-out, consent revoked."
- No new outgoing edge on the AI Call node for callbacks (callbacks are a background scheduled action, not a flow gate).

---

## (b) Journey Settings — AI Callbacks section

**File:** `src/components/journeys/ai-callbacks-settings.tsx` (new), wired into `journey-canvas.tsx` Settings sheet beneath Exit Triggers.

- Section has `id="journey-settings-ai-callbacks"` and a `ref` so the node-level link can scroll to it.
- Five controls:
  1. **DND hours** — read-only ("21:00–08:00 borrower-local"), "Configured at lender level" badge, "Holds when blocked".
  2. **Contact window** — same pattern.
  3. **DNC list** — read-only ("Lender DNC + Regulatory DNC"), highlighted with `red-500/30` border, "Cancels when blocked". Helper text explains DNC is a hard cancel — never holds.
  4. **If the 7-in-7 cap blocks a scheduled callback** — radio with "Hold until the cap clears, then fire" (default) and "Exit and log if the cap won't clear within the max hold duration".
  5. **Max hold duration before exit** — number input + unit (hours/days), default 48 hours, max 336 hours / 14 days.
- When the journey has no AI Call nodes, an info banner says "This journey has no AI Call nodes. These settings will apply if you add one later." The section stays visible regardless (per spec: hiding it would cause confusion).
- Compliance settings are all marked "Configured at lender level" and cannot be overridden at the journey level.

**Wiring**: `journey-canvas.tsx` derives `hasAiCallNode` from the React Flow nodes, holds `callbackSettings` state (default `{ sevenInSevenBehavior: "hold", maxHoldDuration: 48, maxHoldUnit: "hours" }`), and listens for the `journey:open-settings` custom event to open the sheet and scroll to the AI Callbacks anchor.

---

## (c) Runtime behavior

**File:** `src/components/journeys/callback-runtime.tsx` (new)

Stub data model + behavior:

### Data model
```typescript
ScheduledCallback {
  id, originatingNodeId, originatingJourneyInstanceId,
  borrowerId, borrowerName, dealId,
  clearvoiceProjectId, clearvoiceScriptId,   // snapshotted at schedule time
  fireAtIso, status,
  holdReason?, endReason?,
  scheduledAt, firedAt?, cancelledAt?,
  log: [{at, message}]
}
```

`status` ∈ `pending | held | fired | cancelled | errored`

### Schedule path (`simulateCallbackCommit`)
1. Cap check — count `pending`+`held` callbacks for the borrower; if ≥ `callbackMaxPerBorrower`, refuse with reason "Max callbacks per borrower reached".
2. Otherwise, write a `ScheduledCallback` record with:
   - `clearvoiceProjectId` + `clearvoiceScriptId` snapshotted from the node data (immune to subsequent unpublish)
   - `fireAtIso` from the captured callback time
   - `status: "pending"`
3. Emit to subscribers (monitor view re-renders).

### Fire path (mocked)
- DNC check first → if on DNC list, **cancel** with `endReason: "dnc_at_fire"`. Never holds.
- DND / contact window / 7-in-7 → if any blocking, **hold** with the matching `holdReason`. Polling stub re-evaluates.
- If still held when max hold elapses → **errored**.
- Otherwise → **fired**.

### Cancellation watchers
Helper exports:
- `cancelCallback(id, reason)` — used by attribute watchers for `opted_out`, `consent_revoked`, `dnc_at_schedule`.
- `cancelCallbacksForJourneyInstance(journeyInstanceId)` — per user decision, **any journey end cancels all pending/held callbacks for that instance** with `endReason: "journey_ended"`. This simplification supersedes the older "callbacks survive natural ends" rule.

### Locked decisions implemented
- AI only (no human-agent path)
- Same ClearVoice project as the originating node
- Borrower-requested only (no retry-on-no-answer, no agent-initiated)
- Deal-level grain
- DNC = hard cancel; DND/window/7-in-7 = hold-then-fire-or-error
- Snapshotting at schedule time
- Parallel flow — scheduling never branches/pauses the journey
- Re-entry cap — additional captures during a callback respect `callbackMaxPerBorrower`

### Seeded mock data
Four pre-seeded callbacks so the monitor has content on first load: one **pending**, one **held** (DND blocking), one **fired**, one **cancelled** (DNC at fire time).

---

## (d) Monitoring view

**Files:** `src/components/journeys/callback-monitor-view.tsx` (new), `src/app/(app)/journeys/monitor/page.tsx` (new route at `/journeys/monitor`).

- 4 KPI cards: Pending · Held by compliance · Fired (last 24h) · Cancelled / errored.
- Scheduled callbacks table with: Status indicator · Borrower (+ deal id) · Journey instance · Originating node (+ project + script) · Fire time (borrower-local + UTC) · Detail (live state).
- Status indicator follows spec colors exactly:
  - **emerald-500** — pending, on-track
  - **amber-500** — held by compliance
  - **red-500** — held beyond max duration (errored)
  - **zinc-500 + strikethrough** — cancelled (DNC / opt-out / consent revoked / journey ended)
- Tooltip on indicator shows fire time, source node, hold reason or cancel reason, cancelled-at timestamp.
- Cancelled rows remain visible (not silently disappeared). Spec: 7 days or until journey ends; this stub keeps them indefinitely.
- View subscribes to the runtime store via `subscribeCallbacks(...)` so a Simulate-commit on the node panel updates the monitor in real time.

Exposed helper `<CallbackRowIndicator cb={...} />` for embedding the same indicator inline in any future per-borrower row UI.

---

## (e) Attribute registry

**File:** `src/components/journeys/block-configs.tsx`

Stubbed the three callback attributes in `CATEGORICAL_ATTRIBUTES` under a new `AI Callback` group so they appear in the attribute picker used by Decision Split, Profile Attribute Change, Wait for Profile Change, etc.:

```typescript
{ id: "callback_requested", label: "Callback requested", group: "AI Callback", values: ["true", "false"] },
{ id: "callback_date", label: "Callback date", group: "AI Callback", values: [] },
{ id: "callback_time", label: "Callback time", group: "AI Callback", values: [] },
```

A code comment marks them as `// Stub — registered by slice 1 in production`.

---

## Open questions — resolved

- **Exit Trigger reason mapping** (the prompt's "most important open question"): the existing `EndJourneyForm` carries only an `outcome` field, no structured `reason` sub-field. **Resolved by the user**: callbacks live only as long as the journey instance — any journey end cancels them. The Exit Trigger reason mapping is no longer needed. The `cancelCallbacksForJourneyInstance(...)` helper implements this single rule.
- **Snapshotting at schedule time**: confirmed — `ScheduledCallback.clearvoiceProjectId` + `clearvoiceScriptId` are copied from the node at schedule time and never re-read.
- **Cross-node ownership**: handled — each `ScheduledCallback` records its `originatingNodeId`, so multi-AI-Call journeys are unambiguous.

---

## Files touched (summary)

| File | New / Modified | Purpose |
|------|---------------|---------|
| `src/components/journeys/callback-handling.tsx` | New | Part 1 — node config section |
| `src/components/journeys/ai-callbacks-settings.tsx` | New | Part 2 — journey-level settings |
| `src/components/journeys/callback-runtime.tsx` | New | Part 3 — runtime stub + cancellation helpers |
| `src/components/journeys/callback-monitor-view.tsx` | New | Part 4 — monitor view component |
| `src/app/(app)/journeys/monitor/page.tsx` | New | `/journeys/monitor` route |
| `src/components/journeys/node-config-panel.tsx` | Modified | Imports + renders `<CallbackHandlingSection>` inside AI Call config |
| `src/components/journeys/nodes/action-node.tsx` | Modified | Canvas badge on AI Call nodes when callbacks enabled |
| `src/components/journeys/journey-canvas.tsx` | Modified | Adds `<AICallbacksSettings>` to Settings sheet, `hasAiCallNode` derivation, `journey:open-settings` event listener |
| `src/components/journeys/block-configs.tsx` | Modified | Stubs 3 callback attributes in `CATEGORICAL_ATTRIBUTES` |
| `CHANGELOG-ai-callback-feature.md` | New | This file |

Build: clean. 26 routes (added `/journeys/monitor`).
