/**
 * Borrower traces — the per-borrower path through a journey.
 *
 * A trace is a chronological list of hops: which node the borrower reached,
 * what happened there (message delivered / opened / clicked / branch taken /
 * wait elapsed / call outcome), when, and the outcome that fed the next hop.
 * Conversion events (feature 3) are attached at the hop where they fired
 * within the attribution window.
 *
 * This is a prototype seed — the shape it produces mirrors what a real
 * timeline API would return. Values are seeded off the `borrowerId + journeyId`
 * pair via a small deterministic PRNG so the same borrower on the same
 * journey renders the same trace across reloads and browsers.
 */

import type { Borrower } from "./borrowers"
import { borrowers } from "./borrowers"
import { journeysList } from "./journeys"

/* ─────────── Types ─────────── */

export type TraceHopKind =
  | "trigger"
  | "message"
  | "wait"
  | "condition"
  | "action_split"
  | "call"
  | "human_campaign"
  | "end"

export type MessageChannel = "email" | "sms" | "whatsapp"

export type MessageEvent = "sent" | "delivered" | "opened" | "clicked" | "replied" | "bounced" | "unsubscribed"
export type CallEvent = "connected" | "no_answer" | "busy" | "voicemail" | "dropped" | "ptp_captured"

export type TraceOutcome =
  /** Message hop — a chronological list of message events (sent → delivered → opened → …). */
  | { kind: "message"; channel: MessageChannel; events: MessageEvent[]; templateName: string; messageId: string; subject?: string }
  /** Condition/split hop — which branch was taken. */
  | { kind: "branch"; label: string }
  /** Wait hop — how long the borrower waited before continuing. */
  | { kind: "wait"; hours: number }
  /** Call hop — connected + outcome. */
  | { kind: "call"; result: CallEvent; duration_s?: number }
  /** Human campaign hop — enrolment status. */
  | { kind: "human"; queue: string; status: "enrolled" | "worked" | "handled_offline" }
  /** Terminal hop — outcome tag applied to end_journey. */
  | { kind: "end"; tag: "Converted" | "Exited" | "Timed Out" | "Errored" }
  /** Trigger hop — the reason the borrower entered. */
  | { kind: "trigger"; reason: string }

/** Conversion event attached to a hop when it fires within attribution. */
export interface TraceConversionEvent {
  eventId: string
  eventLabel: string
  /** ISO timestamp of the conversion event itself (not the hop). */
  at: string
  /** AED amount attributed. Zero for non-monetary events (RPC, dispute). */
  amountAED: number
  /** Which hop this converts against, e.g. "msg-hop-2". */
  attributedToHopId: string
}

export interface TraceHop {
  id: string
  /** Node id in the journey definition. Used to highlight the canvas. */
  nodeId: string
  /** Human-readable step label — usually the node's own label. */
  label: string
  kind: TraceHopKind
  /** ISO timestamp when the hop happened. */
  at: string
  outcome: TraceOutcome
  /** Any conversion events tied to this hop by attribution. */
  conversions?: TraceConversionEvent[]
}

export interface BorrowerTrace {
  borrowerId: string
  journeyId: string
  /** ISO timestamp the borrower entered the journey. */
  enrolledAt: string
  /** Current state of the borrower's traversal. */
  status: "active" | "converted" | "exited" | "errored"
  /** Where the borrower currently sits, if still active — points at a node id. */
  currentNodeId: string | null
  /** Why they exited, when not active. Mirrors End Journey outcome. */
  exitReason?: "Converted" | "Exited" | "Timed Out" | "Errored"
  hops: TraceHop[]
  /** All conversions attributed across the trace, denormalised for quick sums. */
  conversions: TraceConversionEvent[]
  /** Recovered AED — sum of `amountAED` across `conversions`. */
  recoveredAED: number
}

/* ─────────── Seeded PRNG ─────────── */

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

/* ─────────── Node templates per journey ─────────── */

/**
 * Compact node layout per journey — used both to synthesize traces AND to
 * highlight nodes on the canvas. Real journeys pull this from their
 * ReactFlow definition; the prototype ships a per-journey template so the
 * trace UI has stable node ids to point at.
 *
 * The map isn't a full journey — just the linear or branched sequence of
 * nodes the trace hits. Non-hit nodes are inferred to exist but stay dim.
 */
const JOURNEY_TEMPLATES: Record<
  string,
  Array<{ id: string; label: string; kind: TraceHopKind; channel?: MessageChannel; branchOptions?: string[]; template?: string }>
> = {
  "high-dpd": [
    { id: "n-trigger", label: "60 DPD segment entry", kind: "trigger" },
    { id: "n-email-1", label: "Send Email · Payment Reminder", kind: "message", channel: "email", template: "Payment Reminder" },
    { id: "n-wait-1", label: "Wait 2 days", kind: "wait" },
    { id: "n-split-1", label: "Action Path Split · Email", kind: "action_split", branchOptions: ["Opened", "Clicked", "No response"] },
    { id: "n-sms-1", label: "Send SMS · Follow-up", kind: "message", channel: "sms", template: "Follow-up SMS" },
    { id: "n-wait-2", label: "Wait 1 day", kind: "wait" },
    { id: "n-call-1", label: "Trigger AI Call · Recovery", kind: "call" },
    { id: "n-end-conv", label: "End · Converted", kind: "end" },
  ],
  "broken-promise": [
    { id: "n-trigger", label: "Broken PTP attribute change", kind: "trigger" },
    { id: "n-sms-1", label: "Send SMS · Broken PTP reminder", kind: "message", channel: "sms", template: "Broken PTP reminder" },
    { id: "n-wait-1", label: "Wait 6 hours", kind: "wait" },
    { id: "n-call-1", label: "Trigger AI Call · PTP recovery", kind: "call" },
    { id: "n-split-1", label: "Action Path Split · Call", kind: "action_split", branchOptions: ["PTP captured", "No answer", "Failed"] },
    { id: "n-human-1", label: "Enroll in Human Campaign · Escalation", kind: "human_campaign" },
    { id: "n-end", label: "End · Exited", kind: "end" },
  ],
  "new-overdue": [
    { id: "n-trigger", label: "First DPD event", kind: "trigger" },
    { id: "n-email-1", label: "Send Email · Nudge", kind: "message", channel: "email", template: "Early DPD Nudge" },
    { id: "n-wait-1", label: "Wait 1 day", kind: "wait" },
    { id: "n-sms-1", label: "Send SMS · Reminder", kind: "message", channel: "sms", template: "Early Reminder SMS" },
    { id: "n-end", label: "End · Timed Out", kind: "end" },
  ],
  "early-delinquency": [
    { id: "n-trigger", label: "1-15 DPD attribute change", kind: "trigger" },
    { id: "n-wa-1", label: "Send WhatsApp · Reminder", kind: "message", channel: "whatsapp", template: "WA Early Reminder" },
    { id: "n-wait-1", label: "Wait 3 days", kind: "wait" },
    { id: "n-email-1", label: "Send Email · Second Notice", kind: "message", channel: "email", template: "Second Notice" },
    { id: "n-end", label: "End · Converted", kind: "end" },
  ],
  "q1-recovery": [
    { id: "n-trigger", label: "Q1 recovery segment entry", kind: "trigger" },
    { id: "n-email-1", label: "Send Email · Recovery", kind: "message", channel: "email", template: "Recovery" },
    { id: "n-wait-1", label: "Wait 2 days", kind: "wait" },
    { id: "n-sms-1", label: "Send SMS · Push", kind: "message", channel: "sms", template: "Recovery Push" },
    { id: "n-wait-2", label: "Wait 1 day", kind: "wait" },
    { id: "n-call-1", label: "Trigger AI Call · Final", kind: "call" },
    { id: "n-end", label: "End · Converted", kind: "end" },
  ],
  "escalation": [
    { id: "n-trigger", label: "Escalation segment entry", kind: "trigger" },
    { id: "n-human-1", label: "Human Campaign · Escalation queue", kind: "human_campaign" },
    { id: "n-end", label: "End · Exited", kind: "end" },
  ],
}

/* ─────────── Trace synthesis ─────────── */

const NOW = new Date("2026-08-02T09:00:00Z").getTime()
const ONE_DAY = 86_400_000
const ONE_HOUR = 3_600_000

const MESSAGE_EVENT_LADDER: Record<MessageChannel, MessageEvent[]> = {
  email: ["sent", "delivered", "opened", "clicked"],
  sms: ["sent", "delivered", "clicked"],
  whatsapp: ["sent", "delivered", "opened", "clicked"],
}

function ladderUpTo(channel: MessageChannel, rand: () => number): MessageEvent[] {
  const full = MESSAGE_EVENT_LADDER[channel]
  // Deterministic drop-off — 90% deliver, 60% open (email/whatsapp only), 30% click
  const events: MessageEvent[] = ["sent"]
  if (rand() < 0.94) events.push("delivered")
  else {
    events.push("bounced")
    return events
  }
  if (channel !== "sms" && rand() < 0.62) events.push("opened")
  if (rand() < 0.34) events.push("clicked")
  return events
}

export function synthesizeTrace(borrowerId: string, journeyId: string): BorrowerTrace {
  const template = JOURNEY_TEMPLATES[journeyId]
  const borrower = borrowers.find((b) => b.id === borrowerId)
  const seed = hash(`${borrowerId}:${journeyId}`)
  const rand = prng(seed)

  if (!template || !borrower) {
    return {
      borrowerId,
      journeyId,
      enrolledAt: new Date(NOW - 3 * ONE_DAY).toISOString(),
      status: "exited",
      currentNodeId: null,
      hops: [],
      conversions: [],
      recoveredAED: 0,
    }
  }

  // Where along the template does the borrower go? Some borrowers exit early.
  const enrolledAgo = Math.floor(rand() * 7 + 1) * ONE_DAY
  const enrolledAt = new Date(NOW - enrolledAgo)
  let cursor = enrolledAt.getTime()
  const hops: TraceHop[] = []
  const conversions: TraceConversionEvent[] = []

  // Decide how far the borrower gets: 25% early exit, 45% mid-journey (still active),
  // 30% completed. Seeded so it's stable.
  const roll = rand()
  const stopIndex =
    roll < 0.25 ? Math.max(2, Math.floor(rand() * (template.length - 1)))
      : roll < 0.70 ? Math.max(2, Math.floor(rand() * (template.length - 1)))
      : template.length

  let converted = false
  let recoveredAED = 0
  let status: BorrowerTrace["status"] = "active"

  for (let i = 0; i < stopIndex; i++) {
    const step = template[i]
    const hopAt = new Date(cursor)
    const hopId = `hop-${i}`

    let outcome: TraceOutcome
    switch (step.kind) {
      case "trigger":
        outcome = { kind: "trigger", reason: step.label }
        break
      case "message": {
        const channel = step.channel ?? "email"
        const events = ladderUpTo(channel, rand)
        outcome = {
          kind: "message",
          channel,
          events,
          templateName: step.template ?? step.label,
          messageId: `msg-${journeyId}-${borrowerId}-${i}`,
          subject: channel === "email" ? `Reminder — ${step.template ?? step.label}` : undefined,
        }
        // If borrower clicked and we're in the second half of the journey,
        // attribute a Paid conversion.
        if (events.includes("clicked") && i >= 2 && rand() < 0.55) {
          const amount = Math.round((borrower.outstanding * (0.15 + rand() * 0.7)) / 100) * 100
          const conv: TraceConversionEvent = {
            eventId: "paid",
            eventLabel: "Paid",
            at: new Date(cursor + Math.floor(rand() * ONE_HOUR * 6)).toISOString(),
            amountAED: amount,
            attributedToHopId: hopId,
          }
          conversions.push(conv)
          recoveredAED += amount
          converted = true
        }
        break
      }
      case "wait": {
        const hours = step.label.includes("hour") ? Math.floor(rand() * 8) + 3 : Math.floor(rand() * 3 + 1) * 24
        cursor += hours * ONE_HOUR
        outcome = { kind: "wait", hours }
        break
      }
      case "action_split": {
        const choices = step.branchOptions ?? ["Continued", "Exited"]
        const idx = Math.floor(rand() * choices.length)
        outcome = { kind: "branch", label: choices[idx] }
        break
      }
      case "call": {
        const roll2 = rand()
        const result: CallEvent =
          roll2 < 0.35 ? "connected" : roll2 < 0.55 ? "no_answer" : roll2 < 0.75 ? "voicemail" : roll2 < 0.9 ? "busy" : "ptp_captured"
        const duration_s = result === "connected" ? Math.floor(rand() * 240) + 60 : undefined
        outcome = { kind: "call", result, duration_s }
        if (result === "ptp_captured" || (result === "connected" && rand() < 0.4)) {
          const amount = Math.round((borrower.outstanding * (0.2 + rand() * 0.6)) / 100) * 100
          conversions.push({
            eventId: "ptp_created",
            eventLabel: "PTP created",
            at: new Date(cursor + ONE_HOUR).toISOString(),
            amountAED: amount,
            attributedToHopId: hopId,
          })
          recoveredAED += amount
          converted = true
        }
        break
      }
      case "human_campaign":
        outcome = {
          kind: "human",
          queue: "Escalations · Senior Agents",
          status: rand() < 0.5 ? "enrolled" : "worked",
        }
        break
      case "end":
      case "condition":
      default:
        outcome = {
          kind: "end",
          tag: converted ? "Converted" : "Exited",
        }
        status = converted ? "converted" : "exited"
        break
    }

    hops.push({
      id: hopId,
      nodeId: step.id,
      label: step.label,
      kind: step.kind,
      at: hopAt.toISOString(),
      outcome,
      conversions: conversions.filter((c) => c.attributedToHopId === hopId),
    })

    // Advance cursor for non-wait hops (waits already advanced above).
    if (step.kind !== "wait") {
      cursor += Math.floor(rand() * ONE_HOUR * 4) + ONE_HOUR
    }
  }

  // If we didn't reach an End node, the borrower is still active — mark their
  // current node from the last hop.
  const lastHop = hops[hops.length - 1]
  const currentNodeId =
    status === "active" && lastHop && lastHop.kind !== "end" ? lastHop.nodeId : null

  const exitReason: BorrowerTrace["exitReason"] =
    status === "converted" ? "Converted"
      : status === "exited" ? "Exited"
      : status === ("errored" as BorrowerTrace["status"]) ? "Errored"
      : undefined

  return {
    borrowerId,
    journeyId,
    enrolledAt: enrolledAt.toISOString(),
    status,
    currentNodeId,
    exitReason,
    hops,
    conversions,
    recoveredAED,
  }
}

/* ─────────── Convenience lookups ─────────── */

/** Every journey the given borrower is (or was) enrolled in, deterministically
 *  seeded per borrower so each borrower has a small realistic history. */
export function listJourneysForBorrower(borrowerId: string): Array<{
  journeyId: string
  journeyName: string
  enrolledAt: string
  status: BorrowerTrace["status"]
  recoveredAED: number
}> {
  const seed = hash(`journeys:${borrowerId}`)
  const rand = prng(seed)

  // Pick 2-3 journeys per borrower, weighted toward "running" journeys.
  const pool = journeysList.filter((j) => JOURNEY_TEMPLATES[j.id])
  const take = Math.floor(rand() * 2) + 1 + (rand() < 0.5 ? 1 : 0)
  const chosen = new Set<string>()
  while (chosen.size < Math.min(take, pool.length)) {
    const idx = Math.floor(rand() * pool.length)
    chosen.add(pool[idx].id)
  }

  return Array.from(chosen).map((journeyId) => {
    const trace = synthesizeTrace(borrowerId, journeyId)
    const journey = journeysList.find((j) => j.id === journeyId)!
    return {
      journeyId,
      journeyName: journey.name,
      enrolledAt: trace.enrolledAt,
      status: trace.status,
      recoveredAED: trace.recoveredAED,
    }
  })
}

/** Every borrower currently traversing the given journey — used to power
 *  the "Trace a borrower" picker on the journey report page. */
export function listBorrowersInJourney(journeyId: string, limit = 25): Array<{
  borrower: Borrower
  status: BorrowerTrace["status"]
  currentStepLabel: string | null
  enrolledAt: string
  recoveredAED: number
}> {
  if (!JOURNEY_TEMPLATES[journeyId]) return []
  const seed = hash(`enrolled:${journeyId}`)
  const rand = prng(seed)
  const chosen = new Set<number>()
  while (chosen.size < Math.min(limit, borrowers.length)) {
    const idx = Math.floor(rand() * borrowers.length)
    chosen.add(idx)
  }
  return Array.from(chosen).map((idx) => {
    const borrower = borrowers[idx]
    const trace = synthesizeTrace(borrower.id, journeyId)
    const last = trace.hops[trace.hops.length - 1]
    return {
      borrower,
      status: trace.status,
      currentStepLabel: trace.status === "active" ? last?.label ?? null : null,
      enrolledAt: trace.enrolledAt,
      recoveredAED: trace.recoveredAED,
    }
  })
}
