/**
 * Message snapshots — the *sent* resolved instance of a message for one
 * borrower.
 *
 * Every export MUST come from a snapshot, never from the live template — the
 * template can change after send, but the snapshot is what actually reached
 * the borrower. Snapshots freeze at send-time: variables filled, variation
 * chosen, language selected, sender profile applied, delivery status recorded.
 *
 * In production this is a persistent store. In this prototype we generate
 * snapshots on demand from a MessageListItem + the borrowers dataset, keyed by
 * message id, so results are deterministic and match the message's recipient
 * count.
 */

import { borrowers, type Borrower } from "./borrowers"
import { lenders } from "./lenders"
import {
  getMessageById,
  type MessageListItem,
  type MessageChannel,
} from "./messages"

export type DeliveryStatus = "delivered" | "bounced" | "pending" | "failed"

export interface MessageSnapshot {
  id: string
  messageId: string

  /** Borrower identifiers as they existed at send-time. */
  borrowerId: string
  borrowerName: string
  borrowerCustomerId: string
  borrowerAccountNumber: string

  /** Lender partitioning — used to enforce "no bank sees another bank's data". */
  lenderId: string
  lenderName: string

  /** Delivery + engagement */
  sentAt: string
  deliveredAt?: string
  openedAt?: string
  clickedAt?: string
  paidAt?: string
  deliveryStatus: DeliveryStatus

  /** Content as sent (variables resolved for this borrower) */
  channel: MessageChannel
  variationLabel?: string
  language: "en" | "ar" | "bilingual"
  senderFromName: string
  senderFromEmail?: string
  replyTo?: string
  espRoute?: string
  subject: string
  preheader?: string
  /** The rendered HTML body actually sent to this borrower. Merge tags resolved.
   *  The tracking pixel is *stripped* before this string is stored for export. */
  bodyHtml: string
  /** Plain-text body for SMS/WhatsApp and as an XML fallback for email. */
  bodyText: string
  campaignName: string
}

/* ─────────────── Utilities ─────────────── */

/** Best-effort DPD extraction from a "31-60" / "0-30" / "180+" bucket label. */
function parseDpd(bucket: string): number {
  const m = bucket.match(/(\d+)/)
  return m ? Number(m[1]) : 15
}


/** Simple deterministic PRNG so snapshots are stable across renders. */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function resolveVariables(text: string, b: Borrower): string {
  const amount = new Intl.NumberFormat("en-AE").format(b.outstanding)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() - Math.max(1, parseDpd(b.dpdBucket)))
  const dueStr = dueDate.toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return text
    .replace(/\{\{borrower_name\}\}/g, b.name)
    .replace(/\{\{first_name\}\}/g, b.name.split(" ")[0])
    .replace(/\{\{last_name\}\}/g, b.name.split(" ").slice(-1).join(" "))
    .replace(/\{\{amount_due\}\}/g, amount)
    .replace(/\{\{account_number\}\}/g, `ACC-${b.id.slice(-4).toUpperCase()}-${b.emiratesId.slice(-4)}`)
    .replace(/\{\{due_date\}\}/g, dueStr)
    .replace(/\{\{payment_link\}\}/g, `https://pay.cleargrid.co/r/${b.id}`)
    .replace(/\{\{settlement_amount\}\}/g, new Intl.NumberFormat("en-AE").format(
      Math.round(b.outstanding * 0.7),
    ))
    .replace(/\{\{discount_percent\}\}/g, "30")
    .replace(/\{\{settlement_expiry\}\}/g, dueStr)
    .replace(/\{\{lender_name\}\}/g, "your bank")
}

/** Strip common open-tracking pixel patterns from the body before export. */
export function stripTrackingPixel(html: string): string {
  return html
    .replace(/<img[^>]+open-track[^>]*\/?>/gi, "")
    .replace(/<img[^>]+tracking[^>]*\/?>/gi, "")
    .replace(/<img[^>]+width=["']?1["']?[^>]+height=["']?1["']?[^>]*\/?>/gi, "")
}

/* ─────────────── Snapshot resolver ─────────────── */

/**
 * Deterministically build the snapshot list for a message. Uses `recipients`
 * as the target count, capped to keep the demo responsive.
 */
export function getSnapshotsForMessage(
  messageId: string,
  opts: { limit?: number } = {},
): MessageSnapshot[] {
  const msg = getMessageById(messageId)
  if (!msg) return []

  const cap = opts.limit ?? Math.min(msg.recipients, 200)
  const seed = xmur3(messageId)

  // Deterministic borrower sampling.
  const pool = [...borrowers]
  const picks: Borrower[] = []
  for (let i = 0; i < cap; i++) {
    const idx = seed() % pool.length
    picks.push(pool[idx])
  }

  return picks.map((b, i) => buildSnapshot(msg, b, i, cap, seed))
}

function buildSnapshot(
  msg: MessageListItem,
  b: Borrower,
  idx: number,
  total: number,
  seed: () => number,
): MessageSnapshot {
  const lender = lenders.find((l) => l.id === msg.lenderId)
  const funnelSent = msg.funnel?.sent ?? total
  const funnelDelivered = msg.funnel?.delivered ?? Math.round(total * 0.98)
  const funnelOpened = msg.funnel?.opened ?? Math.round(total * 0.4)
  const funnelClicked = msg.funnel?.clicked ?? Math.round(total * 0.12)
  const goalCount = msg.funnel?.goal.count ?? Math.round(total * 0.05)

  // Deterministic delivery status distribution matching the funnel counts.
  let status: DeliveryStatus = "delivered"
  if (idx >= funnelDelivered) {
    status = idx < funnelSent ? "bounced" : "pending"
  }
  if (msg.status === "failed" && idx % 3 === 0) status = "failed"

  const opened = status === "delivered" && idx < funnelOpened
  const clicked = opened && idx < funnelClicked
  const paid = clicked && idx < goalCount

  const sentAt = msg.sentAt ?? new Date().toISOString()
  const sentAtDate = new Date(sentAt)
  const iso = (offsetMin: number) =>
    new Date(sentAtDate.getTime() + offsetMin * 60_000).toISOString()

  const rawSubject = msg.subject
  const subjectResolved = resolveVariables(rawSubject, b)
  const bodyRaw = msg.subject.includes("SMS") || msg.channel === "sms"
    ? msg.subject // for SMS/whatsapp, the "body" in this prototype is the subject text
    : buildEmailBodyForSnapshot(msg, b)
  const bodyText = htmlToText(bodyRaw)

  return {
    id: `snap-${msg.id}-${b.id}-${idx}`,
    messageId: msg.id,
    borrowerId: b.id,
    borrowerName: b.name,
    borrowerCustomerId: b.emiratesId,
    borrowerAccountNumber: `ACC-${b.id.slice(-4).toUpperCase()}-${b.emiratesId.slice(-4)}`,
    lenderId: msg.lenderId,
    lenderName: lender?.name ?? "General",
    sentAt,
    deliveredAt: status === "delivered" ? iso(seed() % 6) : undefined,
    openedAt: opened ? iso((seed() % 240) + 10) : undefined,
    clickedAt: clicked ? iso((seed() % 240) + 30) : undefined,
    paidAt: paid ? iso((seed() % 1440) + 60) : undefined,
    deliveryStatus: status,
    channel: msg.channel,
    variationLabel: undefined, // A/B variation label — could carry through when set at send time
    language: /[؀-ۿ]/.test(bodyRaw) ? "ar" : "en",
    senderFromName: msg.fromName ?? "ClearGrid Collections",
    senderFromEmail: msg.fromAddress,
    replyTo: msg.fromAddress ? msg.fromAddress.replace(/^(collections|care)@/, "reply@") : undefined,
    espRoute: "Infobip · UAE",
    subject: subjectResolved,
    preheader: undefined,
    bodyHtml: stripTrackingPixel(bodyRaw),
    bodyText,
    campaignName: msg.campaignName,
  }
}

function buildEmailBodyForSnapshot(msg: MessageListItem, b: Borrower): string {
  // Simulate a "resolved" body — in a real system this is the exact HTML
  // the ESP delivered. Here we synthesize a plausible email from the message's
  // subject + funnel goal + borrower context.
  const amount = new Intl.NumberFormat("en-AE").format(b.outstanding)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() - Math.max(1, parseDpd(b.dpdBucket)))
  const dueStr = dueDate.toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const isSettlement = /settle/i.test(msg.subject) || msg.funnel?.goal.key === "settled"
  const isFinal = /final/i.test(msg.subject)
  const isHardship = /hardship|help/i.test(msg.subject) || msg.funnel?.goal.key === "rpc"
  const primary = "#10B981"

  const opener = isFinal
    ? "Dear Mr./Ms."
    : msg.lenderId === "lnd-tamara"
      ? "Hey"
      : "Dear"

  const body = isFinal
    ? `This is a formal notice regarding your outstanding balance of AED ${amount}, due since ${dueStr}. Please settle within 7 calendar days to avoid escalation.`
    : isSettlement
      ? `We are offering you a one-time settlement to close out your account. Accept below to settle for AED ${new Intl.NumberFormat("en-AE").format(Math.round(b.outstanding * 0.7))}.`
      : isHardship
        ? `We understand things don't always go to plan. If you are facing financial difficulty, our care team can walk you through your options privately.`
        : `This is a reminder that your installment of AED ${amount} was due on ${dueStr}. To avoid additional charges, please settle at your earliest convenience.`

  const cta = isSettlement
    ? "Accept Settlement"
    : isHardship
      ? "Talk to a person"
      : "Make Payment"

  return `<div style="font-family:Inter,Arial,sans-serif;color:#0F172A;">
  <div style="background:${primary};padding:16px 24px;color:#FFFFFF;font-weight:700;font-size:16px;">${msg.fromName ?? "ClearGrid"}</div>
  <div style="padding:24px;background:#FFFFFF;">
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0F172A;">${msg.subject}</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${opener} ${b.name},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${body}</p>
    <div style="text-align:center;margin:20px 0;">
      <a href="https://pay.cleargrid.co/r/${b.id}" style="display:inline-block;padding:12px 28px;background:${primary};color:#FFFFFF;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${cta}</a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#475569;">If you have already made this payment, please disregard this notice.</p>
  </div>
  <div style="padding:12px 24px;background:#F8FAFC;color:#475569;font-size:11px;line-height:1.5;">
    Account: ${`ACC-${b.id.slice(-4).toUpperCase()}-${b.emiratesId.slice(-4)}`} · Customer: ${b.emiratesId}<br/>
    ${lenders.find((l) => l.id === msg.lenderId)?.name ?? "ClearGrid Collections"} · Regulated by the Central Bank of the UAE.
  </div>
</div>`
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim()
}

/** Get one snapshot by (messageId, borrowerId) — used by the single-borrower
 *  export UI and by unit-style lookups. */
export function getSnapshotFor(
  messageId: string,
  borrowerId: string,
): MessageSnapshot | undefined {
  return getSnapshotsForMessage(messageId, { limit: 200 }).find(
    (s) => s.borrowerId === borrowerId,
  )
}
