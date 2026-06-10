/**
 * Rich email templates with typed, locked slots.
 *
 * Each template defines:
 *  - id, name, subject, lender, purpose, language, status
 *  - A render() function: takes resolved slot values + a slot click handler,
 *    returns JSX. Editable slots are wrapped with the SlotShell component which
 *    handles hover-highlight + click → inspector.
 *  - slotDefs: typed manifest of every editable slot (id, type, label, constraints).
 *
 * This is the v1 contract — templates are designer-authored; the user can only
 * edit declared slots. Everything else (logo header, legal footer, opt-out) is
 * locked.
 */

import * as React from "react"

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type SlotType = "text" | "image" | "button"

export interface TextSlotDef {
  id: string
  type: "text"
  label: string
  maxLength?: number
  multiline?: boolean
}
export interface ImageSlotDef {
  id: string
  type: "image"
  label: string
  width: number
  height: number
}
export interface ButtonSlotDef {
  id: string
  type: "button"
  label: string
}
export type SlotDef = TextSlotDef | ImageSlotDef | ButtonSlotDef

export interface ButtonSlotValue {
  label: string
  url: string
}
export interface ImageSlotValue {
  src: string
  alt: string
}
export type SlotValue = string | ButtonSlotValue | ImageSlotValue

/** A complete set of slot values for one template. Indexed by slot id. */
export type SlotValues = Record<string, SlotValue>

export interface RichEmailTemplate {
  id: string
  name: string
  subject: string
  /** Short text description shown under the card title. */
  description: string
  lenderId: string
  lenderName: string
  purpose: "reminder" | "ptp-confirmation" | "settlement" | "final-notice" | "welcome" | "hardship" | "broken-promise"
  language: "en" | "ar"
  status: "active" | "draft" | "archived"
  /** Estimated brand colour used in the template — also drives the thumbnail accent. */
  accentColor: string
  slotDefs: SlotDef[]
  /** Initial values that match the template's design defaults. */
  defaultSlots: SlotValues
  /** The locked template renderer. */
  render: (props: TemplateRenderProps) => React.ReactElement
}

export interface TemplateRenderProps {
  slots: SlotValues
  /** Called when user clicks an editable slot. */
  onSlotClick?: (slotId: string) => void
  /** Currently-active slot (gets a brighter outline). */
  activeSlotId?: string | null
  /** Whether to enable interaction (hover/click). Off in thumbnails. */
  interactive?: boolean
}

// ─────────────────────────────────────────────────────────────────────
// Shared building blocks (the locked + slot primitives used by templates)
// ─────────────────────────────────────────────────────────────────────

const lockedRingStyle: React.CSSProperties = {
  position: "relative",
}

function LockedBlock({
  label,
  children,
  style,
}: {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      data-locked="true"
      data-locked-label={label}
      style={{ ...lockedRingStyle, ...style }}
    >
      {children}
    </div>
  )
}

function SlotShell({
  id,
  label,
  type,
  onClick,
  active,
  interactive = true,
  children,
  style,
}: {
  id: string
  label: string
  type: SlotType
  onClick?: (id: string) => void
  active?: boolean
  interactive?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      data-slot-id={id}
      data-slot-label={label}
      data-slot-type={type}
      data-slot-active={active ? "true" : "false"}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onClick?.(id) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.(id)
              }
            }
          : undefined
      }
      style={{
        position: "relative",
        cursor: interactive ? "pointer" : "default",
        outline: active ? "2px solid #10b981" : undefined,
        outlineOffset: active ? "2px" : undefined,
        borderRadius: 4,
        transition: "outline-color 120ms ease, background-color 120ms ease",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// Token resolution — replace {{key}} with sample values
const SAMPLE_TOKENS: Record<string, string> = {
  "borrower_name": "Ahmed Al-Mansoori",
  "borrower_first_name": "Ahmed",
  "borrower_last_name": "Al-Mansoori",
  "amount_due": "1,250.00",
  "currency": "AED",
  "due_date": "12 Apr 2026",
  "days_past_due": "47",
  "lender_name": "ClearGrid",
  "account_number": "ACC-998877",
  "reference_id": "REF-99X4VW",
  "settlement_amount": "850.00",
  "discount_percent": "30",
  "payment_link": "https://pay.cleargrid.ae/abc123",
  "agent_name": "Sara Khalil",
  "contact_phone": "+971 4 123 4567",
}

export function resolveTokens(value: string): string {
  return value.replace(/\{\{([\w_]+)\}\}/g, (_, key) => SAMPLE_TOKENS[key] ?? `{{${key}}}`)
}

function getText(slots: SlotValues, id: string): string {
  const v = slots[id]
  return typeof v === "string" ? v : ""
}
function getButton(slots: SlotValues, id: string): ButtonSlotValue {
  const v = slots[id]
  if (v && typeof v === "object" && "label" in v) return v as ButtonSlotValue
  return { label: "Click here", url: "https://example.com" }
}
function getImage(slots: SlotValues, id: string): ImageSlotValue {
  const v = slots[id]
  if (v && typeof v === "object" && "src" in v) return v as ImageSlotValue
  return { src: "", alt: "" }
}

// ─────────────────────────────────────────────────────────────────────
// Template 1: ClearGrid — Payment Reminder (English)
// ─────────────────────────────────────────────────────────────────────

const cgPaymentReminder: RichEmailTemplate = {
  id: "rich-cg-payment-reminder",
  name: "Payment Reminder",
  description: "Standard reminder for borrowers with an upcoming or recently due installment.",
  subject: "Payment Reminder — {{currency}} {{amount_due}} due on {{due_date}}",
  lenderId: "general",
  lenderName: "ClearGrid",
  purpose: "reminder",
  language: "en",
  status: "active",
  accentColor: "#10b981",
  slotDefs: [
    { id: "greeting", type: "text", label: "Greeting", maxLength: 80 },
    { id: "intro", type: "text", label: "Intro paragraph", multiline: true, maxLength: 400 },
    { id: "cta", type: "button", label: "Pay button" },
    { id: "support_line", type: "text", label: "Support line", maxLength: 200 },
    { id: "signoff", type: "text", label: "Sign-off", maxLength: 60 },
  ],
  defaultSlots: {
    greeting: "Dear {{borrower_name}},",
    intro:
      "This is a friendly reminder that your installment of {{currency}} {{amount_due}} is due on {{due_date}}. To keep your account in good standing and avoid any late fees, please make your payment at your earliest convenience.",
    cta: { label: "Pay now", url: "{{payment_link}}" },
    support_line:
      "If you have already made this payment or need assistance, please reply to this email or call us at {{contact_phone}}.",
    signoff: "Best regards,\nThe ClearGrid Team",
  },
  render: ({ slots, onSlotClick, activeSlotId, interactive = true }) => {
    const button = getButton(slots, "cta")
    return (
      <EmailFrame accent="#10b981">
        {/* Locked: logo header */}
        <LockedBlock label="Logo header" style={{ padding: "32px 40px 24px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.5 }}>
            ClearGrid
          </div>
        </LockedBlock>

        <div style={{ padding: "0 40px 32px" }}>
          {/* Greeting */}
          <SlotShell
            id="greeting"
            label="Greeting"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "greeting"}
            interactive={interactive}
            style={{ marginBottom: 16 }}
          >
            <p style={{ margin: 0, fontSize: 16, color: "#0f172a", fontWeight: 500 }}>
              {resolveTokens(getText(slots, "greeting"))}
            </p>
          </SlotShell>

          {/* Intro paragraph */}
          <SlotShell
            id="intro"
            label="Intro paragraph"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "intro"}
            interactive={interactive}
            style={{ marginBottom: 28 }}
          >
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#334155" }}>
              {resolveTokens(getText(slots, "intro"))}
            </p>
          </SlotShell>

          {/* Locked: payment summary card */}
          <LockedBlock label="Payment summary (auto-generated)">
            <div
              style={{
                background: "#f1f5f9",
                borderRadius: 8,
                padding: 16,
                marginBottom: 28,
                fontSize: 13,
                color: "#334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Amount due</span>
                <strong style={{ color: "#0f172a" }}>{resolveTokens("{{currency}} {{amount_due}}")}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Due date</span>
                <span style={{ color: "#0f172a" }}>{resolveTokens("{{due_date}}")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Account</span>
                <span style={{ color: "#0f172a", fontFamily: "monospace" }}>
                  {resolveTokens("{{account_number}}")}
                </span>
              </div>
            </div>
          </LockedBlock>

          {/* CTA button */}
          <SlotShell
            id="cta"
            label="Pay button"
            type="button"
            onClick={onSlotClick}
            active={activeSlotId === "cta"}
            interactive={interactive}
            style={{ marginBottom: 28, textAlign: "center" }}
          >
            <a
              href={button.url}
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-block",
                background: "#10b981",
                color: "#ffffff",
                padding: "12px 32px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              {button.label}
            </a>
          </SlotShell>

          {/* Support line */}
          <SlotShell
            id="support_line"
            label="Support line"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "support_line"}
            interactive={interactive}
            style={{ marginBottom: 24 }}
          >
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#64748b" }}>
              {resolveTokens(getText(slots, "support_line"))}
            </p>
          </SlotShell>

          {/* Sign-off */}
          <SlotShell
            id="signoff"
            label="Sign-off"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "signoff"}
            interactive={interactive}
          >
            <p style={{ margin: 0, fontSize: 13, color: "#334155", whiteSpace: "pre-line" }}>
              {resolveTokens(getText(slots, "signoff"))}
            </p>
          </SlotShell>
        </div>

        {/* Locked: legal footer */}
        <FooterLocked />
      </EmailFrame>
    )
  },
}

// ─────────────────────────────────────────────────────────────────────
// Template 2: Mashreq — Final Notice (English, formal banking)
// ─────────────────────────────────────────────────────────────────────

const mashreqFinalNotice: RichEmailTemplate = {
  id: "rich-mashreq-final-notice",
  name: "Mashreq Final Notice",
  description: "Formal final-notice template for serious overdue accounts. Banking-grade tone.",
  subject: "FINAL NOTICE — Immediate Action Required on Account {{account_number}}",
  lenderId: "lnd-mashreq",
  lenderName: "Mashreq Bank",
  purpose: "final-notice",
  language: "en",
  status: "active",
  accentColor: "#dc2626",
  slotDefs: [
    { id: "headline", type: "text", label: "Headline", maxLength: 60 },
    { id: "body", type: "text", label: "Body paragraph", multiline: true, maxLength: 800 },
    { id: "consequences", type: "text", label: "Consequences list", multiline: true, maxLength: 500 },
    { id: "cta", type: "button", label: "Payment CTA" },
  ],
  defaultSlots: {
    headline: "FINAL NOTICE",
    body: "Dear Mr./Ms. {{borrower_last_name}},\n\nThis is a final notice regarding your outstanding balance of {{currency}} {{amount_due}} on account {{account_number}}, which is now {{days_past_due}} days past due. Despite previous reminders, this amount remains unpaid.",
    consequences:
      "If payment is not received within 7 calendar days from the date of this notice, we will be compelled to escalate this matter in accordance with UAE Central Bank regulations and our contractual terms. This may include reporting to Al Etihad Credit Bureau and engaging external collection agencies.",
    cta: { label: "Pay outstanding balance", url: "{{payment_link}}" },
  },
  render: ({ slots, onSlotClick, activeSlotId, interactive = true }) => {
    const button = getButton(slots, "cta")
    return (
      <EmailFrame accent="#dc2626">
        {/* Locked: bank header with logo */}
        <LockedBlock label="Mashreq logo + header" style={{ padding: "28px 40px", background: "#0f172a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: "#dc2626",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              M
            </div>
            <div style={{ color: "#fff" }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>Mashreq Bank</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Customer Care · UAE</div>
            </div>
          </div>
        </LockedBlock>

        {/* Headline */}
        <div style={{ padding: "32px 40px 0" }}>
          <SlotShell
            id="headline"
            label="Headline"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "headline"}
            interactive={interactive}
            style={{ marginBottom: 24 }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "#dc2626",
                letterSpacing: -0.5,
              }}
            >
              {resolveTokens(getText(slots, "headline"))}
            </h1>
          </SlotShell>

          {/* Locked: reference block */}
          <LockedBlock label="Reference block">
            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
                padding: "12px 0",
                marginBottom: 24,
                fontSize: 12,
                color: "#475569",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  Reference:{" "}
                  <span style={{ fontFamily: "monospace", color: "#0f172a" }}>
                    {resolveTokens("{{reference_id}}")}
                  </span>
                </span>
                <span>{resolveTokens("{{due_date}}")}</span>
              </div>
            </div>
          </LockedBlock>

          {/* Body */}
          <SlotShell
            id="body"
            label="Body paragraph"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "body"}
            interactive={interactive}
            style={{ marginBottom: 24 }}
          >
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#1e293b", whiteSpace: "pre-line" }}>
              {resolveTokens(getText(slots, "body"))}
            </p>
          </SlotShell>

          {/* Consequences */}
          <SlotShell
            id="consequences"
            label="Consequences"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "consequences"}
            interactive={interactive}
            style={{ marginBottom: 28 }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.7,
                color: "#7f1d1d",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: 14,
              }}
            >
              {resolveTokens(getText(slots, "consequences"))}
            </p>
          </SlotShell>

          {/* CTA */}
          <SlotShell
            id="cta"
            label="Payment CTA"
            type="button"
            onClick={onSlotClick}
            active={activeSlotId === "cta"}
            interactive={interactive}
            style={{ marginBottom: 32, textAlign: "center" }}
          >
            <a
              href={button.url}
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-block",
                background: "#dc2626",
                color: "#ffffff",
                padding: "12px 32px",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              {button.label}
            </a>
          </SlotShell>

          {/* Locked: regulatory line */}
          <LockedBlock label="Regulatory line">
            <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, margin: 0, marginBottom: 24 }}>
              Mashreq Bank PJSC is licensed and regulated by the Central Bank of the UAE. This communication
              constitutes formal notice as required under applicable regulations.
            </p>
          </LockedBlock>
        </div>

        <FooterLocked />
      </EmailFrame>
    )
  },
}

// ─────────────────────────────────────────────────────────────────────
// Template 3: Tamara — Friendly Reminder (English)
// ─────────────────────────────────────────────────────────────────────

const tamaraFriendly: RichEmailTemplate = {
  id: "rich-tamara-friendly",
  name: "Tamara Friendly Reminder",
  description: "Casual first-name reminder for BNPL customers. Warm tone, soft CTA.",
  subject: "Hey {{borrower_first_name}}, quick reminder 👋",
  lenderId: "lnd-tamara",
  lenderName: "Tamara",
  purpose: "reminder",
  language: "en",
  status: "active",
  accentColor: "#ec4899",
  slotDefs: [
    { id: "greeting", type: "text", label: "Greeting", maxLength: 60 },
    { id: "hero_image", type: "image", label: "Hero image", width: 520, height: 200 },
    { id: "body", type: "text", label: "Body", multiline: true, maxLength: 350 },
    { id: "cta", type: "button", label: "Pay button" },
    { id: "ps", type: "text", label: "PS line", maxLength: 200 },
  ],
  defaultSlots: {
    greeting: "Hey {{borrower_first_name}}! 👋",
    hero_image: {
      src: "",
      alt: "Tamara hero illustration",
    },
    body:
      "Just a heads-up — you've got a payment of {{currency}} {{amount_due}} due on {{due_date}}. No stress, these things happen! You can sort it out in just a few taps.",
    cta: { label: "Pay it off — quick & easy", url: "{{payment_link}}" },
    ps: "PS: Need a hand? Reply to this email and we'll get back to you within 2 hours.",
  },
  render: ({ slots, onSlotClick, activeSlotId, interactive = true }) => {
    const button = getButton(slots, "cta")
    const image = getImage(slots, "hero_image")
    return (
      <EmailFrame accent="#ec4899">
        {/* Locked: Tamara header */}
        <LockedBlock label="Tamara logo" style={{ padding: "28px 40px 16px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#ec4899", letterSpacing: -0.5 }}>tamara</div>
        </LockedBlock>

        <div style={{ padding: "0 40px 32px" }}>
          {/* Greeting */}
          <SlotShell
            id="greeting"
            label="Greeting"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "greeting"}
            interactive={interactive}
            style={{ marginBottom: 20 }}
          >
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: -0.5 }}>
              {resolveTokens(getText(slots, "greeting"))}
            </h1>
          </SlotShell>

          {/* Hero image */}
          <SlotShell
            id="hero_image"
            label="Hero image"
            type="image"
            onClick={onSlotClick}
            active={activeSlotId === "hero_image"}
            interactive={interactive}
            style={{ marginBottom: 24 }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "520 / 200",
                background: image.src
                  ? `url(${image.src}) center / cover`
                  : "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9f1239",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {!image.src && "Tap to upload hero image"}
            </div>
          </SlotShell>

          {/* Body */}
          <SlotShell
            id="body"
            label="Body"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "body"}
            interactive={interactive}
            style={{ marginBottom: 28 }}
          >
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#334155" }}>
              {resolveTokens(getText(slots, "body"))}
            </p>
          </SlotShell>

          {/* CTA */}
          <SlotShell
            id="cta"
            label="Pay button"
            type="button"
            onClick={onSlotClick}
            active={activeSlotId === "cta"}
            interactive={interactive}
            style={{ marginBottom: 24, textAlign: "center" }}
          >
            <a
              href={button.url}
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-block",
                background: "#ec4899",
                color: "#ffffff",
                padding: "14px 36px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              {button.label}
            </a>
          </SlotShell>

          {/* PS */}
          <SlotShell
            id="ps"
            label="PS line"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "ps"}
            interactive={interactive}
          >
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "#64748b", fontStyle: "italic" }}>
              {resolveTokens(getText(slots, "ps"))}
            </p>
          </SlotShell>
        </div>

        <FooterLocked />
      </EmailFrame>
    )
  },
}

// ─────────────────────────────────────────────────────────────────────
// Template 4: ClearGrid — Settlement Offer
// ─────────────────────────────────────────────────────────────────────

const cgSettlement: RichEmailTemplate = {
  id: "rich-cg-settlement",
  name: "Settlement Offer",
  description: "Time-bound settlement offer with discount + clear call to action.",
  subject: "Settle for {{currency}} {{settlement_amount}} — {{discount_percent}}% off",
  lenderId: "general",
  lenderName: "ClearGrid",
  purpose: "settlement",
  language: "en",
  status: "active",
  accentColor: "#0ea5e9",
  slotDefs: [
    { id: "greeting", type: "text", label: "Greeting", maxLength: 80 },
    { id: "offer_intro", type: "text", label: "Offer intro", multiline: true, maxLength: 400 },
    { id: "cta", type: "button", label: "Accept offer" },
    { id: "alt_cta_text", type: "text", label: "Talk-to-us line", maxLength: 200 },
  ],
  defaultSlots: {
    greeting: "Dear {{borrower_name}},",
    offer_intro:
      "We understand things happen. To help you close out your account, we're offering a one-time settlement of {{currency}} {{settlement_amount}} — that's {{discount_percent}}% off your current balance of {{currency}} {{amount_due}}.",
    cta: { label: "Accept settlement offer", url: "{{payment_link}}" },
    alt_cta_text: "Want to talk it through first? Reply to this email or call {{contact_phone}}.",
  },
  render: ({ slots, onSlotClick, activeSlotId, interactive = true }) => {
    const button = getButton(slots, "cta")
    return (
      <EmailFrame accent="#0ea5e9">
        <LockedBlock label="ClearGrid header" style={{ padding: "32px 40px 24px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.5 }}>
            ClearGrid
          </div>
        </LockedBlock>

        <div style={{ padding: "0 40px 32px" }}>
          <SlotShell
            id="greeting"
            label="Greeting"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "greeting"}
            interactive={interactive}
            style={{ marginBottom: 20 }}
          >
            <p style={{ margin: 0, fontSize: 16, color: "#0f172a", fontWeight: 500 }}>
              {resolveTokens(getText(slots, "greeting"))}
            </p>
          </SlotShell>

          <LockedBlock label="Settlement headline">
            <div
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
                borderRadius: 10,
                padding: "20px 24px",
                marginBottom: 24,
                color: "#fff",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 }}>
                Limited-time settlement offer
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, letterSpacing: -0.5 }}>
                {resolveTokens("{{currency}} {{settlement_amount}}")}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                {resolveTokens("{{discount_percent}}% off your current balance")}
              </div>
            </div>
          </LockedBlock>

          <SlotShell
            id="offer_intro"
            label="Offer intro"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "offer_intro"}
            interactive={interactive}
            style={{ marginBottom: 28 }}
          >
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#334155" }}>
              {resolveTokens(getText(slots, "offer_intro"))}
            </p>
          </SlotShell>

          <SlotShell
            id="cta"
            label="Accept offer"
            type="button"
            onClick={onSlotClick}
            active={activeSlotId === "cta"}
            interactive={interactive}
            style={{ marginBottom: 24, textAlign: "center" }}
          >
            <a
              href={button.url}
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-block",
                background: "#0ea5e9",
                color: "#ffffff",
                padding: "12px 32px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              {button.label}
            </a>
          </SlotShell>

          <SlotShell
            id="alt_cta_text"
            label="Talk-to-us line"
            type="text"
            onClick={onSlotClick}
            active={activeSlotId === "alt_cta_text"}
            interactive={interactive}
          >
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#64748b", textAlign: "center" }}>
              {resolveTokens(getText(slots, "alt_cta_text"))}
            </p>
          </SlotShell>
        </div>

        <FooterLocked />
      </EmailFrame>
    )
  },
}

// ─────────────────────────────────────────────────────────────────────
// Shared frame + locked footer
// ─────────────────────────────────────────────────────────────────────

function EmailFrame({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 600,
        maxWidth: "100%",
        margin: "0 auto",
        background: "#ffffff",
        borderTop: `4px solid ${accent}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#0f172a",
      }}
    >
      {children}
    </div>
  )
}

function FooterLocked() {
  return (
    <LockedBlock label="Legal footer + opt-out">
      <div
        style={{
          padding: "20px 40px 32px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          fontSize: 11,
          color: "#64748b",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0, marginBottom: 6 }}>
          ClearGrid · Sheikh Zayed Road, Dubai · UAE — TRN 100-XXXX-XXXX
        </p>
        <p style={{ margin: 0 }}>
          You received this email because you have an active account with us.{" "}
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#64748b", textDecoration: "underline" }}>
            Unsubscribe
          </a>{" "}
          ·{" "}
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#64748b", textDecoration: "underline" }}>
            Privacy policy
          </a>
        </p>
      </div>
    </LockedBlock>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────

export const richEmailTemplates: RichEmailTemplate[] = [
  cgPaymentReminder,
  cgSettlement,
  mashreqFinalNotice,
  tamaraFriendly,
]

export function getRichTemplate(id: string): RichEmailTemplate | undefined {
  return richEmailTemplates.find((t) => t.id === id)
}
