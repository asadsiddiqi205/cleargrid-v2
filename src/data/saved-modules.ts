/**
 * Saved (synced) modules.
 *
 * Authored once, reused across templates. Updating the module updates
 * every template that references it. Each module declares whether the
 * embed is locked (compliance modules) or editable.
 *
 * The three canonical module kinds:
 *  - header — brand header (logo + lender ribbon)
 *  - footer — legal footer (regulatory text + opt-out)
 *  - payment_cta — first-class payment button, trackable
 *  - compliance — disclaimers that must appear verbatim
 *  - greeting — reusable salutation block
 */

export type SavedModuleKind =
  | "header"
  | "footer"
  | "payment_cta"
  | "compliance"
  | "greeting"
  | "payment_details"

export interface SavedModule {
  id: string
  name: string
  kind: SavedModuleKind
  /** Owner — "general" if cross-lender. */
  lenderId: string
  /** Locked modules cannot be edited inline in templates that embed them. */
  locked: boolean
  /** Plain-text description for the library card. */
  description: string
  /** Sample HTML / preview content (rendered inside the canvas as the embed). */
  previewHtml: string
  /** How many templates currently reference this module. */
  usedByCount: number
  /** Bilingual flag: does it ship EN + AR side by side? */
  bilingual?: boolean
  status: "active" | "draft"
  updatedAt: string
  updatedBy: string
}

export const savedModules: SavedModule[] = [
  {
    id: "sm-mashreq-header",
    name: "Mashreq · Brand Header",
    kind: "header",
    lenderId: "lnd-mashreq",
    locked: true,
    description: "Logo + orange accent ribbon. Used on every Mashreq email.",
    previewHtml:
      '<div style="background:#F26521;padding:16px 24px;color:#fff;font-weight:600;">Mashreq Bank</div>',
    usedByCount: 14,
    status: "active",
    updatedAt: "2026-05-30T10:00:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sm-mashreq-footer",
    name: "Mashreq · Legal Footer",
    kind: "footer",
    lenderId: "lnd-mashreq",
    locked: true,
    description: "CBUAE regulatory text + opt-out. Locked.",
    previewHtml:
      '<div style="font-size:11px;color:#475569;padding:16px 24px;">Mashreq Bank PSC. Licensed and regulated by the Central Bank of the UAE. P.O. Box 1250, Dubai, UAE. To stop, reply STOP.</div>',
    usedByCount: 14,
    status: "active",
    updatedAt: "2026-05-30T10:00:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sm-tamara-header",
    name: "Tamara · Header",
    kind: "header",
    lenderId: "lnd-tamara",
    locked: false,
    description: "Soft mint header. Reusable across all Tamara comms.",
    previewHtml:
      '<div style="background:#10B981;padding:14px 20px;color:#0F172A;font-weight:600;">tamara</div>',
    usedByCount: 8,
    status: "active",
    updatedAt: "2026-05-28T14:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sm-tamara-footer",
    name: "Tamara · Footer",
    kind: "footer",
    lenderId: "lnd-tamara",
    locked: true,
    description: "Friendly opt-out + Tamara identity. Locked.",
    previewHtml:
      '<div style="font-size:11px;color:#6B7280;padding:14px 20px;">Don\'t want these? Reply STOP and we\'ll quiet down. — Tamara Financing Solutions, Dubai, UAE.</div>',
    usedByCount: 8,
    status: "active",
    updatedAt: "2026-05-28T14:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sm-payment-cta-cleargrid",
    name: "ClearGrid · Trackable Payment Button",
    kind: "payment_cta",
    lenderId: "general",
    locked: false,
    description:
      "First-class payment-link block. Trackable click, conversion-tagged, auto-resolves {{payment_link}} per borrower.",
    previewHtml:
      '<a href="#" style="display:inline-block;padding:14px 32px;background:#10B981;color:#fff;font-weight:600;border-radius:8px;text-decoration:none;">Make Payment</a>',
    usedByCount: 23,
    status: "active",
    updatedAt: "2026-05-20T11:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sm-cbuae-disclaimer",
    name: "CBUAE Regulatory Disclaimer",
    kind: "compliance",
    lenderId: "general",
    locked: true,
    description:
      "Standard Central Bank of the UAE regulatory notice. Required for formal collections content from UAE-licensed lenders.",
    previewHtml:
      '<div style="border-left:3px solid #94A3B8;padding:10px 14px;font-size:11px;color:#475569;background:#F8FAFC;">This communication constitutes formal notice as required under applicable regulations. Licensed and regulated by the Central Bank of the UAE.</div>',
    usedByCount: 9,
    status: "active",
    updatedAt: "2026-05-15T11:00:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sm-aecb-disclaimer",
    name: "Al Etihad Credit Bureau Notice",
    kind: "compliance",
    lenderId: "general",
    locked: true,
    description: "AECB credit-reporting disclaimer. Required for CashNow + late-stage content.",
    previewHtml:
      '<div style="border-left:3px solid #EAB308;padding:10px 14px;font-size:11px;color:#854D0E;background:#FEFCE8;">Continued non-payment may be reported to Al Etihad Credit Bureau and affect your credit score.</div>',
    usedByCount: 6,
    status: "active",
    updatedAt: "2026-05-15T11:00:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sm-bilingual-greeting",
    name: "Bilingual EN/AR Greeting",
    kind: "greeting",
    lenderId: "general",
    locked: false,
    bilingual: true,
    description: "Side-by-side EN/AR salutation block. Used when language === 'bilingual'.",
    previewHtml:
      '<div style="display:flex;gap:16px;"><div style="flex:1;">Dear {{borrower_name}},</div><div style="flex:1;text-align:right;direction:rtl;">عزيزي {{borrower_name}}،</div></div>',
    usedByCount: 4,
    status: "active",
    updatedAt: "2026-06-02T16:00:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "sm-enbd-careline",
    name: "ENBD · Care Line Block",
    kind: "compliance",
    lenderId: "lnd-enbd",
    locked: false,
    description: "Hardship care-line block. Phone + hours.",
    previewHtml:
      '<div style="background:#F9FAFB;padding:14px 18px;border-radius:6px;font-size:12px;color:#111827;">Need to talk? Call our Care team in confidence: +971-4-XXX-XXXX, Sun–Thu 9:00 AM – 6:00 PM GST.</div>',
    usedByCount: 3,
    status: "active",
    updatedAt: "2026-05-18T10:10:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "sm-promo-banner",
    name: "Tamara · Settlement 30% Promo Banner",
    kind: "header",
    lenderId: "lnd-tamara",
    locked: false,
    description: "Draft promo header for Tamara settlement campaigns. Not yet active.",
    previewHtml:
      '<div style="background:#FEF3C7;padding:12px 16px;color:#92400E;font-weight:600;text-align:center;">Save 30% — settle by month-end</div>',
    usedByCount: 0,
    status: "draft",
    updatedAt: "2026-06-08T09:00:00Z",
    updatedBy: "Khalil Ahmed",
  },
  /* ─── Payment details block (Tamara B2B) ───────────────────────
   * Sent to the current contact on demand from AI Call transcripts
   * or agent actions. Values resolve from the lender's config, not
   * per-account — Tamara B2B has one payment endpoint. */
  {
    id: "sm-tamara-b2b-payment-details",
    name: "Tamara B2B · Payment details",
    kind: "payment_details",
    lenderId: "lnd-tamara-b2b",
    locked: true,
    description:
      "IBAN, bank name, beneficiary and reference for Tamara B2B merchant settlements. Send from an AI Call transcript or agent action to the current contact.",
    previewHtml: `
<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;font-family:-apple-system,Inter,system-ui,sans-serif;">
  <div style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.14em;">Payment details</div>
  <div style="margin-top:8px;display:grid;grid-template-columns:110px 1fr;gap:6px;font-size:13px;color:#0F172A;">
    <div style="color:#64748B;">Beneficiary</div><div style="font-weight:600;">Tamara Finance Ltd.</div>
    <div style="color:#64748B;">Bank</div><div>Mashreq Bank PSC · Dubai</div>
    <div style="color:#64748B;">IBAN</div><div style="font-family:ui-monospace,monospace;">AE07 0331 2345 6789 0123 456</div>
    <div style="color:#64748B;">SWIFT</div><div style="font-family:ui-monospace,monospace;">BOMLAEAD</div>
    <div style="color:#64748B;">Reference</div><div style="font-family:ui-monospace,monospace;">{{business.cr_number}}</div>
  </div>
  <div style="margin-top:10px;padding-top:10px;border-top:1px solid #E2E8F0;font-size:11px;color:#475569;">
    Use the reference exactly as shown so the payment matches your account automatically.
  </div>
</div>`.trim(),
    usedByCount: 0,
    status: "active",
    updatedAt: "2026-09-15T09:00:00Z",
    updatedBy: "Rabab Abbas",
  },
]

export function getSavedModuleById(id: string): SavedModule | undefined {
  return savedModules.find((m) => m.id === id)
}

export const MODULE_KIND_LABEL: Record<SavedModuleKind, string> = {
  header: "Header",
  footer: "Footer",
  payment_cta: "Payment CTA",
  compliance: "Compliance",
  greeting: "Greeting",
  payment_details: "Payment Details",
}
