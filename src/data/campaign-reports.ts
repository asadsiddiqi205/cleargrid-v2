/**
 * Campaign reports — the aggregation layer that turns the messages list into
 * reportable rollups for the Reports section (Feature 3).
 *
 * The prototype does not run a real query engine; instead we derive the full
 * report shape from the seeded `messagesList` (per-message funnel + variations
 * + optional recurring metadata), plus the shared conversion-events config.
 * The math is the same as the analytics page — extended with channel-aware
 * detail (SMS gets encoding + segments + no opens; email gets opens with the
 * mail-privacy caveat).
 */

import { messagesList, type MessageListItem, type MessageFunnel } from "./messages"
import { borrowers } from "./borrowers"
import { lenders } from "./lenders"
import { segmentSms } from "@/lib/sms-encoding"
import type { ConversionEventDefinition } from "./conversion-events"

/* ─────────── Types ─────────── */

export type ReportChannel = "email" | "sms"

export interface CampaignReport {
  id: string
  campaignName: string
  channel: ReportChannel
  sentAt: string
  lenderId: string
  lenderName: string
  audience: string
  recipients: number
  /** Funnel — email keeps opens; SMS drops the opens metric. */
  funnel: ReportFunnel
  /** Per-link click breakdown. */
  linkClicks: Array<{ label: string; url: string; clicks: number; isPayment?: boolean }>
  /** Delivery failure reasons (SMS + email carrier bounces). */
  failureReasons: Array<{ reason: string; count: number }>
  /** Opt-outs / unsubscribes / spam complaints. */
  optOuts: number
  spamComplaints: number
  /** Variations, segments, lenders — the same rollup shape at each cut. */
  breakdown: {
    variations: BreakdownRow[]
    segments: BreakdownRow[]
    lenders: BreakdownRow[]
  }
  /** 14-day time series. */
  series: Array<{ date: string; sent: number; delivered: number; conversions: number; recoveredAED: number }>
  /** Per-conversion-event counts + AED. */
  conversions: CampaignConversionRow[]
  /** SMS-only: segment + encoding-driven cost snapshot. Undefined for email. */
  smsCost?: SmsCostBreakdown
  /** Deterministic sample borrowers who fired a conversion — used by the
   *  Reports → per-borrower drill-down. */
  sampleBorrowers: BorrowerConversionRow[]
}

export interface ReportFunnel {
  sent: number
  delivered: number
  bounced: number
  /** Opens exist for email only. Undefined for SMS (per PRD: "SMS has no opens"). */
  opened?: number
  clicked: number
}

export interface BreakdownRow {
  id: string
  label: string
  recipients: number
  delivered: number
  clicked: number
  conversions: number
  recoveredAED: number
  /** Delivery rate as a fraction 0..1. */
  deliveredRate: number
  clickedRate: number
  conversionRate: number
}

export interface CampaignConversionRow {
  eventId: string
  eventLabel: string
  monetary: boolean
  fired: number
  recoveredAED: number
}

export interface SmsCostBreakdown {
  /** GSM-7 vs UCS-2 detection on the message body. */
  encoding: "gsm7" | "ucs2"
  /** Segments per recipient. */
  segmentsPerRecipient: number
  /** Total segments sent = recipients * segmentsPerRecipient. */
  totalSegments: number
  /** Per-segment cost in AED — prototype value, matches the simulator. */
  perSegmentCostAED: number
  /** Estimated total send cost in AED. */
  estimatedCostAED: number
}

export interface BorrowerConversionRow {
  borrowerId: string
  borrowerName: string
  eventId: string
  eventLabel: string
  amountAED: number
  attributedToMessageId: string
  firedAt: string
}

/* ─────────── Deterministic PRNG (same as borrower-traces) ─────────── */

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function prng(seed: number) {
  let s = seed || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const ONE_DAY = 86_400_000

/* ─────────── Aggregation ─────────── */

const SMS_PER_SEGMENT_AED = 0.03
const WHATSAPP_PER_MSG_AED = 0.05

function lenderName(id: string): string {
  return lenders.find((l) => l.id === id)?.shortName ?? id
}

/**
 * Build a campaign report from a seeded message. Only email + sms channels
 * are supported for the Reports view (WhatsApp analytics live in the message
 * detail page).
 */
export function buildCampaignReport(
  messageId: string,
  events: ConversionEventDefinition[],
): CampaignReport | null {
  const message = messagesList.find((m) => m.id === messageId)
  if (!message || (message.channel !== "email" && message.channel !== "sms")) return null
  const funnel = message.funnel
  if (!funnel) return null

  const seed = hash(`campaign-report:${messageId}`)
  const rand = prng(seed)

  const channel = message.channel as ReportChannel

  const reportFunnel: ReportFunnel = {
    sent: funnel.sent,
    delivered: funnel.delivered,
    bounced: Math.max(0, funnel.sent - funnel.delivered),
    opened: channel === "email" ? funnel.opened : undefined,
    clicked: funnel.clicked,
  }

  const failureReasons =
    channel === "sms"
      ? [
          { reason: "Handset unreachable", count: Math.round(reportFunnel.bounced * 0.62) },
          { reason: "Invalid number", count: Math.round(reportFunnel.bounced * 0.22) },
          { reason: "Rejected by operator (spam filter)", count: Math.round(reportFunnel.bounced * 0.11) },
          { reason: "Other technical failure", count: Math.max(0, reportFunnel.bounced - Math.round(reportFunnel.bounced * 0.95)) },
        ]
      : [
          { reason: "Hard bounce (invalid mailbox)", count: Math.round(reportFunnel.bounced * 0.58) },
          { reason: "Soft bounce (deferred)", count: Math.round(reportFunnel.bounced * 0.27) },
          { reason: "Blocked by recipient policy", count: Math.round(reportFunnel.bounced * 0.11) },
          { reason: "Other", count: Math.max(0, reportFunnel.bounced - Math.round(reportFunnel.bounced * 0.96)) },
        ]

  const conversions = deriveConversionRows(funnel, events, rand)
  const totalRecoveredAED = conversions.reduce((sum, c) => sum + c.recoveredAED, 0)

  const variations = deriveVariationBreakdown(message, funnel, totalRecoveredAED, rand)
  const segments = deriveSegmentBreakdown(message, funnel, totalRecoveredAED, rand)
  const lendersBreakdown = deriveLenderBreakdown(message, funnel, totalRecoveredAED, rand)

  const series = deriveSeries(message, funnel, totalRecoveredAED, rand)

  const smsCost =
    channel === "sms" && message.subject
      ? computeSmsCost(message.subject, funnel.sent)
      : undefined

  const sampleBorrowers = deriveSampleBorrowers(message, conversions, rand)

  return {
    id: message.id,
    campaignName: message.campaignName,
    channel,
    sentAt: message.sentAt ?? message.createdAt,
    lenderId: message.lenderId,
    lenderName: lenderName(message.lenderId),
    audience: message.audience,
    recipients: message.recipients,
    funnel: reportFunnel,
    linkClicks: message.linkClicks ?? [],
    failureReasons,
    optOuts: Math.round(funnel.sent * (0.005 + rand() * 0.015)),
    spamComplaints:
      channel === "email"
        ? Math.round(funnel.sent * (0.0005 + rand() * 0.0015))
        : 0,
    breakdown: { variations, segments, lenders: lendersBreakdown },
    series,
    conversions,
    smsCost,
    sampleBorrowers,
  }
}

/** Aggregate rollups across all sent email/sms messages in the seeded list. */
export function listCampaignReports(
  channel: ReportChannel,
  events: ConversionEventDefinition[],
): CampaignReport[] {
  return messagesList
    .filter((m) => m.channel === channel && m.status === "sent" && m.funnel)
    .map((m) => buildCampaignReport(m.id, events))
    .filter((r): r is CampaignReport => r !== null)
}

/** Top-level rollup used by the Reports overview KPI cards. */
export interface ReportsOverview {
  channel: ReportChannel
  campaignCount: number
  recipients: number
  delivered: number
  clicked: number
  opened?: number
  conversions: number
  recoveredAED: number
  optOuts: number
}

export function buildOverview(
  channel: ReportChannel,
  events: ConversionEventDefinition[],
): ReportsOverview {
  const reports = listCampaignReports(channel, events)
  const acc: ReportsOverview = {
    channel,
    campaignCount: reports.length,
    recipients: 0,
    delivered: 0,
    clicked: 0,
    opened: channel === "email" ? 0 : undefined,
    conversions: 0,
    recoveredAED: 0,
    optOuts: 0,
  }
  for (const r of reports) {
    acc.recipients += r.recipients
    acc.delivered += r.funnel.delivered
    acc.clicked += r.funnel.clicked
    if (channel === "email") acc.opened! += r.funnel.opened ?? 0
    acc.optOuts += r.optOuts
    for (const c of r.conversions) {
      acc.conversions += c.fired
      acc.recoveredAED += c.recoveredAED
    }
  }
  return acc
}

/* ─────────── Helpers ─────────── */

function deriveConversionRows(
  funnel: MessageFunnel,
  events: ConversionEventDefinition[],
  rand: () => number,
): CampaignConversionRow[] {
  const enabled = events.filter((e) => e.enabled)
  // Clicks are the pool from which conversions are drawn — clicked users
  // are the ones with intent to convert, and un-clicked users only rarely
  // convert against the same touch.
  const conversionPool = funnel.clicked
  return enabled.map((event) => {
    const rate =
      event.id === "paid" ? 0.32
        : event.id === "ptp_created" ? 0.24
        : event.id === "ptp_kept" ? 0.16
        : event.id === "partial_payment" ? 0.08
        : event.id === "settlement_accepted" ? 0.05
        : 0.42 // rpc
    const jitter = (rand() - 0.5) * 0.15
    const fired = Math.max(0, Math.round(conversionPool * (rate + jitter)))
    const avgAmount = event.id === "settlement_accepted" ? 8200
      : event.id === "ptp_kept" ? 4600
      : event.id === "ptp_created" ? 3400
      : event.id === "partial_payment" ? 1200
      : event.id === "paid" ? 3800
      : 0
    const recoveredAED = event.monetary ? Math.round(fired * avgAmount) : 0
    return {
      eventId: event.id,
      eventLabel: event.label,
      monetary: event.monetary,
      fired,
      recoveredAED,
    }
  })
}

function deriveVariationBreakdown(
  message: MessageListItem,
  funnel: MessageFunnel,
  totalRecoveredAED: number,
  rand: () => number,
): BreakdownRow[] {
  if (!message.variations || message.variations.length === 0) {
    return [
      {
        id: message.id,
        label: "Single (no variations)",
        recipients: message.recipients,
        delivered: funnel.delivered,
        clicked: funnel.clicked,
        conversions: Math.round(funnel.clicked * 0.32),
        recoveredAED: totalRecoveredAED,
        deliveredRate: funnel.delivered / Math.max(1, funnel.sent),
        clickedRate: funnel.clicked / Math.max(1, funnel.delivered),
        conversionRate: Math.round(funnel.clicked * 0.32) / Math.max(1, funnel.clicked),
      },
    ]
  }
  const rows: BreakdownRow[] = []
  let remainingAED = totalRecoveredAED
  message.variations.forEach((v, i) => {
    const share = i === message.variations!.length - 1 ? remainingAED : Math.round(totalRecoveredAED * (v.splitPct / 100) * (0.85 + rand() * 0.3))
    remainingAED -= share
    const conversions = Math.round(v.funnel.clicked * (0.28 + rand() * 0.15))
    rows.push({
      id: v.id,
      label: `Variation ${v.label}`,
      recipients: v.recipients,
      delivered: v.funnel.delivered,
      clicked: v.funnel.clicked,
      conversions,
      recoveredAED: Math.max(0, share),
      deliveredRate: v.funnel.delivered / Math.max(1, v.funnel.sent),
      clickedRate: v.funnel.clicked / Math.max(1, v.funnel.delivered),
      conversionRate: conversions / Math.max(1, v.funnel.clicked),
    })
  })
  return rows
}

function deriveSegmentBreakdown(
  message: MessageListItem,
  funnel: MessageFunnel,
  totalRecoveredAED: number,
  rand: () => number,
): BreakdownRow[] {
  const segments = [
    { id: "0-30", label: "0–30 DPD", weight: 0.35 },
    { id: "31-60", label: "31–60 DPD", weight: 0.28 },
    { id: "61-90", label: "61–90 DPD", weight: 0.2 },
    { id: "91-180", label: "91–180 DPD", weight: 0.12 },
    { id: "180+", label: "180+ DPD", weight: 0.05 },
  ]
  return segments.map((s) => {
    const jitter = (rand() - 0.5) * 0.1
    const recipients = Math.round(message.recipients * (s.weight + jitter))
    const delivered = Math.round(funnel.delivered * (s.weight + jitter))
    const clicked = Math.round(funnel.clicked * (s.weight + jitter))
    const conversions = Math.round(clicked * (0.35 - segments.indexOf(s) * 0.04))
    return {
      id: s.id,
      label: s.label,
      recipients: Math.max(0, recipients),
      delivered: Math.max(0, delivered),
      clicked: Math.max(0, clicked),
      conversions,
      recoveredAED: Math.round(totalRecoveredAED * (s.weight + jitter)),
      deliveredRate: delivered / Math.max(1, recipients),
      clickedRate: clicked / Math.max(1, delivered),
      conversionRate: conversions / Math.max(1, clicked),
    }
  })
}

function deriveLenderBreakdown(
  message: MessageListItem,
  funnel: MessageFunnel,
  totalRecoveredAED: number,
  _rand: () => number,
): BreakdownRow[] {
  // For prototype: the campaign is scoped to one lender in the seed, so the
  // lender breakdown is a single row.
  return [
    {
      id: message.lenderId,
      label: lenderName(message.lenderId),
      recipients: message.recipients,
      delivered: funnel.delivered,
      clicked: funnel.clicked,
      conversions: Math.round(funnel.clicked * 0.32),
      recoveredAED: totalRecoveredAED,
      deliveredRate: funnel.delivered / Math.max(1, funnel.sent),
      clickedRate: funnel.clicked / Math.max(1, funnel.delivered),
      conversionRate: Math.round(funnel.clicked * 0.32) / Math.max(1, funnel.clicked),
    },
  ]
}

function deriveSeries(
  message: MessageListItem,
  funnel: MessageFunnel,
  totalRecoveredAED: number,
  rand: () => number,
): CampaignReport["series"] {
  const anchor = new Date(message.sentAt ?? message.createdAt).getTime()
  const days = 14
  const out: CampaignReport["series"] = []
  // First-day spike, then decaying tail.
  let sentSoFar = 0
  let deliveredSoFar = 0
  let convSoFar = 0
  let recovSoFar = 0
  for (let i = 0; i < days; i++) {
    const t = new Date(anchor + i * ONE_DAY)
    const dayFraction = i === 0 ? 0.42 : i === 1 ? 0.22 : Math.pow(0.72, i - 1) * 0.16 * (0.9 + rand() * 0.2)
    const sent = i === 0 ? Math.round(funnel.sent * dayFraction) : Math.round(funnel.sent * dayFraction * 0.3)
    const delivered = Math.round(sent * (funnel.delivered / Math.max(1, funnel.sent)))
    const conversions = Math.round(delivered * 0.05 * (0.9 + rand() * 0.4))
    const recoveredAED = Math.round(totalRecoveredAED * dayFraction * 0.4)
    sentSoFar += sent
    deliveredSoFar += delivered
    convSoFar += conversions
    recovSoFar += recoveredAED
    out.push({
      date: t.toISOString().slice(0, 10),
      sent,
      delivered,
      conversions,
      recoveredAED,
    })
  }
  return out
}

function computeSmsCost(sampleBody: string, recipients: number): SmsCostBreakdown {
  const seg = segmentSms(sampleBody)
  const segmentsPerRecipient = Math.max(1, seg.segments)
  const totalSegments = segmentsPerRecipient * recipients
  return {
    encoding: seg.encoding,
    segmentsPerRecipient,
    totalSegments,
    perSegmentCostAED: SMS_PER_SEGMENT_AED,
    estimatedCostAED: Math.round(totalSegments * SMS_PER_SEGMENT_AED * 100) / 100,
  }
}

function deriveSampleBorrowers(
  message: MessageListItem,
  conversions: CampaignConversionRow[],
  rand: () => number,
): BorrowerConversionRow[] {
  const out: BorrowerConversionRow[] = []
  const anchor = new Date(message.sentAt ?? message.createdAt).getTime()
  const monetaryConversions = conversions.filter((c) => c.monetary && c.fired > 0)
  if (monetaryConversions.length === 0) return out
  const take = Math.min(borrowers.length, 12)
  for (let i = 0; i < take; i++) {
    const b = borrowers[i]
    // Deterministically assign each borrower to one conversion event, weighted
    // by how many fired.
    const event = monetaryConversions[Math.floor(rand() * monetaryConversions.length)]
    const amount = event.fired === 0
      ? 0
      : Math.round((event.recoveredAED / event.fired) * (0.6 + rand() * 0.9))
    if (amount === 0) continue
    out.push({
      borrowerId: b.id,
      borrowerName: b.name,
      eventId: event.eventId,
      eventLabel: event.eventLabel,
      amountAED: amount,
      attributedToMessageId: message.id,
      firedAt: new Date(anchor + Math.floor(rand() * 6 * ONE_DAY)).toISOString(),
    })
  }
  return out
}
