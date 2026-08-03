import { lenders } from "@/data/lenders"

export type StrategyPurpose =
  | "welcome"
  | "reminder"
  | "broken-promise"
  | "ptp-confirmation"
  | "settlement"
  | "final-notice"
  | "hardship"

export type StrategyTone =
  | "professional"
  | "friendly"
  | "firm"
  | "empathetic"
  | "urgent"

export type CompliancePosture = "standard" | "strict" | "lenient"

export type StrategyChannel = "email" | "sms" | "whatsapp"

export interface StrategyChannelTemplate {
  channel: StrategyChannel
  templateId: string
  templateName: string
  enabled: boolean
  /** Optional rich HTML template id (from rich-email-templates registry). */
  htmlTemplateId?: string
  htmlTemplateName?: string
}

export interface Strategy {
  id: string
  name: string
  description: string
  lenderId: string // "general" or actual lender id from lenders.ts
  lenderName: string
  purpose: StrategyPurpose
  tone: StrategyTone
  compliancePosture: CompliancePosture
  channels: StrategyChannelTemplate[] // 3 entries: email, sms, whatsapp
  cadence: string
  systemPrompt: string
  status: "active" | "draft" | "archived"
  createdAt: string
  lastUsedAt?: string
  // performance metrics
  emailsSent: number
  conversionRate: number
  revenueAed: number
  trendVsLastWeek: number // percentage change
}

// ---------------------------------------------------------------------------
// Purpose metadata for UI
// ---------------------------------------------------------------------------
export const PURPOSE_META: Record<
  StrategyPurpose,
  { label: string; icon: string; color: string; description: string }
> = {
  welcome: {
    label: "Welcome / Onboarding",
    icon: "Sparkles",
    color: "#eab308",
    description: "First-touch outreach to a newly delinquent borrower.",
  },
  reminder: {
    label: "Payment Reminder",
    icon: "Bell",
    color: "#3b82f6",
    description: "Routine nudge to pay before serious escalation.",
  },
  "broken-promise": {
    label: "Broken Promise Recovery",
    icon: "AlertTriangle",
    color: "#ef4444",
    description: "Re-engage borrowers who missed a Promise to Pay.",
  },
  "ptp-confirmation": {
    label: "PTP Confirmation",
    icon: "CheckCircle2",
    color: "#22c55e",
    description: "Confirm and reinforce a freshly captured PTP.",
  },
  settlement: {
    label: "Settlement Offer",
    icon: "HandCoins",
    color: "#14b8a6",
    description: "Present a discounted settlement to close the file.",
  },
  "final-notice": {
    label: "Final Notice",
    icon: "Scale",
    color: "#f97316",
    description: "Last formal warning before legal escalation.",
  },
  hardship: {
    label: "Hardship Outreach",
    icon: "HeartHandshake",
    color: "#a855f7",
    description: "Empathetic outreach to borrowers in financial distress.",
  },
}

export const TONE_META: Record<StrategyTone, { label: string; color: string }> = {
  professional: { label: "Professional", color: "#3b82f6" },
  friendly: { label: "Friendly", color: "#22c55e" },
  firm: { label: "Firm", color: "#ef4444" },
  empathetic: { label: "Empathetic", color: "#a855f7" },
  urgent: { label: "Urgent", color: "#f97316" },
}

export const COMPLIANCE_META: Record<
  CompliancePosture,
  { label: string; description: string }
> = {
  standard: {
    label: "Standard",
    description: "Balanced — UAE/KSA collection norms.",
  },
  strict: {
    label: "Strict",
    description: "Legal-team-reviewed language only.",
  },
  lenient: {
    label: "Lenient",
    description: "Relationship-first, soft language.",
  },
}

// ---------------------------------------------------------------------------
// Helpers to make strategies less verbose to declare
// ---------------------------------------------------------------------------
function lenderName(id: string): string {
  if (id === "general") return "General"
  return lenders.find((l) => l.id === id)?.name ?? "General"
}

function chans(
  email: { id: string; name: string; enabled?: boolean },
  sms: { id: string; name: string; enabled?: boolean },
  whatsapp: { id: string; name: string; enabled?: boolean },
): StrategyChannelTemplate[] {
  return [
    {
      channel: "email",
      templateId: email.id,
      templateName: email.name,
      enabled: email.enabled ?? true,
    },
    {
      channel: "sms",
      templateId: sms.id,
      templateName: sms.name,
      enabled: sms.enabled ?? true,
    },
    {
      channel: "whatsapp",
      templateId: whatsapp.id,
      templateName: whatsapp.name,
      enabled: whatsapp.enabled ?? true,
    },
  ]
}

// ---------------------------------------------------------------------------
// 20+ realistic strategies across lenders + general
// ---------------------------------------------------------------------------
export const strategies: Strategy[] = [
  // -------------------------------------------------------------------------
  // GENERAL — lender-agnostic playbooks
  // -------------------------------------------------------------------------
  {
    id: "strat-gen-reminder",
    name: "General Payment Reminder",
    description:
      "Friendly cross-lender reminder used when no lender-specific playbook exists. Covers all 4 channels with neutral branding.",
    lenderId: "general",
    lenderName: lenderName("general"),
    purpose: "reminder",
    tone: "professional",
    compliancePosture: "standard",
    channels: chans(
      { id: "tmpl-001", name: "Payment Reminder - Soft" },
      { id: "tmpl-009", name: "Partial Payment Thank You" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 4, Day 8",
    systemPrompt:
      "You are a professional debt-resolution assistant. Send a balanced, courteous reminder. Lead with empathy, mention the outstanding amount once, and provide a clear payment link. Avoid pressure tactics.",
    status: "active",
    createdAt: "2025-10-12",
    lastUsedAt: "2026-04-04",
    emailsSent: 4870,
    conversionRate: 3.2,
    revenueAed: 142_000,
    trendVsLastWeek: 1.4,
  },
  {
    id: "strat-gen-welcome",
    name: "General Welcome Message",
    description:
      "First-touch onboarding for newly delinquent borrowers across any lender. Sets a supportive tone for everything that follows.",
    lenderId: "general",
    lenderName: lenderName("general"),
    purpose: "welcome",
    tone: "friendly",
    compliancePosture: "lenient",
    channels: chans(
      { id: "tmpl-010", name: "Welcome - New Delinquent" },
      { id: "tmpl-009", name: "Partial Payment Thank You" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 5",
    systemPrompt:
      "You are a customer-success assistant for a debt-resolution platform. Greet the borrower warmly, explain that this is the first outreach, and present payment options without pressure.",
    status: "active",
    createdAt: "2025-11-02",
    lastUsedAt: "2026-04-03",
    emailsSent: 2310,
    conversionRate: 2.7,
    revenueAed: 56_000,
    trendVsLastWeek: 0.8,
  },
  {
    id: "strat-gen-ptp-followup",
    name: "General PTP Follow-up",
    description:
      "Lender-agnostic Promise-to-Pay confirmation and gentle pre-due reminder.",
    lenderId: "general",
    lenderName: lenderName("general"),
    purpose: "ptp-confirmation",
    tone: "professional",
    compliancePosture: "standard",
    channels: chans(
      { id: "tmpl-001", name: "Payment Reminder - Soft" },
      { id: "tmpl-003", name: "PTP Confirmation" },
      { id: "tmpl-008", name: "Callback Confirmation" },
    ),
    cadence: "Same day, Day before due, Due date",
    systemPrompt:
      "You are confirming a Promise-to-Pay. Acknowledge the commitment, restate the date and amount, and thank the borrower for engaging. Stay positive.",
    status: "active",
    createdAt: "2025-09-30",
    lastUsedAt: "2026-04-04",
    emailsSent: 3640,
    conversionRate: 4.6,
    revenueAed: 198_000,
    trendVsLastWeek: 2.1,
  },

  // -------------------------------------------------------------------------
  // MASHREQ — formal bank tone
  // -------------------------------------------------------------------------
  {
    id: "strat-mashreq-broken-promise",
    name: "Mashreq Broken Promise Recovery",
    description:
      "Formal, firm follow-up for Mashreq borrowers who missed a Promise to Pay. Reinforces the bank's brand standards.",
    lenderId: "lnd-mashreq",
    lenderName: lenderName("lnd-mashreq"),
    purpose: "broken-promise",
    tone: "firm",
    compliancePosture: "strict",
    channels: chans(
      { id: "tmpl-002", name: "Overdue Notice - Firm" },
      { id: "tmpl-006", name: "Broken Promise Follow-up" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day after PTP miss, +2 days, +5 days",
    systemPrompt:
      "You are a collections agent representing Mashreq Bank. Use formal, bank-grade language. Reference the missed Promise to Pay date factually, restate the outstanding amount in AED, and outline the bank's recovery options. Never threaten — state facts only.",
    status: "active",
    createdAt: "2025-08-21",
    lastUsedAt: "2026-04-04",
    emailsSent: 1840,
    conversionRate: 5.2,
    revenueAed: 312_000,
    trendVsLastWeek: 3.1,
  },
  {
    id: "strat-mashreq-ptp-confirmation",
    name: "Mashreq PTP Confirmation",
    description:
      "Bank-branded PTP capture confirmation with formal acknowledgement of the borrower's commitment.",
    lenderId: "lnd-mashreq",
    lenderName: lenderName("lnd-mashreq"),
    purpose: "ptp-confirmation",
    tone: "professional",
    compliancePosture: "strict",
    channels: chans(
      { id: "tmpl-002", name: "Overdue Notice - Firm" },
      { id: "tmpl-003", name: "PTP Confirmation" },
      { id: "tmpl-008", name: "Callback Confirmation" },
    ),
    cadence: "Same day, Day before due",
    systemPrompt:
      "You are confirming a Promise-to-Pay on behalf of Mashreq Bank. Use formal banking language. Restate the agreed payment amount, date, and account reference. Provide instructions on how to pay through Mashreq channels.",
    status: "active",
    createdAt: "2025-09-14",
    lastUsedAt: "2026-04-03",
    emailsSent: 1240,
    conversionRate: 6.1,
    revenueAed: 224_000,
    trendVsLastWeek: 1.9,
  },
  {
    id: "strat-mashreq-settlement",
    name: "Mashreq Settlement Offer",
    description:
      "Discounted settlement offer for high-DPD Mashreq accounts. Strict compliance language with clear validity windows.",
    lenderId: "lnd-mashreq",
    lenderName: lenderName("lnd-mashreq"),
    purpose: "settlement",
    tone: "professional",
    compliancePosture: "strict",
    channels: chans(
      { id: "tmpl-007", name: "Settlement Offer" },
      { id: "tmpl-003", name: "PTP Confirmation" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 7 (final reminder)",
    systemPrompt:
      "You are presenting a settlement opportunity from Mashreq Bank. State the original balance, the discounted amount, the discount percentage, and the validity date. Explain that this is a one-time offer subject to bank approval.",
    status: "active",
    createdAt: "2026-01-08",
    lastUsedAt: "2026-04-02",
    emailsSent: 740,
    conversionRate: 7.4,
    revenueAed: 489_000,
    trendVsLastWeek: 4.3,
  },
  {
    id: "strat-mashreq-final-notice",
    name: "Mashreq Final Notice",
    description:
      "Pre-legal final warning for Mashreq accounts. Reviewed by Mashreq legal — language is fixed.",
    lenderId: "lnd-mashreq",
    lenderName: lenderName("lnd-mashreq"),
    purpose: "final-notice",
    tone: "firm",
    compliancePosture: "strict",
    channels: chans(
      { id: "tmpl-005", name: "Legal Notice Preview" },
      { id: "tmpl-002", name: "Overdue Notice - Firm" },
      { id: "tmpl-011", name: "Escalation Warning" },
    ),
    cadence: "Day 1, Day 4, Day 7 (escalation)",
    systemPrompt:
      "You are issuing the final pre-legal notice on behalf of Mashreq Bank. Use formal language reviewed by legal. Reference Federal Decree Law No. 14 of 2020 where appropriate. State factual consequences of continued non-payment. Provide a clear deadline.",
    status: "active",
    createdAt: "2025-12-04",
    lastUsedAt: "2026-04-01",
    emailsSent: 410,
    conversionRate: 4.1,
    revenueAed: 168_000,
    trendVsLastWeek: -1.2,
  },

  // -------------------------------------------------------------------------
  // TAMARA — friendly BNPL tone
  // -------------------------------------------------------------------------
  {
    id: "strat-tamara-friendly-reminder",
    name: "Tamara Friendly Reminder",
    description:
      "Warm, low-pressure reminder for Tamara BNPL customers. On-brand tone — first-name basis, casual but clear.",
    lenderId: "lnd-tamara",
    lenderName: lenderName("lnd-tamara"),
    purpose: "reminder",
    tone: "friendly",
    compliancePosture: "lenient",
    channels: chans(
      { id: "tmpl-001", name: "Payment Reminder - Soft" },
      { id: "tmpl-009", name: "Partial Payment Thank You" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 3, Day 7",
    systemPrompt:
      "You are a friendly customer assistant for Tamara, the BNPL brand. Address the borrower by first name. Use casual but clear language. Mention the missed instalment amount once and offer the in-app payment link. Stay positive and short.",
    status: "active",
    createdAt: "2025-07-18",
    lastUsedAt: "2026-04-04",
    emailsSent: 5210,
    conversionRate: 4.8,
    revenueAed: 184_000,
    trendVsLastWeek: 5.7,
  },
  {
    id: "strat-tamara-broken-promise",
    name: "Tamara Broken Promise",
    description:
      "Empathetic recovery for Tamara borrowers who missed a Promise to Pay. Preserves the customer relationship.",
    lenderId: "lnd-tamara",
    lenderName: lenderName("lnd-tamara"),
    purpose: "broken-promise",
    tone: "empathetic",
    compliancePosture: "standard",
    channels: chans(
      { id: "tmpl-006", name: "Broken Promise Follow-up" },
      { id: "tmpl-006", name: "Broken Promise Follow-up" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 4",
    systemPrompt:
      "You are reaching out to a Tamara customer who couldn't keep a Promise to Pay. Lead with understanding, ask if there's anything we should know, and offer to reschedule the payment. Never blame.",
    status: "active",
    createdAt: "2025-09-22",
    lastUsedAt: "2026-04-03",
    emailsSent: 2040,
    conversionRate: 5.6,
    revenueAed: 96_000,
    trendVsLastWeek: 2.4,
  },
  {
    id: "strat-tamara-welcome",
    name: "Tamara Welcome to Collections",
    description:
      "Soft onboarding for Tamara customers entering the collections workflow for the first time.",
    lenderId: "lnd-tamara",
    lenderName: lenderName("lnd-tamara"),
    purpose: "welcome",
    tone: "friendly",
    compliancePosture: "lenient",
    channels: chans(
      { id: "tmpl-010", name: "Welcome - New Delinquent" },
      { id: "tmpl-009", name: "Partial Payment Thank You" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1 only",
    systemPrompt:
      "You are introducing yourself to a Tamara customer who has a missed instalment. Use the Tamara brand voice — friendly, casual, warm. Reassure the customer that this is a routine reminder and offer support.",
    status: "active",
    createdAt: "2025-11-19",
    lastUsedAt: "2026-04-02",
    emailsSent: 1860,
    conversionRate: 3.4,
    revenueAed: 48_000,
    trendVsLastWeek: 1.1,
  },
  {
    id: "strat-tamara-settlement",
    name: "Tamara Settlement Offer",
    description:
      "Friendly settlement offer that preserves the customer relationship while closing out high-DPD Tamara files.",
    lenderId: "lnd-tamara",
    lenderName: lenderName("lnd-tamara"),
    purpose: "settlement",
    tone: "friendly",
    compliancePosture: "standard",
    channels: chans(
      { id: "tmpl-007", name: "Settlement Offer" },
      { id: "tmpl-003", name: "PTP Confirmation" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 6",
    systemPrompt:
      "You are offering a settlement to a Tamara customer. Frame it as a one-time goodwill discount to help them close the balance. Stay warm and avoid legal-sounding language.",
    status: "active",
    createdAt: "2026-01-22",
    lastUsedAt: "2026-04-03",
    emailsSent: 920,
    conversionRate: 6.9,
    revenueAed: 215_000,
    trendVsLastWeek: 3.8,
  },

  // -------------------------------------------------------------------------
  // CASHNOW — personal loans
  // -------------------------------------------------------------------------
  {
    id: "strat-cashnow-standard",
    name: "CashNow Standard Reminder",
    description:
      "Standard reminder for CashNow personal-loan borrowers. Balanced tone with clear payment options.",
    lenderId: "lnd-cashnow",
    lenderName: lenderName("lnd-cashnow"),
    purpose: "reminder",
    tone: "professional",
    compliancePosture: "standard",
    channels: chans(
      { id: "tmpl-001", name: "Payment Reminder - Soft" },
      { id: "tmpl-009", name: "Partial Payment Thank You" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 5, Day 10",
    systemPrompt:
      "You are a CashNow collections assistant. Use a professional, balanced tone. Mention the loan reference, the outstanding amount, and the next due date. Provide a clear payment link and contact number.",
    status: "active",
    createdAt: "2025-10-04",
    lastUsedAt: "2026-04-04",
    emailsSent: 3120,
    conversionRate: 3.7,
    revenueAed: 124_000,
    trendVsLastWeek: 0.6,
  },
  {
    id: "strat-cashnow-hardship",
    name: "CashNow Hardship Outreach",
    description:
      "Empathetic outreach for CashNow borrowers showing financial-distress signals. Offers restructuring options.",
    lenderId: "lnd-cashnow",
    lenderName: lenderName("lnd-cashnow"),
    purpose: "hardship",
    tone: "empathetic",
    compliancePosture: "lenient",
    channels: chans(
      { id: "tmpl-010", name: "Welcome - New Delinquent" },
      { id: "tmpl-009", name: "Partial Payment Thank You" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 7, Day 14",
    systemPrompt:
      "You are reaching out to a CashNow borrower flagged for potential hardship. Lead with empathy, ask open questions, and present restructuring and payment-plan options. Do NOT mention legal escalation.",
    status: "active",
    createdAt: "2025-12-11",
    lastUsedAt: "2026-04-01",
    emailsSent: 680,
    conversionRate: 4.2,
    revenueAed: 38_000,
    trendVsLastWeek: -0.4,
  },

  // -------------------------------------------------------------------------
  // EMIRATES NBD — premium bank PoV
  // -------------------------------------------------------------------------
  {
    id: "strat-enbd-early-nudge",
    name: "ENBD Early Delinquency Nudge",
    description:
      "Premium-bank early-delinquency outreach for Emirates NBD. Polished, brand-aligned, low-pressure.",
    lenderId: "lnd-enbd",
    lenderName: lenderName("lnd-enbd"),
    purpose: "reminder",
    tone: "professional",
    compliancePosture: "strict",
    channels: chans(
      { id: "tmpl-001", name: "Payment Reminder - Soft" },
      { id: "tmpl-009", name: "Partial Payment Thank You" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 4",
    systemPrompt:
      "You are an Emirates NBD digital banking assistant. Address the customer as a valued ENBD customer. Use polished, premium-bank language. Mention the outstanding amount once and provide ENBD's secure payment options.",
    status: "active",
    createdAt: "2026-02-01",
    lastUsedAt: "2026-04-04",
    emailsSent: 1320,
    conversionRate: 4.1,
    revenueAed: 142_000,
    trendVsLastWeek: 6.2,
  },
  {
    id: "strat-enbd-standard-recovery",
    name: "ENBD Standard Recovery",
    description:
      "Standard mid-DPD recovery flow for Emirates NBD. Used for accounts 30–60 days past due.",
    lenderId: "lnd-enbd",
    lenderName: lenderName("lnd-enbd"),
    purpose: "broken-promise",
    tone: "firm",
    compliancePosture: "strict",
    channels: chans(
      { id: "tmpl-002", name: "Overdue Notice - Firm" },
      { id: "tmpl-006", name: "Broken Promise Follow-up" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp" },
    ),
    cadence: "Day 1, Day 4, Day 8",
    systemPrompt:
      "You are an Emirates NBD recovery specialist. Use firm but respectful banking language. Reference the customer's account history factually. Outline the bank's recovery options including payment plans and settlement.",
    status: "active",
    createdAt: "2026-02-14",
    lastUsedAt: "2026-04-03",
    emailsSent: 980,
    conversionRate: 4.9,
    revenueAed: 263_000,
    trendVsLastWeek: 8.1,
  },
  {
    id: "strat-enbd-high-value-settlement",
    name: "ENBD High Value Settlement",
    description:
      "Bespoke settlement playbook for high-balance Emirates NBD accounts. Requires manual approval before sending.",
    lenderId: "lnd-enbd",
    lenderName: lenderName("lnd-enbd"),
    purpose: "settlement",
    tone: "professional",
    compliancePosture: "strict",
    channels: chans(
      { id: "tmpl-007", name: "Settlement Offer" },
      { id: "tmpl-003", name: "PTP Confirmation" },
      { id: "tmpl-008", name: "Callback Confirmation" },
    ),
    cadence: "Day 1 (manual trigger)",
    systemPrompt:
      "You are presenting a high-value settlement on behalf of Emirates NBD's recovery team. Address the customer with respect and discretion. State the original balance, the proposed settlement amount, and the validity. Offer to schedule a callback with a senior agent.",
    status: "draft",
    createdAt: "2026-03-02",
    emailsSent: 120,
    conversionRate: 8.2,
    revenueAed: 412_000,
    trendVsLastWeek: 12.0,
  },

  // -------------------------------------------------------------------------
  // Extra archived strategy — to show status filter works
  // -------------------------------------------------------------------------
  {
    id: "strat-tamara-legacy",
    name: "Tamara Legacy Late Notice",
    description:
      "Older Tamara late-notice flow. Replaced by the friendly reminder strategy in Q1 2026.",
    lenderId: "lnd-tamara",
    lenderName: lenderName("lnd-tamara"),
    purpose: "reminder",
    tone: "firm",
    compliancePosture: "standard",
    channels: chans(
      { id: "tmpl-002", name: "Overdue Notice - Firm" },
      { id: "tmpl-006", name: "Broken Promise Follow-up" },
      { id: "tmpl-004", name: "Payment Link - WhatsApp", enabled: false },
    ),
    cadence: "Day 1, Day 5",
    systemPrompt:
      "Legacy Tamara late-notice flow. Do not edit — kept for audit purposes.",
    status: "archived",
    createdAt: "2024-12-01",
    lastUsedAt: "2025-12-15",
    emailsSent: 410,
    conversionRate: 1.6,
    revenueAed: 11_000,
    trendVsLastWeek: -2.8,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function getStrategiesForLender(lenderId: string): Strategy[] {
  if (!lenderId || lenderId === "all") return strategies
  return strategies.filter(
    (s) => s.lenderId === lenderId || s.lenderId === "general"
  )
}

export function getStrategiesByPurpose(purpose: StrategyPurpose): Strategy[] {
  return strategies.filter((s) => s.purpose === purpose)
}

export function getStrategyById(id: string): Strategy | undefined {
  return strategies.find((s) => s.id === id)
}

// Kept for backwards compatibility with composer / sequence builder consumers
export const TEMPLATE_VARIABLES = [
  "{{borrower_name}}",
  "{{outstanding_amount}}",
  "{{due_date}}",
  "{{account_number}}",
  "{{payment_link}}",
  "{{agent_name}}",
  "{{company_name}}",
  "{{settlement_offer}}",
  "{{days_past_due}}",
  "{{last_payment_date}}",
]
