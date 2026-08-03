/**
 * Purpose + lender aware starter documents for the v3 builder.
 *
 * When a user creates a new template, the builder lands on a canvas pre-filled
 * for that lender's voice and the purpose's natural structure — so a payment
 * reminder starts with "your payment is due" + Pay Now CTA; a broken-promise
 * starts with "we didn't see your scheduled payment" + reschedule CTA, etc.
 *
 * Architecture: one body-template per purpose. Lender styling (colours, header
 * module, footer module, tone) is layered on top. Avoids 7×6 = 42 hand-built
 * docs.
 */

import type {
  BuilderBlock,
  BuilderDocument,
  BuilderRow,
} from "./builder-blocks"
import { newBlockId, newRowId } from "./builder-blocks"
import { getBrandKitByLenderId } from "./brand-kits"
import type { TemplatePurpose, TemplateChannel } from "./templates"

// ─────────── Lender voice — drives copy + tone ───────────

type LenderVoice = {
  greeting: (purpose: TemplatePurpose) => string
  signoff: string
  /** When true, use a casual/single-emoji greeting (Tamara). */
  emoji?: boolean
  /** Header saved-module id, if the lender has one. */
  headerModuleId?: string
  /** Footer saved-module id (legal/regulatory + opt-out). */
  footerModuleId?: string
  /** Compliance module to embed at the bottom (CBUAE / AECB). */
  complianceModuleId?: string
}

const LENDER_VOICE: Record<string, LenderVoice> = {
  "lnd-mashreq": {
    greeting: () => "Dear Mr./Ms. {{borrower_name}},",
    signoff: "Customer Care Team — Mashreq Bank",
    headerModuleId: "sm-mashreq-header",
    footerModuleId: "sm-mashreq-footer",
    complianceModuleId: "sm-cbuae-disclaimer",
  },
  "lnd-tamara": {
    greeting: (p) =>
      p === "hardship"
        ? "Hi {{borrower_name}},"
        : "Hey {{borrower_name}}! 👋",
    signoff: "The Tamara Team 💚",
    emoji: true,
    headerModuleId: "sm-tamara-header",
    footerModuleId: "sm-tamara-footer",
  },
  "lnd-cashnow": {
    greeting: () => "Hi {{borrower_name}},",
    signoff: "CashNow Collections",
    complianceModuleId: "sm-aecb-disclaimer",
  },
  "lnd-enbd": {
    greeting: () => "Dear {{borrower_name}},",
    signoff: "Customer Care — Emirates NBD",
    headerModuleId: undefined,
  },
  "lnd-fab": {
    greeting: () => "Dear Mr./Ms. {{borrower_name}},",
    signoff: "Customer Care — First Abu Dhabi Bank",
    complianceModuleId: "sm-cbuae-disclaimer",
  },
  general: {
    greeting: () => "Hi {{borrower_name}},",
    signoff: "Collections Team",
  },
}

function getVoice(lenderId: string): LenderVoice {
  return LENDER_VOICE[lenderId] ?? LENDER_VOICE.general
}

// ─────────── Purpose-specific block content ───────────

type PurposeStarter = {
  /** Headline shown as the h1 of the email. */
  headline: (lenderId: string) => string
  /** Body paragraph(s) following the greeting. Plain HTML. */
  body: string
  /** CTA label + colour role + conversion event. */
  cta: {
    label: string
    conversionEvent: "payment_initiated" | "ptp_captured" | "settlement_accepted"
    /** Subline shown under the button. */
    subline?: string
  }
  /** Optional secondary paragraph after the CTA. */
  secondary?: string
  /** Optional accent — overrides primary colour. e.g. red for FINAL NOTICE. */
  accentColor?: string
}

const PURPOSE_STARTERS: Record<TemplatePurpose, PurposeStarter> = {
  reminder: {
    headline: () => "Payment Reminder",
    body: `<p style="margin:0;color:#0F172A;line-height:1.6;">This is a friendly reminder that your installment of <strong>AED {{amount_due}}</strong> for account <strong>{{account_number}}</strong> was due on <strong>{{due_date}}</strong>. To avoid additional charges, please settle the outstanding balance at your earliest convenience.</p>`,
    cta: {
      label: "Make Payment",
      conversionEvent: "payment_initiated",
      subline: "Tap to pay AED {{amount_due}} now",
    },
    secondary: `<p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">If you have already made this payment, please disregard this notice. For assistance, reply to this email or call us during business hours.</p>`,
  },
  welcome: {
    headline: (l) => (l === "lnd-tamara" ? "Welcome to Tamara!" : "Welcome aboard"),
    body: `<p style="margin:0;color:#0F172A;line-height:1.6;">Thanks for joining, {{borrower_name}}. Your account <strong>{{account_number}}</strong> is now ready. Activate your access in a single tap and you're set.</p>`,
    cta: {
      label: "Activate my account",
      conversionEvent: "payment_initiated",
      subline: "Takes about 30 seconds",
    },
    secondary: `<p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">Need a hand? Reply to this email and we'll walk you through it.</p>`,
  },
  "ptp-confirmation": {
    headline: () => "We've got your payment plan",
    body: `<p style="margin:0;color:#0F172A;line-height:1.6;">Thanks for committing to pay <strong>AED {{ptp_amount}}</strong> on <strong>{{ptp_date}}</strong>. We've locked this in for your account <strong>{{account_number}}</strong>. There's nothing else you need to do until then.</p>`,
    cta: {
      label: "View payment plan",
      conversionEvent: "ptp_captured",
      subline: "Tap to see details or modify",
    },
    secondary: `<p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">Need to change the date? Just reply to this email or open the plan above.</p>`,
  },
  "broken-promise": {
    headline: () => "We didn't see your scheduled payment",
    body: `<p style="margin:0;color:#0F172A;line-height:1.6;">{{borrower_name}}, you'd committed to pay <strong>AED {{ptp_amount}}</strong> on <strong>{{ptp_date}}</strong> for account <strong>{{account_number}}</strong>, but the payment hasn't reached us yet. Things happen — let's set up a new plan.</p>`,
    cta: {
      label: "Pick a new date",
      conversionEvent: "ptp_captured",
      subline: "Reschedule in a couple of taps",
    },
    secondary: `<p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">Already paid? Reply with your reference number and we'll match it up.</p>`,
  },
  settlement: {
    headline: () => "A one-time settlement offer",
    body: `<p style="margin:0;color:#0F172A;line-height:1.6;">{{borrower_name}}, we're offering a one-time settlement to clear your outstanding balance of <strong>AED {{amount_due}}</strong> for just <strong>AED {{settlement_amount}}</strong> — that's <strong>{{discount_percent}}% off</strong>. This offer expires on <strong>{{settlement_expiry}}</strong>.</p>`,
    cta: {
      label: "Accept Settlement",
      conversionEvent: "settlement_accepted",
      subline: "AED {{settlement_amount}} · tap to confirm",
    },
    secondary: `<p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">Need to negotiate? <a href="/counter-offer" style="color:#10B981;">Submit a counter-offer</a>, or reply to this email to talk to a person.</p>`,
  },
  "final-notice": {
    headline: () => "FINAL NOTICE",
    body: `<p style="margin:0;color:#0F172A;line-height:1.6;"><strong>Reference: Account {{account_number}}</strong></p><p style="margin:12px 0 0;color:#0F172A;line-height:1.6;">This is a FINAL NOTICE regarding your overdue balance of <strong>AED {{amount_due}}</strong>, due since <strong>{{due_date}}</strong>. Despite previous reminders, this amount remains unpaid. If payment is not received within <strong>7 calendar days</strong>, we will be compelled to escalate this matter in accordance with applicable regulations and our contractual terms.</p>`,
    cta: {
      label: "Pay Now",
      conversionEvent: "payment_initiated",
    },
    secondary: `<p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">To discuss a payment arrangement, contact Customer Care during business hours.</p>`,
    accentColor: "#B91C1C",
  },
  hardship: {
    headline: () => "We're here to help",
    body: `<p style="margin:0;color:#0F172A;line-height:1.6;">{{borrower_name}}, we understand things don't always go to plan. If you're facing temporary financial difficulty, our team can walk through your options with you — privately and without judgement. No payment is requested in this email.</p>`,
    cta: {
      label: "Talk to a human",
      conversionEvent: "payment_initiated",
      subline: "Reply to this email or use the link",
    },
    secondary: `<p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">If you'd prefer to settle online, you can do that too — tap the option above to see your hardship plan.</p>`,
  },
}

// ─────────── Block factories ───────────

function mkText(html: string): BuilderBlock {
  return { id: newBlockId(), kind: "text", html }
}
function mkSpacer(height: number): BuilderBlock {
  return { id: newBlockId(), kind: "spacer", height }
}
function mkPayment(
  label: string,
  bg: string,
  color: string,
  conversionEvent: "payment_initiated" | "ptp_captured" | "settlement_accepted",
  subline?: string,
): BuilderBlock {
  return { id: newBlockId(), kind: "payment_link", label, bg, color, conversionEvent, subline }
}
function mkLockedModuleRow(moduleId: string): BuilderRow {
  return {
    id: newRowId(),
    columns: 1,
    locked: true,
    columnsBlocks: [
      [{ id: newBlockId(), kind: "saved_module", moduleId, locked: true }],
    ],
  }
}

// ─────────── Public factory ───────────

/**
 * Build a starter document for a new template. The returned doc embeds the
 * lender's header/footer/compliance modules, applies their brand-kit colour
 * to the CTA, and uses the purpose-specific body + headline.
 */
export function buildStarterDoc(
  lenderId: string,
  purpose: TemplatePurpose | undefined,
  channel: TemplateChannel,
  templateName?: string,
): BuilderDocument {
  const safePurpose = purpose ?? "reminder"
  const voice = getVoice(lenderId)
  const brand = getBrandKitByLenderId(lenderId)
  const starter = PURPOSE_STARTERS[safePurpose]

  // SMS / WhatsApp: build a single text block. The full builder still renders
  // it, but with one block + no header/footer modules (no canvas chrome).
  if (channel !== "email") {
    const smsCopy = buildSmsCopy(lenderId, safePurpose)
    return {
      id: `doc-new-${newBlockId()}`,
      language: "en",
      dir: "ltr",
      pageBg: "#0F172A",
      contentWidth: 360,
      rows: [
        {
          id: newRowId(),
          columns: 1,
          bg: "#FFFFFF",
          padding: 20,
          columnsBlocks: [
            [
              mkText(
                `<p style="margin:0;font-family:ui-monospace,SFMono-Regular,monospace;font-size:13px;color:#0F172A;line-height:1.5;">${smsCopy}</p>`,
              ),
            ],
          ],
        },
      ],
    }
  }

  const primary = brand?.colors.primary ?? "#10B981"
  const onPrimary = brand?.colors.primaryText ?? "#FFFFFF"
  const accent = starter.accentColor ?? primary
  const accentText = starter.accentColor ? "#FFFFFF" : onPrimary

  const headlineColor = starter.accentColor ?? "#0F172A"
  const headlineText = starter.headline(lenderId)

  // Body row: greeting → body paragraph → CTA → secondary
  const contentBlocks: BuilderBlock[] = [
    mkText(
      `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${headlineColor};">${headlineText}</h1><p style="margin:0 0 12px;color:#0F172A;line-height:1.6;">${voice.greeting(safePurpose)}</p>${starter.body}`,
    ),
    mkSpacer(20),
    mkPayment(starter.cta.label, accent, accentText, starter.cta.conversionEvent, starter.cta.subline),
  ]

  if (starter.secondary) {
    contentBlocks.push(mkSpacer(18))
    contentBlocks.push(mkText(starter.secondary))
  }

  contentBlocks.push(mkSpacer(20))
  contentBlocks.push(
    mkText(
      `<p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">— ${voice.signoff}</p>`,
    ),
  )

  const rows: BuilderRow[] = []

  // Header — locked module if the lender has one, else a brand-tinted strip.
  if (voice.headerModuleId) {
    rows.push(mkLockedModuleRow(voice.headerModuleId))
  } else if (brand) {
    rows.push({
      id: newRowId(),
      columns: 1,
      bg: primary,
      padding: 18,
      columnsBlocks: [
        [
          mkText(
            `<div style="color:${onPrimary};font-weight:700;font-size:16px;">${brand.lenderName}</div>`,
          ),
        ],
      ],
    })
  }

  rows.push({
    id: newRowId(),
    columns: 1,
    bg: "#FFFFFF",
    padding: 28,
    columnsBlocks: [contentBlocks],
  })

  if (voice.complianceModuleId) {
    rows.push(mkLockedModuleRow(voice.complianceModuleId))
  }
  if (voice.footerModuleId) {
    rows.push(mkLockedModuleRow(voice.footerModuleId))
  } else if (brand) {
    rows.push({
      id: newRowId(),
      columns: 1,
      locked: true,
      bg: brand.colors.surface,
      padding: 16,
      columnsBlocks: [
        [
          mkText(
            `<p style="margin:0;font-size:11px;color:${brand.colors.muted};line-height:1.5;">${brand.defaultFooterHtml}</p>`,
          ),
        ],
      ],
    })
  }

  return {
    id: `doc-new-${newBlockId()}`,
    language: "en",
    dir: "ltr",
    pageBg: brand?.colors.surface ?? "#F1F5F9",
    contentWidth: 600,
    rows,
  }
}

// ─────────── AI-generated COMPLETE HTML email factory ───────────

/**
 * Build a fully decorated HTML email — the canvas this returns looks like
 * a finished campaign, not a stub. Used when the inline composer's AI mode
 * hands off to the v3 builder via the HTML-template path.
 *
 * Composition:
 *   1. Brand header (locked saved module if available, else a brand-tinted strip)
 *   2. Hero banner — brand-coloured pill with the email's purpose
 *   3. Headline + greeting + body paragraph
 *   4. Spotlight card — amount-due / settlement / PTP key facts (2-column grid)
 *   5. Primary CTA (trackable payment-link block)
 *   6. Supporting paragraph
 *   7. Divider
 *   8. Two-column "What to expect" / "Need help?" row
 *   9. Secondary CTA — talk to a human
 *  10. Footer + signoff (locked footer module if available)
 */
export function buildAiGeneratedHtmlDoc(
  lenderId: string,
  purpose: TemplatePurpose | undefined,
  templateName?: string,
): BuilderDocument {
  const safePurpose = purpose ?? "reminder"
  const voice = getVoice(lenderId)
  const brand = getBrandKitByLenderId(lenderId)
  const starter = PURPOSE_STARTERS[safePurpose]

  const primary = brand?.colors.primary ?? "#10B981"
  const onPrimary = brand?.colors.primaryText ?? "#FFFFFF"
  const accent = starter.accentColor ?? primary
  const accentText = starter.accentColor ? "#FFFFFF" : onPrimary
  const surface = brand?.colors.surface ?? "#F8FAFC"
  const headlineColor = starter.accentColor ?? "#0F172A"

  const rows: BuilderRow[] = []

  // 1. Brand header (locked) or brand-tinted strip
  if (voice.headerModuleId) {
    rows.push(mkLockedModuleRow(voice.headerModuleId))
  } else if (brand) {
    rows.push({
      id: newRowId(),
      columns: 1,
      bg: primary,
      padding: 22,
      columnsBlocks: [
        [
          mkText(
            `<div style="color:${onPrimary};font-weight:700;font-size:18px;letter-spacing:-0.01em;">${brand.lenderName}</div>`,
          ),
        ],
      ],
    })
  }

  // 2. Hero banner
  const heroLabel = purposeHeroLabel(safePurpose)
  rows.push({
    id: newRowId(),
    columns: 1,
    bg: surface,
    padding: 28,
    columnsBlocks: [
      [
        mkText(
          `<div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${accent};color:${accentText};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${heroLabel}</div>` +
          `<h1 style="margin:14px 0 0;font-size:28px;line-height:1.15;font-weight:800;color:${headlineColor};letter-spacing:-0.02em;">${starter.headline(lenderId)}</h1>`,
        ),
      ],
    ],
  })

  // 3. Greeting + body
  rows.push({
    id: newRowId(),
    columns: 1,
    bg: "#FFFFFF",
    padding: 28,
    columnsBlocks: [
      [
        mkText(
          `<p style="margin:0 0 16px;color:#0F172A;font-size:15px;line-height:1.6;">${voice.greeting(safePurpose)}</p>${starter.body}`,
        ),
      ],
    ],
  })

  // 4. Spotlight card — 2-column key facts
  rows.push({
    id: newRowId(),
    columns: 2,
    bg: "#FFFFFF",
    padding: 28,
    columnsBlocks: spotlightCard(safePurpose),
  })

  // 5. Primary CTA
  rows.push({
    id: newRowId(),
    columns: 1,
    bg: "#FFFFFF",
    padding: 28,
    columnsBlocks: [
      [
        mkPayment(starter.cta.label, accent, accentText, starter.cta.conversionEvent, starter.cta.subline),
      ],
    ],
  })

  // 6. Supporting paragraph (if any)
  if (starter.secondary) {
    rows.push({
      id: newRowId(),
      columns: 1,
      bg: "#FFFFFF",
      padding: 28,
      columnsBlocks: [[mkText(starter.secondary)]],
    })
  }

  // 7. Divider
  rows.push({
    id: newRowId(),
    columns: 1,
    bg: "#FFFFFF",
    padding: 8,
    columnsBlocks: [
      [{ id: newBlockId(), kind: "divider", color: "#E5E7EB", thickness: 1 }],
    ],
  })

  // 8. Two-column "What to expect" / "Need help?"
  rows.push({
    id: newRowId(),
    columns: 2,
    bg: surface,
    padding: 28,
    columnsBlocks: [
      [
        mkText(
          `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${primary};">What happens next</p>` +
          `<p style="margin:0;color:#0F172A;font-size:13px;line-height:1.6;">${secondaryColumnLeftCopy(safePurpose)}</p>`,
        ),
      ],
      [
        mkText(
          `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${primary};">Need help?</p>` +
          `<p style="margin:0;color:#0F172A;font-size:13px;line-height:1.6;">Reply to this email or call us — a real person will pick up during business hours.</p>`,
        ),
      ],
    ],
  })

  // 9. Secondary CTA — talk to a human
  rows.push({
    id: newRowId(),
    columns: 1,
    bg: surface,
    padding: 24,
    columnsBlocks: [
      [
        mkButton("Talk to a person", "#FFFFFF", "#0F172A", "rgba(15,23,42,0.15)"),
      ],
    ],
  })

  // 10. Footer + signoff
  rows.push({
    id: newRowId(),
    columns: 1,
    bg: "#FFFFFF",
    padding: 24,
    columnsBlocks: [
      [
        mkText(
          `<p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">— ${voice.signoff}</p>`,
        ),
      ],
    ],
  })

  if (voice.complianceModuleId) {
    rows.push(mkLockedModuleRow(voice.complianceModuleId))
  }
  if (voice.footerModuleId) {
    rows.push(mkLockedModuleRow(voice.footerModuleId))
  } else if (brand) {
    rows.push({
      id: newRowId(),
      columns: 1,
      locked: true,
      bg: surface,
      padding: 16,
      columnsBlocks: [
        [
          mkText(
            `<p style="margin:0;font-size:11px;color:${brand.colors.muted};line-height:1.5;">${brand.defaultFooterHtml}</p>`,
          ),
        ],
      ],
    })
  }

  return {
    id: `doc-ai-${newBlockId()}`,
    language: "en",
    dir: "ltr",
    pageBg: surface,
    contentWidth: 640,
    rows,
  }
}

function mkButton(label: string, bg: string, color: string, _border: string): BuilderBlock {
  return {
    id: newBlockId(),
    kind: "button",
    label,
    href: "#",
    bg,
    color,
    align: "center",
  }
}

function purposeHeroLabel(p: TemplatePurpose): string {
  switch (p) {
    case "reminder":
      return "Payment Due"
    case "ptp-confirmation":
      return "Plan Confirmed"
    case "broken-promise":
      return "Action Needed"
    case "settlement":
      return "Settlement Offer"
    case "final-notice":
      return "Final Notice"
    case "hardship":
      return "We're Here"
    case "welcome":
      return "Welcome"
  }
}

function secondaryColumnLeftCopy(p: TemplatePurpose): string {
  switch (p) {
    case "reminder":
      return "Once you tap the button, you'll be taken to a secure payment page. We'll confirm by email within minutes."
    case "ptp-confirmation":
      return "We'll send a reminder a day before, and confirm the payment as soon as it clears."
    case "broken-promise":
      return "Pick any date in the next 14 days that works for you. We'll lock it in and send a reminder before."
    case "settlement":
      return "Once you accept, the discount is yours. We'll close the account and report it to the bureau as settled."
    case "final-notice":
      return "Settling within 7 days stops the escalation. After that, the matter moves to our recovery partners."
    case "hardship":
      return "When you talk to us, we'll review your situation and walk through every option that's open."
    case "welcome":
      return "After activation, you'll get a welcome guide by email and immediate access to your dashboard."
  }
}

function spotlightCard(p: TemplatePurpose): BuilderBlock[][] {
  // Two columns — each side carries a label + value pair. The keys are
  // merge tags so the email renders per-borrower.
  const cells = (label: string, value: string): BuilderBlock[] => [
    {
      id: newBlockId(),
      kind: "text",
      html:
        `<div style="border-left:3px solid #10B981;padding:6px 12px;background:#F8FAFC;border-radius:4px;">` +
        `<p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#475569;">${label}</p>` +
        `<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0F172A;line-height:1.2;">${value}</p>` +
        `</div>`,
    },
  ]
  switch (p) {
    case "reminder":
    case "broken-promise":
    case "final-notice":
      return [
        cells("Amount due", "AED {{amount_due}}"),
        cells("Due date", "{{due_date}}"),
      ]
    case "settlement":
      return [
        cells("Settlement amount", "AED {{settlement_amount}}"),
        cells("Discount", "{{discount_percent}}% off"),
      ]
    case "ptp-confirmation":
      return [
        cells("Confirmed amount", "AED {{ptp_amount}}"),
        cells("Pay by", "{{ptp_date}}"),
      ]
    case "hardship":
      return [
        cells("Care line", "+971-4-XXX-XXXX"),
        cells("Hours", "Sun–Thu 9 AM – 6 PM"),
      ]
    case "welcome":
      return [
        cells("Account", "{{account_number}}"),
        cells("Status", "Ready to activate"),
      ]
  }
}

// ─────────── SMS / WhatsApp copy ───────────

function buildSmsCopy(lenderId: string, purpose: TemplatePurpose): string {
  const lenderPrefix =
    lenderId === "lnd-mashreq"
      ? "Mashreq: "
      : lenderId === "lnd-tamara"
        ? "Tamara: "
        : lenderId === "lnd-cashnow"
          ? "CashNow: "
          : lenderId === "lnd-enbd"
            ? "ENBD: "
            : lenderId === "lnd-fab"
              ? "FAB: "
              : ""
  switch (purpose) {
    case "reminder":
      return `${lenderPrefix}Reminder — AED {{amount_due}} due {{due_date}}. Pay now: {{payment_link}}. Reply STOP to opt out.`
    case "welcome":
      return `${lenderPrefix}Welcome {{borrower_name}}! Activate your account: {{payment_link}}`
    case "ptp-confirmation":
      return `${lenderPrefix}Plan confirmed — AED {{ptp_amount}} on {{ptp_date}}. We'll remind you closer to the date.`
    case "broken-promise":
      return `${lenderPrefix}We didn't see your AED {{ptp_amount}} payment on {{ptp_date}}. Pick a new date: {{payment_link}}`
    case "settlement":
      return `${lenderPrefix}Settle AED {{amount_due}} for AED {{settlement_amount}} ({{discount_percent}}% off). Expires {{settlement_expiry}}. Accept: {{payment_link}}`
    case "final-notice":
      return `${lenderPrefix}FINAL NOTICE — AED {{amount_due}} overdue on account {{account_number}}. 7 days to settle: {{payment_link}}`
    case "hardship":
      return `${lenderPrefix}Hi {{borrower_name}}, we're here to help. Reply to this message or call us for hardship options.`
  }
}
