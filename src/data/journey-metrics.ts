/**
 * Single source of truth for message-analytics metric labels, tooltips and
 * display formatting. Every analytics surface — node Analytics tab, Report
 * tab, CSV exports — reads from this module so they can never disagree on
 * what "Delivery rate" or "CR%" means.
 *
 * TODO (backend contract): these definitions map 1:1 to the analytics
 * endpoint's response shape. When the API lands, replace the mock
 * synthesizers in `message-analytics.ts` with network calls returning
 * the same keys.
 */

export type MetricFormat = "count" | "percent" | "aed" | "duration_hours"

export type MessageMetricId =
  // Funnel
  | "reached"
  | "sent"
  | "delivered"
  | "unique_opens"
  | "unique_clicks"
  | "converted"
  // Delivery
  | "delivery_rate"
  | "not_sent"
  | "queued"
  | "hard_bounces"
  | "soft_bounces"
  | "spam_rate"
  | "opt_out_rate"
  | "invalid_emails_rate"
  // Engagement
  | "open_rate"
  | "ctr"
  | "click_to_open_rate"
  | "cta_ctr"
  | "time_to_first_open"
  // Outcomes
  | "calls_initiated"
  | "offers_accepted"
  | "extension"
  | "deferral"
  | "ptp_count"
  | "ptp_amount"
  | "ptp_kept_rate"
  | "ptp_broken"
  | "borrowed_amount"
  | "collection"
  | "recovery_pct"
  | "cr_pct"
  | "emails_per_borrower"
  | "sms_per_borrower"
  // SMS-specific
  | "segments_sent"
  | "estimated_cost"
  | "awaiting_receipt"
  | "undelivered"

export interface MetricDefinition {
  id: MessageMetricId
  label: string
  short?: string
  description: string
  format: MetricFormat
  /** Accent tone when shown as a card. */
  tone?: "primary" | "info" | "warn" | "muted"
}

export const METRIC_DEFINITIONS: Record<MessageMetricId, MetricDefinition> = {
  reached: {
    id: "reached",
    label: "Reached here",
    description: "Borrowers who arrived at this node within the selected window.",
    format: "count",
    tone: "muted",
  },
  sent: {
    id: "sent",
    label: "Sent",
    description: "Send attempts accepted by the provider.",
    format: "count",
  },
  delivered: {
    id: "delivered",
    label: "Delivered",
    description:
      "Email: Sent minus bounced. SMS: confirmed by the operator delivery receipt.",
    format: "count",
    tone: "primary",
  },
  unique_opens: {
    id: "unique_opens",
    label: "Unique opens",
    description:
      "Distinct recipients who opened at least once. Includes automated opens from Apple Mail Privacy Protection, so this overstates real reads.",
    format: "count",
  },
  unique_clicks: {
    id: "unique_clicks",
    label: "Unique clicks",
    description: "Distinct recipients who clicked at least once.",
    format: "count",
  },
  converted: {
    id: "converted",
    label: "Converted",
    short: "CR%",
    description:
      "Borrowers with a PTP or payment within the attribution window ÷ Delivered.",
    format: "percent",
    tone: "primary",
  },
  delivery_rate: {
    id: "delivery_rate",
    label: "Delivery rate",
    description: "Delivered ÷ Sent.",
    format: "percent",
  },
  not_sent: {
    id: "not_sent",
    label: "Not sent",
    description:
      "Borrowers skipped before reaching the provider: no address, invalid, DNC, blocked, frequency cap, personalization failure.",
    format: "count",
    tone: "warn",
  },
  queued: {
    id: "queued",
    label: "Queued",
    description:
      "Borrowers waiting for the node's send window. Shown separately from failures.",
    format: "count",
    tone: "info",
  },
  hard_bounces: {
    id: "hard_bounces",
    label: "Hard bounces",
    description: "Permanent failure, e.g. non-existent address.",
    format: "count",
    tone: "warn",
  },
  soft_bounces: {
    id: "soft_bounces",
    label: "Soft bounces",
    description:
      "Temporary failure. Shown as Retrying while the provider retries, counted as bounced only if it never delivers.",
    format: "count",
  },
  spam_rate: {
    id: "spam_rate",
    label: "Spam rate",
    description: "Spam complaints ÷ Delivered.",
    format: "percent",
    tone: "warn",
  },
  opt_out_rate: {
    id: "opt_out_rate",
    label: "Opt-out rate",
    description:
      "Unsubscribes (email) or STOP replies (SMS) ÷ Delivered.",
    format: "percent",
  },
  invalid_emails_rate: {
    id: "invalid_emails_rate",
    label: "Invalid emails rate",
    description: "Invalid email records ÷ eligible email records.",
    format: "percent",
  },
  open_rate: {
    id: "open_rate",
    label: "Open rate",
    description:
      "Unique opens ÷ Delivered. Includes automated opens from Apple Mail Privacy Protection.",
    format: "percent",
  },
  ctr: {
    id: "ctr",
    label: "CTR",
    description: "Unique clicks ÷ Delivered.",
    format: "percent",
  },
  click_to_open_rate: {
    id: "click_to_open_rate",
    label: "Click-to-open rate",
    description: "Unique clicks ÷ Unique opens.",
    format: "percent",
  },
  cta_ctr: {
    id: "cta_ctr",
    label: "CTA-level CTR",
    description: "Unique clicks on one CTA ÷ Delivered.",
    format: "percent",
  },
  time_to_first_open: {
    id: "time_to_first_open",
    label: "Time to first open",
    description: "Median time from delivery to first open.",
    format: "duration_hours",
  },
  calls_initiated: {
    id: "calls_initiated",
    label: "Calls initiated",
    description:
      "Inbound calls or click-to-call within the attribution window after delivery.",
    format: "count",
  },
  offers_accepted: {
    id: "offers_accepted",
    label: "Offers accepted",
    description:
      "Settlement / discount offers accepted within the attribution window.",
    format: "count",
  },
  extension: {
    id: "extension",
    label: "Extension",
    description:
      "Due-date extensions requested within the attribution window.",
    format: "count",
  },
  deferral: {
    id: "deferral",
    label: "Deferral",
    description: "Payment deferrals granted within the attribution window.",
    format: "count",
  },
  ptp_count: {
    id: "ptp_count",
    label: "PTP",
    description:
      "Payment promises created within the attribution window after delivery.",
    format: "count",
  },
  ptp_amount: {
    id: "ptp_amount",
    label: "PTP amount",
    description: "Total AED promised across those PTPs.",
    format: "aed",
  },
  ptp_kept_rate: {
    id: "ptp_kept_rate",
    label: "PTP kept rate",
    description:
      "PTPs paid by due date ÷ PTPs that reached their due date.",
    format: "percent",
  },
  ptp_broken: {
    id: "ptp_broken",
    label: "PTP broken",
    description: "PTPs not paid by due date.",
    format: "count",
    tone: "warn",
  },
  borrowed_amount: {
    id: "borrowed_amount",
    label: "Total borrowed amount",
    description:
      "Total outstanding of delivered borrowers at send time.",
    format: "aed",
  },
  collection: {
    id: "collection",
    label: "Collection",
    description:
      "Amount collected from delivered borrowers within the attribution window.",
    format: "aed",
    tone: "primary",
  },
  recovery_pct: {
    id: "recovery_pct",
    label: "Recovery %",
    description:
      "Collection ÷ Total outstanding of delivered borrowers at send time.",
    format: "percent",
    tone: "primary",
  },
  cr_pct: {
    id: "cr_pct",
    label: "CR%",
    description:
      "Borrowers with a PTP or payment in the attribution window ÷ Delivered.",
    format: "percent",
  },
  emails_per_borrower: {
    id: "emails_per_borrower",
    label: "Emails per borrower",
    description:
      "Emails delivered ÷ distinct borrowers who received at least one.",
    format: "count",
  },
  sms_per_borrower: {
    id: "sms_per_borrower",
    label: "SMS per borrower",
    description:
      "SMS delivered ÷ distinct borrowers who received at least one.",
    format: "count",
  },
  segments_sent: {
    id: "segments_sent",
    label: "Segments sent",
    description:
      "Total SMS segments billed. A single message may be 1–3 segments depending on encoding (GSM-7 vs UCS-2) and length.",
    format: "count",
  },
  estimated_cost: {
    id: "estimated_cost",
    label: "Estimated cost",
    description:
      "Segments sent × per-segment cost. TODO: per-segment cost comes from Lender Configurations.",
    format: "aed",
  },
  awaiting_receipt: {
    id: "awaiting_receipt",
    label: "Awaiting receipt",
    description:
      "SMS sent but with no delivery receipt yet. Never counted as failed.",
    format: "count",
    tone: "info",
  },
  undelivered: {
    id: "undelivered",
    label: "Undelivered",
    description: "SMS the operator reported as undelivered (with error code).",
    format: "count",
    tone: "warn",
  },
}

export function fmt(id: MessageMetricId, value: number): string {
  const d = METRIC_DEFINITIONS[id]
  switch (d.format) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`
    case "aed":
      return `AED ${Math.round(value).toLocaleString()}`
    case "duration_hours":
      if (value < 1) return `${Math.round(value * 60)}m`
      if (value < 24) return `${value.toFixed(1)}h`
      return `${(value / 24).toFixed(1)}d`
    case "count":
    default:
      return Math.round(value).toLocaleString()
  }
}

/** Reasons a Sent attempt was rejected before the provider accepted it. */
export type NotSentReason =
  | "no_address"
  | "invalid_address"
  | "dnc_or_opted_out"
  | "blocked_prior_bounce"
  | "frequency_cap"
  | "personalization_failure"
  | "provider_rejected"

export const NOT_SENT_REASON_LABEL: Record<NotSentReason, string> = {
  no_address: "No address on file",
  invalid_address: "Invalid address",
  dnc_or_opted_out: "DNC or opted out",
  blocked_prior_bounce: "Blocked after earlier hard bounce",
  frequency_cap: "Frequency cap",
  personalization_failure: "Personalization failure",
  provider_rejected: "Rejected by provider",
}

/** CTA types managers can tag each tracked link with. */
export type CtaType =
  | "pay"
  | "ptp"
  | "extension"
  | "deferral"
  | "help"
  | "call"
  | "other"

export const CTA_LABEL: Record<CtaType, string> = {
  pay: "Pay",
  ptp: "PTP",
  extension: "Extension",
  deferral: "Deferral",
  help: "Help",
  call: "Call",
  other: "Other",
}

/** Best-guess CTA type from a URL. Used as a default when the author
 *  hasn't tagged a link yet; `tel:` always maps to Call. */
export function guessCtaType(url: string): CtaType {
  const u = url.toLowerCase().trim()
  if (u.startsWith("tel:")) return "call"
  if (/\/pay(\?|\/|$)|checkout|invoice/.test(u)) return "pay"
  if (/\/ptp|promise/.test(u)) return "ptp"
  if (/extension|extend/.test(u)) return "extension"
  if (/defer/.test(u)) return "deferral"
  if (/help|support|faq|contact/.test(u)) return "help"
  return "other"
}
