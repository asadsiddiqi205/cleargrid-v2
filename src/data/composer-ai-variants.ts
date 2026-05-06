// Pre-written AI content variants used by the Composer demo.
// Each action maps to 1+ realistic debt collections bodies with variable tokens.

export type Tone = "professional" | "friendly" | "firm" | "empathetic" | "urgent"
export type Length = "short" | "medium" | "long"

export interface GeneratedDraft {
  subject: string
  preview: string
  body: string
}

// ---------- Help me write (full draft generator) ----------

export const generateVariants: Record<Tone, GeneratedDraft[]> = {
  professional: [
    {
      subject: "Payment Reminder: {{amount_due}} Outstanding",
      preview: "A professional reminder regarding your account balance.",
      body:
        "Dear {{borrower_name}},\n\n" +
        "We hope this message finds you well. Our records indicate that your account has an outstanding balance of {{amount_due}}, which was due on {{due_date}}.\n\n" +
        "To keep your account in good standing, please complete your payment at your earliest convenience using the secure link below:\n\n" +
        "{{payment_link}}\n\n" +
        "If you have already made this payment, kindly disregard this message. Should you have any questions or wish to discuss payment options, please reply to this email or call us at {{contact_number}}.\n\n" +
        "Thank you for your prompt attention to this matter.\n\n" +
        "Kind regards,\nClearGrid Collections",
    },
    {
      subject: "Action Required on Account {{account_number}}",
      preview: "Your account requires attention - please review.",
      body:
        "Dear {{borrower_name}},\n\n" +
        "This is a courtesy notice regarding account {{account_number}}. As of today, the outstanding balance on this account is {{amount_due}}, which became due on {{due_date}}.\n\n" +
        "We understand that circumstances sometimes change. To help resolve this promptly, we offer several convenient options:\n\n" +
        "  • Pay online: {{payment_link}}\n" +
        "  • Arrange a structured plan by replying to this email\n" +
        "  • Speak to an agent at {{contact_number}}\n\n" +
        "We appreciate your cooperation and look forward to your response.\n\n" +
        "Best regards,\nClearGrid Collections",
    },
  ],
  friendly: [
    {
      subject: "Hi {{borrower_name}} — a quick note about your balance",
      preview: "Just checking in about your recent payment.",
      body:
        "Hi {{borrower_name}},\n\n" +
        "Just a friendly reminder that your payment of {{amount_due}} was due on {{due_date}}. We know life gets busy, so this is just a quick nudge.\n\n" +
        "If you can take care of it today, here's the quickest way:\n{{payment_link}}\n\n" +
        "If anything is making this tricky right now, just hit reply — we're happy to work something out together.\n\n" +
        "Thanks so much!\nThe ClearGrid Team",
    },
    {
      subject: "Checking in, {{borrower_name}}",
      preview: "We're here to help with your account.",
      body:
        "Hi {{borrower_name}},\n\n" +
        "Hope you're doing well! We noticed that your balance of {{amount_due}} is still open. No judgment — we just wanted to reach out in case this slipped your mind.\n\n" +
        "You can take care of it in under a minute here: {{payment_link}}\n\n" +
        "And if you need a bit more time or want to discuss options, we're always happy to chat. Just reply or call {{contact_number}}.\n\n" +
        "Warmly,\nClearGrid",
    },
  ],
  firm: [
    {
      subject: "Final Notice: {{amount_due}} Past Due on Account {{account_number}}",
      preview: "Immediate action required on your account.",
      body:
        "Dear {{borrower_name}},\n\n" +
        "Your account {{account_number}} is currently {{days_past_due}} days past due with an outstanding balance of {{amount_due}}.\n\n" +
        "Despite previous reminders, we have not received payment. This balance must be resolved immediately to avoid further escalation of your account.\n\n" +
        "Pay now: {{payment_link}}\nOr call: {{contact_number}}\n\n" +
        "We urge you to take action today.\n\n" +
        "Regards,\nClearGrid Collections",
    },
  ],
  empathetic: [
    {
      subject: "We're here to help, {{borrower_name}}",
      preview: "Let's find a solution together.",
      body:
        "Dear {{borrower_name}},\n\n" +
        "We understand that financial situations can change unexpectedly, and we know that falling behind on payments is stressful. We want you to know that you are not alone and we are here to help.\n\n" +
        "Your current balance of {{amount_due}} has been outstanding since {{due_date}}. Rather than let this situation worsen, let's work on a solution together.\n\n" +
        "We offer several flexible options:\n" +
        "  • Customized payment plans\n" +
        "  • Short-term hardship programs\n" +
        "  • Settlement discussions\n\n" +
        "Please reply to this email or call us at {{contact_number}} so we can find the option that works best for you. There is no judgment here — just support.\n\n" +
        "With care,\nClearGrid Customer Care",
    },
  ],
  urgent: [
    {
      subject: "URGENT: Account {{account_number}} requires immediate action",
      preview: "Time-sensitive notice regarding your account.",
      body:
        "Dear {{borrower_name}},\n\n" +
        "This is an urgent notice. Your account balance of {{amount_due}} remains unpaid as of {{due_date}}.\n\n" +
        "Without immediate action in the next 48 hours, your account will be escalated for further review. This may impact your credit profile and could incur additional fees.\n\n" +
        "Act now: {{payment_link}}\nCall immediately: {{contact_number}}\n\n" +
        "We strongly encourage you to resolve this today.\n\n" +
        "ClearGrid Collections",
    },
  ],
}

// ---------- Inline AI actions ----------

export const improveVariants: string[] = [
  "Dear {{borrower_name}},\n\nWe noticed that your payment of {{amount_due}} is currently past due. We understand that circumstances can change — please let us know how we can help you resolve this. You can pay securely at {{payment_link}} or reach our team at {{contact_number}}.\n\nThank you,\nClearGrid Collections",
  "Dear {{borrower_name}},\n\nThis is a gentle reminder that your payment of {{amount_due}} was due on {{due_date}}. To keep your account in good standing, please make a payment at {{payment_link}} or contact us to discuss flexible options.\n\nBest regards,\nClearGrid Collections",
  "Dear {{borrower_name}},\n\nWe wanted to reach out regarding your outstanding balance of {{amount_due}}. Many of our customers find it easiest to use our secure payment portal at {{payment_link}}. If you'd prefer to set up a plan, just reply and we'll make it simple.\n\nWarm regards,\nClearGrid",
]

export const fixGrammarVariants: string[] = [
  "Dear {{borrower_name}},\n\nThis is a reminder that your payment of {{amount_due}} was due on {{due_date}}. Please make your payment at your earliest convenience. If you have any questions, do not hesitate to contact us at {{contact_number}}.\n\nRegards,\nClearGrid Collections",
  "Dear {{borrower_name}},\n\nOur records show that your payment of {{amount_due}}, due on {{due_date}}, has not yet been received. Please arrange payment as soon as possible or contact our team for assistance.\n\nBest regards,\nClearGrid Collections",
]

export const makeShorterVariants: string[] = [
  "Hi {{borrower_name}}, your payment of {{amount_due}} is past due. Pay now: {{payment_link}}",
  "{{borrower_name}}, quick reminder — {{amount_due}} is outstanding. Tap to pay: {{payment_link}}",
  "Dear {{borrower_name}}, please settle your overdue balance of {{amount_due}} at {{payment_link}}. Thanks.",
]

export const makeLongerVariants: string[] = [
  "Dear {{borrower_name}},\n\nI hope this email finds you well. I am writing to follow up on the outstanding balance on your account. As of today, our records indicate that the amount of {{amount_due}} remains unpaid and was originally due on {{due_date}}.\n\nWe understand that managing finances can be challenging, and we want to assure you that we are here to support you. Our team has been committed to working with customers to find solutions that fit their individual circumstances. If there are any factors currently making it difficult to settle this balance, please do not hesitate to reach out — we may be able to arrange a payment plan or explore other flexible options tailored to your situation.\n\nTo make things as easy as possible, you can pay online through our secure portal at {{payment_link}}. Alternatively, you are welcome to call our customer support team at {{contact_number}} during business hours (09:00 - 19:00 GST, Sunday through Thursday).\n\nThank you for your time and cooperation. We look forward to resolving this matter together.\n\nWarm regards,\nClearGrid Collections Team",
]

export const polishVariants: string[] = [
  "Dear {{borrower_name}},\n\nThis is a friendly reminder that your payment of {{amount_due}} was due on {{due_date}}. To make a payment or discuss options, please visit {{payment_link}} or reply to this email. We're here to help.\n\nBest regards,\nClearGrid Collections",
  "Dear {{borrower_name}},\n\nWe hope all is well. A quick note to let you know your balance of {{amount_due}} remains outstanding as of {{due_date}}. Settling it today is simple — just visit {{payment_link}}. If you need to discuss options, our team is one reply away.\n\nKind regards,\nClearGrid Collections",
]

export const changeToneVariants: Record<Tone, string[]> = {
  professional: [
    "Dear {{borrower_name}},\n\nWe are writing to inform you that your account balance of {{amount_due}} remains outstanding as of {{due_date}}. Kindly remit payment via {{payment_link}} or contact our office at {{contact_number}} to arrange a suitable resolution.\n\nRegards,\nClearGrid Collections",
  ],
  friendly: [
    "Hey {{borrower_name}}!\n\nJust a little nudge — your balance of {{amount_due}} is still hanging out. No worries, just wanted to make sure it didn't slip past you. Tap here to handle it in a jiffy: {{payment_link}}\n\nNeed a hand? Reply anytime.\n\nCheers,\nClearGrid",
  ],
  firm: [
    "Dear {{borrower_name}},\n\nYour account balance of {{amount_due}} is overdue. Payment is required immediately. Pay at {{payment_link}} or call {{contact_number}} today. Failure to respond will result in further action.\n\nClearGrid Collections",
  ],
  empathetic: [
    "Dear {{borrower_name}},\n\nWe know life can be unpredictable and we want to help. Your balance of {{amount_due}} is still open, and we'd love to find a way forward that works for you. Whether that's a plan, a pause, or just a conversation — we're ready to listen. Reply any time or call {{contact_number}}.\n\nWith care,\nClearGrid",
  ],
  urgent: [
    "URGENT — {{borrower_name}}, your {{amount_due}} balance is past due. Immediate action required. Pay now: {{payment_link}} or call {{contact_number}}. Do not delay.",
  ],
}

export const translateVariants: Record<"arabic" | "english", string[]> = {
  arabic: [
    "عزيزي/عزيزتي {{borrower_name}}،\n\nنذكركم بأن مبلغ {{amount_due}} مستحق الدفع منذ {{due_date}}. يرجى إتمام الدفع عبر الرابط الآمن التالي: {{payment_link}} أو الاتصال بنا على {{contact_number}} لمناقشة الخيارات المتاحة.\n\nمع أطيب التحيات،\nفريق كليرجريد",
  ],
  english: [
    "Dear {{borrower_name}},\n\nThis is a reminder that your payment of {{amount_due}} has been outstanding since {{due_date}}. Please complete your payment through the secure link: {{payment_link}} or call us at {{contact_number}} to discuss your options.\n\nBest regards,\nClearGrid Team",
  ],
}

// ---------- SMS & WhatsApp variants ----------

export const smsVariants: string[] = [
  "ClearGrid: Hi {{borrower_name}}, your payment of {{amount_due}} is past due. Pay securely at {{payment_link}}. Reply HELP for assistance.",
  "ClearGrid: {{borrower_name}}, a friendly reminder — {{amount_due}} was due {{due_date}}. Pay now: {{payment_link}} or call {{contact_number}}.",
]

export interface WhatsAppTemplate {
  id: string
  name: string
  category: string
  body: string
}

export const whatsappTemplates: WhatsAppTemplate[] = [
  {
    id: "wa-001",
    name: "Payment Reminder (Approved)",
    category: "UTILITY",
    body:
      "Hello {{borrower_name}},\n\nThis is a reminder from ClearGrid that your payment of {{amount_due}} was due on {{due_date}}.\n\nTap the button below to pay securely:\n{{payment_link}}\n\nReply STOP to opt out.",
  },
  {
    id: "wa-002",
    name: "PTP Confirmation (Approved)",
    category: "UTILITY",
    body:
      "Hello {{borrower_name}},\n\nYour promise to pay {{amount_due}} on {{due_date}} has been recorded. Reference: {{account_number}}.\n\nThank you for your commitment.\n\nClearGrid",
  },
  {
    id: "wa-003",
    name: "Settlement Offer (Approved)",
    category: "MARKETING",
    body:
      "Hello {{borrower_name}},\n\nWe have a special offer on your account {{account_number}}. Pay {{amount_due}} today and close your balance completely.\n\nView offer: {{payment_link}}\n\nClearGrid",
  },
  {
    id: "wa-004",
    name: "Callback Scheduled (Approved)",
    category: "UTILITY",
    body:
      "Hi {{borrower_name}},\n\nWe have scheduled a callback regarding your account {{account_number}}. An agent will reach you shortly.\n\nReply CANCEL if no longer needed.\n\nClearGrid",
  },
]

// Common tokens available in the "Add variable" menu (legacy)
export const availableTokens: { token: string; label: string }[] = [
  { token: "{{borrower_name}}", label: "Borrower name" },
  { token: "{{amount_due}}", label: "Amount due" },
  { token: "{{due_date}}", label: "Due date" },
  { token: "{{account_number}}", label: "Account number" },
  { token: "{{payment_link}}", label: "Payment link" },
  { token: "{{days_past_due}}", label: "Days past due" },
  { token: "{{contact_number}}", label: "Contact number" },
  { token: "{{agent_name}}", label: "Agent name" },
  { token: "{{lender_name}}", label: "Lender name" },
]

// ---------- Execution-level scoped merge variables (Khalil model) ----------
//
// Used by the new email composer modes. The variable picker groups these
// under section headers and the preview panel substitutes them with realistic
// mock data.

export type MergeVarLevel = "borrower" | "account" | "sub_account"

export interface MergeVar {
  token: string
  label: string
  level: MergeVarLevel
  type: "string" | "number" | "date" | "boolean"
  /** Default sample value used when no borrower context is provided. */
  sample: string
}

export const mergeVariables: MergeVar[] = [
  // Borrower (9)
  { token: "{{borrower.name}}", label: "Borrower name", level: "borrower", type: "string", sample: "Ahmed Al Maktoum" },
  { token: "{{borrower.email}}", label: "Borrower email", level: "borrower", type: "string", sample: "ahmed.almaktoum@email.ae" },
  { token: "{{borrower.phone}}", label: "Borrower phone", level: "borrower", type: "string", sample: "+971 55 123 4567" },
  { token: "{{borrower.total_outstanding}}", label: "Total outstanding", level: "borrower", type: "number", sample: "AED 245,000" },
  { token: "{{borrower.total_delinquent}}", label: "Total delinquent", level: "borrower", type: "number", sample: "AED 86,400" },
  { token: "{{borrower.segment}}", label: "Borrower segment", level: "borrower", type: "string", sample: "High Risk" },
  { token: "{{borrower.risk_score}}", label: "Risk score", level: "borrower", type: "number", sample: "78" },
  { token: "{{borrower.aggregate_dpd}}", label: "Aggregate DPD", level: "borrower", type: "number", sample: "75" },
  { token: "{{borrower.ptp_status}}", label: "PTP status", level: "borrower", type: "string", sample: "Active" },
  // Account (12)
  { token: "{{account.id}}", label: "Account ID", level: "account", type: "string", sample: "ACC-78291" },
  { token: "{{account.type}}", label: "Account type", level: "account", type: "string", sample: "Personal Loan" },
  { token: "{{account.lender_name}}", label: "Lender name", level: "account", type: "string", sample: "Emirates NBD" },
  { token: "{{account.merchant_name}}", label: "Merchant name", level: "account", type: "string", sample: "Jarir Bookstore" },
  { token: "{{account.balance}}", label: "Current balance", level: "account", type: "number", sample: "AED 245,000" },
  { token: "{{account.overdue_amount}}", label: "Overdue amount", level: "account", type: "number", sample: "AED 32,400" },
  { token: "{{account.dpd}}", label: "Account DPD", level: "account", type: "number", sample: "61" },
  { token: "{{account.payment_link}}", label: "Payment link", level: "account", type: "string", sample: "cg.ae/pay/abc123" },
  { token: "{{account.support_contact}}", label: "Support contact", level: "account", type: "string", sample: "800-CLEARGRID" },
  { token: "{{account.reference}}", label: "Account reference", level: "account", type: "string", sample: "PL-2026-78291" },
  { token: "{{account.last_payment_date}}", label: "Last payment date", level: "account", type: "date", sample: "12 Mar 2026" },
  { token: "{{account.settlement_eligible}}", label: "Settlement eligible", level: "account", type: "boolean", sample: "Yes" },
  // Sub-account (7)
  { token: "{{sub_account.installment_number}}", label: "Installment #", level: "sub_account", type: "number", sample: "#3" },
  { token: "{{sub_account.due_date}}", label: "Due date", level: "sub_account", type: "date", sample: "15 Apr 2026" },
  { token: "{{sub_account.amount}}", label: "Installment amount", level: "sub_account", type: "number", sample: "AED 8,200" },
  { token: "{{sub_account.overdue_amount}}", label: "Overdue amount", level: "sub_account", type: "number", sample: "AED 8,200" },
  { token: "{{sub_account.days_overdue}}", label: "Days overdue", level: "sub_account", type: "number", sample: "15" },
  { token: "{{sub_account.status}}", label: "Status", level: "sub_account", type: "string", sample: "Overdue" },
  { token: "{{sub_account.prior_ptp_date}}", label: "Prior PTP date", level: "sub_account", type: "date", sample: "1 Apr 2026" },
]

export const mergeVarLevelLabels: Record<MergeVarLevel, string> = {
  borrower: "Borrower",
  account: "Account",
  sub_account: "Sub-account",
}

/** Returns the variables visible at a given execution level (cumulative). */
export function getMergeVariablesForLevel(level: MergeVarLevel): MergeVar[] {
  if (level === "borrower") return mergeVariables.filter((v) => v.level === "borrower")
  if (level === "account") return mergeVariables.filter((v) => v.level !== "sub_account")
  return mergeVariables
}

// ---------- AI Assist quick-action content (12 actions) ----------
//
// Each action returns a varied "rewrite" for the email body. Used by the
// inline-mode AI Assist sidebar panel.

export const aiAssistVariants: Record<string, string[]> = {
  improve: [
    "Dear {{borrower.name}},\n\nWe noticed your payment of {{account.overdue_amount}} on account {{account.reference}} remains outstanding. We understand circumstances change — please let us know how we can help. You can pay securely at {{account.payment_link}} or reach our team at {{account.support_contact}}.\n\nWith appreciation,\nClearGrid Collections",
    "Hello {{borrower.name}},\n\nThank you for being a {{account.lender_name}} customer. Our records show {{account.overdue_amount}} on your {{account.type}} account is currently overdue. Settling it today is quick and secure: {{account.payment_link}}. If you'd like to talk through options, our team is ready at {{account.support_contact}}.\n\nKind regards,\nClearGrid",
  ],
  grammar: [
    "Dear {{borrower.name}},\n\nThis is a reminder that your payment of {{account.overdue_amount}} on account {{account.reference}} was due on {{account.last_payment_date}}. Please complete the payment at your earliest convenience. If you have any questions, do not hesitate to contact us at {{account.support_contact}}.\n\nRegards,\nClearGrid Collections",
  ],
  shorter: [
    "Hi {{borrower.name}}, your {{account.type}} balance of {{account.overdue_amount}} is overdue. Pay now: {{account.payment_link}}.",
    "{{borrower.name}} — quick reminder: {{account.overdue_amount}} is past due. Tap to pay: {{account.payment_link}}.",
  ],
  professional: [
    "Dear {{borrower.name}},\n\nWe write regarding account {{account.reference}} held with {{account.lender_name}}. As of today, the outstanding balance of {{account.overdue_amount}} remains unsettled. Kindly remit payment via {{account.payment_link}} or contact us at {{account.support_contact}} to arrange a suitable resolution.\n\nYours sincerely,\nClearGrid Collections",
  ],
  friendly: [
    "Hi {{borrower.name}}!\n\nJust a quick note about your {{account.type}} account — {{account.overdue_amount}} is still hanging out and we wanted to make sure it didn't slip past you. You can sort it in under a minute here: {{account.payment_link}}. If anything is making this tricky, just reply — we're happy to help.\n\nWarmly,\nClearGrid",
  ],
  firmer: [
    "Dear {{borrower.name}},\n\nYour account {{account.reference}} is currently {{account.dpd}} days past due with an outstanding balance of {{account.overdue_amount}}. This balance must be resolved immediately to avoid further action on your account.\n\nPay now: {{account.payment_link}}\nOr call: {{account.support_contact}}\n\nClearGrid Collections",
  ],
  persuasive: [
    "Dear {{borrower.name}},\n\nClearing your {{account.overdue_amount}} balance today brings real benefits — no more reminders, your account stays in good standing, and you avoid additional fees. Most customers settle in under two minutes via {{account.payment_link}}. If a plan would help, we can set one up over a single phone call: {{account.support_contact}}.\n\nThank you,\nClearGrid",
  ],
  simplify: [
    "Hi {{borrower.name}},\n\nYou owe {{account.overdue_amount}} on your {{account.type}} account. Pay here: {{account.payment_link}}. Need help? Call {{account.support_contact}}.\n\nThanks,\nClearGrid",
  ],
  translate: [
    "عزيزي/عزيزتي {{borrower.name}}،\n\nنود تذكيركم بأن المبلغ المستحق {{account.overdue_amount}} على الحساب {{account.reference}} لم يُسدّد بعد. يرجى إتمام الدفع عبر الرابط الآمن: {{account.payment_link}} أو الاتصال على {{account.support_contact}} لمناقشة الخيارات.\n\nمع التحية،\nفريق كليرجريد",
  ],
  expand: [
    "Dear {{borrower.name}},\n\nI hope this email finds you well. I am writing to follow up on the outstanding balance on your {{account.type}} account ({{account.reference}}) held with {{account.lender_name}}. Our records show that {{account.overdue_amount}} remains unpaid and was originally due on {{account.last_payment_date}}.\n\nWe understand managing finances can be challenging, and we're committed to working with our customers to find solutions that fit their individual circumstances. If there's anything making it difficult to settle this balance right now, please don't hesitate to reach out — we may be able to arrange a payment plan or explore flexible options tailored to your situation.\n\nTo make things as easy as possible, you can pay online through our secure portal at {{account.payment_link}}. Alternatively, you're welcome to call our customer support team at {{account.support_contact}} during business hours (09:00 - 19:00 GST, Sunday through Thursday).\n\nThank you for your time and cooperation. We look forward to resolving this matter together.\n\nWarm regards,\nClearGrid Collections",
  ],
  personalize: [
    "Dear {{borrower.name}},\n\nAs a {{borrower.segment}} customer with {{account.lender_name}}, your standing matters to us. The {{account.overdue_amount}} on account {{account.reference}} is currently {{account.dpd}} days past due. Based on your history with us, we'd like to offer the smoothest path forward — pay now at {{account.payment_link}}, or call {{account.support_contact}} so we can tailor a plan that works for you.\n\nWith regards,\nClearGrid",
  ],
  empathetic: [
    "Dear {{borrower.name}},\n\nWe know that life can be unpredictable, and we want to help. Your balance of {{account.overdue_amount}} on account {{account.reference}} is still open, and we'd love to find a way forward that works for you. Whether that's a plan, a pause, or just a conversation — we're ready to listen. Reply any time or call {{account.support_contact}}.\n\nWith care,\nClearGrid",
  ],
}

// ---------- AI Generate Mode content ----------

export interface AiGenerateConfig {
  objective: string
  tone: string
  firmness: string
  language: string
  length: string
  ctaType: string
  includePaymentReminder: boolean
  includeOverdueSummary: boolean
  mentionPreviousInteractions: boolean
  brandVoice: string
}

export interface AiGeneratedEmail {
  subject: string
  preheader: string
  body: string
  reasoning: string
}

const ctaLineMap: Record<string, string> = {
  payment: "[Make Payment]({{account.payment_link}})",
  settlement: "[View Settlement Options]({{account.payment_link}})",
  callback: "[Schedule a Callback]({{account.support_contact}})",
  plan: "[Set Up a Plan]({{account.payment_link}})",
}

const objectiveSubjects: Record<string, string[]> = {
  reminder: [
    "Friendly reminder about your {{account.type}} payment",
    "A quick note about your upcoming payment",
  ],
  overdue: [
    "Action required: {{account.overdue_amount}} is past due",
    "Important: Your {{account.type}} payment is overdue",
  ],
  settlement: [
    "Special settlement offer for account {{account.reference}}",
    "A one-time opportunity to settle your balance",
  ],
  welcome: [
    "Welcome to ClearGrid — let's get you set up",
    "Hi {{borrower.name}}, welcome aboard",
  ],
  ptp: [
    "Following up on your payment commitment",
    "Your scheduled payment — quick check-in",
  ],
  hardship: [
    "We're here to help, {{borrower.name}}",
    "Let's find a path forward together",
  ],
  final: [
    "Final notice: account {{account.reference}}",
    "Important: Your account may be escalated",
  ],
}

export function generateAiEmail(config: AiGenerateConfig): AiGeneratedEmail {
  const objective = config.objective || "reminder"
  const subjects = objectiveSubjects[objective] || objectiveSubjects.reminder
  const subject = subjects[Math.floor(Math.random() * subjects.length)]

  const greetingByTone: Record<string, string> = {
    professional: "Dear {{borrower.name}},",
    friendly: "Hi {{borrower.name}},",
    firm: "Dear {{borrower.name}},",
    empathetic: "Dear {{borrower.name}},",
    urgent: "{{borrower.name}},",
  }
  const greeting = greetingByTone[config.tone] || greetingByTone.professional

  const openings: Record<string, string> = {
    reminder: "We hope this message finds you well. We're reaching out regarding your {{account.type}} account ({{account.reference}}) with {{account.lender_name}}.",
    overdue: "Our records show that {{account.overdue_amount}} on your {{account.type}} account ({{account.reference}}) is currently {{account.dpd}} days past due.",
    settlement: "We're pleased to offer you a special settlement opportunity on your {{account.type}} account ({{account.reference}}).",
    welcome: "Welcome to ClearGrid. We're here to help you manage your {{account.lender_name}} account smoothly and on your terms.",
    ptp: "Thank you for your earlier commitment to settle your balance on account {{account.reference}}. We wanted to follow up on the payment we'd agreed.",
    hardship: "We understand that financial situations can change unexpectedly. Your wellbeing matters to us, and we want to find a path that works.",
    final: "Despite previous communications, the {{account.overdue_amount}} balance on your {{account.type}} account ({{account.reference}}) remains unresolved.",
  }
  const opening = openings[objective] || openings.reminder

  const reminderLine = config.includePaymentReminder
    ? "\n\nYour payment of {{account.overdue_amount}} was due on {{account.last_payment_date}}."
    : ""

  const summaryBlock = config.includeOverdueSummary
    ? "\n\n— Account Summary —\nAccount: {{account.reference}}\nAmount due: {{account.overdue_amount}}\nDue date: {{account.last_payment_date}}\nDays past due: {{account.dpd}}"
    : ""

  const previousLine = config.mentionPreviousInteractions
    ? "\n\nWe note that on {{sub_account.prior_ptp_date}} a payment commitment was made, which we have not yet seen fulfilled. We appreciate any update you can share."
    : ""

  const firmnessLine: Record<string, string> = {
    soft: "\n\nIf you've already made this payment, please disregard this message.",
    moderate: "\n\nWe encourage you to settle the balance at your earliest convenience to avoid further reminders.",
    firm: "\n\nThis balance must be resolved promptly to keep your account in good standing.",
    aggressive: "\n\nIf this balance is not resolved within 5 business days, your account may be escalated to our external collections partner.",
  }
  const firmness = firmnessLine[config.firmness] || firmnessLine.moderate

  const ctaLine = ctaLineMap[config.ctaType] || ctaLineMap.payment

  const closing =
    config.tone === "friendly"
      ? "\n\nThanks so much,\nClearGrid"
      : config.tone === "empathetic"
      ? "\n\nWith care,\nClearGrid Customer Care"
      : config.tone === "urgent"
      ? "\n\nClearGrid Collections"
      : "\n\nKind regards,\n{{account.lender_name}} via ClearGrid"

  let body = `${greeting}\n\n${opening}${reminderLine}${summaryBlock}${previousLine}${firmness}\n\n${ctaLine}\n\nFor questions, contact us at {{account.support_contact}}.${closing}`

  // Arabic translation handling — simple swap for short headers
  if (config.language === "Arabic") {
    body = `عزيزي/عزيزتي {{borrower.name}}،\n\nنود تذكيركم بشأن حسابكم ({{account.reference}}) لدى {{account.lender_name}}. الرصيد المستحق هو {{account.overdue_amount}} وقد حان موعد سداده.\n\n${ctaLine}\n\nللاستفسار يرجى الاتصال على {{account.support_contact}}.\n\nمع التحية،\nفريق كليرجريد`
  }

  // Length adjustment
  if (config.length === "short") {
    body = `${greeting}\n\n${opening}${reminderLine}\n\n${ctaLine}${closing}`
  }

  const reasoning = [
    `Generated a ${config.tone} email with ${config.firmness} firmness for the "${objective}" objective.`,
    config.includePaymentReminder ? "Included an explicit payment reminder line." : null,
    config.includeOverdueSummary ? "Added an account summary block for clarity." : null,
    config.mentionPreviousInteractions ? "Referenced the borrower's prior interaction history." : null,
    `Length: ${config.length}. Language: ${config.language}.`,
    `CTA: ${config.ctaType}. Stays within compliance guidelines.`,
    config.brandVoice ? `Brand voice notes applied: "${config.brandVoice.slice(0, 80)}".` : null,
  ]
    .filter(Boolean)
    .join("\n• ")

  return {
    subject,
    preheader: "An update about your {{account.type}} account",
    body,
    reasoning: "• " + reasoning,
  }
}

// ---------- AI Call (voice) ----------

export interface VoiceScriptTemplate {
  id: string
  name: string
  script: string
}

export const voiceScriptTemplates: VoiceScriptTemplate[] = [
  {
    id: "custom",
    name: "Custom script",
    script: "",
  },
  {
    id: "standard-collection",
    name: "Standard Collection",
    script:
      "Hi {{borrower_name}}, this is an automated call from ClearGrid regarding your account with {{lender_name}}. " +
      "You have an outstanding balance of {{amount_due}} AED that was due on {{due_date}}. " +
      "Press 1 to make a payment, press 2 to speak with an agent, or press 3 to schedule a callback.",
  },
  {
    id: "ptp-followup",
    name: "PTP Follow-up",
    script:
      "Hi {{borrower_name}}, this is ClearGrid following up on your promise to pay {{amount_due}} AED. " +
      "The payment is due today. Press 1 to confirm payment, press 2 to reschedule, or press 3 to speak with an agent.",
  },
  {
    id: "settlement-negotiation",
    name: "Settlement Negotiation",
    script:
      "Hi {{borrower_name}}, this is ClearGrid. We have a special settlement offer for your account. " +
      "You can settle your outstanding balance of {{amount_due}} AED for just {{settlement_amount}} AED if you act today. " +
      "Press 1 to accept, press 2 to discuss with an agent.",
  },
  {
    id: "payment-confirmation",
    name: "Payment Confirmation",
    script:
      "Hi {{borrower_name}}, this is ClearGrid confirming we received your payment of {{amount_paid}} AED. " +
      "Thank you. Your remaining balance is {{remaining_balance}} AED. " +
      "Press 1 to set up automatic payments, press 2 to speak with an agent.",
  },
  {
    id: "welcome",
    name: "Welcome Call",
    script:
      "Hi {{borrower_name}}, this is ClearGrid welcoming you. We see you have an account with {{lender_name}} that needs attention. " +
      "We're here to help you resolve this in a way that works for you. " +
      "Press 1 to make a payment, press 2 to discuss options.",
  },
]

export const voiceAiActions: {
  improve: string[]
  moreEmpathetic: string[]
  moreUrgent: string[]
  shorter: string[]
  addPtpQuestion: string[]
} = {
  improve: [
    "Hello {{borrower_name}}, this is ClearGrid calling about your account with {{lender_name}}. " +
      "Our records show an outstanding balance of {{amount_due}} AED that became due on {{due_date}}. " +
      "We'd like to help you resolve this today. Press 1 to make a payment, press 2 to speak with one of our agents, or press 3 to arrange a callback at a more convenient time.",
    "Hi {{borrower_name}}, this is an automated call from ClearGrid on behalf of {{lender_name}}. " +
      "You currently have a balance of {{amount_due}} AED outstanding since {{due_date}}. " +
      "To resolve this quickly, press 1 to pay now, press 2 for a live agent, or press 3 to be called back.",
  ],
  moreEmpathetic: [
    "Hi {{borrower_name}}, this is ClearGrid. We know that life can be unpredictable and we want to make this as easy as possible for you. " +
      "Your account with {{lender_name}} has a balance of {{amount_due}} AED that needs attention. " +
      "We're here to help find an option that works for your situation. " +
      "Press 1 to make a payment, press 2 to speak with someone who can help you find a plan, or press 3 to schedule a callback when it's convenient for you.",
    "Hello {{borrower_name}}, this is ClearGrid calling with care about your account. " +
      "We understand that situations change. Your balance of {{amount_due}} AED with {{lender_name}} is outstanding, but we want to work with you. " +
      "Press 1 if you can make a payment today, press 2 to talk to someone about flexible options, or press 3 to schedule a better time for us to call.",
  ],
  moreUrgent: [
    "URGENT: {{borrower_name}}, this is ClearGrid. Your account with {{lender_name}} is significantly past due. " +
      "An immediate payment of {{amount_due}} AED is required to avoid further escalation. " +
      "Press 1 to pay now, press 2 to speak with an agent immediately. Failure to respond may impact your credit profile.",
    "{{borrower_name}}, this is an urgent notice from ClearGrid. Your balance of {{amount_due}} AED with {{lender_name}} requires immediate action. " +
      "Press 1 to settle now, or press 2 to speak with an agent right now. Do not delay.",
  ],
  shorter: [
    "Hi {{borrower_name}}, this is ClearGrid. You owe {{amount_due}} AED on your {{lender_name}} account. " +
      "Press 1 to pay, press 2 for an agent.",
    "{{borrower_name}}, ClearGrid here. Balance: {{amount_due}} AED. Press 1 to pay, press 2 to talk.",
  ],
  addPtpQuestion: [
    "Hi {{borrower_name}}, this is ClearGrid regarding your {{lender_name}} account. " +
      "You have an outstanding balance of {{amount_due}} AED, due on {{due_date}}. " +
      "Can you commit to paying this balance within the next 7 days? " +
      "Press 1 if yes, I will pay within 7 days. Press 2 if you need more time. Press 3 to speak with an agent.",
    "Hello {{borrower_name}}, ClearGrid calling about your balance of {{amount_due}} AED on your account with {{lender_name}}. " +
      "We'd like to set up a promise to pay. When can you commit to paying? " +
      "Press 1 for within 3 days, press 2 for within 7 days, press 3 for within 14 days, or press 4 to speak with an agent.",
  ],
}
