/**
 * Module starter presets — multiple visual options per (lender × kind) that
 * the New Module modal surfaces as a picker. Selecting one pre-fills the
 * HTML content; the author can still tweak it before saving.
 */

import type { SavedModuleKind } from "./saved-modules"

export interface ModulePreset {
  id: string
  label: string
  /** One-line summary shown under the label. */
  description: string
  /** Pre-filled HTML content. */
  html: string
}

/**
 * Lender id → kind → list of presets. Falls back to "general" when the
 * lender has no specific options for the kind.
 */
type Registry = Partial<Record<SavedModuleKind, ModulePreset[]>>

const GENERAL: Registry = {
  header: [
    {
      id: "g-header-logo-ribbon",
      label: "Logo + accent ribbon",
      description: "Brand block at the top.",
      html: `<div style="background:#10B981;padding:16px 24px;color:#fff;font-weight:700;font-size:16px;letter-spacing:-0.01em;">ClearGrid</div>`,
    },
    {
      id: "g-header-centered",
      label: "Centered wordmark",
      description: "Logo centered, no ribbon.",
      html: `<div style="background:#FFFFFF;padding:24px;text-align:center;border-bottom:1px solid #E5E7EB;font-weight:700;font-size:18px;color:#0F172A;">ClearGrid</div>`,
    },
    {
      id: "g-header-promo",
      label: "Promo banner",
      description: "Coloured banner with announcement copy.",
      html: `<div style="background:#FEF3C7;padding:12px 16px;color:#92400E;font-weight:600;text-align:center;font-size:13px;">Save 30% — settle by month-end</div>`,
    },
  ],
  footer: [
    {
      id: "g-footer-legal",
      label: "Legal + opt-out",
      description: "Compliance line + unsubscribe.",
      html: `<div style="font-size:11px;color:#475569;padding:16px 24px;background:#F8FAFC;border-top:1px solid #E5E7EB;">ClearGrid Collections · To stop receiving these notifications, reply STOP or visit cleargrid.co/preferences.</div>`,
    },
    {
      id: "g-footer-contact",
      label: "Contact + opt-out",
      description: "Phone, hours, opt-out line.",
      html: `<div style="font-size:11px;color:#475569;padding:16px 24px;background:#F8FAFC;line-height:1.5;">Questions? Reply to this email or call +971-4-XXX-XXXX (Sun–Thu, 9 AM – 6 PM).<br/>Reply STOP to unsubscribe.</div>`,
    },
  ],
  payment_cta: [
    {
      id: "g-cta-pay-now",
      label: "Pay Now — solid",
      description: "Primary payment button.",
      html: `<div style="text-align:center;padding:8px;"><a href="#" style="display:inline-block;padding:14px 36px;background:#10B981;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Make Payment</a></div>`,
    },
    {
      id: "g-cta-pay-with-amount",
      label: "Pay Now — with amount",
      description: "Button + sub-line showing AED {{amount_due}}.",
      html: `<div style="text-align:center;padding:8px;"><a href="#" style="display:inline-block;padding:14px 36px;background:#10B981;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Pay AED {{amount_due}}</a><div style="margin-top:8px;font-size:12px;color:#6B7280;">Tap to pay now · takes 10 seconds</div></div>`,
    },
    {
      id: "g-cta-settlement",
      label: "Accept Settlement",
      description: "Settlement-themed CTA.",
      html: `<div style="text-align:center;padding:8px;"><a href="#" style="display:inline-block;padding:14px 36px;background:#10B981;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Accept Settlement</a><div style="margin-top:8px;font-size:12px;color:#6B7280;">AED {{settlement_amount}} · {{discount_percent}}% off</div></div>`,
    },
  ],
  compliance: [
    {
      id: "g-comp-cbuae",
      label: "CBUAE regulatory notice",
      description: "Central Bank of the UAE disclaimer.",
      html: `<div style="border-left:3px solid #94A3B8;padding:10px 14px;font-size:11px;color:#475569;background:#F8FAFC;">This communication constitutes formal notice as required under applicable regulations. Licensed and regulated by the Central Bank of the UAE.</div>`,
    },
    {
      id: "g-comp-aecb",
      label: "AECB credit-reporting notice",
      description: "Al Etihad Credit Bureau disclaimer.",
      html: `<div style="border-left:3px solid #EAB308;padding:10px 14px;font-size:11px;color:#854D0E;background:#FEFCE8;">Continued non-payment may be reported to Al Etihad Credit Bureau and affect your credit score.</div>`,
    },
  ],
  greeting: [
    {
      id: "g-greet-formal",
      label: "Formal salutation",
      description: "Dear Mr./Ms. + last name.",
      html: `<p style="margin:0;color:#0F172A;font-size:15px;line-height:1.6;">Dear Mr./Ms. {{last_name}},</p>`,
    },
    {
      id: "g-greet-friendly",
      label: "Friendly first-name",
      description: "Hi + first name.",
      html: `<p style="margin:0;color:#0F172A;font-size:15px;line-height:1.6;">Hi {{first_name}},</p>`,
    },
    {
      id: "g-greet-bilingual",
      label: "Bilingual EN/AR",
      description: "Side-by-side English + Arabic.",
      html: `<div style="display:flex;gap:16px;"><div style="flex:1;color:#0F172A;font-size:15px;">Dear {{borrower_name}},</div><div style="flex:1;text-align:right;direction:rtl;color:#0F172A;font-size:15px;font-family:Tajawal,sans-serif;">عزيزي {{borrower_name}}،</div></div>`,
    },
  ],
}

const MASHREQ: Registry = {
  header: [
    {
      id: "mq-header-orange",
      label: "Mashreq orange ribbon",
      description: "Brand orange (#F26521) bar with white wordmark.",
      html: `<div style="background:#F26521;padding:18px 26px;color:#FFFFFF;font-weight:700;font-size:18px;letter-spacing:-0.01em;">Mashreq Bank</div>`,
    },
    {
      id: "mq-header-formal",
      label: "Formal — logo + account",
      description: "Logo strip with account number on the right.",
      html: `<div style="background:#FFFFFF;padding:18px 26px;border-bottom:2px solid #F26521;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;font-size:16px;color:#0F172A;">Mashreq Bank</span><span style="font-size:11px;color:#475569;">Account: {{account_number}}</span></div>`,
    },
  ],
  footer: [
    {
      id: "mq-footer-regulatory",
      label: "Regulatory footer",
      description: "CBUAE + Mashreq PSC details.",
      html: `<div style="font-size:11px;color:#475569;padding:16px 26px;background:#F8FAFC;border-top:1px solid #E5E7EB;line-height:1.5;">Mashreq Bank PSC. Licensed and regulated by the Central Bank of the UAE. P.O. Box 1250, Dubai, UAE.<br/>To stop receiving these notifications, reply STOP or visit mashreq.com/preferences.</div>`,
    },
  ],
  payment_cta: [
    {
      id: "mq-cta-pay",
      label: "Mashreq Pay Now",
      description: "Mashreq orange CTA.",
      html: `<div style="text-align:center;padding:8px;"><a href="#" style="display:inline-block;padding:14px 36px;background:#F26521;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Make Payment</a></div>`,
    },
  ],
  compliance: [
    {
      id: "mq-comp-cbuae",
      label: "CBUAE notice (Mashreq voice)",
      description: "Formal regulatory disclaimer.",
      html: `<div style="border-left:3px solid #F26521;padding:10px 14px;font-size:11px;color:#475569;background:#F8FAFC;">Mashreq Bank is licensed and regulated by the Central Bank of the UAE. This communication constitutes formal notice as required under applicable regulations.</div>`,
    },
  ],
  greeting: [
    {
      id: "mq-greet-formal",
      label: "Dear Mr./Ms.",
      description: "Mashreq's formal salutation.",
      html: `<p style="margin:0;color:#0F172A;font-size:15px;line-height:1.6;">Dear Mr./Ms. {{last_name}},</p>`,
    },
  ],
}

const TAMARA: Registry = {
  header: [
    {
      id: "tm-header-mint",
      label: "Tamara mint ribbon",
      description: "Mint-green bar with lowercase wordmark.",
      html: `<div style="background:#10B981;padding:16px 22px;color:#0F172A;font-weight:700;font-size:18px;letter-spacing:-0.02em;">tamara</div>`,
    },
    {
      id: "tm-header-promo",
      label: "Promo — 30% off settlement",
      description: "Bright yellow promo banner.",
      html: `<div style="background:#FEF3C7;padding:12px 16px;color:#92400E;font-weight:600;text-align:center;font-size:13px;">Save 30% — settle by month-end</div>`,
    },
  ],
  footer: [
    {
      id: "tm-footer-friendly",
      label: "Friendly opt-out",
      description: "Soft tone, brand voice.",
      html: `<div style="font-size:11px;color:#6B7280;padding:14px 22px;background:#F9FAFB;border-top:1px solid #E5E7EB;">Don't want these? Reply STOP and we'll quiet down. — Tamara Financing Solutions, Dubai, UAE.</div>`,
    },
  ],
  payment_cta: [
    {
      id: "tm-cta-pay-now",
      label: "Pay Now — friendly",
      description: "Tamara mint CTA with sub-line.",
      html: `<div style="text-align:center;padding:8px;"><a href="#" style="display:inline-block;padding:14px 36px;background:#10B981;color:#0F172A;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Pay Now</a><div style="margin-top:8px;font-size:12px;color:#6B7280;">Done in 10 seconds</div></div>`,
    },
    {
      id: "tm-cta-reschedule",
      label: "Reschedule plan",
      description: "Secondary CTA for PTP flows.",
      html: `<div style="text-align:center;padding:8px;"><a href="#" style="display:inline-block;padding:14px 36px;background:#10B981;color:#0F172A;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Pick a new date</a></div>`,
    },
  ],
  greeting: [
    {
      id: "tm-greet-friendly",
      label: "Hey + first name 👋",
      description: "Casual Tamara voice.",
      html: `<p style="margin:0;color:#111827;font-size:15px;line-height:1.6;">Hey {{first_name}}! 👋</p>`,
    },
  ],
}

const CASHNOW: Registry = {
  header: [
    {
      id: "cn-header-blue",
      label: "CashNow blue strip",
      description: "Lender-blue header bar.",
      html: `<div style="background:#0EA5E9;padding:16px 24px;color:#FFFFFF;font-weight:700;font-size:17px;">CashNow</div>`,
    },
  ],
  compliance: [
    {
      id: "cn-comp-aecb",
      label: "AECB credit-reporting (CashNow)",
      description: "Required for late-stage CashNow content.",
      html: `<div style="border-left:3px solid #EAB308;padding:10px 14px;font-size:11px;color:#854D0E;background:#FEFCE8;">Continued non-payment may be reported to Al Etihad Credit Bureau and affect your credit score.</div>`,
    },
  ],
  payment_cta: [
    {
      id: "cn-cta-direct",
      label: "CashNow direct CTA",
      description: "High-urgency CTA, blue brand.",
      html: `<div style="text-align:center;padding:8px;"><a href="#" style="display:inline-block;padding:14px 36px;background:#0EA5E9;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Settle AED {{amount_due}}</a></div>`,
    },
  ],
}

const ENBD: Registry = {
  header: [
    {
      id: "enbd-header-red",
      label: "ENBD red strip",
      description: "Emirates NBD red brand bar.",
      html: `<div style="background:#C8102E;padding:18px 26px;color:#FFFFFF;font-weight:700;font-size:17px;">Emirates NBD</div>`,
    },
  ],
  footer: [
    {
      id: "enbd-footer-regulatory",
      label: "ENBD regulatory footer",
      description: "ENBD PJSC + CBUAE.",
      html: `<div style="font-size:11px;color:#475569;padding:16px 26px;background:#F9FAFB;border-top:1px solid #E5E7EB;line-height:1.5;">Emirates NBD Bank PJSC. Regulated by the Central Bank of the UAE. P.O. Box 777, Dubai, UAE.</div>`,
    },
  ],
  compliance: [
    {
      id: "enbd-careline",
      label: "Hardship care-line",
      description: "Care-line contact block.",
      html: `<div style="background:#F9FAFB;padding:14px 18px;border-radius:6px;font-size:12px;color:#111827;border-left:3px solid #C8102E;">Need to talk? Call our Care team in confidence: +971-4-XXX-XXXX, Sun–Thu 9:00 AM – 6:00 PM GST.</div>`,
    },
  ],
}

const FAB: Registry = {
  header: [
    {
      id: "fab-header-navy",
      label: "FAB navy header",
      description: "First Abu Dhabi navy strip.",
      html: `<div style="background:#003C71;padding:18px 26px;color:#FFFFFF;font-weight:700;font-size:17px;">First Abu Dhabi Bank</div>`,
    },
  ],
  footer: [
    {
      id: "fab-footer-regulatory",
      label: "FAB regulatory footer",
      description: "FAB PJSC + CBUAE.",
      html: `<div style="font-size:11px;color:#475569;padding:16px 26px;background:#F8FAFC;border-top:1px solid #CBD5E1;line-height:1.5;">First Abu Dhabi Bank PJSC. Licensed by the Central Bank of the UAE.</div>`,
    },
  ],
}

const REGISTRIES: Record<string, Registry> = {
  general: GENERAL,
  "lnd-mashreq": MASHREQ,
  "lnd-tamara": TAMARA,
  "lnd-cashnow": CASHNOW,
  "lnd-enbd": ENBD,
  "lnd-fab": FAB,
}

/**
 * Get the list of preset starting points for a given (lender × kind).
 * Always returns at least the General presets — lender-specific options are
 * prepended on top.
 */
export function getModulePresets(
  lenderId: string,
  kind: SavedModuleKind,
): ModulePreset[] {
  const lenderPresets = REGISTRIES[lenderId]?.[kind] ?? []
  const generalPresets = REGISTRIES.general?.[kind] ?? []
  // Lender-specific options first, then general, deduped by id.
  const seen = new Set<string>()
  const out: ModulePreset[] = []
  for (const p of [...lenderPresets, ...generalPresets]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}
