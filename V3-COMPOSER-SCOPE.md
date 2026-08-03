# Command Composer v3 — Scope Notes

Reference doc for writing the scope brief. Everything below is what's been
built into the prototype at [cleargrid-v1-modblk.vercel.app](https://cleargrid-v1-modblk.vercel.app)
and earlier deployments.

---

## 1. Goal

Turn the inline composer into a full email-building environment inside Command —
HTML template authoring, cross-channel playbooks, AI template generation, and
Journey Builder integration. The v3 builder is the powerful mode that sits next
to the existing inline composer (textarea) and AI mode.

---

## 2. Surfaces

### Surface 1 — Full HTML email builder

**Where:** `/email-generator/builder/[id]` (live builder), opened from:

- Templates list → "Open in v3 builder" on any rich template
- Inline composer → "Open v3 builder" chip in the toolbar (all channels)
- AI Generated mode → "Build HTML template in v3 builder" when the user picks
  the HTML output format
- New template wizard → after step 3 the primary CTA pushes to the builder
  pre-scoped to the chosen lender + purpose
- Playbook Templates tab → "Author in v3 builder" link per playbook

**Layout:** three columns

- **Left rail** — Block palette (12 block kinds) + Saved modules tab
- **Center** — White email canvas with rows + columns, drag-and-drop blocks,
  drop-zone rails, click-to-select, top-right per-block toolbar
- **Right rail** — Properties panel (per-block fields when a block is selected;
  document-level fields — language, page bg, content width — when nothing is)
- **Bottom strip** — Live playbook lint (pass / N error(s) / warning(s))

**Top toolbar:** back to Templates · template name · status badge · undo/redo ·
desktop/mobile toggle · EN/AR/Bilingual toggle · Composer GPT · A/B · History ·
Save as template · Preview & test · Create journey · Submit / Approve

**Block kinds supported:**

| Kind | Notes |
|---|---|
| `text` | Inline HTML body block |
| `image` | Single image + optional link |
| `button` | Standard CTA |
| `payment_link` | First-class **trackable** payment button; carries a `conversionEvent` field (payment_initiated / ptp_captured / settlement_accepted) so analytics tie back to the right funnel goal |
| `divider`, `spacer` | Visual rhythm |
| `table` | Payment-schedule / breakdown grid |
| `social`, `video` | Decorative |
| `custom_html` | Escape hatch |
| `saved_module` | Reference to a re-usable module (header/footer/compliance) |
| `ai_conditional` | Two-variant swap driven by borrower attributes |

**Drag & drop:**

- Block reordering inside the canvas (existing block grip → drop rails between
  blocks, cross-column moves work for 2-column rows)
- Palette → canvas drag-in (creates a new block at the drop position)
- Locked blocks/rows reject drops and hide the grip
- × delete chip on the top-right of every selected non-locked block

**Locking model:** any block or row can be marked `locked` — embeds see it as
read-only chrome. This is how the v1/v2 "locked-template" mode rides on top of
the full v3 builder.

**RTL / Arabic:**

- Language toggle on the top bar (EN · AR · Bilingual)
- Switching to AR translates every non-locked text/button/CTA/table block via a
  phrase dictionary (~80 phrases covering all starter-doc copy)
- Applies `dir="rtl"` on the document container + Arabic font stack to every
  translated text block
- Bilingual splits every non-locked row into two columns: EN left, AR right
- Switching back to EN restores the original copy from a snapshot taken when
  the user left English (no reverse-dictionary roundtripping)

**Files:**

- `src/app/(app)/email-generator/builder/[id]/page.tsx`
- `src/components/composer/builder/builder-canvas.tsx`
- `src/components/composer/builder/builder-toolbar.tsx`
- `src/components/composer/builder/block-palette.tsx`
- `src/components/composer/builder/block-renderers.tsx`
- `src/components/composer/builder/properties-panel.tsx`
- `src/components/composer/builder/builder-dialogs.tsx` (every dialog)
- `src/data/builder-blocks.ts` (block model + sample docs)
- `src/data/starter-docs.ts` (purpose + lender → tailored starter doc)
- `src/data/translations-ar.ts`, `src/lib/translate-builder-doc.ts`

---

### Surface 2 — Templates · Saved modules · Brand kits · Playbooks

**Where:** tabbed library at `/templates`, `/templates/modules`, `/strategies`
(brand kits were removed — folded into starter-doc colour theming).

**Templates** — the existing rich-template + plain-template registry, with
authoring metadata (Draft · In review · Active · Archived), version history,
maker/checker approval trail, lender × purpose × channel taxonomy preserved
from v1/v2.

**Saved modules** — first-class reusable blocks:

- 5 kinds: `header`, `footer`, `payment_cta`, `compliance`, `greeting`
- Each module declares `locked` (uneditable inline) and optional `bilingual`
- Lender-scoped (`lnd-mashreq`, `lnd-tamara`, etc.) or `general`
- Show up in the v3 builder palette's "Saved modules" tab — drag in to embed
- Updating the module pushes through to every template that embeds it

**Module creation flow:**

1. **Modal** at `/templates/modules` → "New module" — collects kind, lender,
   locked / bilingual toggles, name, optional description, and shows a
   **preset gallery** (~3 starting points per lender × kind, e.g. "Mashreq
   orange ribbon" / "FAB navy strip" / "Generic logo + ribbon"). Live previews.
2. **Dedicated module canvas** at `/templates/modules/new` — the modal's
   "Create & open builder" pushes here, NOT the template builder. The canvas is
   intentionally simpler: a single vertical block stack, no rows/columns, no
   header/footer modules to embed, no journey/A-B/conditional features.

**Module canvas features:**

- Same `BlockRenderer` as the template builder, so renders are identical
- Click to select, × to delete, grip to drag-reorder with the same emerald
  drop rails
- Right rail flips between block properties (when a block is selected) and
  module properties (kind, lender, locked, bilingual)
- Left rail has presets gallery + 5 primitives (Text, Image, Button, Divider,
  HTML) + merge tag chips
- Top bar: name · kind badge · block count · desktop/mobile · Preview/HTML
  toggle · Save module

**Playbooks** — moved back to v2 design (4-tab dialog: Overview · Templates ·
AI Prompt · Cadence) with one addition: the **Templates tab now includes a
Rich HTML template slot** with a picker over the rich-template registry and an
"Author in v3 builder" link.

**Brand kits** — removed as a standalone surface. Brand-kit data is still used
internally to drive starter-doc colours; there's just no UI to author them
separately.

**Files:**

- `src/app/(app)/templates/page.tsx`, `/templates/modules/page.tsx`,
  `/templates/modules/new/page.tsx`, `/strategies/page.tsx`
- `src/components/templates/library-tabs.tsx`, `modules-view.tsx`,
  `templates-view.tsx`
- `src/components/strategies/strategies-grid.tsx` (v2 playbook editor +
  HTML-template attachment)
- `src/data/saved-modules.ts`, `module-presets.ts`, `brand-kits.ts`,
  `template-versions.ts`

---

### Surface 3 — Playbooks (first-class voice + ruleset)

**Where:** `/strategies`

**What a playbook bundles:**

- Tone, language (EN / AR), compliance posture
- AI prompt (system prompt for Composer GPT when this playbook is active)
- Cadence settings
- One template per channel: **email (plain), SMS, WhatsApp**, plus a
  **rich HTML email template** attached as a separate slot
- Lender scope (`general` or `lnd-*`)
- Status: Active / Draft / Archived

**What it does (data-model intent):**

- Steers Composer GPT
- Lints manual content via the rules engine (`src/lib/playbook-lint.ts`)
- Provides the default tone/voice for the AI mode

**Lint detector kinds** (`PlaybookRule['detector']`):

- `forbidden_phrase` — banned phrases (e.g. Tamara forbids "FINAL NOTICE")
- `required_phrase` — must include
- `max_length` — channel-aware (subject / sms_body / email_body)
- `reading_level` — Flesch–Kincaid grade cap
- `must_include_disclaimer` — saved-module id must be embedded
- `no_excessive_caps` — fires only on a run of N+ consecutive ALL-CAPS words
  (isolated acronyms don't trip it)

**Seeded playbooks** (`src/data/playbooks-v3.ts`):
Mashreq Formal · Tamara Friendly · CashNow Urgent · ENBD Hardship · Bilingual
UAE · FAB Final-Stage (draft).

---

### Surface 4 — AI generation

Two distinct surfaces, both stubbed (prototype canned outputs):

**Composer GPT** (inside v3 builder)

- Prompt-first dialog — large textarea at the top, recommendation chips below
- Live intent inference from the prompt text ("settlement" / "broken" / "final
  notice" / "welcome" / "hardship" / "ptp" / "reminder")
- 6 intent presets as clickable chips that pre-fill the prompt with a seed
- Steering context strip: active playbook · brand · language
- After Generate: preview card with reasoning, subject suggestion, SMS variant,
  block/row counts, and live playbook lint
- Outputs blocks (not opaque HTML) so the result is editable in the canvas
- Lint errors don't block insertion — button becomes amber "Insert anyway"

**Inline AI assist** — per-block rewrite from the properties panel:

- More formal · More friendly · Shorten · Translate to Arabic · Rewrite for
  clarity

**AI Generated mode** in the inline composer (`/email-generator/new`):

- First step asks: **Text-based template** (stays inline) OR **Complete HTML
  template** (pushes to v3 builder with `?from=ai`)
- The HTML path lands on a **fully decorated email** — `buildAiGeneratedHtmlDoc`
  produces a 10-row canvas: brand header · hero banner with purpose chip ·
  greeting + body · spotlight card (2-col key facts) · primary CTA · supporting
  paragraph · divider · "What happens next" / "Need help?" 2-col · secondary
  CTA · footer

**Files:**

- `src/components/composer/builder/builder-dialogs.tsx` (`ComposerGptDialog`,
  `InlineAiDialog`, `MergeTagDialog`)
- `src/data/composer-gpt-presets.ts` (canned outputs per intent × lender)
- `src/components/composer/email-ai-generate-mode.tsx` (text/HTML chooser)
- `src/data/starter-docs.ts` (`buildAiGeneratedHtmlDoc`)

---

### Surface 5 — Conditional content · Preview · A/B · Approval · Version history

All as dialogs from the builder toolbar.

**Conditional content** (`ConditionalDialog`)

- Per-block visibility gated on borrower attributes
- Same operators as Journey Builder Decision Split — One Of / None Of, AND /
  OR — for consistency
- Show-when-match vs hide-when-match toggle
- Selected blocks get a violet "Conditional" badge on the canvas

**Preview & test** (`PreviewTestDialog`)

- 5 device/client previews: Desktop · Mobile · Dark mode · Gmail (web) ·
  Outlook (web)
- Pre-flight checks: spam score · link audit · accessibility · images
- Send-a-test input on the right rail

**A/B test** (`AbTestDialog`)

- Subject + content variants
- Goal **is the payment-outcome funnel goal** (paid / PTP / settlement /
  activated / replies) — not opens or clicks
- Allocation %, conversion %, sent counts, confidence

**Approval workflow + version history**

- Statuses: Draft → In review → Active → Archived
- Maker/checker captured per transition
- `VersionHistoryDialog` shows the full timeline + change summary per version
- Approval bar in the toolbar swaps Submit-for-review / Approve & publish /
  Publish update based on current status

**Files:**

- `src/components/composer/builder/builder-dialogs.tsx` (all 5 dialogs in one
  file)
- `src/data/template-versions.ts` (authoring metadata, A/B test records)

---

### Surface 6 — Journey integration

Three touchpoints, all sharing one template + playbook library with Journey
Builder:

**Journeys consume composer content** — a journey's Send Email / Send SMS node
picks from the shared template registry. Rich HTML templates are pickable from
within the v2 playbook editor's Templates tab.

**Create journey from composer** — every channel of the inline composer
(email / SMS / WhatsApp) has a **Create journey** dropdown in its toolbar. The
v3 builder also has a "Create journey" button. Picking a blueprint pushes to
`/journeys/new?from=composer&blueprint=…&channel=…&templateName=…&audience=…`.

**Funnel-to-journey** — on the message detail page, each funnel-segment CTA
(didn't deliver / didn't open / didn't click / didn't pay) scaffolds a draft
journey with the audience + first-Send template pre-placed.

**Journey blueprints** (`src/data/journey-blueprints.ts`):

| Blueprint | Nodes (the journey canvas lands on this graph fully wired) |
|---|---|
| **Single Send node** | Trigger → Send (2 nodes) |
| **3-step reminder cadence** | Trigger → Send · wait 3d · SMS · wait 2d · Final · End-Paid (7 nodes) |
| **PTP recovery branch** | Trigger → Send · wait 2d · Decision split on `ptp_status` → PTP-confirmed path (Send + End-PTP) **or** Escalate path (Trigger AI Call + End-Escalated) (8 nodes) |
| **Settlement push** | Trigger → Settlement Send · wait 5d · Reminder Send · wait 5d · Trigger AI Call (callback capture on) · End-Settled (7 nodes) |
| **Funnel** | Trigger (segment label from the funnel CTA) → Send (2 nodes, used by Surface 6's funnel-to-journey) |

**Files:**

- `src/data/journey-blueprints.ts` — blueprint graph factory
- `src/components/journeys/journey-canvas.tsx` — `from=composer` / `from=funnel`
  / `from=ai` hydration block reads `blueprint` + `channel` + `templateName` +
  `audience` and merges the blueprint into the canvas
- `src/components/composer/builder/builder-dialogs.tsx` — `CreateJourneyDialog`
- `src/components/composer/funnel-segment-cta.tsx` — segment CTAs on message
  detail
- `src/components/composer/editor-panel.tsx` — `CreateJourneyDropdown` (used
  in all 3 inline-composer channels)

---

## 3. Cross-cutting items / non-feature work

**Messages list polish** (`/email-generator`)

- Compact title row + "+ New message" CTA pinned at top-right, always above the
  fold
- KPI cards condensed (`p-3.5 text-xl` instead of `p-5 text-3xl`)
- 4 KPIs sit in a single row at desktop widths

**SMS analytics**

- `MessageFunnelChart` is channel-aware — for SMS it collapses to Sent →
  Delivered → Goal (no opened/clicked, since SMS can't report them)
- "Delivered" carries an amber caveat explaining the channel limitation
- Goal rate computed against Delivered for SMS (not Clicks)
- Seeded SMS messages include funnel data (`msg-4`, `msg-16`)
- Funnel-segment CTAs on message detail adapt: hide didn't-open / didn't-click
  segments for SMS

**Dialog ergonomics**

- Global `DialogContent` caps at `max-h-[90vh]` with `overflow-y-auto` so no
  dialog clips its action row
- Composer GPT uses a custom flex layout with sticky footer so Generate / Insert
  buttons are always reachable

**Drag handle + delete UX**

- Floating per-block toolbar (grip + ×) appears on hover, locks on when
  selected — same widget in template canvas, module canvas, and the AI-generated
  doc preview

---

## 4. Routes added / changed

| Route | Purpose |
|---|---|
| `/email-generator/builder/[id]` | v3 HTML builder (existing templates + `new`) |
| `/email-generator/builder/new?lender=…&purpose=…&channel=…&from=ai` | New-template / AI handoff |
| `/email-generator/[id]` | Message detail page (already existed; now shows funnel-to-journey CTAs) |
| `/templates` | Templates library tab (existing) |
| `/templates/modules` | Saved modules library (new) |
| `/templates/modules/new` | Module builder canvas (new, block-based) |
| `/strategies` | Playbooks (v2 grid restored, with HTML template slot added to the Templates tab) |
| `/journeys/new?from=composer&blueprint=…&channel=…&templateName=…` | Journey hydration from composer |
| `/journeys/new?from=funnel&message=…&segment=…&template=…` | Funnel-to-journey hydration |

Routes removed: `/templates/brand-kits` (folded into starter-doc theming).

---

## 5. Data models added

- `BuilderDocument`, `BuilderRow`, `BuilderBlock` — block model used by the
  template + module canvases (`src/data/builder-blocks.ts`)
- `Playbook` v3 — voice + ruleset + lint rules (`src/data/playbooks-v3.ts`).
  Coexists with the v2 `Strategy` type; v2 is what powers `/strategies`
- `SavedModule` — reusable block records (`src/data/saved-modules.ts`)
- `ModulePreset` — multiple visual starting points per lender × kind
  (`src/data/module-presets.ts`)
- `TemplateAuthoring`, `AbTest`, `TemplateVersionEntry` — authoring metadata
  (`src/data/template-versions.ts`)
- `BrandKit` — per-lender visual identity, used internally for starter-doc
  colour theming (`src/data/brand-kits.ts`)
- `BlueprintId`, `buildBlueprint(...)` — journey blueprint graphs
  (`src/data/journey-blueprints.ts`)
- `EN_TO_AR` phrase dictionary + `translateDocToArabic` /
  `translateDocToBilingual` (`src/data/translations-ar.ts`,
  `src/lib/translate-builder-doc.ts`)

---

## 6. Locked decisions / things to flag in the scope doc

- Editor engine is **mocked** in React (not Beefree/Unlayer SDK). For
  production, swap to a real embed; the surface contract should stay the same.
- AI generation is **stubbed** — canned outputs keyed by intent × lender ×
  language. No real Anthropic / OpenAI call.
- Playbook lint is **client-side only** — runs on the document in the dialog;
  production should run server-side at publish time.
- Saved modules are **referenced by id** in templates, but the prototype doesn't
  yet propagate updates back to embeds (the registry is static).
- Compliance modules (`sm-cbuae-disclaimer`, `sm-aecb-disclaimer`) are **hard
  locked** — playbook lint checks for them by saved-module id; updating these
  in production is a change-control event, not a casual edit.
- A/B test results are **mocked**; real implementation needs the analytics
  pipeline to be wired up.
- AR translation uses a **phrase dictionary**, not an LLM. Locked saved modules
  are NOT auto-translated — they need a bilingual variant authored by the
  lender (intentional, since regulatory copy can't be machine-translated).

---

## 7. Files inventory

### New files (most relevant)

```
src/app/(app)/email-generator/builder/[id]/page.tsx
src/app/(app)/templates/modules/page.tsx
src/app/(app)/templates/modules/new/page.tsx

src/components/composer/builder/builder-canvas.tsx
src/components/composer/builder/builder-toolbar.tsx
src/components/composer/builder/block-palette.tsx
src/components/composer/builder/block-renderers.tsx
src/components/composer/builder/properties-panel.tsx
src/components/composer/builder/builder-dialogs.tsx
src/components/composer/creation-sheets.tsx
src/components/composer/funnel-segment-cta.tsx
src/components/composer/message-funnel.tsx
src/components/composer/messages-table.tsx
src/components/templates/library-tabs.tsx
src/components/templates/modules-view.tsx

src/data/builder-blocks.ts
src/data/saved-modules.ts
src/data/module-presets.ts
src/data/playbooks-v3.ts
src/data/template-versions.ts
src/data/brand-kits.ts
src/data/composer-gpt-presets.ts
src/data/starter-docs.ts
src/data/journey-blueprints.ts
src/data/translations-ar.ts
src/data/messages.ts
src/data/rich-email-templates.tsx

src/lib/playbook-lint.ts
src/lib/translate-builder-doc.ts
```

### Modified files (most relevant)

```
src/components/composer/editor-panel.tsx       — Open v3 builder chip,
                                                  Create-journey dropdown,
                                                  AI text/HTML chooser
src/components/composer/email-ai-generate-mode.tsx — Text vs HTML choice,
                                                     HTML path → v3 builder
src/components/strategies/strategies-grid.tsx  — Rich HTML template slot
src/components/journeys/journey-canvas.tsx     — Blueprint hydration
src/components/layout/nav-config.ts            — Compose nav (Messages /
                                                  Templates / Saved modules /
                                                  Playbooks)
src/components/templates/templates-view.tsx    — Open in v3 builder CTA
src/components/templates/templates-tabs.tsx    — Library tabs wrap
src/components/ui/dialog.tsx                   — max-h cap + scroll
src/app/(app)/email-generator/page.tsx         — Tight inline header, KPI
                                                  compact
src/data/strategies.ts                         — htmlTemplateId field on
                                                  channel
```

---

## 8. Latest deployments (most recent first)

| URL | What's there |
|---|---|
| https://cleargrid-v1-modblk.vercel.app | Block-based module canvas |
| https://cleargrid-v1-modcanvas.vercel.app | (superseded by above) |
| https://cleargrid-v1-bp.vercel.app | Journey blueprints + composer Create-journey + module modal width + messages CTA |
| https://cleargrid-v1-aihtml.vercel.app | AI HTML factory + module modal polish |
| https://cleargrid-v1-revamp.vercel.app | v2 playbooks restored + module modal redesign |
| https://cleargrid-v1-clean.vercel.app | Composer cleanup + brand kits removed |
| https://cleargrid-v1-gpt.vercel.app | Composer GPT prompt-first rework |
| https://cleargrid-v1-dlgfix.vercel.app | Dialog height caps |
| https://cleargrid-v1-ar.vercel.app | Arabic translation toggle |
| https://cleargrid-v1-blank.vercel.app | Blank canvas from composer entry |
| https://cleargrid-v1-starter.vercel.app | Lender × purpose starter docs |
| https://cleargrid-v1-dnd3.vercel.app | Palette → canvas drag-and-drop |
| https://cleargrid-v1-dnd2.vercel.app | Per-block drag handle + × delete |
| https://cleargrid-v1-v3b.vercel.app | Creation sheets wired |
| https://cleargrid-v1-v3.vercel.app | Initial v3 release (all 6 surfaces) |
