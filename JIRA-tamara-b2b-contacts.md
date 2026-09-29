# Feature: Tamara B2B — multi-contact accounts on Command

**Epic ID (suggested):** CG-TAM-1
**Portfolio:** Tamara B2B (merchant collections, ~14k merchants, KSA / UAE / Bahrain / Kuwait)
**Guardrail:** everything behind a per-lender / per-portfolio flag `tamara_b2b_contacts`. Existing single-contact behaviour is the default when the flag is off — no regressions to consumer portfolios.

**Constraint (from spec):** Update Journey Builder, Composer and campaign flows **in place**. Do not rebuild existing screens.

**Out of scope for this epic (spec explicit):**
- Gateway / channel changes (reuse existing Tamara gateways).
- Journey-level escalation ladder.
- Branch-on-contact-outcome (design the rotation state so it lands cleanly next).

---

## Phase 1 · Foundation

### CG-TAM-1.0 · Data model — accounts, contacts, phones, rotation state
**Type:** Backend · **Component:** Data Model · **Est:** 5 pts
**Description**
Introduce the multi-contact schema underneath the existing `borrower` shape. B2B "borrowers" become accounts with an owned set of contacts, each with its own phones.

**Acceptance criteria**
- [ ] `contacts` table: `id, account_id, name, designation_enum, designation_raw, is_primary, is_legally_liable, priority_rank, do_not_contact, created_at, updated_at`.
- [ ] `designation_enum`: `ceo_office | finance | admin | ap | procurement | other`. `designation_raw` preserves the lender's original string.
- [ ] `contact_phones` table: `id, contact_id, e164, source (lender | pca | skip_trace | agent_added), verification_status (unknown | verified | invalid | unreachable), last_outcome, last_outcome_at`.
- [ ] `account_rotation_state` table: `account_id, last_contact_id, last_phone_id, next_contact_id, next_phone_id, updated_at`. One row per account.
- [ ] `communication_attempts` gains `contact_id` and `phone_or_email_used` (nullable for existing consumer rows).
- [ ] Migration is additive; existing single-contact borrowers get one synthetic `contacts` row on backfill with `is_primary=true`, `priority_rank=1`, copied phone as verified.
- [ ] `flag_tamara_b2b_contacts` on `lender` / `portfolio` gates new tables from being *read* by legacy paths — writers always populate them.

**Dependencies**
None. Ships before every other ticket.

---

### CG-TAM-1.1 · Feature flag `tamara_b2b_contacts`
**Type:** Task · **Component:** Config · **Est:** 1 pt
**Description**
Wire a per-lender / per-portfolio flag surfaced in the Lender Config screen, defaulted **off** everywhere except `lnd-tamara-b2b`.

**Acceptance criteria**
- [ ] Toggle appears on Lender Config → "Contacts" section.
- [ ] Reading the flag is one call on any surface (`useLenderFlag('tamara_b2b_contacts')`).
- [ ] Server-side check available for validators + execution engine.
- [ ] Flag change is versioned + audited.

---

### CG-TAM-1.2 · Shared `<ContactSelector>` component + `RecipientRule` config type
**Type:** Frontend · **Component:** Design System / Shared UI · **Est:** 5 pts
**Description**
One reusable UI + config type used by AI call, email, SMS and human campaign flows. No per-surface variants.

**API**
```ts
type RecipientRule = {
  mode: "primary_only" | "all_contacts" | "by_designation" | "priority_order"
  designations?: DesignationEnum[]     // used when mode = by_designation
  includeUnverifiedNumbers: boolean    // default true when flag is on
  maxContactsPerAccount?: number       // undefined = no cap
  fallback: "use_primary" | "skip_account"
}
```

**Acceptance criteria**
- [ ] Mode picker with the four modes + inline helper text per mode.
- [ ] Designation multi-select (chips) visible only in `by_designation`.
- [ ] Toggle: "Include unverified numbers" — default **on** when flag is enabled.
- [ ] Number input: "Max contacts per account" — blank = unlimited.
- [ ] Radio: fallback = use primary / skip account (only shown when mode ≠ primary_only).
- [ ] Read-only "Resolves to ~N contacts across audience" preview line, updates on rule change.
- [ ] Fires `onChange(rule)` on any edit; parent owns state.
- [ ] Uses semantic tokens, works in light + dark, screen-reader labels for every field.
- [ ] Component exported from `@/components/shared/contact-selector`; type from `@/data/recipient-rule`.

**Dependencies**
CG-TAM-1.0 (needs designation enum), CG-TAM-1.1 (component reads flag to hide from non-B2B lenders when embedded).

---

## Phase 2 · Trigger AI Call node

### CG-TAM-2.0 · Recipients step in AI Call full editor
**Type:** Frontend · **Component:** Journey Builder / AI Call node · **Est:** 3 pts
**Description**
Add a new "Recipients" step to the AI Call node full editor, positioned after the agent selection step. Uses `<ContactSelector>`.

**Acceptance criteria**
- [ ] Renders only when `tamara_b2b_contacts` is on for this lender.
- [ ] Persists `recipientRule` under `node.data.recipientRule` (typed `RecipientRule`).
- [ ] Deep-copies default rule (`primary_only`, `includeUnverifiedNumbers: true`, `fallback: use_primary`) on first open.
- [ ] "Resolves to ~N contacts" line reflects the current audience count.
- [ ] Save closes; on reopen selection persists.

**Files**
- `src/components/journeys/message-node-full-editor.tsx` (AI call variant)

---

### CG-TAM-2.1 · Contact merge tags in AI Call · Params tab
**Type:** Frontend · **Component:** Journey Builder / AI Call node · **Est:** 3 pts
**Description**
Add "Contact" as a mapping source alongside `borrower` / `deal`. Expose the contact-scoped tokens listed in the spec. Params resolve **per contact being called**, not per account.

**Acceptance criteria**
- [ ] Mapping-source dropdown gains `Contact` and `Business` options.
- [ ] Tokens available under `Contact`: `contact.first_name`, `contact.last_name`, `contact.designation`, `contact.phone`.
- [ ] Tokens available under `Business`: `business.name`, `business.cr_number`.
- [ ] Existing `borrower.*` and `deal.*` tokens unchanged.
- [ ] Preview panel resolves per selected sample contact when `recipientRule` returns >1 contact.

**Files**
- AI Call params tab in the AI Call editor.

---

### CG-TAM-2.2 · Delivery tab · retry target with rotation
**Type:** Frontend · **Component:** Journey Builder / AI Call node · **Est:** 3 pts
**Description**
Add a "Retry target" selector next to the outcome checkboxes. Determines who the retry attempt reaches when the current attempt does not succeed.

**Acceptance criteria**
- [ ] Options (radio): `same_contact` (existing behaviour) · `next_number_same_contact` · `next_contact_priority_order` · `next_contact_same_designation`.
- [ ] Persists to `node.data.retryTarget`.
- [ ] Summary line at the bottom of Delivery tab reflects rotation, e.g. "Retry up to 3 attempts; on no-answer, dial the next number of the same contact."
- [ ] `next_contact_same_designation` disabled with a tooltip when `recipientRule.mode !== 'by_designation'`.

**Files**
- AI Call Delivery tab.

---

### CG-TAM-2.3 · AI Call recipient / params validation
**Type:** Frontend · **Component:** Journey Builder / Validator · **Est:** 2 pts
**Description**
Journey Validator surfaces two new failure modes for AI Call nodes.

**Acceptance criteria**
- [ ] Warning when `recipientRule` resolves to **zero contacts** for the entry audience — deep-links to Recipients step.
- [ ] Error when a `Params` mapping references `contact.*` while `recipientRule.mode === 'primary_only'` and the account has no primary contact — deep-links to Params.
- [ ] Validator ignores both checks when `tamara_b2b_contacts` is off for the journey's lender.

**Files**
- `src/app/(app)/journeys/[id]/validator/page.tsx`

---

## Phase 3 · Composer / Email / SMS nodes

### CG-TAM-3.0 · Recipients + email send mode
**Type:** Frontend · **Component:** Composer + Journey Message nodes · **Est:** 5 pts
**Description**
The Send Email and Send SMS nodes and the standalone Composer add a Recipients selector (shared) and, for email only, a send-mode picker.

**Acceptance criteria**
- [ ] `<ContactSelector>` mounted on Send Email node editor, Send SMS node editor, and Composer inline flow (email + SMS).
- [ ] Email send-mode toggle: `one_message_per_contact` (default) · `one_message_with_cc` (primary in To, others in CC).
- [ ] De-duplicate identical email addresses across the resolved contact set before sending.
- [ ] Persists to `node.data.recipientRule` and `node.data.emailSendMode`.
- [ ] SMS always uses `one_message_per_contact`; send-mode picker hidden for SMS.

---

### CG-TAM-3.1 · Contact merge tags with fallback
**Type:** Frontend · **Component:** Composer + Templates · **Est:** 2 pts
**Description**
Add `Contact` merge tag namespace to the Add Variable popover in message editors and to the standalone Template Editor. Support a configurable fallback string when the tag resolves to nothing.

**Acceptance criteria**
- [ ] Add Variable popover grows a `Contact` group: `contact.first_name`, `contact.last_name`, `contact.full_name`, `contact.designation`, `contact.phone`, `contact.email`.
- [ ] Editor exposes a "Fallback for missing name" input (default: "Dear Finance Team") — stored per template on `template.contactNameFallback`.
- [ ] Server-side merge substitutes fallback when the contact field is empty; never leaves a literal `{{}}` in the rendered body.

---

### CG-TAM-3.2 · Preview per resolved contact
**Type:** Frontend · **Component:** Composer + Message node editor · **Est:** 2 pts
**Description**
The preview panel gains a dropdown to switch between resolved contacts for the selected sample account.

**Acceptance criteria**
- [ ] Sample account already selectable; add a second `Contact` selector below it.
- [ ] Renders subject + body + preheader against the picked contact.
- [ ] Missing-name paths visibly use the configured fallback.
- [ ] Works in both LTR and RTL (respects direction toggle from CG-RTL-1).

---

### CG-TAM-3.3 · Send-time balance / amount tag resolution
**Type:** Backend · **Component:** Merge engine · **Est:** 3 pts
**Description**
Balance and amount tags (`{{amount}}`, `{{outstanding}}`, `{{cut_off_balance}}`) must resolve at **send time**, not at journey-enrollment time. Balances update daily and change at cut-off.

**Acceptance criteria**
- [ ] Merge engine categorises tokens as `snapshot_at_enrol` vs `resolve_at_send`.
- [ ] All balance / amount tokens marked `resolve_at_send`; contact / borrower demographic tokens stay `snapshot_at_enrol`.
- [ ] Send-time resolver hits the daily-refreshed balance store, not the enrolment snapshot.
- [ ] Preview label warns "resolved at send" next to those tokens in the editor.
- [ ] Regression: consumer portfolios still see enrol-time behaviour (flag-gated).

---

### CG-TAM-3.4 · Reusable "Payment details" block
**Type:** Frontend + Backend · **Component:** Composer + AI Call runtime · **Est:** 3 pts
**Description**
Author a saved-module block "Payment details (IBAN)" in the HTML builder. Expose an "Insert payment details" action from AI call transcripts and agent workspace so the current contact receives them on demand.

**Acceptance criteria**
- [ ] Saved module `payment_details_v1` includes IBAN, bank name, beneficiary, reference.
- [ ] Values resolve from the lender's config, not per-account (Tamara has one payment endpoint for B2B).
- [ ] "Send payment details to current contact" action available in AI Call flow (agent tool) and in Agent Workspace inline.
- [ ] Delivery uses the contact's verified email first, falling back to WhatsApp if configured.
- [ ] Records a `communication_attempt` with `channel: "payment_details_block"`.

---

## Phase 4 · Human campaigns + Dialer

### CG-TAM-4.0 · Campaign creation — shared selector + within-account dial order
**Type:** Frontend · **Component:** Campaigns · **Est:** 3 pts
**Description**
Create Human Campaign editors (in Campaigns app and in the journey node) adopt `<ContactSelector>`. Add a "within-account dial order" selector.

**Acceptance criteria**
- [ ] Audience tab replaces the current single-contact assumption with `<ContactSelector>`.
- [ ] New field: "Within-account dial order" — `priority_rank` (default) · `designation` (primary sort by designation list order, then rank) · `last_outcome_recency`.
- [ ] Persists on `campaign.recipientRule` and `campaign.withinAccountOrder`.
- [ ] Existing consumer campaigns keep the current UI when the flag is off.

**Files**
- `src/components/journeys/human-campaign-full-editor.tsx`
- `src/app/(app)/campaigns/[id]/edit/page.tsx`

---

### CG-TAM-4.1 · Agent workspace — contact list + switch + inline add
**Type:** Frontend · **Component:** Agent Workspace · **Est:** 5 pts
**Description**
When an agent is connected to an account, the workspace shows every known contact with its designation, phones, and last outcome. The active contact is highlighted; the agent can switch mid-call.

**Acceptance criteria**
- [ ] Contact list panel with rows: name · designation · primary chip · phones (with verification chip) · last outcome.
- [ ] "Active" row is visually emphasised; switching updates the dialer's target immediately.
- [ ] Inline "Add contact" action (name, designation, phone, source = `agent_added`, verification = `unknown`).
- [ ] Switching contacts writes the new active contact to `account_rotation_state.last_contact_id` and stops the previous timer.

---

### CG-TAM-4.2 · Per-contact call dispositions
**Type:** Frontend + Backend · **Component:** Agent Workspace · **Est:** 3 pts
**Description**
Three new dispositions: `wrong_contact`, `referred` (with inline add-new-contact form), `not_responsible`. Applied to the contact, not the account.

**Acceptance criteria**
- [ ] Dispositions selectable at end of call.
- [ ] `wrong_contact` marks the contact's `do_not_contact = true` and the used phone `verification_status = invalid`.
- [ ] `referred` opens a form: name, designation, phone (optional). New contact appears with `source = agent_added`, `priority_rank` immediately after the current contact.
- [ ] `not_responsible` marks the contact `is_legally_liable = false` and drops them from `by_designation` results in future campaigns.
- [ ] All three write a `communication_attempts` row with the disposition.

---

### CG-TAM-4.3 · Redial contact picker — align with shared selector
**Type:** Frontend · **Component:** Campaigns / Schedule tab · **Est:** 2 pts
**Description**
The existing redial contact picker on the campaign Schedule tab currently ships fixed Contact 1–5. Replace with `<ContactSelector>` for the B2B path; keep the numbered chips for consumer.

**Acceptance criteria**
- [ ] When flag is on, redial picker renders `<ContactSelector>` with mode locked to the campaign's `recipientRule`.
- [ ] When flag is off, existing Contact 1–5 chips remain (no regression).
- [ ] Round sequence builder still supports per-round wait times; rounds now target contacts, not slot numbers.

**Files**
- `src/components/campaigns/campaign-schedule-tab.tsx`

---

## Phase 5 · Execution rules

### CG-TAM-5.0 · Per-contact frequency caps
**Type:** Backend · **Component:** Execution Engine · **Est:** 5 pts
**Description**
Frequency caps currently count attempts per account. Move to per-contact counters, enforced across journeys and campaigns.

**Acceptance criteria**
- [ ] `contact_frequency_counters` table: `contact_id, channel, window (day | week | 30d), count, window_start`.
- [ ] Counter increments on every send / dial attempt to that contact.
- [ ] Journey / campaign preflight checks the contact's counter, not the account.
- [ ] Journey settings continue to expose caps at the account level as a **ceiling** — the stricter of contact-level or account-level wins.
- [ ] Flag-gated: consumer portfolios stay on the account-level counter.

---

### CG-TAM-5.1 · Sequential rotation enforcement
**Type:** Backend · **Component:** Execution Engine · **Est:** 5 pts
**Description**
When a recipient rule resolves to multiple contacts, outreach runs sequentially in priority / dial order. The next contact is attempted only after the current one's retries are exhausted **or** its outcome triggers rotation.

**Acceptance criteria**
- [ ] Execution engine walks resolved contacts one at a time, advancing via `account_rotation_state`.
- [ ] Retry policy exhaustion advances to `next_contact_id`.
- [ ] `retryTarget` from CG-TAM-2.2 drives which contact gets `next_contact_id`.
- [ ] Never dials two contacts on the same account in parallel — enforced by a per-account lock in the dispatcher.
- [ ] Rotation state persists across restarts of the engine.

**Dependencies**
CG-TAM-1.0 (`account_rotation_state`), CG-TAM-2.2 (retryTarget), CG-TAM-5.2 (respects committing outcomes).

---

### CG-TAM-5.2 · Account-level committing-outcome stop
**Type:** Backend · **Component:** Execution Engine · **Est:** 3 pts
**Description**
When any contact on an account reaches a committing outcome (`ptp`, `paid`, `dispute_raised`), stop **all** further outreach to every contact on that account across every journey and campaign. Not configurable.

**Acceptance criteria**
- [ ] Committing outcomes trigger `account.outreach_stop = true` with reason + timestamp.
- [ ] Dispatcher checks `account.outreach_stop` before every send / dial.
- [ ] In-flight attempts on other contacts are cancelled if not yet dispatched; already-dispatched calls are allowed to complete but log a note.
- [ ] "Reactivate outreach" is a manual admin action, audited.
- [ ] Applies whether the flag is on or off — B2C accounts benefit too.

---

### CG-TAM-5.3 · Number verification updates from call outcomes
**Type:** Backend · **Component:** Execution Engine · **Est:** 3 pts
**Description**
Every call outcome must update the phone's verification status.

**Acceptance criteria**
- [ ] `connected_right_party` → phone.verification_status = `verified`.
- [ ] `wrong_number` → phone.verification_status = `invalid`; phone excluded from future selections.
- [ ] `no_answer / busy / voicemail` → no change (still `unknown` if unverified, still `verified` if verified).
- [ ] `unreachable / disconnected` (3 consecutive) → phone.verification_status = `unreachable`; excluded from future selections until manually re-verified.
- [ ] Recipient rule respects the exclusion set — `invalid` and `unreachable` phones are never dialled regardless of `includeUnverifiedNumbers`.

---

## Phase 6 · QA + Rollout

### CG-TAM-6.0 · QA — end-to-end multi-contact sweep
**Type:** QA · **Component:** QA · **Est:** 5 pts
**Description**
Walk every touched surface with a Tamara B2B seed account (3 contacts across designations, mixed verification, mixed phone counts).

**Test data**
- Account `MERCHANT-1001` — 3 contacts:
  - CEO Office: Sara Al-Sabah — 1 verified mobile, 1 unverified landline
  - Finance: Omar El-Sayed — 1 verified mobile, 1 verified email
  - Admin: Nourhan Adel — 1 unverified mobile, `do_not_contact = true`
- Committing outcome test: run a PTP on the Finance contact and verify all other outreach halts.

**Acceptance grid (repeat per surface)**
- [ ] AI call node preview resolves to the right contacts per recipient rule.
- [ ] Email preview renders per contact with correct fallback for missing names.
- [ ] SMS preview per contact; unverified mobile included when toggle on.
- [ ] Human campaign creation reflects the chosen designations + within-account order.
- [ ] Agent workspace shows all 3 contacts; switching works; disposition on wrong contact flips DNC + invalid.
- [ ] Frequency cap on Finance contact does not affect CEO Office's cap.
- [ ] Sequential rotation observed in the run log — no parallel dispatch on the same account.
- [ ] PTP on Finance triggers `outreach_stop` on account; subsequent journey enrolment is skipped with reason.
- [ ] Legacy consumer journey on `lnd-mashreq` unaffected (regression).

---

### CG-TAM-6.1 · Tamara B2B enablement + backfill
**Type:** Ops · **Component:** Rollout · **Est:** 3 pts
**Description**
Turn on the flag for `lnd-tamara-b2b` after all Phase 1–5 tickets land, and backfill contacts from the current Tamara feed.

**Acceptance criteria**
- [ ] Backfill job reads Tamara's current merchant contact export, upserts `contacts` and `contact_phones` for ~14k accounts.
- [ ] Backfill sets `is_primary` based on the current single-contact record; `is_legally_liable = true` on primary by default; designation from source when present, `other` otherwise; verification `verified` for phones that have received a successful send in the last 30 days, `unknown` otherwise.
- [ ] Enable `tamara_b2b_contacts` on `lnd-tamara-b2b` after backfill success.
- [ ] Dry-run the flag in a staging environment for 72h with a subset (500 merchants) and diff outreach counts vs. shadow control.
- [ ] Rollback: turning the flag off restores single-contact behaviour end-to-end (no data loss).

---

## Suggested sequencing

| Sprint | Tickets |
|---|---|
| 1 | 1.0, 1.1, 1.2 (foundation lands first) |
| 2 | 2.0, 2.1, 2.2, 2.3 (AI Call node) |
| 3 | 3.0, 3.1, 3.2, 3.3, 3.4 (Composer / message nodes) |
| 4 | 4.0, 4.1, 4.2, 4.3 (Human campaigns + agent workspace) |
| 5 | 5.0, 5.1, 5.2, 5.3 (execution engine) |
| 6 | 6.0, 6.1 (QA + rollout) |

Total ≈ 78 pts. Adjust once engineering weighs in on the backend estimates.

## Rollout risk register

- **Backfill quality**: If designation is missing in the source feed for >20% of contacts, downstream `by_designation` rules will underperform. Mitigation: enrichment task in Sprint 6 pre-cutover.
- **Sequential rotation vs. current throughput**: Sequential enforcement will slow down "everyone gets called on day 1" campaigns. Product to confirm the trade-off is acceptable — spec says it is (never parallel), so proceed.
- **Committing outcome stop is not configurable**: Some ops folk may want to override. Flag as a policy decision, not a bug.
- **Regression risk on consumer portfolios**: Every ticket must respect the flag; the QA acceptance grid explicitly retests a consumer journey.
