/**
 * Message-level analytics mock layer for Send Email and Send SMS nodes.
 *
 * Builds deterministic, filter-aware mock metrics on top of the existing
 * `borrower-traces` / `journey-runs` / `journey-analytics` spine. Every
 * number is derived from a seeded hash of (journeyId, nodeId, filter
 * shape) so the UI stays stable between renders.
 *
 * TODO (backend contract): replace this module with network calls when
 * the analytics API is ready. The shapes below map 1:1 to the planned
 * endpoint, and the metric ids come from `journey-metrics.ts` so labels
 * and tooltips stay consistent wherever the data is rendered.
 */

import { classifyNode, type NodeKind } from "./journey-analytics"
import type { CtaType, NotSentReason } from "./journey-metrics"
import { guessCtaType } from "./journey-metrics"
import type { AnalyticsFilters } from "@/components/journeys/analytics-filter-bar"
import { listBorrowersInJourney } from "./borrower-traces"

/* ─────────── Deterministic seeding ─────────── */

function hash(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function seeded(seed: number): () => number {
  let s = seed || 1
  return () => {
    s = Math.imul(1664525, s) + 1013904223
    s = (s + 0x9e3779b9) >>> 0
    return ((s >>> 8) & 0xffffff) / 0xffffff
  }
}

function filterSeed(f: AnalyticsFilters): string {
  return [
    f.dateStart ?? "",
    f.dateEnd ?? "",
    f.submissionStart ?? "",
    f.submissionEnd ?? "",
    f.dpdBuckets.join(","),
    f.nationalities.join(","),
    f.lenderIds.join(","),
    f.reachableBuckets.join(","),
  ].join("|")
}

/* ─────────── Shapes ─────────── */

export interface MessageAnalyticsFunnel {
  reached: number
  sent: number
  delivered: number
  uniqueOpens: number
  uniqueClicks: number
  converted: number
  /** Converted ÷ Delivered, memoized. */
  convertedRate: number
}

export interface MessageAnalyticsDelivery {
  sent: number
  delivered: number
  deliveryRate: number
  notSent: Array<{ reason: NotSentReason; count: number; detail?: string }>
  queued: number
  hardBounces: number
  softBouncesRetrying: number
  softBouncesFinal: number
  bounceReasons: Array<{ code: string; count: number }>
  spamRate: number
  optOutRate: number
  invalidEmailsRate: number
  senderBreakdown: Array<{
    senderId: string
    senderLabel: string
    domain: string
    sent: number
    delivered: number
    hardBounces: number
    spamRate: number
    /** 0-100 reputation when known. "Not available yet" if null. */
    domainReputation: number | null
  }>
  recipientDomains: Array<{
    domain: "Gmail" | "Outlook" | "Yahoo" | "iCloud" | "Other"
    delivered: number
    bounced: number
    openRate: number
  }>
}

export interface CtaBreakdownRow {
  linkId: string
  url: string
  cta: CtaType
  clicks: number
  ctr: number
}

export interface MessageAnalyticsEngagement {
  uniqueOpens: number
  openRate: number
  timeToFirstOpenHours: number
  uniqueClicks: number
  ctr: number
  clickToOpenRate: number
  ctaBreakdown: CtaBreakdownRow[]
}

export interface MessageAnalyticsOutcomes {
  callsInitiated: number
  offersAccepted: number
  extension: number
  deferral: number
  ptpCount: number
  ptpAmount: number
  ptpKeptRate: number
  ptpBroken: number
  borrowedAmount: number
  collection: number
  recoveryPct: number
  crPct: number
  emailsPerBorrower: number
  smsPerBorrower: number
}

export interface SmsAnalyticsDelivery
  extends Omit<
    MessageAnalyticsDelivery,
    "senderBreakdown" | "recipientDomains"
  > {
  /** After-send-only breakdowns specific to SMS. */
  awaitingReceipt: number
  undelivered: Array<{ code: string; label: string; count: number }>
  expired: number
  segmentsSent: number
  gsm7: number
  ucs2: number
  estimatedCost: number
  byNumberPosition: Array<{ position: number; sent: number; delivered: number }>
  byCountry: Array<{ country: "UAE" | "KSA"; sent: number; delivered: number }>
  bySenderId: Array<{ senderId: string; sent: number; delivered: number }>
}

export interface EmailAnalytics {
  funnel: MessageAnalyticsFunnel
  delivery: MessageAnalyticsDelivery
  engagement: MessageAnalyticsEngagement
  outcomes: MessageAnalyticsOutcomes
}

export interface SmsAnalytics {
  funnel: Omit<MessageAnalyticsFunnel, "uniqueOpens">
  delivery: SmsAnalyticsDelivery
  engagement: Omit<
    MessageAnalyticsEngagement,
    "uniqueOpens" | "openRate" | "timeToFirstOpenHours" | "clickToOpenRate"
  >
  outcomes: MessageAnalyticsOutcomes
  replies: number
  stopOptOuts: number
}

/* ─────────── Borrower-level status rows ─────────── */

export type EmailStatus =
  | "not_sent"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"

export type SmsStatus =
  | "not_sent"
  | "queued"
  | "sent"
  | "delivered"
  | "awaiting_receipt"
  | "undelivered"
  | "clicked"

export interface BorrowerStatusRow {
  borrowerId: string
  borrowerName: string
  phone: string
  dpdBucket: string
  product: string
  lenderId: string
  nationality: string
  status: EmailStatus | SmsStatus
  reason?: string
  /** Attributed outcome for this send, if any. */
  attributedPTP?: number
  attributedPayment?: number
  timeline: Array<{ at: string; event: string; detail?: string }>
}

/* ─────────── Mock synthesizers ─────────── */

/** The three sender addresses the demo rotation seed uses. Real backend
 *  will return the node's configured rotation list. */
export const DEMO_SENDERS = [
  { id: "snd-collections", label: "collections@mashreq.ae", domain: "mashreq.ae" },
  { id: "snd-notice", label: "notice@mashreq.ae", domain: "mashreq.ae" },
  { id: "snd-support", label: "support@mashreqbank.com", domain: "mashreqbank.com" },
]

function pickReached(journeyId: string, _nodeId: string, rng: () => number): number {
  const borrowers = listBorrowersInJourney(journeyId, 100)
  // Scale per node — biggest sources further up the tree see more borrowers.
  const base = Math.max(50, Math.floor(borrowers.length * 3 * (0.3 + rng() * 0.5)))
  return base + Math.floor(rng() * 30)
}

export function synthesizeEmailAnalytics(
  journeyId: string,
  nodeId: string,
  filters: AnalyticsFilters,
): EmailAnalytics {
  const rng = seeded(hash(`email|${journeyId}|${nodeId}|${filterSeed(filters)}`))
  const reached = pickReached(journeyId, nodeId, rng)
  const notSentCount = Math.floor(reached * (0.04 + rng() * 0.05))
  const queued = Math.floor(reached * (0.01 + rng() * 0.02))
  const sent = reached - notSentCount - queued
  const hardBounces = Math.floor(sent * (0.01 + rng() * 0.015))
  const softFinal = Math.floor(sent * (0.005 + rng() * 0.01))
  const softRetrying = Math.floor(sent * (0.003 + rng() * 0.007))
  const delivered = sent - hardBounces - softFinal
  const uniqueOpens = Math.floor(delivered * (0.32 + rng() * 0.22))
  const uniqueClicks = Math.floor(uniqueOpens * (0.14 + rng() * 0.18))
  const ptpCount = Math.floor(delivered * (0.03 + rng() * 0.04))
  const paidCount = Math.floor(delivered * (0.015 + rng() * 0.02))
  const converted = ptpCount + paidCount
  const borrowedAmount = Math.round(delivered * (6000 + rng() * 4000))
  const collection = Math.round(delivered * (180 + rng() * 240))
  const ptpAmount = Math.round(ptpCount * (900 + rng() * 1800))

  const notSent: MessageAnalyticsDelivery["notSent"] = (
    [
      { reason: "no_address", count: Math.floor(notSentCount * 0.35) },
      { reason: "invalid_address", count: Math.floor(notSentCount * 0.18) },
      { reason: "dnc_or_opted_out", count: Math.floor(notSentCount * 0.15) },
      { reason: "blocked_prior_bounce", count: Math.floor(notSentCount * 0.1) },
      { reason: "frequency_cap", count: Math.floor(notSentCount * 0.12) },
      {
        reason: "personalization_failure",
        count: Math.floor(notSentCount * 0.1),
        detail: "{{borrower.first_name}} missing",
      },
    ] as const
  ).filter((r) => r.count > 0)

  const senderBreakdown: MessageAnalyticsDelivery["senderBreakdown"] =
    DEMO_SENDERS.map((s, i) => {
      const share = i === 0 ? 0.55 : i === 1 ? 0.3 : 0.15
      const senderSent = Math.floor(sent * share)
      const senderHard = Math.floor(hardBounces * share)
      return {
        senderId: s.id,
        senderLabel: s.label,
        domain: s.domain,
        sent: senderSent,
        delivered: senderSent - senderHard - Math.floor(softFinal * share),
        hardBounces: senderHard,
        spamRate: 0.001 + rng() * 0.002,
        domainReputation: i === 2 ? null : 82 + Math.floor(rng() * 12),
      }
    })

  const domainShares = { Gmail: 0.4, Outlook: 0.22, Yahoo: 0.11, iCloud: 0.09, Other: 0.18 }
  const recipientDomains: MessageAnalyticsDelivery["recipientDomains"] = (
    Object.keys(domainShares) as Array<keyof typeof domainShares>
  ).map((domain) => {
    const share = domainShares[domain]
    const d = Math.floor(delivered * share)
    const b = Math.floor((hardBounces + softFinal) * share)
    return {
      domain,
      delivered: d,
      bounced: b,
      openRate:
        domain === "Gmail" || domain === "iCloud"
          ? 0.42 + rng() * 0.18
          : 0.28 + rng() * 0.14,
    }
  })

  const ctaBreakdown: CtaBreakdownRow[] = [
    {
      linkId: "l1",
      url: "https://cleargrid.ai/pay",
      cta: guessCtaType("https://cleargrid.ai/pay"),
      clicks: Math.floor(uniqueClicks * 0.55),
      ctr: 0,
    },
    {
      linkId: "l2",
      url: "https://cleargrid.ai/ptp",
      cta: guessCtaType("https://cleargrid.ai/ptp"),
      clicks: Math.floor(uniqueClicks * 0.3),
      ctr: 0,
    },
    {
      linkId: "l3",
      url: "tel:+97144005544",
      cta: guessCtaType("tel:+97144005544"),
      clicks: Math.floor(uniqueClicks * 0.15),
      ctr: 0,
    },
  ].map((r) => ({
    ...r,
    ctr: delivered > 0 ? r.clicks / delivered : 0,
  }))

  return {
    funnel: {
      reached,
      sent,
      delivered,
      uniqueOpens,
      uniqueClicks,
      converted,
      convertedRate: delivered > 0 ? converted / delivered : 0,
    },
    delivery: {
      sent,
      delivered,
      deliveryRate: sent > 0 ? delivered / sent : 0,
      notSent,
      queued,
      hardBounces,
      softBouncesRetrying: softRetrying,
      softBouncesFinal: softFinal,
      bounceReasons: [
        { code: "user_not_found", count: Math.floor(hardBounces * 0.6) },
        { code: "mailbox_full", count: Math.floor(softFinal * 0.5) },
        { code: "greylisted", count: Math.floor(softRetrying * 0.9) },
      ].filter((r) => r.count > 0),
      spamRate: 0.0015 + rng() * 0.0012,
      optOutRate: 0.004 + rng() * 0.004,
      invalidEmailsRate: reached > 0 ? (notSent.find((r) => r.reason === "invalid_address")?.count ?? 0) / reached : 0,
      senderBreakdown,
      recipientDomains,
    },
    engagement: {
      uniqueOpens,
      openRate: delivered > 0 ? uniqueOpens / delivered : 0,
      timeToFirstOpenHours: 1.8 + rng() * 4,
      uniqueClicks,
      ctr: delivered > 0 ? uniqueClicks / delivered : 0,
      clickToOpenRate: uniqueOpens > 0 ? uniqueClicks / uniqueOpens : 0,
      ctaBreakdown,
    },
    outcomes: synthesizeOutcomes({
      rng,
      delivered,
      converted,
      ptpCount,
      ptpAmount,
      borrowedAmount,
      collection,
    }),
  }
}

export function synthesizeSmsAnalytics(
  journeyId: string,
  nodeId: string,
  filters: AnalyticsFilters,
  smsPerSegmentAED = 0.03,
): SmsAnalytics {
  const rng = seeded(hash(`sms|${journeyId}|${nodeId}|${filterSeed(filters)}`))
  const reached = pickReached(journeyId, nodeId, rng)
  const notSentCount = Math.floor(reached * (0.03 + rng() * 0.04))
  const queued = Math.floor(reached * (0.015 + rng() * 0.02))
  const sent = reached - notSentCount - queued
  const awaitingReceipt = Math.floor(sent * (0.02 + rng() * 0.03))
  const undeliveredTotal = Math.floor(sent * (0.03 + rng() * 0.03))
  const expired = Math.floor(sent * (0.005 + rng() * 0.008))
  const delivered = sent - awaitingReceipt - undeliveredTotal - expired
  const uniqueClicks = Math.floor(delivered * (0.07 + rng() * 0.05))
  const ptpCount = Math.floor(delivered * (0.025 + rng() * 0.03))
  const paidCount = Math.floor(delivered * (0.01 + rng() * 0.02))
  const converted = ptpCount + paidCount
  const borrowedAmount = Math.round(delivered * (5500 + rng() * 3500))
  const collection = Math.round(delivered * (160 + rng() * 220))
  const ptpAmount = Math.round(ptpCount * (850 + rng() * 1600))

  const gsm7 = Math.floor(sent * 0.7)
  const ucs2 = sent - gsm7
  const segmentsSent = Math.round(gsm7 * 1.2 + ucs2 * 2.4)

  const notSent: MessageAnalyticsDelivery["notSent"] = (
    [
      { reason: "no_address", count: Math.floor(notSentCount * 0.3), detail: "No phone on file" },
      { reason: "invalid_address", count: Math.floor(notSentCount * 0.18) },
      { reason: "dnc_or_opted_out", count: Math.floor(notSentCount * 0.22), detail: "STOP recorded" },
      { reason: "frequency_cap", count: Math.floor(notSentCount * 0.12) },
      { reason: "personalization_failure", count: Math.floor(notSentCount * 0.08), detail: "{{amount}} missing" },
      { reason: "provider_rejected", count: Math.floor(notSentCount * 0.1), detail: "Sender ID not allowlisted" },
    ] as const
  ).filter((r) => r.count > 0)

  return {
    funnel: {
      reached,
      sent,
      delivered,
      uniqueClicks,
      converted,
      convertedRate: delivered > 0 ? converted / delivered : 0,
    },
    delivery: {
      sent,
      delivered,
      deliveryRate: sent > 0 ? delivered / sent : 0,
      notSent,
      queued,
      hardBounces: 0,
      softBouncesRetrying: 0,
      softBouncesFinal: 0,
      bounceReasons: [],
      spamRate: 0,
      optOutRate: 0.006 + rng() * 0.004,
      invalidEmailsRate: 0,
      awaitingReceipt,
      undelivered: [
        { code: "ABSENT_SUBSCRIBER", label: "Handset off / out of coverage", count: Math.floor(undeliveredTotal * 0.55) },
        { code: "BLOCKED", label: "Blocked by operator", count: Math.floor(undeliveredTotal * 0.25) },
        { code: "INVALID", label: "Invalid number", count: Math.floor(undeliveredTotal * 0.2) },
      ].filter((r) => r.count > 0),
      expired,
      segmentsSent,
      gsm7,
      ucs2,
      estimatedCost: segmentsSent * smsPerSegmentAED,
      byNumberPosition: [
        { position: 1, sent: Math.floor(sent * 0.7), delivered: Math.floor(delivered * 0.74) },
        { position: 2, sent: Math.floor(sent * 0.22), delivered: Math.floor(delivered * 0.2) },
        { position: 3, sent: Math.floor(sent * 0.08), delivered: Math.floor(delivered * 0.06) },
      ],
      byCountry: [
        { country: "UAE", sent: Math.floor(sent * 0.82), delivered: Math.floor(delivered * 0.84) },
        { country: "KSA", sent: Math.floor(sent * 0.18), delivered: Math.floor(delivered * 0.16) },
      ],
      bySenderId: [
        { senderId: "MASHREQ", sent: Math.floor(sent * 0.7), delivered: Math.floor(delivered * 0.72) },
        { senderId: "CG-COL", sent: Math.floor(sent * 0.3), delivered: Math.floor(delivered * 0.28) },
      ],
    },
    engagement: {
      uniqueClicks,
      ctr: delivered > 0 ? uniqueClicks / delivered : 0,
      ctaBreakdown: (
        [
          {
            linkId: "l1",
            url: "https://cg.link/pay",
            cta: "pay" as CtaType,
            clicks: Math.floor(uniqueClicks * 0.6),
            ctr: 0,
          },
          {
            linkId: "l2",
            url: "tel:+97144005544",
            cta: "call" as CtaType,
            clicks: Math.floor(uniqueClicks * 0.4),
            ctr: 0,
          },
        ] satisfies CtaBreakdownRow[]
      ).map((r) => ({
        ...r,
        ctr: delivered > 0 ? r.clicks / delivered : 0,
      })),
    },
    outcomes: synthesizeOutcomes({
      rng,
      delivered,
      converted,
      ptpCount,
      ptpAmount,
      borrowedAmount,
      collection,
    }),
    replies: Math.floor(delivered * (0.02 + rng() * 0.02)),
    stopOptOuts: Math.floor(delivered * (0.004 + rng() * 0.003)),
  }
}

function synthesizeOutcomes({
  rng,
  delivered,
  converted,
  ptpCount,
  ptpAmount,
  borrowedAmount,
  collection,
}: {
  rng: () => number
  delivered: number
  converted: number
  ptpCount: number
  ptpAmount: number
  borrowedAmount: number
  collection: number
}): MessageAnalyticsOutcomes {
  const ptpKept = Math.floor(ptpCount * (0.42 + rng() * 0.2))
  const ptpBroken = ptpCount - ptpKept
  return {
    callsInitiated: Math.floor(delivered * (0.015 + rng() * 0.02)),
    offersAccepted: Math.floor(delivered * (0.005 + rng() * 0.007)),
    extension: Math.floor(delivered * (0.008 + rng() * 0.01)),
    deferral: Math.floor(delivered * (0.004 + rng() * 0.005)),
    ptpCount,
    ptpAmount,
    ptpKeptRate: ptpCount > 0 ? ptpKept / ptpCount : 0,
    ptpBroken,
    borrowedAmount,
    collection,
    recoveryPct: borrowedAmount > 0 ? collection / borrowedAmount : 0,
    crPct: delivered > 0 ? converted / delivered : 0,
    emailsPerBorrower: delivered > 0 ? 1 + rng() * 0.6 : 0,
    smsPerBorrower: delivered > 0 ? 1 + rng() * 0.4 : 0,
  }
}

/* ─────────── Borrower rows ─────────── */

const EMAIL_STATUSES: EmailStatus[] = [
  "not_sent",
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
]

const SMS_STATUSES: SmsStatus[] = [
  "not_sent",
  "queued",
  "sent",
  "delivered",
  "awaiting_receipt",
  "undelivered",
  "clicked",
]

/**
 * Deterministic status row per borrower for the node. Used by the
 * borrower list on the Analytics tab and by the per-borrower timeline.
 */
export function listEmailBorrowerStatuses(
  journeyId: string,
  nodeId: string,
  filters: AnalyticsFilters,
): BorrowerStatusRow[] {
  const enrolled = listBorrowersInJourney(journeyId, 80)
  const rng = seeded(hash(`emailrows|${journeyId}|${nodeId}|${filterSeed(filters)}`))
  return enrolled.map(({ borrower: b }) => {
    const r = rng()
    const status: EmailStatus =
      r < 0.04
        ? "not_sent"
        : r < 0.07
          ? "queued"
          : r < 0.1
            ? "bounced"
            : r < 0.16
              ? "sent"
              : r < 0.36
                ? "delivered"
                : r < 0.78
                  ? "opened"
                  : "clicked"
    return {
      borrowerId: b.id,
      borrowerName: b.name,
      phone: b.phone,
      dpdBucket: b.dpdBucket,
      product: b.product,
      lenderId: inferLenderId(b.product),
      nationality: pickNationality(b.id),
      status,
      reason:
        status === "not_sent"
          ? "No email on file"
          : status === "bounced"
            ? "user_not_found"
            : undefined,
      attributedPTP: status === "clicked" && rng() < 0.3 ? 1200 + Math.floor(rng() * 2400) : undefined,
      attributedPayment: status === "clicked" && rng() < 0.15 ? 600 + Math.floor(rng() * 1800) : undefined,
      timeline: makeTimeline("email", status, rng),
    }
  })
}

export function listSmsBorrowerStatuses(
  journeyId: string,
  nodeId: string,
  filters: AnalyticsFilters,
): BorrowerStatusRow[] {
  const enrolled = listBorrowersInJourney(journeyId, 80)
  const rng = seeded(hash(`smsrows|${journeyId}|${nodeId}|${filterSeed(filters)}`))
  return enrolled.map(({ borrower: b }) => {
    const r = rng()
    const status: SmsStatus =
      r < 0.04
        ? "not_sent"
        : r < 0.08
          ? "queued"
          : r < 0.12
            ? "undelivered"
            : r < 0.18
              ? "awaiting_receipt"
              : r < 0.32
                ? "sent"
                : r < 0.9
                  ? "delivered"
                  : "clicked"
    return {
      borrowerId: b.id,
      borrowerName: b.name,
      phone: b.phone,
      dpdBucket: b.dpdBucket,
      product: b.product,
      lenderId: inferLenderId(b.product),
      nationality: pickNationality(b.id),
      status,
      reason:
        status === "not_sent"
          ? "No phone on file"
          : status === "undelivered"
            ? "ABSENT_SUBSCRIBER"
            : undefined,
      attributedPTP: status === "clicked" && rng() < 0.3 ? 1000 + Math.floor(rng() * 2200) : undefined,
      attributedPayment: status === "clicked" && rng() < 0.15 ? 500 + Math.floor(rng() * 1500) : undefined,
      timeline: makeTimeline("sms", status, rng),
    }
  })
}

function makeTimeline(
  channel: "email" | "sms",
  status: EmailStatus | SmsStatus,
  rng: () => number,
) {
  const now = Date.now()
  const base = now - Math.floor(rng() * 1000 * 60 * 60 * 24 * 3)
  const steps: Array<{ at: string; event: string; detail?: string }> = []
  if (status === "not_sent") {
    steps.push({ at: new Date(base).toISOString(), event: "Skipped", detail: "No address on file" })
    return steps
  }
  if (status === "queued") {
    steps.push({ at: new Date(base).toISOString(), event: "Queued for window" })
    return steps
  }
  steps.push({ at: new Date(base).toISOString(), event: channel === "email" ? "Sent" : "Accepted by provider" })
  if (status === "bounced") {
    steps.push({ at: new Date(base + 30_000).toISOString(), event: "Hard bounce", detail: "user_not_found" })
    return steps
  }
  if (status === "undelivered") {
    steps.push({ at: new Date(base + 60_000).toISOString(), event: "Undelivered", detail: "ABSENT_SUBSCRIBER" })
    return steps
  }
  if (status === "awaiting_receipt") return steps
  steps.push({
    at: new Date(base + 45_000).toISOString(),
    event: "Delivered",
  })
  if (status === "opened" || status === "clicked") {
    steps.push({
      at: new Date(base + 1000 * 60 * 15).toISOString(),
      event: "First open",
    })
  }
  if (status === "clicked") {
    steps.push({
      at: new Date(base + 1000 * 60 * 20).toISOString(),
      event: "Clicked",
      detail: "CTA: Pay",
    })
    if (rng() < 0.25) {
      steps.push({
        at: new Date(base + 1000 * 60 * 60 * 2).toISOString(),
        event: "PTP created",
        detail: `AED ${Math.floor(1000 + rng() * 2000)}`,
      })
    }
  }
  return steps
}

/* ─────────── Helpers ─────────── */

function inferLenderId(product: string): string {
  const p = product.toLowerCase()
  if (p.includes("tamara")) return "tamara"
  if (p.includes("mashreq")) return "mashreq"
  if (p.includes("enbd")) return "enbd"
  if (p.includes("fab")) return "fab"
  if (p.includes("cashnow")) return "cashnow"
  return "mashreq"
}

function pickNationality(borrowerId: string): string {
  const options = ["AE", "IN", "PK", "EG", "PH", "JO"]
  return options[hash(borrowerId) % options.length]
}

export function isMessageEmailNode(kind: NodeKind): boolean {
  return kind === "message_email"
}

export function isMessageSmsNode(kind: NodeKind): boolean {
  return kind === "message_sms"
}

export { classifyNode }

export const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = {
  not_sent: "Not sent",
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  opened: "Opened",
  clicked: "Clicked",
  bounced: "Bounced",
}

export const SMS_STATUS_LABEL: Record<SmsStatus, string> = {
  not_sent: "Not sent",
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  awaiting_receipt: "Awaiting receipt",
  undelivered: "Undelivered",
  clicked: "Clicked",
}

export { EMAIL_STATUSES, SMS_STATUSES }
