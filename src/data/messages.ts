export type MessageChannel = "email" | "sms" | "whatsapp";
export type MessageStatus = "draft" | "scheduled" | "sent" | "failed";

export interface MessageListItem {
  id: string;
  /** Campaign name — required at send time, always present. Primary title in
   *  the message listing. Distinct from `subject`, which is the email subject
   *  line (or first ~80 chars of the body for SMS/WhatsApp). */
  campaignName: string;
  subject: string; // For email; for SMS/WhatsApp, first ~80 chars of body
  channel: MessageChannel;
  status: MessageStatus;
  audience: string; // "1 borrower" or segment name
  audienceType: "single" | "segment";
  recipients: number;
  /** ISO date string */
  sentAt: string | null;
  /** ISO date string */
  createdAt: string;
  createdBy: string;
  lenderId: string;
  playbookId: string | null;
  playbookName: string | null;
  /** Engagement (sent only) */
  openRate: number | null; // %
  clickRate: number | null; // %
  replyRate: number | null; // %
  /** Rich template that the message used, if any. */
  templateId?: string;
  /** From / sender info for the detail page */
  fromName?: string;
  fromAddress?: string;
  /** Count-based funnel — populated for sent and failed messages */
  funnel?: MessageFunnel;
  /** Per-link click breakdown (for sent emails) */
  linkClicks?: Array<{ label: string; url: string; clicks: number; isPayment?: boolean }>;
  /** A/B/n variations. When present with length > 1, the analytics page
   *  renders the variation switcher + per-variation comparison table. The
   *  top-level `funnel` remains the aggregate across variations. */
  variations?: MessageVariation[];
  /** Optional holdout / control arm — used to compute campaign lift on
   *  the analytics comparison table. */
  holdout?: MessageHoldout;
  /** Recurring campaign metadata. Present on the parent series template
   *  and on every occurrence copy. */
  recurring?: RecurringMeta;
}

/**
 * Goal stage for the funnel. The bottom (climax) stage adapts to the
 * message's purpose — a Payment Reminder counts payments, a PTP message
 * counts PTPs captured, a Hardship outreach counts replies/RPCs, etc.
 */
export type MessageGoalKey =
  | "paid"        // Payment Reminder, Final Notice
  | "ptp"         // Broken Promise Recovery, PTP Confirmation
  | "rpc"         // Hardship Outreach (Right Party Contact)
  | "settled"     // Settlement Offer
  | "replies"     // generic outreach where engagement = success
  | "activated"   // Welcome / Onboarding

export interface MessageGoal {
  key: MessageGoalKey;
  /** Display label, e.g. "Paid", "PTPs captured", "Settlements accepted" */
  label: string;
  /** Tooltip / sub-line, e.g. "% of clicks converted" */
  rateLabelOverride?: string;
  /** How many recipients hit the goal */
  count: number;
  /** Optional value display under the count, e.g. "AED 142,320 recovered" or "AED 38,000 settled" */
  valueLabel?: string;
  /** Optional caveat shown beside the stage, e.g. "Manual reviewed PTPs" */
  caveat?: string;
}

export interface MessageFunnel {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  /** The bottom-of-funnel goal stage, adapted to the message's purpose. */
  goal: MessageGoal;
  /** Attribution window in days */
  attributionWindowDays: number;
}

/**
 * One variation of a sent A/B/n campaign. All the funnel/subject/from fields
 * mirror the top-level Message shape so the analytics page can reuse its
 * existing render logic scoped to a variation.
 */
export interface MessageVariation {
  id: string;
  /** "A", "B", "C" — display label */
  label: string;
  /** Traffic split % this variation received at send time. Sums to 100
   *  across variations (excluding holdout). */
  splitPct: number;
  /** How many recipients this variation was sent to. */
  recipients: number;
  subject: string;
  fromName?: string;
  fromAddress?: string;
  templateId?: string;
  funnel: MessageFunnel;
  linkClicks?: Array<{ label: string; url: string; clicks: number; isPayment?: boolean }>;
}

/**
 * Control/holdout arm. When present, its `paidRate` is compared against the
 * variation aggregate to compute lift.
 */
export interface MessageHoldout {
  pct: number;
  recipients: number;
  /** Rate of goal completion in the holdout arm (0..100). */
  goalRate: number;
  goalLabel: string;
}

/**
 * Recurring-campaign metadata. Present on both the parent series (isParent)
 * and on every occurrence copy (isOccurrence). Occurrence copies always
 * point at their parent via `seriesId`.
 */
export type RecurringSeriesStatus = "active" | "paused" | "ended";

export type RecurringCadence =
  | { kind: "daily"; time: string }
  /**
   * Custom cadence — either specific weekdays (daysOfWeek non-empty) or an
   * every-N-days interval. Exactly one of the two shapes is used at a time:
   * if daysOfWeek is empty, everyN drives the schedule.
   */
  | { kind: "custom"; daysOfWeek: number[]; everyN: number; time: string };

export interface RecurringMeta {
  /** Points at the parent series' message id. On the parent itself, this
   *  equals the parent's own id for uniformity. */
  seriesId: string;
  /** Human-readable series name — sticky across occurrences.
   *  E.g. "Mashreq · Daily 30 DPD reminder". */
  seriesName: string;
  /** True on the parent-template row (visible in the listing as a "series"
   *  entry); false on individual occurrence copies. */
  isParent: boolean;
  /** 1-indexed occurrence number for copies. Undefined on the parent. */
  occurrenceIndex?: number;
  /** Total occurrences fired so far — same across the series. */
  totalOccurrences: number;
  status: RecurringSeriesStatus;
  cadence: RecurringCadence;
  /** Timestamp the series was last paused or resumed — used in banners. */
  lastStateChangeAt?: string;
}

/** Manual campaign-name overrides for seeded messages. Anything not in this
 *  map gets a derived name (see `deriveCampaignName`) so every entry in the
 *  listing always has a campaign name — matches the mandatory-at-send rule. */
const SEED_CAMPAIGN_NAMES: Record<string, string> = {
  "msg-1": "Mashreq · High DPD Wave 12",
  "msg-2": "Tamara · Ahmed Al-Mansoori (1:1 reminder)",
  "msg-3": "Mashreq · Final Notice · 91-180 DPD",
  "msg-4": "CashNow · Early Delinquency SMS · May W2",
  "msg-5": "ENBD · Settlement Push · May",
  "msg-6": "Tamara · PTP WhatsApp Confirmation · Daily",
  "msg-7": "Mashreq · Broken Promise Follow-up",
  "msg-8": "Tamara · Pre-Due Reminders · May",
  "msg-9": "CashNow · 1:1 SMS (test)",
  "msg-10": "General · Mid-DPD Multi-Channel · Wave 8",
  "msg-11": "ENBD · Hardship Outreach",
  "msg-12": "Mashreq · Settlement 30% off · WhatsApp",
  "msg-13": "CashNow · Broken Promise Recovery · June",
  "msg-14": "General · Settlement 20% off · Wave 3",
  "msg-15": "General · Welcome / Onboarding · May",
  "msg-16": "Tamara · PTP SMS Reminder · May W4",
  // Recurring series parent (schedule template) + occurrence copies
  "msg-rec-parent": "Mashreq · Daily 30 DPD Reminder (recurring)",
  "msg-rec-occ-1": "Mashreq · Daily 30 DPD Reminder — Wave 12",
  "msg-rec-occ-2": "Mashreq · Daily 30 DPD Reminder — Wave 13",
  "msg-rec-occ-3": "Mashreq · Daily 30 DPD Reminder — Wave 14",
}

const rawMessagesList: Array<Omit<MessageListItem, "campaignName">> = [
  {
    id: "msg-1",
    subject: "Payment Reminder — Action Required",
    channel: "email",
    status: "sent",
    audience: "High DPD UAE Borrowers",
    audienceType: "segment",
    recipients: 1248,
    sentAt: "2026-05-12T09:00:00Z",
    createdAt: "2026-05-12T08:45:00Z",
    createdBy: "Rabab Abbas",
    lenderId: "lnd-mashreq",
    playbookId: "pb-general-reminder",
    playbookName: "General Payment Reminder",
    openRate: 38.2,
    clickRate: 12.4,
    replyRate: 3.1,
    templateId: "rich-cg-payment-reminder",
    fromName: "ClearGrid Collections",
    fromAddress: "collections@cleargrid.co",
    funnel: {
      sent: 1248,
      delivered: 1232,
      opened: 471,
      clicked: 155,
      goal: {
        key: "paid",
        label: "Paid",
        count: 84,
        valueLabel: "AED 142,320 recovered",
        rateLabelOverride: "54.2% of clicks paid",
      },
      attributionWindowDays: 7,
    },
    linkClicks: [
      { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 121, isPayment: true },
      { label: "Reply / support", url: "mailto:support@cleargrid.co", clicks: 22 },
      { label: "Unsubscribe", url: "/unsubscribe", clicks: 12 },
    ],
    variations: [
      {
        id: "var-a",
        label: "A",
        splitPct: 40,
        recipients: 500,
        subject: "Payment Reminder — Action Required",
        fromName: "ClearGrid Collections",
        fromAddress: "collections@cleargrid.co",
        templateId: "rich-cg-payment-reminder",
        funnel: {
          sent: 500,
          delivered: 494,
          opened: 178,
          clicked: 56,
          goal: {
            key: "paid",
            label: "Paid",
            count: 28,
            valueLabel: "AED 47,600 recovered",
            rateLabelOverride: "50.0% of clicks paid",
          },
          attributionWindowDays: 7,
        },
        linkClicks: [
          { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 42, isPayment: true },
          { label: "Reply / support", url: "mailto:support@cleargrid.co", clicks: 9 },
          { label: "Unsubscribe", url: "/unsubscribe", clicks: 5 },
        ],
      },
      {
        id: "var-b",
        label: "B",
        splitPct: 40,
        recipients: 500,
        subject: "AED 3,450 due — pay in one tap",
        fromName: "Mashreq Care",
        fromAddress: "care@notifications.mashreq.ae",
        templateId: "rich-cg-payment-reminder",
        funnel: {
          sent: 500,
          delivered: 496,
          opened: 214,
          clicked: 78,
          goal: {
            key: "paid",
            label: "Paid",
            count: 44,
            valueLabel: "AED 74,720 recovered",
            rateLabelOverride: "56.4% of clicks paid",
          },
          attributionWindowDays: 7,
        },
        linkClicks: [
          { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 59, isPayment: true },
          { label: "Reply / support", url: "mailto:support@cleargrid.co", clicks: 12 },
          { label: "Unsubscribe", url: "/unsubscribe", clicks: 7 },
        ],
      },
      {
        id: "var-c",
        label: "C",
        splitPct: 20,
        recipients: 248,
        subject: "Ahmed, a quick note about your Mashreq account",
        fromName: "Mashreq Care",
        fromAddress: "care@notifications.mashreq.ae",
        templateId: "rich-cg-payment-reminder",
        funnel: {
          sent: 248,
          delivered: 242,
          opened: 79,
          clicked: 21,
          goal: {
            key: "paid",
            label: "Paid",
            count: 12,
            valueLabel: "AED 20,000 recovered",
            rateLabelOverride: "57.1% of clicks paid",
          },
          attributionWindowDays: 7,
        },
        linkClicks: [
          { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 15, isPayment: true },
          { label: "Reply / support", url: "mailto:support@cleargrid.co", clicks: 3 },
        ],
      },
    ],
    holdout: {
      pct: 10,
      recipients: 139,
      goalRate: 2.9,
      goalLabel: "Paid (control arm — no message sent)",
    },
  },
  {
    id: "msg-2",
    subject: "Hey Ahmed — quick reminder about your payment 👋",
    channel: "email",
    status: "sent",
    audience: "Ahmed Al-Mansoori",
    audienceType: "single",
    recipients: 1,
    sentAt: "2026-05-11T15:20:00Z",
    createdAt: "2026-05-11T15:18:00Z",
    createdBy: "Asad Siddiqi",
    lenderId: "lnd-tamara",
    playbookId: "pb-tamara-friendly",
    playbookName: "Tamara Friendly Reminder",
    openRate: 100,
    clickRate: 100,
    replyRate: 0,
    templateId: "rich-tamara-friendly",
    fromName: "Tamara Care",
    fromAddress: "care@tamara.co",
    funnel: {
      sent: 1,
      delivered: 1,
      opened: 1,
      clicked: 1,
      goal: {
        key: "paid",
        label: "Paid",
        count: 1,
        valueLabel: "AED 1,250 recovered",
      },
      attributionWindowDays: 7,
    },
    linkClicks: [{ label: "Pay button", url: "{{payment_link}}", clicks: 1, isPayment: true }],
  },
  {
    id: "msg-3",
    subject: "FINAL NOTICE — Immediate Action Required",
    channel: "email",
    status: "scheduled",
    audience: "Mashreq 91-180 DPD",
    audienceType: "segment",
    recipients: 421,
    sentAt: "2026-05-14T08:00:00Z",
    createdAt: "2026-05-10T17:30:00Z",
    createdBy: "Khalil Ahmed",
    lenderId: "lnd-mashreq",
    playbookId: "pb-mashreq-final",
    playbookName: "Mashreq Final Notice",
    openRate: null,
    clickRate: null,
    replyRate: null,
  },
  {
    id: "msg-4",
    subject: "Reminder: AED 1,250 due May 20",
    channel: "sms",
    status: "sent",
    audience: "Early Delinquency 1-30",
    audienceType: "segment",
    recipients: 892,
    sentAt: "2026-05-10T11:00:00Z",
    createdAt: "2026-05-10T10:45:00Z",
    createdBy: "Rabab Abbas",
    lenderId: "lnd-cashnow",
    playbookId: null,
    playbookName: null,
    openRate: null,
    clickRate: null,
    replyRate: null,
    fromName: "CashNow",
    funnel: {
      sent: 892,
      delivered: 871,
      // SMS has no Opened / Clicked signal — these are unused by the
      // funnel UI when channel === "sms" but kept here for type safety.
      opened: 0,
      clicked: 0,
      goal: {
        key: "paid",
        label: "Paid",
        count: 64,
        valueLabel: "AED 81,420 recovered",
        rateLabelOverride: "7.3% of delivered paid",
        caveat: "SMS attribution is recipient-level; goal is matched on borrower payment within window.",
      },
      attributionWindowDays: 7,
    },
  },
  {
    id: "msg-5",
    subject: "Settlement offer — close out by month-end",
    channel: "email",
    status: "draft",
    audience: "Settlement Eligible",
    audienceType: "segment",
    recipients: 0,
    sentAt: null,
    createdAt: "2026-05-13T14:10:00Z",
    createdBy: "Asad Siddiqi",
    lenderId: "lnd-enbd",
    playbookId: null,
    playbookName: null,
    openRate: null,
    clickRate: null,
    replyRate: null,
  },
  {
    id: "msg-6",
    subject: "WhatsApp PTP confirmation",
    channel: "whatsapp",
    status: "sent",
    audience: "PTP Captured Today",
    audienceType: "segment",
    recipients: 156,
    sentAt: "2026-05-12T17:45:00Z",
    createdAt: "2026-05-12T17:30:00Z",
    createdBy: "Khalil Ahmed",
    lenderId: "lnd-tamara",
    playbookId: null,
    playbookName: null,
    openRate: 86.5,
    clickRate: null,
    replyRate: 12.8,
  },
  {
    id: "msg-7",
    subject: "Broken promise follow-up",
    channel: "email",
    status: "failed",
    audience: "Broken Promises Last 7d",
    audienceType: "segment",
    recipients: 47,
    sentAt: "2026-05-09T16:00:00Z",
    createdAt: "2026-05-09T15:45:00Z",
    createdBy: "Rabab Abbas",
    lenderId: "lnd-mashreq",
    playbookId: null,
    playbookName: null,
    openRate: null,
    clickRate: null,
    replyRate: null,
  },
  {
    id: "msg-8",
    subject: "Tamara — gentle nudge before due date",
    channel: "email",
    status: "scheduled",
    audience: "Pre-due Reminders",
    audienceType: "segment",
    recipients: 2340,
    sentAt: "2026-05-15T09:30:00Z",
    createdAt: "2026-05-11T11:00:00Z",
    createdBy: "Asad Siddiqi",
    lenderId: "lnd-tamara",
    playbookId: "pb-tamara-friendly",
    playbookName: "Tamara Friendly Reminder",
    openRate: null,
    clickRate: null,
    replyRate: null,
  },
  {
    id: "msg-9",
    subject: "Tap to pay your installment",
    channel: "sms",
    status: "draft",
    audience: "Single borrower",
    audienceType: "single",
    recipients: 1,
    sentAt: null,
    createdAt: "2026-05-13T10:20:00Z",
    createdBy: "Rabab Abbas",
    lenderId: "lnd-cashnow",
    playbookId: null,
    playbookName: null,
    openRate: null,
    clickRate: null,
    replyRate: null,
  },
  {
    id: "msg-10",
    subject: "Mid-cycle reminder · multi-channel",
    channel: "email",
    status: "sent",
    audience: "Mid-DPD All Lenders",
    audienceType: "segment",
    recipients: 3421,
    sentAt: "2026-05-08T09:00:00Z",
    createdAt: "2026-05-08T08:30:00Z",
    createdBy: "Khalil Ahmed",
    lenderId: "general",
    playbookId: "pb-general-reminder",
    playbookName: "General Payment Reminder",
    openRate: 42.7,
    clickRate: 18.3,
    replyRate: 4.9,
    templateId: "rich-cg-payment-reminder",
    fromName: "ClearGrid Collections",
    fromAddress: "collections@cleargrid.co",
    funnel: {
      sent: 3421,
      delivered: 3387,
      opened: 1461,
      clicked: 626,
      goal: {
        key: "paid",
        label: "Paid",
        count: 287,
        valueLabel: "AED 481,540 recovered",
        rateLabelOverride: "45.8% of clicks paid",
      },
      attributionWindowDays: 7,
    },
    linkClicks: [
      { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 521, isPayment: true },
      { label: "View account", url: "/account", clicks: 64 },
      { label: "Reply", url: "mailto:support@cleargrid.co", clicks: 28 },
      { label: "Unsubscribe", url: "/unsubscribe", clicks: 13 },
    ],
  },
  {
    id: "msg-11",
    subject: "Hardship outreach",
    channel: "email",
    status: "sent",
    audience: "Hardship Cases",
    audienceType: "segment",
    recipients: 68,
    sentAt: "2026-05-07T14:00:00Z",
    createdAt: "2026-05-07T13:30:00Z",
    createdBy: "Asad Siddiqi",
    lenderId: "lnd-enbd",
    playbookId: null,
    playbookName: null,
    openRate: 71.2,
    clickRate: 25.8,
    replyRate: 19.4,
    templateId: "rich-cg-settlement",
    fromName: "Emirates NBD Care",
    fromAddress: "care@emiratesnbd.com",
    funnel: {
      sent: 68,
      delivered: 67,
      opened: 48,
      clicked: 18,
      goal: {
        key: "rpc",
        label: "Right party contacts",
        count: 24,
        valueLabel: "Confirmed RPCs (incl. replies)",
        rateLabelOverride: "35.8% RPC rate of delivered",
      },
      attributionWindowDays: 14,
    },
    linkClicks: [
      { label: "Talk to us", url: "mailto:hardship@enbd.com", clicks: 14, isPayment: false },
      { label: "Reply", url: "mailto:support@cleargrid.co", clicks: 4 },
    ],
  },
  {
    id: "msg-12",
    subject: "AED 850 settlement — 30% off",
    channel: "whatsapp",
    status: "draft",
    audience: "Settlement Eligible WhatsApp",
    audienceType: "segment",
    recipients: 0,
    sentAt: null,
    createdAt: "2026-05-13T09:00:00Z",
    createdBy: "Rabab Abbas",
    lenderId: "lnd-mashreq",
    playbookId: null,
    playbookName: null,
    openRate: null,
    clickRate: null,
    replyRate: null,
  },
  // ─── SMS PTP follow-up (goal: PTPs captured, no open/click signal) ─
  {
    id: "msg-16",
    subject: "Tamara: Tap to pick a new payment date — bit.ly/ta-ptp",
    channel: "sms",
    status: "sent",
    audience: "Broken Promises SMS",
    audienceType: "segment",
    recipients: 504,
    sentAt: "2026-05-28T13:00:00Z",
    createdAt: "2026-05-28T12:45:00Z",
    createdBy: "Khalil Ahmed",
    lenderId: "lnd-tamara",
    playbookId: null,
    playbookName: null,
    openRate: null,
    clickRate: null,
    replyRate: null,
    fromName: "Tamara",
    funnel: {
      sent: 504,
      delivered: 492,
      opened: 0,
      clicked: 0,
      goal: {
        key: "ptp",
        label: "PTPs captured",
        count: 31,
        valueLabel: "AED 57,800 promised",
        rateLabelOverride: "6.3% of delivered captured a PTP",
        caveat: "SMS attribution is recipient-level; PTPs matched by borrower within window.",
      },
      attributionWindowDays: 7,
    },
  },
  // ─── PTP follow-up (goal: PTPs captured) ─────────────────────────
  {
    id: "msg-13",
    subject: "We can work this out — pick a date that works for you",
    channel: "email",
    status: "sent",
    audience: "Broken Promises 31-60 DPD",
    audienceType: "segment",
    recipients: 412,
    sentAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T09:30:00Z",
    createdBy: "Khalil Ahmed",
    lenderId: "lnd-cashnow",
    playbookId: null,
    playbookName: null,
    openRate: 44.1,
    clickRate: 19.8,
    replyRate: 6.2,
    templateId: "rich-cg-payment-reminder",
    fromName: "CashNow Collections",
    fromAddress: "collections@cashnow.ae",
    funnel: {
      sent: 412,
      delivered: 408,
      opened: 180,
      clicked: 81,
      goal: {
        key: "ptp",
        label: "PTPs captured",
        count: 47,
        valueLabel: "AED 89,200 promised",
        rateLabelOverride: "58.0% of clicks resulted in a PTP",
      },
      attributionWindowDays: 7,
    },
    linkClicks: [
      { label: "Schedule payment", url: "/schedule-payment", clicks: 64 },
      { label: "Talk to an agent", url: "/callback", clicks: 12 },
      { label: "Unsubscribe", url: "/unsubscribe", clicks: 5 },
    ],
  },
  // ─── Settlement offer (goal: Settlements accepted) ───────────────
  {
    id: "msg-14",
    subject: "Settle for {{currency}} {{settlement_amount}} — {{discount_percent}}% off",
    channel: "email",
    status: "sent",
    audience: "Settlement Eligible 91-180 DPD",
    audienceType: "segment",
    recipients: 312,
    sentAt: "2026-05-30T11:00:00Z",
    createdAt: "2026-05-30T10:40:00Z",
    createdBy: "Rabab Abbas",
    lenderId: "general",
    playbookId: null,
    playbookName: null,
    openRate: 51.6,
    clickRate: 24.2,
    replyRate: 9.6,
    templateId: "rich-cg-settlement",
    fromName: "ClearGrid Settlements",
    fromAddress: "settlements@cleargrid.co",
    funnel: {
      sent: 312,
      delivered: 309,
      opened: 159,
      clicked: 75,
      goal: {
        key: "settled",
        label: "Settlements accepted",
        count: 38,
        valueLabel: "AED 32,300 settled",
        rateLabelOverride: "50.7% of clicks accepted offer",
      },
      attributionWindowDays: 14,
    },
    linkClicks: [
      { label: "Accept settlement (CTA)", url: "{{payment_link}}", clicks: 58, isPayment: true },
      { label: "Counter-offer", url: "/negotiate", clicks: 11 },
      { label: "Reply", url: "mailto:settlements@cleargrid.co", clicks: 6 },
    ],
  },
  // ─── Welcome / Onboarding (goal: Account activations) ────────────
  {
    id: "msg-15",
    subject: "Welcome to your new ClearGrid account",
    channel: "email",
    status: "sent",
    audience: "Newly Activated Accounts",
    audienceType: "segment",
    recipients: 894,
    sentAt: "2026-05-29T08:00:00Z",
    createdAt: "2026-05-29T07:45:00Z",
    createdBy: "Asad Siddiqi",
    lenderId: "general",
    playbookId: null,
    playbookName: null,
    openRate: 68.3,
    clickRate: 38.1,
    replyRate: 2.1,
    fromName: "ClearGrid Onboarding",
    fromAddress: "onboarding@cleargrid.co",
    funnel: {
      sent: 894,
      delivered: 891,
      opened: 609,
      clicked: 341,
      goal: {
        key: "activated",
        label: "Activated / logged in",
        count: 248,
        valueLabel: "27.8% activation rate",
        rateLabelOverride: "72.7% of clicks activated",
      },
      attributionWindowDays: 30,
    },
    linkClicks: [
      { label: "Activate now (CTA)", url: "/onboarding", clicks: 287, isPayment: false },
      { label: "Read the guide", url: "/help", clicks: 41 },
      { label: "Unsubscribe", url: "/unsubscribe", clicks: 13 },
    ],
  },
  // ─────── Recurring campaign: parent template ───────
  {
    id: "msg-rec-parent",
    subject: "Payment Reminder — 30 DPD",
    channel: "email",
    status: "scheduled", // conceptually the "series" is active; latest occurrence is queued
    audience: "Mashreq 30 DPD Reminders (daily)",
    audienceType: "segment",
    recipients: 420, // last-run count as a reference
    sentAt: null,
    createdAt: "2026-07-14T09:00:00Z",
    createdBy: "Rabab Abbas",
    lenderId: "lnd-mashreq",
    playbookId: "pb-general-reminder",
    playbookName: "General Payment Reminder",
    openRate: null,
    clickRate: null,
    replyRate: null,
    templateId: "rich-cg-payment-reminder",
    fromName: "Mashreq Care",
    fromAddress: "care@notifications.mashreq.ae",
    recurring: {
      seriesId: "msg-rec-parent",
      seriesName: "Mashreq · Daily 30 DPD Reminder",
      isParent: true,
      totalOccurrences: 14,
      status: "active",
      cadence: { kind: "daily", time: "09:00" },
    },
  },
  // ─────── Occurrence copies (already sent) ───────
  {
    id: "msg-rec-occ-1",
    subject: "Payment Reminder — 30 DPD",
    channel: "email",
    status: "sent",
    audience: "Mashreq 30 DPD Reminders (daily)",
    audienceType: "segment",
    recipients: 418,
    sentAt: "2026-07-28T09:00:00Z",
    createdAt: "2026-07-28T09:00:00Z",
    createdBy: "System · recurring",
    lenderId: "lnd-mashreq",
    playbookId: "pb-general-reminder",
    playbookName: "General Payment Reminder",
    openRate: 41.2,
    clickRate: 11.6,
    replyRate: 2.4,
    templateId: "rich-cg-payment-reminder",
    fromName: "Mashreq Care",
    fromAddress: "care@notifications.mashreq.ae",
    funnel: {
      sent: 418,
      delivered: 414,
      opened: 172,
      clicked: 49,
      goal: {
        key: "paid",
        label: "Paid",
        count: 26,
        valueLabel: "AED 44,720 recovered",
      },
      attributionWindowDays: 7,
    },
    linkClicks: [
      { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 41, isPayment: true },
      { label: "Reply / support", url: "mailto:support@cleargrid.co", clicks: 6 },
    ],
    recurring: {
      seriesId: "msg-rec-parent",
      seriesName: "Mashreq · Daily 30 DPD Reminder",
      isParent: false,
      occurrenceIndex: 14,
      totalOccurrences: 14,
      status: "active",
      cadence: { kind: "daily", time: "09:00" },
    },
  },
  {
    id: "msg-rec-occ-2",
    subject: "Payment Reminder — 30 DPD",
    channel: "email",
    status: "sent",
    audience: "Mashreq 30 DPD Reminders (daily)",
    audienceType: "segment",
    recipients: 402,
    sentAt: "2026-07-27T09:00:00Z",
    createdAt: "2026-07-27T09:00:00Z",
    createdBy: "System · recurring",
    lenderId: "lnd-mashreq",
    playbookId: "pb-general-reminder",
    playbookName: "General Payment Reminder",
    openRate: 39.8,
    clickRate: 10.9,
    replyRate: 2.2,
    templateId: "rich-cg-payment-reminder",
    fromName: "Mashreq Care",
    fromAddress: "care@notifications.mashreq.ae",
    funnel: {
      sent: 402,
      delivered: 398,
      opened: 160,
      clicked: 44,
      goal: { key: "paid", label: "Paid", count: 23, valueLabel: "AED 39,100 recovered" },
      attributionWindowDays: 7,
    },
    linkClicks: [
      { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 37, isPayment: true },
      { label: "Reply / support", url: "mailto:support@cleargrid.co", clicks: 4 },
    ],
    recurring: {
      seriesId: "msg-rec-parent",
      seriesName: "Mashreq · Daily 30 DPD Reminder",
      isParent: false,
      occurrenceIndex: 13,
      totalOccurrences: 14,
      status: "active",
      cadence: { kind: "daily", time: "09:00" },
    },
  },
  {
    id: "msg-rec-occ-3",
    subject: "Payment Reminder — 30 DPD",
    channel: "email",
    status: "sent",
    audience: "Mashreq 30 DPD Reminders (daily)",
    audienceType: "segment",
    recipients: 388,
    sentAt: "2026-07-26T09:00:00Z",
    createdAt: "2026-07-26T09:00:00Z",
    createdBy: "System · recurring",
    lenderId: "lnd-mashreq",
    playbookId: "pb-general-reminder",
    playbookName: "General Payment Reminder",
    openRate: 40.2,
    clickRate: 11.1,
    replyRate: 2.3,
    templateId: "rich-cg-payment-reminder",
    fromName: "Mashreq Care",
    fromAddress: "care@notifications.mashreq.ae",
    funnel: {
      sent: 388,
      delivered: 384,
      opened: 156,
      clicked: 43,
      goal: { key: "paid", label: "Paid", count: 21, valueLabel: "AED 35,700 recovered" },
      attributionWindowDays: 7,
    },
    linkClicks: [
      { label: "Pay now (CTA)", url: "{{payment_link}}", clicks: 36, isPayment: true },
    ],
    recurring: {
      seriesId: "msg-rec-parent",
      seriesName: "Mashreq · Daily 30 DPD Reminder",
      isParent: false,
      occurrenceIndex: 12,
      totalOccurrences: 14,
      status: "active",
      cadence: { kind: "daily", time: "09:00" },
    },
  },
];

export const messagesList: MessageListItem[] = rawMessagesList.map((m) => ({
  ...m,
  campaignName: SEED_CAMPAIGN_NAMES[m.id] ?? deriveCampaignName(m),
}));

function deriveCampaignName(m: Omit<MessageListItem, "campaignName">): string {
  // Fallback for any seed entry not explicitly named: audience + short subject.
  const short = m.subject.length > 60 ? m.subject.slice(0, 57).trim() + "…" : m.subject
  return `${m.audience} · ${short}`
}

export const messageKpis = [
  { label: "Sent (7d)", value: "5,981" },
  { label: "Drafts", value: "3" },
  { label: "Scheduled", value: "2" },
  { label: "Failed (7d)", value: "1" },
];

/**
 * Given any message that belongs to a recurring series (parent or occurrence
 * copy), return the parent-template message. Returns undefined for
 * non-recurring messages.
 */
export function getRecurringParent(id: string): MessageListItem | undefined {
  const m = messagesList.find((x) => x.id === id);
  if (!m?.recurring) return undefined;
  return messagesList.find((x) => x.id === m.recurring!.seriesId);
}

/**
 * All messages in a recurring series (parent + occurrence copies), sorted
 * by createdAt descending (most recent occurrence first).
 */
export function getSeriesOccurrences(seriesId: string): MessageListItem[] {
  return messagesList
    .filter((m) => m.recurring?.seriesId === seriesId && !m.recurring.isParent)
    .sort((a, b) => (b.createdAt.localeCompare(a.createdAt)));
}

export function getMessageById(id: string): MessageListItem | undefined {
  return messagesList.find((m) => m.id === id);
}
