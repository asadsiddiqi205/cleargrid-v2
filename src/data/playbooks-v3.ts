/**
 * Playbooks v3 — first-class voice + ruleset.
 *
 * A playbook does two jobs:
 *  1. Steers AI generation (Composer GPT + inline AI assist)
 *  2. Validates manual content via lint (compliance / brand / length rules)
 *
 * Cross-channel: rules apply to SMS, HTML email, and plain text.
 */

export type PlaybookTone = "professional" | "friendly" | "firm" | "empathetic" | "urgent"
export type PlaybookLanguage = "en" | "ar" | "bilingual"
export type DialectArabic = "msa" | "gulf" | "egyptian"

export type DpdBucket = "0-30" | "31-60" | "61-90" | "91-180" | "180+"

export interface DpdEscalation {
  bucket: DpdBucket
  toneShift: PlaybookTone
  /** Extra rules that only apply once a borrower is in this bucket. */
  addedRules?: string[]
}

export interface PlaybookRule {
  id: string
  /** Short, human-readable rule statement (shown in the lint panel). */
  statement: string
  /** What lint level a violation triggers. */
  severity: "error" | "warning" | "info"
  /** How the linter detects this rule. */
  detector:
    | { kind: "forbidden_phrase"; phrases: string[] }
    | { kind: "required_phrase"; phrases: string[]; minOccurrences?: number }
    | { kind: "max_length"; channel: "email_subject" | "sms_body" | "email_body"; max: number }
    | { kind: "reading_level"; maxGradeLevel: number }
    | { kind: "must_include_disclaimer"; disclaimerId: string }
    | { kind: "no_excessive_caps"; maxConsecutive: number }
}

export interface PlaybookDisclaimer {
  id: string
  label: string
  /** Short body shown in the saved-module preview. */
  text: string
}

export interface Playbook {
  id: string
  name: string
  /** Lender scope; "general" means it works across all lenders. */
  lenderId: string
  status: "draft" | "active" | "archived"
  description: string
  tone: PlaybookTone
  /** Default authoring language. Bilingual layouts get an EN + AR pair. */
  language: PlaybookLanguage
  arabicDialect?: DialectArabic
  /** Composer GPT defaults: objective, firmness, target reading level. */
  aiSteering: {
    objective: "reminder" | "ptp_capture" | "settlement" | "hardship_outreach" | "welcome" | "final_notice"
    firmness: "soft" | "moderate" | "firm" | "aggressive"
    maxReadingGrade: number
    /** Free-form steering notes shown to the AI before any generation. */
    notes: string
  }
  /** Static disclaimers (referenced by lint rules + auto-inserted as locked modules). */
  disclaimers: PlaybookDisclaimer[]
  /** Cross-channel rules. */
  rules: PlaybookRule[]
  /** Tone shifts and added rules per DPD bucket. */
  escalation: DpdEscalation[]
  updatedAt: string
  updatedBy: string
}

export const playbooksV3: Playbook[] = [
  {
    id: "pbk-mashreq-formal",
    name: "Mashreq Formal Collections",
    lenderId: "lnd-mashreq",
    status: "active",
    description:
      "Bank-grade formal voice. Strict UAE Central Bank compliance posture. Used for all Mashreq collections content unless overridden.",
    tone: "professional",
    language: "en",
    aiSteering: {
      objective: "reminder",
      firmness: "firm",
      maxReadingGrade: 11,
      notes:
        "Address borrowers as Mr./Ms. {{last_name}}. Reference the account number in every communication. Always include the formal salutation and signature block. No emoji.",
    },
    disclaimers: [
      {
        id: "sm-cbuae-disclaimer",
        label: "UAE Central Bank notice",
        text: "Mashreq Bank is licensed and regulated by the Central Bank of the UAE. This communication constitutes formal notice as required under applicable regulations.",
      },
      {
        id: "discl-mashreq-optout",
        label: "Opt-out line",
        text: "To stop receiving these notifications, reply STOP or visit mashreq.com/preferences.",
      },
    ],
    rules: [
      {
        id: "r-mq-fp-1",
        statement: "Forbidden: casual greetings like 'Hey' or 'Hi there' — use 'Dear Mr./Ms.' or formal title.",
        severity: "error",
        detector: { kind: "forbidden_phrase", phrases: ["hey", "hi there", "what's up", "hiya"] },
      },
      {
        id: "r-mq-rp-1",
        statement: "Must include the CBUAE regulatory disclaimer.",
        severity: "error",
        detector: { kind: "must_include_disclaimer", disclaimerId: "sm-cbuae-disclaimer" },
      },
      {
        id: "r-mq-caps",
        statement: "Avoid more than 4 consecutive ALL-CAPS words (reads as shouting / breaches dignity guidance).",
        severity: "warning",
        detector: { kind: "no_excessive_caps", maxConsecutive: 4 },
      },
      {
        id: "r-mq-len-sub",
        statement: "Email subject must stay under 78 characters (Gmail truncation).",
        severity: "warning",
        detector: { kind: "max_length", channel: "email_subject", max: 78 },
      },
      {
        id: "r-mq-len-sms",
        statement: "SMS body must stay under 160 characters (single-segment).",
        severity: "warning",
        detector: { kind: "max_length", channel: "sms_body", max: 160 },
      },
    ],
    escalation: [
      {
        bucket: "61-90",
        toneShift: "firm",
        addedRules: ["Include account number prominently", "Reference contractual terms"],
      },
      {
        bucket: "91-180",
        toneShift: "urgent",
        addedRules: ["Lead with 'FINAL NOTICE'", "Cite 7-day window"],
      },
      {
        bucket: "180+",
        toneShift: "urgent",
        addedRules: ["Mention escalation per CBUAE", "Include legal-action language"],
      },
    ],
    updatedAt: "2026-06-04T11:23:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "pbk-tamara-friendly",
    name: "Tamara Friendly Reminder",
    lenderId: "lnd-tamara",
    status: "active",
    description:
      "BNPL-native, conversational, low-friction. Emoji allowed. Optimised for tap-to-pay completion on mobile.",
    tone: "friendly",
    language: "en",
    aiSteering: {
      objective: "reminder",
      firmness: "soft",
      maxReadingGrade: 7,
      notes:
        "Talk like a customer-service teammate, not a bank. Lead with the borrower's first name. Short sentences. One CTA. A single light emoji is fine in the greeting.",
    },
    disclaimers: [
      {
        id: "discl-tamara-stop",
        label: "Friendly opt-out",
        text: "Don't want these? Reply STOP and we'll quiet down.",
      },
    ],
    rules: [
      {
        id: "r-tm-fp-1",
        statement: "Forbidden: legalistic terms — 'cease and desist', 'litigation', 'demand'.",
        severity: "error",
        detector: { kind: "forbidden_phrase", phrases: ["cease and desist", "litigation", "demand letter", "legal action"] },
      },
      {
        id: "r-tm-fp-2",
        statement: "Forbidden: 'final notice' (Tamara's brand voice never escalates that far).",
        severity: "error",
        detector: { kind: "forbidden_phrase", phrases: ["final notice", "FINAL NOTICE"] },
      },
      {
        id: "r-tm-len-sub",
        statement: "Email subject should stay under 50 characters (mobile preview).",
        severity: "info",
        detector: { kind: "max_length", channel: "email_subject", max: 50 },
      },
      {
        id: "r-tm-reading",
        statement: "Reading level must stay at grade 7 or below.",
        severity: "warning",
        detector: { kind: "reading_level", maxGradeLevel: 7 },
      },
    ],
    escalation: [
      {
        bucket: "31-60",
        toneShift: "empathetic",
        addedRules: ["Offer hardship pathway", "Mention live agent option"],
      },
    ],
    updatedAt: "2026-05-29T09:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "pbk-cashnow-urgent",
    name: "CashNow Urgent Recovery",
    lenderId: "lnd-cashnow",
    status: "active",
    description:
      "Direct, urgency-led voice for short-term lender. Used after 30 DPD. Conversion-optimised, not relationship-led.",
    tone: "urgent",
    language: "en",
    aiSteering: {
      objective: "ptp_capture",
      firmness: "firm",
      maxReadingGrade: 8,
      notes:
        "Be direct. State the amount and the deadline in the first sentence. Single CTA. Avoid filler words.",
    },
    disclaimers: [
      {
        id: "sm-aecb-disclaimer",
        label: "Al Etihad Credit Bureau notice",
        text: "Continued non-payment may be reported to Al Etihad Credit Bureau and affect your credit score.",
      },
    ],
    rules: [
      {
        id: "r-cn-rp-1",
        statement: "Must include the AECB credit-reporting disclaimer.",
        severity: "error",
        detector: { kind: "must_include_disclaimer", disclaimerId: "sm-aecb-disclaimer" },
      },
      {
        id: "r-cn-len-sms",
        statement: "SMS body must stay under 160 characters.",
        severity: "warning",
        detector: { kind: "max_length", channel: "sms_body", max: 160 },
      },
    ],
    escalation: [
      { bucket: "31-60", toneShift: "firm" },
      { bucket: "61-90", toneShift: "urgent", addedRules: ["Mention AECB reporting"] },
    ],
    updatedAt: "2026-05-22T14:40:00Z",
    updatedBy: "Khalil Ahmed",
  },
  {
    id: "pbk-enbd-hardship",
    name: "ENBD Hardship Outreach",
    lenderId: "lnd-enbd",
    status: "active",
    description:
      "Empathetic, support-led voice for hardship cases. Optimised for right-party contact and reply rate, not payment.",
    tone: "empathetic",
    language: "en",
    aiSteering: {
      objective: "hardship_outreach",
      firmness: "soft",
      maxReadingGrade: 9,
      notes:
        "Open by acknowledging difficulty. Offer the live-agent option above the payment CTA. Never request payment in the first paragraph.",
    },
    disclaimers: [
      {
        id: "discl-enbd-careline",
        label: "Care line",
        text: "Talk to our Care team in confidence at +971-4-XXX-XXXX, Sun–Thu 9:00 AM – 6:00 PM GST.",
      },
    ],
    rules: [
      {
        id: "r-enbd-fp-1",
        statement: "Forbidden: pressure language — 'must pay', 'immediate action', 'demand'.",
        severity: "warning",
        detector: { kind: "forbidden_phrase", phrases: ["must pay", "demand", "immediate action required"] },
      },
    ],
    escalation: [],
    updatedAt: "2026-05-18T10:10:00Z",
    updatedBy: "Asad Siddiqi",
  },
  {
    id: "pbk-bilingual-uae",
    name: "Bilingual EN/AR — UAE Standard",
    lenderId: "general",
    status: "active",
    description:
      "Default bilingual playbook. Generates an English-first body with an Arabic counterpart in the same email. RTL handled per row.",
    tone: "professional",
    language: "bilingual",
    arabicDialect: "msa",
    aiSteering: {
      objective: "reminder",
      firmness: "moderate",
      maxReadingGrade: 9,
      notes:
        "Always emit both English and MSA Arabic. Mirror payment-link CTAs in both languages. Numeric amounts use Arabic-Indic digits in the AR section.",
    },
    disclaimers: [],
    rules: [],
    escalation: [],
    updatedAt: "2026-06-02T16:00:00Z",
    updatedBy: "Rabab Abbas",
  },
  {
    id: "pbk-fab-final",
    name: "FAB Final-Stage Notice (draft)",
    lenderId: "lnd-fab",
    status: "draft",
    description: "Final-stage formal notice playbook. Drafted, not yet approved.",
    tone: "firm",
    language: "en",
    aiSteering: {
      objective: "final_notice",
      firmness: "aggressive",
      maxReadingGrade: 11,
      notes: "Formal bank voice. Cite contractual terms and CBUAE.",
    },
    disclaimers: [],
    rules: [],
    escalation: [],
    updatedAt: "2026-06-08T12:00:00Z",
    updatedBy: "Asad Siddiqi",
  },
]

export function getPlaybookV3ById(id: string): Playbook | undefined {
  return playbooksV3.find((p) => p.id === id)
}

// ─────────── Playbook → templates bundle ───────────
//
// A playbook can bundle one template per channel. The email slot accepts a
// rich HTML template id from the v3 builder (richEmailTemplates registry)
// alongside an optional simple-inline template id. SMS/WhatsApp use the
// simple template ids.

export interface PlaybookTemplateBundle {
  /** Optional rich HTML template (from rich-email-templates). */
  htmlEmailTemplateId?: string
  /** Optional simple inline email template (from templates registry). */
  inlineEmailTemplateId?: string
  smsTemplateId?: string
  whatsappTemplateId?: string
}

export const playbookTemplateBundles: Record<string, PlaybookTemplateBundle> = {
  "pbk-mashreq-formal": {
    htmlEmailTemplateId: "rich-cg-payment-reminder",
    inlineEmailTemplateId: "tpl-mashreq-reminder-en",
    smsTemplateId: "tpl-mashreq-reminder-sms",
    whatsappTemplateId: "tpl-mashreq-reminder-whatsapp",
  },
  "pbk-tamara-friendly": {
    htmlEmailTemplateId: "rich-tamara-friendly",
    smsTemplateId: "tpl-tamara-friendly-sms",
    whatsappTemplateId: "tpl-tamara-friendly-whatsapp",
  },
  "pbk-cashnow-urgent": {
    smsTemplateId: "tpl-cashnow-urgent-sms",
    inlineEmailTemplateId: "tpl-cashnow-urgent-email",
  },
  "pbk-enbd-hardship": {
    htmlEmailTemplateId: "rich-cg-settlement",
    inlineEmailTemplateId: "tpl-enbd-hardship-email",
  },
  "pbk-bilingual-uae": {
    htmlEmailTemplateId: "rich-cg-payment-reminder",
  },
  "pbk-fab-final": {
    htmlEmailTemplateId: "rich-cg-final-notice",
  },
}

export function getPlaybookTemplates(playbookId: string): PlaybookTemplateBundle {
  return playbookTemplateBundles[playbookId] ?? {}
}

export const PLAYBOOK_TONE_LABEL: Record<PlaybookTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  firm: "Firm",
  empathetic: "Empathetic",
  urgent: "Urgent",
}

export const PLAYBOOK_TONE_COLOR: Record<PlaybookTone, string> = {
  professional: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  friendly: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  firm: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  empathetic: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  urgent: "bg-red-500/15 text-red-300 border-red-500/30",
}
