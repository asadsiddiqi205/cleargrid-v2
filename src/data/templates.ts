export type TemplatePurpose =
  | "welcome"
  | "reminder"
  | "broken-promise"
  | "ptp-confirmation"
  | "settlement"
  | "final-notice"
  | "hardship";

export type TemplateChannel = "email" | "sms" | "whatsapp";

export interface Template {
  id: string;
  name: string;
  lenderId: string; // "general" or actual lender id
  lenderName: string;
  purpose: TemplatePurpose;
  channel: TemplateChannel;
  subject?: string; // email only
  body: string;
  variables: string[]; // {{borrower_name}}, {{amount_due}}, etc.
  status: "active" | "draft" | "archived";
  language: "en" | "ar";
  // metadata
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  // performance
  sentCount: number;
  openRate: number; // % (email only)
  clickRate: number; // % (email only)
  conversionRate: number;
  usedInJourneys: number;
  usedInStrategies: number;
}

export const PURPOSE_LABELS: Record<TemplatePurpose, string> = {
  welcome: "Welcome / Onboarding",
  reminder: "Payment Reminder",
  "broken-promise": "Broken Promise Recovery",
  "ptp-confirmation": "Promise to Pay Confirmation",
  settlement: "Settlement Offer",
  "final-notice": "Final Notice",
  hardship: "Hardship Outreach",
};

export const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export const PURPOSE_ORDER: TemplatePurpose[] = [
  "welcome",
  "reminder",
  "ptp-confirmation",
  "broken-promise",
  "settlement",
  "hardship",
  "final-notice",
];

export const CHANNEL_ORDER: TemplateChannel[] = [
  "email",
  "sms",
  "whatsapp",
];

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */

function extractVars(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

interface TemplateInput {
  id: string;
  name: string;
  lenderId: string;
  lenderName: string;
  purpose: TemplatePurpose;
  channel: TemplateChannel;
  subject?: string;
  body: string;
  status?: "active" | "draft" | "archived";
  language?: "en" | "ar";
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
  sentCount?: number;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
  usedInJourneys?: number;
  usedInStrategies?: number;
}

function mk(t: TemplateInput): Template {
  const fullText = (t.subject ?? "") + "\n" + t.body;
  return {
    id: t.id,
    name: t.name,
    lenderId: t.lenderId,
    lenderName: t.lenderName,
    purpose: t.purpose,
    channel: t.channel,
    subject: t.subject,
    body: t.body,
    variables: extractVars(fullText),
    status: t.status ?? "active",
    language: t.language ?? "en",
    createdAt: t.createdAt ?? "2025-11-01",
    updatedAt: t.updatedAt ?? "2026-03-15",
    lastUsedAt: t.lastUsedAt,
    sentCount: t.sentCount ?? 0,
    openRate: t.openRate ?? 0,
    clickRate: t.clickRate ?? 0,
    conversionRate: t.conversionRate ?? 0,
    usedInJourneys: t.usedInJourneys ?? 0,
    usedInStrategies: t.usedInStrategies ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * GENERAL templates — basic, reusable across lenders
 * ──────────────────────────────────────────────────────────────────────── */

const generalTemplates: Template[] = [
  // ── General > Welcome
  mk({
    id: "tmpl-gen-welcome-email",
    name: "General — Welcome (Email)",
    lenderId: "general",
    lenderName: "General",
    purpose: "welcome",
    channel: "email",
    subject: "Welcome to {{lender_name}} — let's get you back on track",
    body: `Hello {{borrower_name}},

Thank you for being a {{lender_name}} customer. We noticed there is an outstanding balance of AED {{amount_due}} on your account, and we're here to help you resolve it.

We understand life happens. Whether you'd like to settle in full, set up a payment plan, or simply ask a question — our team is ready to support you.

You can review your balance and pay securely at any time:
{{payment_link}}

If you'd prefer to talk to someone, reply to this email or call {{contact_phone}} during business hours.

Kind regards,
{{agent_name}}
{{lender_name}} Customer Care`,
    sentCount: 1840,
    openRate: 48.2,
    clickRate: 11.4,
    conversionRate: 4.6,
    usedInJourneys: 2,
    usedInStrategies: 1,
    lastUsedAt: "2026-04-03",
  }),
  mk({
    id: "tmpl-gen-welcome-sms",
    name: "General — Welcome (SMS)",
    lenderId: "general",
    lenderName: "General",
    purpose: "welcome",
    channel: "sms",
    body: `Hi {{borrower_name}}, this is {{lender_name}}. Your balance of AED {{amount_due}} is ready to view & pay: {{payment_link}}. Reply HELP for support.`,
    sentCount: 2410,
    openRate: 95.1,
    clickRate: 14.2,
    conversionRate: 5.1,
    usedInJourneys: 3,
    usedInStrategies: 1,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    id: "tmpl-gen-welcome-whatsapp",
    name: "General — Welcome (WhatsApp)",
    lenderId: "general",
    lenderName: "General",
    purpose: "welcome",
    channel: "whatsapp",
    body: `Hello {{borrower_name}},

Welcome — this is {{lender_name}}. We're reaching out about a balance of AED {{amount_due}} on your account.

You can view your account and pay securely here: {{payment_link}}

If you'd like to set up a payment plan or have any questions, just reply to this message and our team will help you.`,
    sentCount: 1320,
    openRate: 82.4,
    clickRate: 18.7,
    conversionRate: 6.2,
    usedInJourneys: 2,
    usedInStrategies: 1,
    lastUsedAt: "2026-04-02",
  }),

  // ── General > Reminder
  mk({
    id: "tmpl-gen-reminder-email",
    name: "General — Payment Reminder (Email)",
    lenderId: "general",
    lenderName: "General",
    purpose: "reminder",
    channel: "email",
    subject: "Reminder: AED {{amount_due}} due on {{due_date}}",
    body: `Dear {{borrower_name}},

This is a friendly reminder that a payment of AED {{amount_due}} on your {{lender_name}} account is due on {{due_date}}.

If you've already paid, thank you and please disregard this message. Otherwise, you can settle the balance in just a couple of clicks:
{{payment_link}}

Need a different arrangement? Reply to this email or call {{contact_phone}} and we'll do our best to find an option that works for you.

Best regards,
{{agent_name}}
{{lender_name}}`,
    sentCount: 4820,
    openRate: 44.6,
    clickRate: 9.8,
    conversionRate: 3.7,
    usedInJourneys: 5,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    id: "tmpl-gen-reminder-sms",
    name: "General — Payment Reminder (SMS)",
    lenderId: "general",
    lenderName: "General",
    purpose: "reminder",
    channel: "sms",
    body: `Reminder: AED {{amount_due}} is due {{due_date}}. Pay securely at {{payment_link}}. Questions? Call {{contact_phone}}. — {{lender_name}}`,
    sentCount: 5630,
    openRate: 96.2,
    clickRate: 16.4,
    conversionRate: 4.8,
    usedInJourneys: 4,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    id: "tmpl-gen-reminder-whatsapp",
    name: "General — Payment Reminder (WhatsApp)",
    lenderId: "general",
    lenderName: "General",
    purpose: "reminder",
    channel: "whatsapp",
    body: `Hi {{borrower_name}},

Just a quick reminder from {{lender_name}}: a payment of AED {{amount_due}} is due on {{due_date}}.

You can pay in seconds here: {{payment_link}}

If you'd like to discuss a different arrangement, reply to this message and we'll help.`,
    sentCount: 3240,
    openRate: 84.7,
    clickRate: 22.1,
    conversionRate: 6.4,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // ── General > PTP Confirmation
  mk({
    id: "tmpl-gen-ptp-email",
    name: "General — PTP Confirmation (Email)",
    lenderId: "general",
    lenderName: "General",
    purpose: "ptp-confirmation",
    channel: "email",
    subject: "Your payment promise — confirmed",
    body: `Dear {{borrower_name}},

Thank you for confirming your promise to pay. We've recorded the following commitment on your {{lender_name}} account:

  Amount: AED {{amount_due}}
  Date: {{due_date}}
  Reference: {{reference_id}}

You can pay any time before the due date here:
{{payment_link}}

If anything changes and you can't pay on the agreed date, please reach out to {{agent_name}} at {{contact_phone}} so we can find an alternative.

Best regards,
{{lender_name}}`,
    sentCount: 1980,
    openRate: 62.4,
    clickRate: 14.7,
    conversionRate: 38.2,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    id: "tmpl-gen-ptp-sms",
    name: "General — PTP Confirmation (SMS)",
    lenderId: "general",
    lenderName: "General",
    purpose: "ptp-confirmation",
    channel: "sms",
    body: `Confirmed: AED {{amount_due}} on {{due_date}}. Ref {{reference_id}}. Pay anytime: {{payment_link}}. — {{lender_name}}`,
    sentCount: 2870,
    openRate: 96.4,
    clickRate: 19.3,
    conversionRate: 41.6,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    id: "tmpl-gen-ptp-whatsapp",
    name: "General — PTP Confirmation (WhatsApp)",
    lenderId: "general",
    lenderName: "General",
    purpose: "ptp-confirmation",
    channel: "whatsapp",
    body: `Hi {{borrower_name}},

We've recorded your promise to pay:

Amount: AED {{amount_due}}
Date: {{due_date}}
Reference: {{reference_id}}

Pay any time before the due date: {{payment_link}}

Need to change the date? Just reply to this message.

— {{lender_name}}`,
    sentCount: 1740,
    openRate: 88.1,
    clickRate: 24.6,
    conversionRate: 44.9,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),
];

/* ─────────────────────────────────────────────────────────────────────────
 * MASHREQ — formal bank tone
 * ──────────────────────────────────────────────────────────────────────── */

const mashreqLender = { lenderId: "lnd-mashreq", lenderName: "Mashreq Bank" };

const mashreqTemplates: Template[] = [
  // Reminder
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-reminder-email",
    name: "Mashreq — Payment Reminder (Email)",
    purpose: "reminder",
    channel: "email",
    subject: "Account {{account_number}} — payment due on {{due_date}}",
    body: `Dear {{borrower_name}},

We are writing to inform you that a payment of AED {{amount_due}} is due on your Mashreq Bank account ({{account_number}}) on {{due_date}}.

To avoid additional charges and to keep your account in good standing, kindly arrange settlement on or before the due date.

You may make payment through any of the following channels:
  • Mashreq Online Banking or Mashreq Mobile App
  • Secure payment portal: {{payment_link}}
  • Any Mashreq branch in the UAE

Should you require any clarification or wish to discuss alternative arrangements, please contact {{agent_name}} on {{contact_phone}} during business hours.

We thank you for your continued banking relationship with Mashreq.

Yours sincerely,
{{agent_name}}
Collections Department
Mashreq Bank PSC`,
    sentCount: 6420,
    openRate: 41.8,
    clickRate: 7.6,
    conversionRate: 3.4,
    usedInJourneys: 4,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-reminder-sms",
    name: "Mashreq — Payment Reminder (SMS)",
    purpose: "reminder",
    channel: "sms",
    body: `Mashreq Bank: AED {{amount_due}} due {{due_date}} on a/c {{account_number}}. Pay via app or {{payment_link}}. Helpline: {{contact_phone}}.`,
    sentCount: 8120,
    openRate: 95.8,
    clickRate: 12.4,
    conversionRate: 4.2,
    usedInJourneys: 4,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-reminder-whatsapp",
    name: "Mashreq — Payment Reminder (WhatsApp)",
    purpose: "reminder",
    channel: "whatsapp",
    body: `Dear {{borrower_name}},

This is an official message from Mashreq Bank. A payment of AED {{amount_due}} on account {{account_number}} is due on {{due_date}}.

You may settle the amount via the Mashreq Mobile App or our secure payment portal: {{payment_link}}

For any assistance, please contact our Collections team on {{contact_phone}}.

Mashreq Bank PSC`,
    sentCount: 3680,
    openRate: 81.2,
    clickRate: 18.4,
    conversionRate: 5.7,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // Broken Promise
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-bp-email",
    name: "Mashreq — Broken Promise Recovery (Email)",
    purpose: "broken-promise",
    channel: "email",
    subject: "URGENT: Missed payment commitment on account {{account_number}}",
    body: `Dear {{borrower_name}},

Our records indicate that the agreed payment of AED {{amount_due}} on your Mashreq Bank account ({{account_number}}), promised on {{due_date}}, has not been received.

We understand that unforeseen circumstances may arise. However, it is essential that we hear from you within the next 48 hours to discuss this matter and avoid further escalation, which may include reporting to credit reference agencies and additional charges.

Please contact {{agent_name}} on {{contact_phone}} at your earliest convenience, or settle the outstanding amount via:
{{payment_link}}

Your prompt response is appreciated.

Yours sincerely,
{{agent_name}}
Collections Department
Mashreq Bank PSC`,
    sentCount: 2480,
    openRate: 52.6,
    clickRate: 11.2,
    conversionRate: 8.4,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-bp-sms",
    name: "Mashreq — Broken Promise Recovery (SMS)",
    purpose: "broken-promise",
    channel: "sms",
    body: `Mashreq Bank: Your promised payment of AED {{amount_due}} was not received. Pay now: {{payment_link}} or call {{contact_phone}} within 48hrs.`,
    sentCount: 3150,
    openRate: 96.4,
    clickRate: 17.2,
    conversionRate: 9.1,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-bp-whatsapp",
    name: "Mashreq — Broken Promise Recovery (WhatsApp)",
    purpose: "broken-promise",
    channel: "whatsapp",
    body: `Dear {{borrower_name}},

This is an urgent notice from Mashreq Bank.

Your promised payment of AED {{amount_due}} on account {{account_number}}, scheduled for {{due_date}}, has not been received.

Please settle this amount within 48 hours via {{payment_link}} or contact our Collections team on {{contact_phone}} to discuss alternative arrangements.

Failure to respond may result in further escalation, including credit bureau reporting.

Mashreq Bank PSC`,
    sentCount: 1820,
    openRate: 86.4,
    clickRate: 21.7,
    conversionRate: 11.2,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // PTP Confirmation
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-ptp-email",
    name: "Mashreq — PTP Confirmation (Email)",
    purpose: "ptp-confirmation",
    channel: "email",
    subject: "Confirmation of Payment Arrangement — {{reference_id}}",
    body: `Dear {{borrower_name}},

We hereby confirm receipt of your payment commitment with respect to account {{account_number}}, as detailed below:

  Promised amount: AED {{amount_due}}
  Promised date: {{due_date}}
  Reference: {{reference_id}}
  Agent: {{agent_name}}

Kindly ensure the funds are credited to your account on or before the agreed date. Payments may be made via Mashreq Online Banking, the Mashreq Mobile App, or our secure portal:
{{payment_link}}

Should you experience any difficulty in honouring this commitment, please contact us on {{contact_phone}} prior to the due date so that we may discuss alternative arrangements.

We appreciate your cooperation.

Yours sincerely,
Collections Department
Mashreq Bank PSC`,
    sentCount: 1840,
    openRate: 64.2,
    clickRate: 13.6,
    conversionRate: 42.1,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-ptp-sms",
    name: "Mashreq — PTP Confirmation (SMS)",
    purpose: "ptp-confirmation",
    channel: "sms",
    body: `Mashreq: PTP confirmed. AED {{amount_due}} on {{due_date}}, ref {{reference_id}}. Pay: {{payment_link}}. Helpline: {{contact_phone}}.`,
    sentCount: 2310,
    openRate: 96.7,
    clickRate: 18.4,
    conversionRate: 46.2,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-ptp-whatsapp",
    name: "Mashreq — PTP Confirmation (WhatsApp)",
    purpose: "ptp-confirmation",
    channel: "whatsapp",
    body: `Dear {{borrower_name}},

Mashreq Bank confirms your payment arrangement on account {{account_number}}:

Amount: AED {{amount_due}}
Date: {{due_date}}
Reference: {{reference_id}}

Pay any time before the due date via {{payment_link}}.

For assistance, contact {{contact_phone}}.

Mashreq Bank PSC`,
    sentCount: 1480,
    openRate: 87.6,
    clickRate: 22.4,
    conversionRate: 48.7,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // Settlement
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-settle-email",
    name: "Mashreq — Settlement Offer (Email)",
    purpose: "settlement",
    channel: "email",
    subject: "Settlement Offer for Account {{account_number}} — Valid until {{expiry_date}}",
    body: `Dear {{borrower_name}},

We are pleased to extend a one-time settlement offer for your Mashreq Bank account ({{account_number}}).

  Outstanding balance: AED {{amount_due}}
  Settlement amount: AED {{settlement_amount}}
  Discount: {{discount_percent}}%
  Offer valid until: {{expiry_date}}

Upon receipt of the settlement amount, your account will be marked as settled in full and reported accordingly to credit reference agencies. This is a discretionary offer extended without prejudice to our rights.

To accept this offer, please make payment through our secure portal:
{{payment_link}}

Or contact {{agent_name}} on {{contact_phone}} to discuss the arrangement in detail.

Yours sincerely,
{{agent_name}}
Collections Department
Mashreq Bank PSC`,
    sentCount: 980,
    openRate: 58.4,
    clickRate: 18.2,
    conversionRate: 14.6,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-settle-sms",
    name: "Mashreq — Settlement Offer (SMS)",
    purpose: "settlement",
    channel: "sms",
    body: `Mashreq: Settle a/c {{account_number}} for AED {{settlement_amount}} ({{discount_percent}}% off). Offer ends {{expiry_date}}. Pay: {{payment_link}}.`,
    sentCount: 1240,
    openRate: 96.2,
    clickRate: 21.8,
    conversionRate: 16.4,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-settle-whatsapp",
    name: "Mashreq — Settlement Offer (WhatsApp)",
    purpose: "settlement",
    channel: "whatsapp",
    body: `Dear {{borrower_name}},

Mashreq Bank is pleased to offer a one-time settlement on account {{account_number}}:

Outstanding: AED {{amount_due}}
Settle for: AED {{settlement_amount}} ({{discount_percent}}% off)
Valid until: {{expiry_date}}

Accept here: {{payment_link}}
Or call {{contact_phone}} to speak with our team.

This is a discretionary offer extended in good faith.

Mashreq Bank PSC`,
    sentCount: 720,
    openRate: 89.2,
    clickRate: 27.6,
    conversionRate: 19.4,
    usedInJourneys: 1,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // Final Notice
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-final-email",
    name: "Mashreq — Final Notice (Email)",
    purpose: "final-notice",
    channel: "email",
    subject: "FINAL NOTICE — Account {{account_number}}",
    body: `Dear {{borrower_name}},

This serves as a FINAL NOTICE regarding the outstanding balance of AED {{amount_due}} on your Mashreq Bank account ({{account_number}}), which has remained unpaid for {{dpd}} days past due.

Despite previous communications, we have not received payment or a satisfactory response. Unless we receive payment in full, or you contact us to discuss a formal arrangement, within seven (7) calendar days of this notice, your account will be referred to our legal department for further recovery action.

Such action may include, but is not limited to:
  • Reporting to the Al Etihad Credit Bureau (AECB)
  • Civil legal proceedings
  • Travel ban application (where applicable)

To avoid the above, please make immediate payment via:
{{payment_link}}

Or contact {{agent_name}} on {{contact_phone}} without delay.

Yours sincerely,
{{agent_name}}
Collections Department
Mashreq Bank PSC`,
    sentCount: 640,
    openRate: 67.8,
    clickRate: 14.2,
    conversionRate: 11.8,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-final-sms",
    name: "Mashreq — Final Notice (SMS)",
    purpose: "final-notice",
    channel: "sms",
    body: `Mashreq FINAL NOTICE: AED {{amount_due}} on a/c {{account_number}} unpaid {{dpd}} days. Pay {{payment_link}} or call {{contact_phone}} in 7 days.`,
    sentCount: 820,
    openRate: 96.8,
    clickRate: 19.6,
    conversionRate: 12.4,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...mashreqLender,
    id: "tmpl-mashreq-final-whatsapp",
    name: "Mashreq — Final Notice (WhatsApp)",
    purpose: "final-notice",
    channel: "whatsapp",
    body: `FINAL NOTICE — Mashreq Bank

Dear {{borrower_name}},

The outstanding balance of AED {{amount_due}} on account {{account_number}} has been unpaid for {{dpd}} days.

This is your final opportunity to resolve this matter before legal escalation, including AECB reporting and civil action.

Pay now: {{payment_link}}
Or call {{contact_phone}} within 7 days.

Mashreq Bank PSC`,
    sentCount: 480,
    openRate: 91.4,
    clickRate: 24.8,
    conversionRate: 14.6,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),
];

/* ─────────────────────────────────────────────────────────────────────────
 * TAMARA — friendly BNPL tone
 * ──────────────────────────────────────────────────────────────────────── */

const tamaraLender = { lenderId: "lnd-tamara", lenderName: "Tamara" };

const tamaraTemplates: Template[] = [
  // Welcome
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-welcome-email",
    name: "Tamara — Welcome (Email)",
    purpose: "welcome",
    channel: "email",
    subject: "Hey {{borrower_name}}, let's sort your Tamara payment",
    body: `Hey {{borrower_name}},

Thanks for shopping with Tamara! We noticed your installment of AED {{amount_due}} is coming up on {{due_date}} — just a heads up so nothing catches you off guard.

The good news? Paying takes about 30 seconds. Tap below and you're done:
{{payment_link}}

If money is tight this month, no stress — reply to this email and we'll find a way that works for you. We're not here to chase, we're here to help.

Cheers,
The Tamara Team`,
    sentCount: 5240,
    openRate: 51.6,
    clickRate: 18.4,
    conversionRate: 7.2,
    usedInJourneys: 4,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-welcome-sms",
    name: "Tamara — Welcome (SMS)",
    purpose: "welcome",
    channel: "sms",
    body: `Hey {{borrower_name}}! Tamara here. Your AED {{amount_due}} installment is due {{due_date}}. Pay in 30 sec: {{payment_link}}`,
    sentCount: 7820,
    openRate: 97.1,
    clickRate: 23.6,
    conversionRate: 8.4,
    usedInJourneys: 4,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-welcome-whatsapp",
    name: "Tamara — Welcome (WhatsApp)",
    purpose: "welcome",
    channel: "whatsapp",
    body: `Hey {{borrower_name}}!

Just a friendly heads up from Tamara — your installment of AED {{amount_due}} is coming up on {{due_date}}.

Quick & easy to pay here: {{payment_link}}

Need to talk? Just reply to this message and we'll get you sorted. No judgement, no hassle.

— Tamara`,
    sentCount: 4620,
    openRate: 88.4,
    clickRate: 28.7,
    conversionRate: 9.6,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // Reminder
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-reminder-email",
    name: "Tamara — Friendly Reminder (Email)",
    purpose: "reminder",
    channel: "email",
    subject: "Friendly reminder — AED {{amount_due}} due {{due_date}}",
    body: `Hey {{borrower_name}},

Quick one — your Tamara installment of AED {{amount_due}} is due {{due_date}}. Already paid? Awesome, ignore this. Otherwise, here's the magic link:

{{payment_link}}

Takes about as long as it takes to read this email. If you're having a rough month, just hit reply and we'll figure it out together.

Cheers,
The Tamara Team`,
    sentCount: 8420,
    openRate: 49.8,
    clickRate: 21.4,
    conversionRate: 7.8,
    usedInJourneys: 5,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-reminder-sms",
    name: "Tamara — Friendly Reminder (SMS)",
    purpose: "reminder",
    channel: "sms",
    body: `Hey {{borrower_name}}, your Tamara installment of AED {{amount_due}} is due {{due_date}}. Pay in seconds: {{payment_link}}`,
    sentCount: 12420,
    openRate: 97.4,
    clickRate: 26.8,
    conversionRate: 9.2,
    usedInJourneys: 5,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-reminder-whatsapp",
    name: "Tamara — Friendly Reminder (WhatsApp)",
    purpose: "reminder",
    channel: "whatsapp",
    body: `Hey {{borrower_name}},

Quick reminder from Tamara: AED {{amount_due}} due {{due_date}}.

Tap to pay: {{payment_link}}

Need flexibility? Just reply.

— Tamara`,
    sentCount: 6820,
    openRate: 89.6,
    clickRate: 31.2,
    conversionRate: 11.4,
    usedInJourneys: 4,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),

  // Broken Promise
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-bp-email",
    name: "Tamara — Broken Promise (Email)",
    purpose: "broken-promise",
    channel: "email",
    subject: "Hey {{borrower_name}} — looks like your payment didn't go through",
    body: `Hey {{borrower_name}},

We noticed the AED {{amount_due}} payment you promised on {{due_date}} didn't make it through. No worries — these things happen, and we'd rather sort it together than let it pile up.

Two quick options:

1. Pay now (takes 30 seconds): {{payment_link}}
2. Tell us what's going on so we can find a plan that fits your situation. Just hit reply or message us back.

We genuinely want to help. The sooner we hear from you, the more options we have.

Cheers,
The Tamara Team`,
    sentCount: 1840,
    openRate: 56.2,
    clickRate: 19.4,
    conversionRate: 12.4,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-bp-sms",
    name: "Tamara — Broken Promise (SMS)",
    purpose: "broken-promise",
    channel: "sms",
    body: `Hey {{borrower_name}}, your AED {{amount_due}} Tamara payment didn't go through. Sort it here: {{payment_link}} or reply to chat.`,
    sentCount: 2680,
    openRate: 96.8,
    clickRate: 24.6,
    conversionRate: 14.2,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...tamaraLender,
    id: "tmpl-tamara-bp-whatsapp",
    name: "Tamara — Broken Promise (WhatsApp)",
    purpose: "broken-promise",
    channel: "whatsapp",
    body: `Hey {{borrower_name}},

Looks like your AED {{amount_due}} payment from {{due_date}} didn't come through. No drama — let's sort it out.

Pay now: {{payment_link}}
Or reply to this message and tell us what's going on. We've got options that might work better for you.

— Tamara`,
    sentCount: 1480,
    openRate: 87.4,
    clickRate: 29.8,
    conversionRate: 16.8,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),
];

/* ─────────────────────────────────────────────────────────────────────────
 * EMIRATES NBD — premium private banking tone
 * ──────────────────────────────────────────────────────────────────────── */

const enbdLender = { lenderId: "lnd-enbd", lenderName: "Emirates NBD" };

const enbdTemplates: Template[] = [
  // Reminder
  mk({
    ...enbdLender,
    id: "tmpl-enbd-reminder-email",
    name: "Emirates NBD — Payment Reminder (Email)",
    purpose: "reminder",
    channel: "email",
    subject: "Courtesy reminder — Account {{account_number}}",
    body: `Dear {{borrower_name}},

We hope this message finds you well.

As a valued Emirates NBD client, we wish to bring to your attention that a payment of AED {{amount_due}} on your account ({{account_number}}) is due on {{due_date}}.

Your dedicated relationship manager, {{agent_name}}, remains available to assist you with any matters relating to this payment, or to discuss bespoke arrangements should you wish to do so. You may reach them directly on {{contact_phone}}.

For your convenience, payment may also be settled through Emirates NBD Online or our secure portal:
{{payment_link}}

We appreciate your continued banking relationship with Emirates NBD and remain at your service.

With kind regards,
{{agent_name}}
Relationship Manager
Emirates NBD Bank PJSC`,
    sentCount: 320,
    openRate: 68.4,
    clickRate: 16.8,
    conversionRate: 8.6,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...enbdLender,
    id: "tmpl-enbd-reminder-sms",
    name: "Emirates NBD — Payment Reminder (SMS)",
    purpose: "reminder",
    channel: "sms",
    body: `Emirates NBD: Courtesy reminder — AED {{amount_due}} due {{due_date}} on a/c {{account_number}}. Your RM: {{contact_phone}}. Pay: {{payment_link}}`,
    sentCount: 480,
    openRate: 97.2,
    clickRate: 14.6,
    conversionRate: 9.4,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...enbdLender,
    id: "tmpl-enbd-reminder-whatsapp",
    name: "Emirates NBD — Payment Reminder (WhatsApp)",
    purpose: "reminder",
    channel: "whatsapp",
    body: `Dear {{borrower_name}},

A courtesy message from Emirates NBD.

A payment of AED {{amount_due}} is scheduled on account {{account_number}} for {{due_date}}.

Your relationship manager {{agent_name}} is available on {{contact_phone}} for any assistance.

Settle securely at your convenience: {{payment_link}}

With kind regards,
Emirates NBD Bank PJSC`,
    sentCount: 240,
    openRate: 91.6,
    clickRate: 19.4,
    conversionRate: 11.2,
    usedInJourneys: 1,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // Settlement
  mk({
    ...enbdLender,
    id: "tmpl-enbd-settle-email",
    name: "Emirates NBD — Settlement Offer (Email)",
    purpose: "settlement",
    channel: "email",
    subject: "Confidential — Settlement proposal for account {{account_number}}",
    body: `Dear {{borrower_name}},

Further to our recent communications, Emirates NBD is pleased to extend a discretionary settlement proposal in respect of your account ({{account_number}}).

Outstanding balance:    AED {{amount_due}}
Proposed settlement:    AED {{settlement_amount}}
Discount:               {{discount_percent}}%
Validity:               {{expiry_date}}

This proposal is offered without prejudice and is conditional upon receipt of cleared funds on or before the validity date noted above. Upon settlement, your account will be marked as fully discharged in our records and reported accordingly.

We would welcome the opportunity to discuss this with you in detail. Kindly contact your relationship manager, {{agent_name}}, on {{contact_phone}} at your earliest convenience, or you may proceed via our secure portal:
{{payment_link}}

We look forward to bringing this matter to a mutually agreeable conclusion.

With kind regards,
{{agent_name}}
Emirates NBD Bank PJSC`,
    sentCount: 120,
    openRate: 74.2,
    clickRate: 24.6,
    conversionRate: 18.4,
    usedInJourneys: 1,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...enbdLender,
    id: "tmpl-enbd-settle-sms",
    name: "Emirates NBD — Settlement Offer (SMS)",
    purpose: "settlement",
    channel: "sms",
    body: `Emirates NBD: Settlement proposal on a/c {{account_number}} — AED {{settlement_amount}} ({{discount_percent}}% off). Valid {{expiry_date}}. RM: {{contact_phone}}`,
    sentCount: 160,
    openRate: 96.8,
    clickRate: 22.4,
    conversionRate: 19.2,
    usedInJourneys: 1,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...enbdLender,
    id: "tmpl-enbd-settle-whatsapp",
    name: "Emirates NBD — Settlement Offer (WhatsApp)",
    purpose: "settlement",
    channel: "whatsapp",
    body: `Dear {{borrower_name}},

Confidential settlement proposal — Emirates NBD account {{account_number}}.

Outstanding: AED {{amount_due}}
Proposed: AED {{settlement_amount}} ({{discount_percent}}% discount)
Valid until: {{expiry_date}}

This proposal is offered without prejudice. Your relationship manager {{agent_name}} is available on {{contact_phone}} to discuss in detail.

Secure payment portal: {{payment_link}}

With kind regards,
Emirates NBD Bank PJSC`,
    sentCount: 80,
    openRate: 92.4,
    clickRate: 28.6,
    conversionRate: 22.8,
    usedInJourneys: 1,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),
];

/* ─────────────────────────────────────────────────────────────────────────
 * CASHNOW — personal loans, direct & helpful
 * ──────────────────────────────────────────────────────────────────────── */

const cashnowLender = { lenderId: "lnd-cashnow", lenderName: "CashNow" };

const cashnowTemplates: Template[] = [
  // Reminder
  mk({
    ...cashnowLender,
    id: "tmpl-cashnow-reminder-email",
    name: "CashNow — Payment Reminder (Email)",
    purpose: "reminder",
    channel: "email",
    subject: "Your CashNow installment of AED {{amount_due}} is due {{due_date}}",
    body: `Hi {{borrower_name}},

This is CashNow with a reminder about your upcoming installment.

  Loan: {{account_number}}
  Amount due: AED {{amount_due}}
  Due date: {{due_date}}

Paying on time helps you avoid late fees and keeps your loan in good standing for future borrowing. You can pay in seconds via the link below:

{{payment_link}}

If you're worried about meeting the payment, please don't ignore this — reply to this email or call us on {{contact_phone}}. We have hardship options available, but only if we hear from you.

Thanks,
{{agent_name}}
CashNow Customer Care`,
    sentCount: 2480,
    openRate: 47.4,
    clickRate: 14.2,
    conversionRate: 6.4,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...cashnowLender,
    id: "tmpl-cashnow-reminder-sms",
    name: "CashNow — Payment Reminder (SMS)",
    purpose: "reminder",
    channel: "sms",
    body: `CashNow: AED {{amount_due}} due {{due_date}} on loan {{account_number}}. Pay: {{payment_link}}. Need help? Call {{contact_phone}}.`,
    sentCount: 3620,
    openRate: 96.8,
    clickRate: 18.4,
    conversionRate: 7.8,
    usedInJourneys: 3,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...cashnowLender,
    id: "tmpl-cashnow-reminder-whatsapp",
    name: "CashNow — Payment Reminder (WhatsApp)",
    purpose: "reminder",
    channel: "whatsapp",
    body: `Hi {{borrower_name}},

CashNow reminder: your installment of AED {{amount_due}} is due on {{due_date}}.

Pay securely: {{payment_link}}

If you need to talk about a hardship plan or change of date, just reply to this message — we're here to help.

— CashNow`,
    sentCount: 1840,
    openRate: 86.2,
    clickRate: 24.7,
    conversionRate: 9.4,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),

  // Hardship
  mk({
    ...cashnowLender,
    id: "tmpl-cashnow-hardship-email",
    name: "CashNow — Hardship Outreach (Email)",
    purpose: "hardship",
    channel: "email",
    subject: "We're here to help, {{borrower_name}}",
    body: `Hi {{borrower_name}},

We've noticed you're behind on your CashNow loan ({{account_number}}), and we want you to know — we get it. Life can throw curveballs, and we're not here to make things harder.

If you're experiencing financial hardship, we have options that may help, including:

  • Reduced monthly payments for a fixed period
  • Temporary payment pause (forbearance)
  • Restructured loan term
  • Settlement at a reduced amount

None of these have any cost to discuss, and reaching out won't make things worse. The earlier we talk, the more we can do.

Please call {{agent_name}} on {{contact_phone}} for a confidential conversation, or reply to this email. We'll work with you, not against you.

You can also start the conversation here: {{payment_link}}

With understanding,
{{agent_name}}
CashNow Customer Support`,
    sentCount: 640,
    openRate: 58.4,
    clickRate: 21.4,
    conversionRate: 14.6,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...cashnowLender,
    id: "tmpl-cashnow-hardship-sms",
    name: "CashNow — Hardship Outreach (SMS)",
    purpose: "hardship",
    channel: "sms",
    body: `CashNow: We can help, {{borrower_name}}. Hardship options available — no cost to discuss. Call {{contact_phone}} or reply HELP.`,
    sentCount: 880,
    openRate: 96.4,
    clickRate: 17.8,
    conversionRate: 16.2,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-04",
  }),
  mk({
    ...cashnowLender,
    id: "tmpl-cashnow-hardship-whatsapp",
    name: "CashNow — Hardship Outreach (WhatsApp)",
    purpose: "hardship",
    channel: "whatsapp",
    body: `Hi {{borrower_name}},

This is CashNow. We've noticed your loan ({{account_number}}) is behind, and we want you to know we're here to help.

If you're going through a tough time, we have options:
- Reduced payments
- Temporary pause
- Restructured term
- Reduced settlement

None of these cost anything to discuss. Please reply to this message or call {{contact_phone}} for a confidential chat with {{agent_name}}.

We work with you, not against you.

— CashNow`,
    sentCount: 480,
    openRate: 89.6,
    clickRate: 26.4,
    conversionRate: 18.7,
    usedInJourneys: 2,
    usedInStrategies: 2,
    lastUsedAt: "2026-04-03",
  }),
];

/* ─────────────────────────────────────────────────────────────────────────
 * Combined export
 * ──────────────────────────────────────────────────────────────────────── */

export const templates: Template[] = [
  ...generalTemplates,
  ...mashreqTemplates,
  ...tamaraTemplates,
  ...enbdTemplates,
  ...cashnowTemplates,
];

/* ─────────────────────────────────────────────────────────────────────────
 * Query helpers
 * ──────────────────────────────────────────────────────────────────────── */

export function getTemplatesForLender(lenderId: string): Template[] {
  return templates.filter((t) => t.lenderId === lenderId);
}

export function getTemplatesByPurpose(purpose: TemplatePurpose): Template[] {
  return templates.filter((t) => t.purpose === purpose);
}

export function getTemplatesByChannel(channel: TemplateChannel): Template[] {
  return templates.filter((t) => t.channel === channel);
}

export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplate(
  lenderId: string,
  purpose: TemplatePurpose,
  channel: TemplateChannel,
): Template | undefined {
  return templates.find(
    (t) => t.lenderId === lenderId && t.purpose === purpose && t.channel === channel,
  );
}

/**
 * Returns a unique, ordered list of lenderIds that have at least one template,
 * with "general" listed first.
 */
export function getLenderIdsWithTemplates(): string[] {
  const ids = new Set<string>();
  for (const t of templates) ids.add(t.lenderId);
  const result: string[] = [];
  if (ids.has("general")) result.push("general");
  for (const id of ids) {
    if (id !== "general") result.push(id);
  }
  return result;
}

/**
 * Returns the unique purposes a given lender has templates for, in canonical order.
 */
export function getPurposesForLender(lenderId: string): TemplatePurpose[] {
  const purposes = new Set<TemplatePurpose>();
  for (const t of templates) {
    if (t.lenderId === lenderId) purposes.add(t.purpose);
  }
  return PURPOSE_ORDER.filter((p) => purposes.has(p));
}

/**
 * Convenience: list of template variables available throughout the editor.
 */
export const AVAILABLE_VARIABLES: { token: string; description: string }[] = [
  { token: "{{borrower_name}}", description: "Borrower's full name" },
  { token: "{{amount_due}}", description: "Outstanding amount (AED)" },
  { token: "{{due_date}}", description: "Payment due date" },
  { token: "{{lender_name}}", description: "Lender / brand name" },
  { token: "{{payment_link}}", description: "Unique payment URL" },
  { token: "{{agent_name}}", description: "Assigned agent" },
  { token: "{{contact_phone}}", description: "Contact phone number" },
  { token: "{{account_number}}", description: "Account / loan number" },
  { token: "{{reference_id}}", description: "Reference / case number" },
  { token: "{{settlement_amount}}", description: "Settlement amount (AED)" },
  { token: "{{discount_percent}}", description: "Settlement discount (%)" },
  { token: "{{expiry_date}}", description: "Offer expiry date" },
  { token: "{{dpd}}", description: "Days past due" },
];
