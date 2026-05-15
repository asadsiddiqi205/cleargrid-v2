# Journey Builder — v1 Node-Level Updates

Date: 2026-05-10
Scope: node-level only (canvas, palette, node config panels). List view and segment builder are unchanged.

---

## Section 1 — Canvas Interactions

### 1.1 Single-click adds node to canvas
**File:** `src/components/journeys/journey-canvas.tsx`
- Rewrote `onPaletteAdd` to position the new node next to the most recently selected node (or at canvas centre if nothing selected, or below the last node if there is one).
- If a node was selected at click time, automatically connects a `smoothstep` edge from selected → new.
- The new node is auto-selected after placement so the user can continue chaining without clicking back to the palette.
- Drag-from-palette behaviour preserved untouched.

### 1.2 Inline `+` affordance on each node
**File:** `src/components/journeys/quick-add-button.tsx`
- The `+` button already rendered on every placed node. Added **splice** behaviour: if the source already has an outgoing edge from the same handle, clicking `+` inserts the new node *between* source and downstream rather than appending a sibling branch. Source → new → existing downstream.
- Match WebEngage / Braze inline-insertion pattern.

---

## Section 2 — Entry & Trigger Nodes

### 2.1 Journey Handoff Entry — **NEW NODE**
**Files:** `src/data/journeys.ts`, `src/components/journeys/block-configs.tsx`
- Added new block type `journey_handoff_entry` to the Entry / Trigger category, directly under the existing trigger nodes. Icon: `ArrowRightLeft`.
- New `JourneyHandoffEntryForm` config panel with:
  - **Accept from** — dropdown: "All journeys" (default) / "Specific journeys"
  - **Source journeys** picker — multi-select checkboxes (stubbed with 5 existing journeys, will be replaced by a live query)
  - **Source variables** read-only block listing `source_journey_id`, `source_outcome`, "Any forwarded variables from the source journey"
- Existing `flow_handoff` (the exit-side handoff under Integrations) is preserved — these two are a complementary pair.

### 2.2 Event Trigger — events + frequency
**File:** `src/components/journeys/block-configs.tsx`
- Added module-scope `COLLECTIONS_EVENTS` catalogue with 16 events: `pay_in_full_success`, `pay_in_full_clicked`, `schedule_payment_success`, `schedule_payment_clicked`, `payment_plan_success`, `payment_plan_clicked`, `account_settlement_success`, `account_settlement_clicked`, `paid_to_lender_partial`, `dob_verified`, `land_on_dob_verification_page`, `id_number_verified`, `borrower_account_login`, `borrower_account_login_all`, `consent_form_i_accept_clicked`, `promise_to_pay_clicked`.
- Replaced the binary "Once / Every time" frequency selector with a 3-option control: **first** / **every** (default) / **nth**. The Nth occurrence option reveals `nthOccurrence` count + window number + unit (hours/days).
- Cooldown only shown when frequency is `every`.

### 2.3 Date / Time Trigger — three modes
**File:** `src/components/journeys/block-configs.tsx`
- Added a third mode: `relative` (in addition to `specific` and `recurring`).
- **Specific**: single datetime picker (unchanged).
- **Recurring**: cadence dropdown (`daily` / `weekly` / `monthly`). Weekly reveals 7 day-of-week chip toggles. Monthly reveals a day-of-month picker (1–31 + "Last day of month"). All recurring modes include start date, optional end date, and time-of-day.
- **Relative**: direction (`Before` / `After`) + amount + unit (hours/days) + anchor attribute. Anchor attribute filtered to date-typed attributes only — stubbed via new `DATE_ATTRIBUTES` const with `cf_due_date`, `cf_ptp_date`, `cf_submit_date`, `cf_last_payment_date`, `cf_visa_expiry_date`.

### 2.4 Profile Attribute Change — aligned with prototype
**File:** `src/components/journeys/block-configs.tsx`
- Replaced the flat attribute dropdown with a **grouped picker** using the canonical `CATEGORICAL_ATTRIBUTES` catalogue (grouped by data type: Risk & Collections / Consent / Borrower Identity).
- Typed operators per data type: categorical attributes render `is` / `is not` / `is in` / `is not in` (other data types stubbed for follow-up).
- Value control now renders as an **enum dropdown** when a categorical attribute is selected — no more free-text drift.
- Legacy From / To free-text fields preserved as a fallback when no catalogued attribute is selected.

---

## Section 3 — Channels & Actions

### 3.1 Send Email — dual mode
**File:** `src/components/journeys/node-config-panel.tsx`
- Added a **Template / Manual** segmented control at the top of the Send Email config.
- **Template mode** (default): template picker, body locked, mustache variables surfaced as inline pills under the template.
- **Manual mode**: free-text Subject, HTML body textarea, plain-text fallback textarea.
- Shared between both modes (preserved when switching): **From**, **Reply-to**, **Provider** (Default ESP / SendGrid / Amazon SES).
- New helper component `ModeToggle` added at the bottom of `node-config-panel.tsx`.

### 3.2 Send SMS — dual mode
**File:** `src/components/journeys/node-config-panel.tsx`
- Same Template / Manual toggle as Send Email.
- **Template mode**: template picker, character counter, mustache variables surfaced.
- **Manual mode**: free-text body textarea with live character count (160-segment indicator).
- Shared: **Sender ID** + **Provider** (Default / Twilio / Unifonic).

---

## Section 4 — Conditions

### 4.1 Action Path Split — **CRITICAL**
**Files:** `src/components/journeys/node-config-panel.tsx`, `src/components/journeys/block-configs.tsx`
- The config panel now walks the graph backward (up to 6 hops, hopping through wait/split pass-through nodes) to detect the nearest upstream action node and its `actionType`.
- Threaded `upstreamActionType: "email" | "sms" | "whatsapp" | "call" | null` through `BlockConfigFormProps`.
- Rewrote `ActionPathSplitForm`:
  - **Upstream action** — auto-detected, read-only display. Shows a red validation error if no upstream action exists.
  - **Wait window** — number input + unit dropdown (hours/days). Default 1 day, max 14 days.
  - **Branches** — auto-rendered as pill labels per upstream action type:
    - Email: Delivered, Bounced, Opened, Clicked, Replied, Unsubscribed, **No response**
    - SMS: Delivered, Failed, Replied, Opted out, **No response**
    - WhatsApp: Delivered, Read, Replied, Failed, Opted out, **No response**
    - AI Call: Answered, Voicemail, No answer, Busy, Failed, DNC, RPC, NRPC, PTP captured, Dispute raised, Callback requested, Hung up early
  - Branch labels and count persist into the node `data` so the canvas edge labels render.

### 4.2 Best Channel — full config
**File:** `src/components/journeys/block-configs.tsx`
- **Eligible channels** multi-select chip group (Email / SMS / WhatsApp / AI Call). One outgoing edge per selected channel + a "No reachable channel" fallback.
- **Scoring uses these attributes** read-only block listing `preferred_channel`, `contactability_score`, `consent_status`, `is_phone_reachable`, `is_email_reachable`, `is_sms_reachable` with role descriptions.

### 4.3 Decision Split — auto-enumerated branches
**Files:** `src/data/journeys.ts`, `src/components/journeys/block-configs.tsx`
- Changed `decision_split` from a binary `condition` node (`maxOutputs: 2`) to a variable-output `generic` node (`maxOutputs: 6`) with `branchKind: "decision_split"`.
- Rewrote `DecisionSplitForm`:
  - **Attribute** — grouped dropdown over `CATEGORICAL_ATTRIBUTES`.
  - **Branches** — read-only preview, auto-derived from the attribute's `values`, **plus a dedicated Null / Empty branch always appended** so unset values don't silently fall out.
  - Branch labels persist into node data for canvas rendering.
- Examples covered by the catalogue: `dpd_bucket_label` (0-30/31-60/61-90/91-180/180+/Null), `consent_status` (Full/Restricted/Blocked/Null), `preferred_channel` (Voice/Email/SMS/Null).
- Manual "add branch" UI removed — branches are derived, not user-added.

### 4.4 Has Done Event — frequency control
**File:** `src/components/journeys/block-configs.tsx`
- Added Frequency dropdown: `at_least` (default) / `exactly` / `at_most` + `frequencyN` number input (default 1, min 1).
- Enables conditions like "borrower has clicked Pay-in-Full at least twice in the last 7 days."

### 4.5 Wait for Profile Change — restored fields
**File:** `src/components/journeys/block-configs.tsx`
- Restored **Attribute selector** — grouped `CATEGORICAL_ATTRIBUTES` picker (required, state key `watchAttribute`).
- Restored **Timeout duration** — number input + unit dropdown (hours/days). Default 7 days.
- Helper text noting the two outgoing edges: "Changed" and "No change (timeout)".

---

## Section 5 — Flow Controls

### 5.1 Pause / Hold — duration + manual resume
**File:** `src/components/journeys/block-configs.tsx`
- Added **Pause duration** number input + unit dropdown (hours / days / **weeks**). Default 24 hours.
- Added **Allow manual resume** Switch with helper text. Default on.

### 5.2 End Journey — Outcome tag
**File:** `src/components/journeys/block-configs.tsx`
- Added required **Outcome** dropdown with exactly four values: `Converted` / `Exited` / `Timed Out` / `Errored`. Default `Exited`.
- Helper text references the canonical `last_journey_outcome` attribute so the values stay in sync with the data layer when it lands.
- Naming kept as **End Journey** throughout (per user direction during scope clarification).

---

## Section 6 — Data, State & Consent

### 6.1 Tag Management — DESCOPED
**File:** `src/data/journeys.ts`
- Tag Management removed from the v1 palette. The underlying `TagManagementForm` component is **not deleted** — only the BLOCK_TYPES registration is commented out so it stops appearing in the palette. A code comment notes the descope reason: borrower profiles don't carry tags yet.

### 6.2 Consent / DNC — full panel built
**File:** `src/components/journeys/block-configs.tsx`
- Rewrote `ConsentManagementForm` (previously an empty shell). New fields:
  - **Channel scope** — multi-select chips (Email / SMS / WhatsApp / AI Call). Defaults to all four.
  - **Required consent state** — dropdown (Full / Restricted (must include)). Default Full.
  - **DNC list source** — multi-select chips (Lender DNC / Regulatory DNC / Internal DNC). Default `["Regulatory DNC"]`.
  - **Action on violation** — 3-button radio group:
    - `exit` — Exit journey (default)
    - `fallback` — Route to fallback branch (adds 3rd outgoing edge "Consent blocked")
    - `skip` — Skip this step
- Helper text describes the two-edge default (Allowed / Blocked or Exit) and the third edge added by the fallback option.

---

## Section 7 — Critical Missing Attributes (reference only)

No code changes. Several node configs above reference attributes that live in the segment builder data layer (out of scope for this ticket). Attributes referenced by node configs in the spec-aligned exact names:

- `consent_status`, `preferred_channel`, `contactability_score`, `is_phone_reachable`, `is_email_reachable`, `is_sms_reachable`, `engagement_tier`, `ptp_overdue`, `days_to_ptp`, `days_since_last_payment`, `days_since_last_successful_contact`, `broken_ptp_count`, `dpd_bucket_label`, `risk_segment`, `last_journey_outcome`, `is_in_active_journey`

Where these appear in node config dropdowns today (Decision Split, Profile Attribute Change, Wait for Profile Change), they are stubbed via the `CATEGORICAL_ATTRIBUTES` module-scope constant in `block-configs.tsx`. A code comment notes this is the swap-out target when the data layer lands.

---

## Conflicts Resolved Before Editing (per user clarification)

1. **WhatsApp**: not re-added to the palette. Action Path Split keeps the WhatsApp branch vocabulary mapped in code so the wiring is ready, but no WhatsApp action node exists in the v1 channel set.
2. **Journey Handoff Entry**: created as a new entry-side node, complementing (not replacing) the existing `flow_handoff` (exit-side) under Integrations.
3. **Other unmentioned existing nodes**: left alone. Only Tag Management was descoped.
4. **End Journey vs Exit Journey naming**: kept as **End Journey** throughout.
5. **Decision Split contract change**: confirmed by user — binary → variable-output, auto-enumerated.

---

## Files Touched

| File | Changes |
|---|---|
| `src/data/journeys.ts` | Tag Management commented out of BLOCK_TYPES; `journey_handoff_entry` added to Entry category; `decision_split` switched to generic/maxOutputs:6/branchKind:"decision_split" |
| `src/components/journeys/journey-canvas.tsx` | `onPaletteAdd` rewritten with selected-relative positioning + auto-connect; `NodeConfigPanel` now receives `nodes` and `edges` |
| `src/components/journeys/quick-add-button.tsx` | Added splice behaviour to inline `+` insertion |
| `src/components/journeys/node-config-panel.tsx` | Threaded `upstreamActionType` to `BlockConfigComponent`; Send Email + Send SMS now have Template/Manual dual-mode with shared From/Reply-To/Provider/Sender ID fields; added `ModeToggle` helper component |
| `src/components/journeys/block-configs.tsx` | All 9 form rewrites detailed above; added `CATEGORICAL_ATTRIBUTES`, `COLLECTIONS_EVENTS`, `DATE_ATTRIBUTES` module-scope constants; added `UpstreamActionType` type to `BlockConfigFormProps`; added `JourneyHandoffEntryForm` and registered in dispatch map |
| `CHANGELOG-v1-node-updates.md` | This file |

---

## Build Status

`pnpm build` — clean. 24 routes generated, 0 TypeScript errors, 0 lint failures.
