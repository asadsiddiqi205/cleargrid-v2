# Feature: Bidirectional (Arabic / English) message editing

**Epic ID (suggested):** CG-RTL-1
**Goal:** Every place a ClearGrid user manually authors message copy should render Arabic right-to-left and English left-to-right. Where the browser guess is wrong or the author wants explicit control, a small pill toggle (**Auto · EN · AR**) sits at the top of the field group and pins the direction.

**Shipped prototype:** [cleargrid-v1-jb.netlify.app](https://cleargrid-v1-jb.netlify.app)
Reference commit: `4f94451` on `main` (repo `asadsiddiqi205/cleargrid-v2`).

---

## Design system — foundation ticket

### CG-RTL-1.0 · Shared `DirectionToggle` component

**Type:** Task
**Component:** Design System / Shared UI
**Estimate:** 2 pts

**Description**
Create a compact three-way pill toggle that lets an author pick a writing direction for a group of adjacent fields.

**States:** `Auto` (default, browser bidi heuristic per line) · `EN` (force LTR) · `AR` (force RTL).

**API**
```ts
type TextDir = "auto" | "ltr" | "rtl"

<DirectionToggle
  value={textDir}
  onChange={setTextDir}
  label?: string    // optional caption, "Direction" by default
/>
```

**Acceptance criteria**
- [ ] Renders three buttons in a segmented control with `Auto` active by default.
- [ ] Hover shows the direction tooltip ("Force left-to-right", etc).
- [ ] Uses semantic tokens — works in light and dark themes.
- [ ] `role="tablist"` + `aria-selected` on the active button.
- [ ] Toggle updates the parent-owned state only — never persists a value on its own.
- [ ] Consumers pass the value down to input/textarea `dir` attribute.

**Notes on scope**
Direction toggle should NOT translate content or store a language on the record — it's a viewing preference for editing. Storing "template language" is out of scope.

---

## Surface tickets — one per authoring surface

Each surface needs the toggle placed at the top of its manual-editing block, and every input/textarea inside that block bound to the toggle's value.

### CG-RTL-1.1 · Journey Builder — SMS / Email / WhatsApp node editor

**Type:** Task
**Component:** Journey Builder
**Estimate:** 3 pts

**Description**
The full-page action-node editor for Send Email, Send SMS, and Send WhatsApp nodes must let authors switch direction while writing manual content.

**Acceptance criteria**
- [ ] Toggle appears when Compose mode is `Manual`; hidden when a template is selected (no manual editing surface).
- [ ] Toggle controls `dir` on: manual subject input (email only), HTML body textarea (email only), plain-text fallback textarea (email only), SMS body textarea, WhatsApp body textarea.
- [ ] Selection persists while switching Compose mode toggle but resets when the node is closed and reopened.
- [ ] RTL selection right-aligns caret and text; Arabic characters flow right-to-left.
- [ ] EN selection forces LTR even for Arabic content (author preview override).

**Files**
- `src/components/journeys/message-node-full-editor.tsx`

---

### CG-RTL-1.2 · Journey Builder — Create Human Campaign node editor

**Type:** Task
**Component:** Journey Builder
**Estimate:** 2 pts

**Description**
The Messages tab of the Create Human Campaign node has three call-flow textareas (Welcome / Loop / Busy) that are typically authored in Arabic for KSA / UAE agent scripts.

**Acceptance criteria**
- [ ] Toggle appears at the top of the Messages tab, in the header row.
- [ ] Toggle controls `dir` on all three textareas.
- [ ] Toggle state is per-tab (resets when tab is switched away and back).
- [ ] Preview card in the right column (if reintroduced) also honours the toggle when rendering the copy.

**Files**
- `src/components/journeys/human-campaign-full-editor.tsx`

---

### CG-RTL-1.3 · Campaigns — `/campaigns/[id]/edit` Messages tab

**Type:** Task
**Component:** Campaigns
**Estimate:** 1 pt

**Description**
Same call-flow textareas as CG-RTL-1.2 (Welcome / Loop / Busy) live on the standalone campaign edit page. Same UX.

**Acceptance criteria**
- [ ] Toggle in the Messages tab header, next to the "Open template editor" button.
- [ ] Toggle controls `dir` on all three textareas.
- [ ] Call-flow preview cards (welcome / loop / busy) render user content in the toggled direction.

**Files**
- `src/app/(app)/campaigns/[id]/edit/page.tsx`

---

### CG-RTL-1.4 · Composer — inline flow (Email + SMS)

**Type:** Task
**Component:** Composer
**Estimate:** 3 pts

**Description**
The Composer's inline authoring flow (`/email-generator/new` and continuations) covers the highest-frequency authoring path for both email and SMS.

**Acceptance criteria**
- [ ] Toggle appears in the inline Email flow above the Subject input.
- [ ] Toggle appears in the SMS flow next to the existing "Create journey" dropdown.
- [ ] Toggle controls `dir` on: email subject, email preview text, email body Textarea, SMS body Textarea.
- [ ] Character-count chip (SMS `n/160`) stays correctly aligned in RTL.
- [ ] Preview panel (`PreviewPanel`) renders the same content in the same direction as the editing panel.
- [ ] AI Assist, insert-token, and playbook actions continue to work when direction is set to AR.

**Files**
- `src/components/composer/editor-panel.tsx`
- `src/components/composer/preview-panel.tsx` (verify RTL is honoured)

**Out of scope**
The AI Assist prompt sent to the model is unaffected by the toggle — the toggle is a UI preference only.

---

### CG-RTL-1.5 · Composer — HTML builder text block

**Type:** Task
**Component:** Composer / HTML Builder
**Estimate:** 3 pts

**Description**
The block-based email builder (`/email-generator/builder/[id]`) has a Text block whose HTML is edited in the right-side properties panel. RTL support must work both while authoring and in the canvas render.

**Acceptance criteria**
- [ ] Direction toggle appears at the top of the Text block property panel (per-block state).
- [ ] Toggle controls `dir` on the HTML body Textarea in the property panel.
- [ ] Canvas render of the Text block honours `dir="auto"` so RTL content right-aligns automatically.
- [ ] Custom-HTML block also renders with `dir="auto"` on the canvas.
- [ ] Preview & Test dialog uses the same canvas render component so it inherits the fix.
- [ ] Default text alignment for text blocks is `start` (not `left`) so RTL content flows correctly.

**Files**
- `src/components/composer/builder/properties-panel.tsx`
- `src/components/composer/builder/block-renderers.tsx`

**Notes**
Out of scope for v1: multi-row bidirectional documents where per-row direction differs. Toggle is per-block.

---

### CG-RTL-1.6 · Standalone Template Editor

**Type:** Task
**Component:** Templates
**Estimate:** 1 pt

**Description**
The template-authoring page (`/templates/[id]/edit`, also embedded in the "Edit template" modal from other editors) has a Template Settings block with Subject / Preview / From-name fields that are commonly Arabic.

**Acceptance criteria**
- [ ] Toggle in the Template Settings header, next to the section title.
- [ ] Toggle controls `dir` on: Subject Line, Preview Text, From Name inputs.
- [ ] Reply-To stays LTR always (it's an email address, always Latin).

**Files**
- `src/components/templates/template-editor.tsx`

---

### CG-RTL-1.7 · Journey Builder — legacy right-side inspector

**Type:** Task (cleanup)
**Component:** Journey Builder
**Estimate:** 1 pt

**Description**
The legacy right-side `NodeConfigPanel` still handles some action node types (WhatsApp, human-campaign inspector, and any node the new full-page editor doesn't override). Its manual editing subject / HTML body / plain-text / SMS body fields need `dir="auto"` at minimum so Arabic renders correctly for those flows too.

**Acceptance criteria**
- [ ] All manual-mode textareas and the subject input have `dir="auto"`.
- [ ] No visible regression on English content.
- [ ] Optionally: a mini toggle above the manual mode section if the panel is retained long-term. For v1 `dir="auto"` alone is acceptable.

**Files**
- `src/components/journeys/node-config-panel.tsx`

---

## QA / cross-cutting

### CG-RTL-1.8 · QA — end-to-end direction sweep

**Type:** QA
**Component:** QA
**Estimate:** 2 pts

**Description**
Walk every editing surface with three test scripts and verify direction and visual correctness.

**Test data (paste these verbatim)**
- **English:** `Hi {{borrower.first_name}}, this is a friendly reminder that your payment of {{amount}} is due today. Pay now: cg.co/p/xxxx`
- **Arabic:** `مرحباً {{borrower.first_name}}، هذا تذكير ودّي بأن دفعتك بقيمة {{amount}} مستحقة اليوم. ادفع الآن: cg.co/p/xxxx`
- **Mixed:** `Hi Sara — دفعتك بقيمة AED 4,500 مستحقة today. Pay: cg.co/p/xxxx`

**Acceptance criteria per surface** (repeat for each of CG-RTL-1.1 to 1.7)
- [ ] English pasted with Auto → LTR, left-aligned.
- [ ] Arabic pasted with Auto → RTL, right-aligned per line.
- [ ] Mixed pasted with Auto → each line follows its first strong character (English line LTR, Arabic line RTL).
- [ ] EN toggle forces every line LTR regardless of content.
- [ ] AR toggle forces every line RTL regardless of content.
- [ ] Merge tokens (`{{borrower.first_name}}`) survive intact in all three modes.
- [ ] Preview surface (device mockup, email inbox card, call-flow bubble) matches the editing surface direction.

**Browser matrix**
Chrome + Safari on macOS; Chrome on Android; Safari on iOS.

---

## Nice-to-have follow-ups (not in this epic)

- Store `preferred_language` per template so a template can persist its default direction across sessions and users.
- Add an inline "Detect direction from content" hint when the toggle disagrees with the content's own bidi guess.
- Emit an event on toggle change so analytics can measure how often authors override Auto.

---

## Rollout

Feature ships behind no flag — the toggle is additive and the default `Auto` keeps existing behaviour unchanged. Merge freely once each surface ticket is signed off.
