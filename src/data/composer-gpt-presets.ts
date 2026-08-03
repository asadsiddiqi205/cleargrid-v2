/**
 * Composer GPT canned outputs (Surface 4 — stubbed AI).
 *
 * The prototype's Composer GPT panel and inline AI assist both look up
 * canned outputs here keyed by intent + playbook + lender. Returns a
 * builder-block payload that gets inserted into the canvas, so the AI
 * never emits an opaque HTML blob.
 */

import type { BuilderRow } from "./builder-blocks"
import { newBlockId, newRowId } from "./builder-blocks"

export type ComposerIntent =
  | "draft_reminder"
  | "draft_ptp"
  | "draft_settlement"
  | "draft_hardship"
  | "draft_welcome"
  | "draft_final"
  | "translate_arabic"
  | "make_formal"
  | "make_friendly"
  | "shorten_sms"

export interface CannedOutput {
  /** Short summary shown in the "generating…" UI before reveal. */
  reasoning: string
  /** New rows to splice in (replaces the active selection, or appends). */
  rows?: BuilderRow[]
  /** For inline-assist on a single text block — replacement HTML. */
  replacementHtml?: string
  /** Optional generated subject line. */
  subject?: string
  /** Optional generated SMS variant. */
  smsVariant?: string
}

/** Composer GPT — full-template drafts keyed by intent. */
export function getCannedDraft(
  intent: ComposerIntent,
  ctx: { lenderId: string; playbookId: string; language: "en" | "ar" | "bilingual" },
): CannedOutput {
  if (intent === "draft_reminder" && ctx.lenderId === "lnd-mashreq") {
    return {
      reasoning:
        "Drafted a formal Mashreq reminder per the playbook (Dear Mr./Ms., account number prominent, CBUAE disclaimer locked).",
      subject: "Payment Reminder — Account {{account_number}}",
      smsVariant:
        "Mashreq: Your account {{account_number}} has AED {{amount_due}} due. Pay: {{payment_link}}",
      rows: [
        mkLocked("sm-mashreq-header"),
        mkContentRow(
          [
            mkText(
              "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;'>Payment Reminder</h1><p style='margin:0;color:#0F172A;line-height:1.6;'>Dear Mr./Ms. {{borrower_name}},<br/><br/>This is a reminder that your installment of <strong>AED {{amount_due}}</strong> for account <strong>{{account_number}}</strong> was due on <strong>{{due_date}}</strong>. To avoid additional charges, please settle the outstanding balance at your earliest convenience.</p>",
            ),
            mkSpacer(20),
            mkPayment("Make Payment", "#F26521", "#FFFFFF", "Tap to pay AED {{amount_due}} now"),
            mkSpacer(20),
            mkText(
              "<p style='margin:0;color:#475569;font-size:13px;line-height:1.6;'>If you have already made this payment, please disregard this notice. For assistance, contact Customer Care at +971-4-XXX-XXXX, Sun–Thu 9:00 AM – 5:00 PM GST.</p>",
            ),
          ],
          { padding: 28, bg: "#FFFFFF" },
        ),
        mkLocked("sm-cbuae-disclaimer"),
        mkLocked("sm-mashreq-footer"),
      ],
    }
  }
  if (intent === "draft_reminder" && ctx.lenderId === "lnd-tamara") {
    return {
      reasoning:
        "Drafted a Tamara-voice reminder per the Friendly playbook (first name, light emoji, short sentences, single CTA).",
      subject: "Hey {{borrower_name}} — quick reminder 👋",
      smsVariant: "Hey {{borrower_name}}! 👋 Your Tamara payment of AED {{amount_due}} is due. Tap to pay: {{payment_link}}",
      rows: [
        mkLocked("sm-tamara-header"),
        mkContentRow(
          [
            mkText(
              "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;'>Hey {{borrower_name}}! 👋</h1><p style='margin:0;color:#111827;line-height:1.6;'>Quick reminder — you have a payment of <strong>AED {{amount_due}}</strong> due. No stress, sort it in a few taps:</p>",
            ),
            mkSpacer(18),
            mkPayment("Pay Now", "#10B981", "#0F172A", "Done in 10 seconds"),
            mkSpacer(24),
            mkText("<p style='margin:0;color:#6B7280;font-size:13px;line-height:1.6;'>Need help? Just reply. We're here.</p>"),
          ],
          { padding: 28, bg: "#FFFFFF" },
        ),
        mkLocked("sm-tamara-footer"),
      ],
    }
  }
  if (intent === "draft_settlement") {
    return {
      reasoning: "Drafted a settlement offer with discount placeholder, accept-CTA primary, counter-offer secondary.",
      subject: "Settle for AED {{settlement_amount}} — {{discount_percent}}% off",
      rows: [
        mkContentRow(
          [
            mkText(
              "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;'>A one-time settlement offer</h1><p style='margin:0;color:#0F172A;line-height:1.6;'>Hi {{borrower_name}},<br/><br/>We're offering you the chance to clear your outstanding balance of <strong>AED {{amount_due}}</strong> with a one-time settlement of just <strong>AED {{settlement_amount}}</strong> — that's <strong>{{discount_percent}}% off</strong>. This offer expires on <strong>{{settlement_expiry}}</strong>.</p>",
            ),
            mkSpacer(22),
            mkPayment("Accept Settlement", "#10B981", "#FFFFFF", "AED {{settlement_amount}} — tap to confirm"),
            mkSpacer(16),
            mkText("<p style='margin:0;color:#475569;font-size:13px;line-height:1.6;'>Need to negotiate? <a href='/counter-offer' style='color:#10B981;'>Submit a counter-offer</a>, or reply to this email to talk to a person.</p>"),
          ],
          { padding: 28, bg: "#FFFFFF" },
        ),
      ],
    }
  }
  if (intent === "draft_hardship") {
    return {
      reasoning: "Drafted a hardship-outreach body. Care-line first, payment CTA second, no payment language in the first paragraph.",
      subject: "We're here to help",
      rows: [
        mkContentRow(
          [
            mkText(
              "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;'>We're here to help</h1><p style='margin:0;color:#0F172A;line-height:1.6;'>Hi {{borrower_name}},<br/><br/>We understand things don't always go to plan. If you're facing temporary financial difficulty, our Care team can walk through your options with you — privately and without judgement.</p>",
            ),
            mkSpacer(20),
            mkBlock({
              kind: "saved_module",
              moduleId: "sm-enbd-careline",
            }),
            mkSpacer(20),
            mkText("<p style='margin:0;color:#475569;font-size:13px;line-height:1.6;'>If you'd prefer to settle online instead, you can do that here:</p>"),
            mkSpacer(10),
            mkPayment("Pay Online", "#C8102E", "#FFFFFF"),
          ],
          { padding: 28, bg: "#FFFFFF" },
        ),
      ],
    }
  }
  if (intent === "draft_final") {
    return {
      reasoning: "Drafted a Final Notice. Formal voice, 7-day window, contractual language, regulatory disclaimer locked.",
      subject: "FINAL NOTICE — Account {{account_number}}",
      rows: [
        mkContentRow(
          [
            mkText(
              "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#B91C1C;'>FINAL NOTICE</h1><p style='margin:0;color:#0F172A;line-height:1.6;'>Dear Mr./Ms. {{borrower_name}},<br/><br/><strong>Reference: Account {{account_number}}</strong><br/><br/>This is a FINAL NOTICE regarding your overdue balance of <strong>AED {{amount_due}}</strong> which was due on <strong>{{due_date}}</strong>. Despite previous reminders, this amount remains unpaid. If payment is not received within <strong>7 calendar days</strong>, we will be compelled to escalate this matter in accordance with applicable regulations and our contractual terms.</p>",
            ),
            mkSpacer(20),
            mkPayment("Pay Now", "#B91C1C", "#FFFFFF"),
            mkSpacer(18),
            mkText("<p style='margin:0;color:#475569;font-size:12px;line-height:1.6;'>To discuss a payment arrangement, contact Customer Care during business hours.</p>"),
          ],
          { padding: 28, bg: "#FFFFFF" },
        ),
        mkLocked("sm-cbuae-disclaimer"),
      ],
    }
  }
  // Default: generic reminder
  return {
    reasoning: "Drafted a generic reminder. Switch lender or playbook for a more tailored result.",
    subject: "Payment reminder",
    rows: [
      mkContentRow(
        [
          mkText(
            "<h1 style='margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;'>Payment Reminder</h1><p style='margin:0;color:#0F172A;line-height:1.6;'>Hi {{borrower_name}},<br/><br/>Your payment of AED {{amount_due}} is due. Please settle at your earliest convenience.</p>",
          ),
          mkSpacer(20),
          mkPayment("Pay Now", "#10B981", "#FFFFFF"),
        ],
        { padding: 28, bg: "#FFFFFF" },
      ),
    ],
  }
}

/** Inline AI assist — single-slot rewrites. */
export function getInlineAssist(
  action: "formal" | "friendly" | "shorten" | "translate_ar" | "rewrite",
  currentHtml: string,
): { reasoning: string; replacementHtml: string } {
  if (action === "formal") {
    return {
      reasoning: "Made the line more formal — removed casual phrasing, used full salutation.",
      replacementHtml: currentHtml
        .replace(/Hey/gi, "Dear Mr./Ms.")
        .replace(/Quick reminder/i, "This is a formal reminder")
        .replace(/sort it in a few taps/i, "settle the outstanding balance at your earliest convenience")
        .replace(/👋/g, ""),
    }
  }
  if (action === "friendly") {
    return {
      reasoning: "Softened the tone — shorter sentences, conversational phrasing.",
      replacementHtml: currentHtml
        .replace(/Dear Mr\.\/Ms\./gi, "Hey")
        .replace(/This is a formal reminder/i, "Quick reminder")
        .replace(/at your earliest convenience/i, "in a few taps"),
    }
  }
  if (action === "shorten") {
    return {
      reasoning: "Cut to the essentials — kept amount, deadline, and CTA pointer.",
      replacementHtml:
        "<p style='margin:0;color:#0F172A;line-height:1.6;'>Hi {{borrower_name}}, AED {{amount_due}} is due by {{due_date}}. Tap the button to pay.</p>",
    }
  }
  if (action === "translate_ar") {
    return {
      reasoning: "Translated to Modern Standard Arabic. RTL applied.",
      replacementHtml:
        "<p style='margin:0;color:#0F172A;line-height:1.8;direction:rtl;text-align:right;font-family:Tajawal,\"Noto Naskh Arabic\",sans-serif;'>عزيزي {{borrower_name}}، يستحق قسطك بقيمة {{amount_due}} درهم بتاريخ {{due_date}}. يرجى تسوية الرصيد المستحق في أقرب وقت ممكن.</p>",
    }
  }
  return {
    reasoning: "Rewrote for clarity. Tightened sentences and kept the original intent.",
    replacementHtml: currentHtml,
  }
}

// ───── helpers ─────

function mkBlock(b: Record<string, unknown>) {
  return { id: newBlockId(), ...b } as never
}
function mkText(html: string) {
  return mkBlock({ kind: "text", html })
}
function mkSpacer(height: number) {
  return mkBlock({ kind: "spacer", height })
}
function mkPayment(label: string, bg: string, color: string, subline?: string) {
  return mkBlock({
    kind: "payment_link",
    label,
    bg,
    color,
    subline,
    conversionEvent: "payment_initiated",
  })
}
function mkLocked(moduleId: string): BuilderRow {
  return {
    id: newRowId(),
    columns: 1,
    locked: true,
    columnsBlocks: [[mkBlock({ kind: "saved_module", moduleId, locked: true })]],
  }
}
function mkContentRow(
  blocks: unknown[],
  opts?: { padding?: number; bg?: string },
): BuilderRow {
  return {
    id: newRowId(),
    columns: 1,
    bg: opts?.bg,
    padding: opts?.padding,
    columnsBlocks: [blocks as never],
  }
}
