/**
 * Journey analytics engine — the aggregation layer behind the /journeys/[id]/
 * report page. Everything the report renders (per-node borrower lists,
 * drop-off, breakdowns, time-to-convert, business impact) is derived here
 * from the existing borrower-trace + campaign-report + journey-settings
 * modules so no new source-of-truth store is introduced.
 *
 * The single input is the journey id + a time range. Everything else is
 * looked up:
 *   - Enrolled borrowers → listBorrowersInJourney (borrower-traces)
 *   - Per-borrower path  → synthesizeTrace          (borrower-traces)
 *   - Conversion roster  → loadConversionEvents     (conversion-events)
 *   - Per-journey overrides → loadJourneySettings   (journey-settings)
 *
 * Values are deterministic per journey — the same journey renders the same
 * numbers across reloads and browsers.
 */

import {
  listBorrowersInJourney,
  synthesizeTrace,
  type BorrowerTrace,
  type TraceHop,
} from "./borrower-traces"
import type { Borrower } from "./borrowers"
import { segmentSms } from "@/lib/sms-encoding"
import type { ConversionEventDefinition } from "./conversion-events"
import {
  DEFAULT_COSTS,
  resolveConversionEvents,
  type BusinessMetricConfig,
  type JourneySettings,
  type ResolvedConversionEvent,
} from "./journey-settings"

/* ─────────── Types ─────────── */

export type NodeBorrowerState = "passed" | "waiting" | "failed" | "skipped" | "in_progress"

export interface NodeBorrowerRow {
  borrower: Borrower
  state: NodeBorrowerState
  /** Timestamp of this borrower's hop at this node, ISO string. */
  at: string
  /** For message nodes — the delivery/open/click chips per event. */
  messageEvents?: string[]
  /** For AI call nodes — the call outcome. */
  callResult?: string
  /** For split/condition nodes — the branch taken. */
  branchLabel?: string
  /** For wait nodes — hours currently waited. */
  waitedHours?: number
  /** For terminal end nodes — the outcome tag. */
  endTag?: string
  /** Convenience — did this borrower convert on their whole journey? */
  converted: boolean
  /** AED recovered by this borrower (across the whole trace, not just here). */
  recoveredAED: number
}

export type NodeKind =
  | "trigger"
  | "message_email"
  | "message_sms"
  | "message_whatsapp"
  | "call"
  | "split"
  | "condition"
  | "wait"
  | "human"
  | "end"
  | "other"

export interface NodeBreakdown {
  /** Total enrolled at this node. */
  total: number
  /** State counts — always populated for every node. */
  states: Record<NodeBorrowerState, number>
  /**
   * Node-type-aware metric strip. Message nodes get delivered/opened/clicked/
   * converted. Call nodes get connected/RPC/PTP captured. Split nodes get
   * the branch distribution. Wait nodes get avg wait + currently-waiting.
   */
  kind: NodeKind
  /** Kind-specific metrics — see `kind` above. */
  metrics: Array<{ label: string; value: number; format: "count" | "percent"; tone?: "primary" | "info" | "warn" | "muted" }>
  /** Branch distribution — only populated for split/condition nodes. */
  branches?: Array<{ label: string; count: number; pct: number }>
  /** Currently-waiting borrower count for wait nodes. */
  waitingCount?: number
  /** Median wait hours so far for wait nodes. */
  medianWaitHours?: number
}

export interface JourneyAggregate {
  /** Sum of all enrolled borrowers matching the range. */
  enrolled: number
  /** How many completed with a positive outcome (converted). */
  converted: number
  /** Exited (either End · Exited or Timed Out). */
  exited: number
  /** Still traversing. */
  active: number
  /** Primary conversion rate — converted / enrolled. */
  conversionRate: number
  /** Uplift vs holdout — pp difference in conversion rate. */
  upliftVsHoldoutPct: number
  /** Aggregate cost + net. */
  cost: {
    smsSegmentsTotal: number
    smsCostAED: number
    aiCallMinutesTotal: number
    aiCallCostAED: number
    totalCostAED: number
  }
  recoveredAED: number
  netAED: number
  /** Median/p90 hours from enrol → first conversion. */
  timeToConvert: { p50Hours: number; p90Hours: number }
  /** Distribution histogram — 6 buckets of hours to convert. */
  timeToConvertDist: Array<{ bucketLabel: string; count: number }>
}

export interface DropOffStage {
  nodeId: string
  label: string
  reached: number
  exited: number
  exitedPct: number
}

export interface AnalyticsBreakdown {
  key: string
  label: string
  enrolled: number
  converted: number
  recoveredAED: number
  conversionRate: number
}

/* ─────────── Deterministic helpers ─────────── */

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

/* ─────────── Node kind classifier ─────────── */

export function classifyNode(rfType: string, blockType?: string, label?: string): NodeKind {
  const t = blockType ?? rfType
  const l = (label ?? "").toLowerCase()
  if (t === "send_email" || l.startsWith("send email")) return "message_email"
  if (t === "send_sms" || l.startsWith("send sms")) return "message_sms"
  if (t === "whatsapp_ott" || t === "send_whatsapp" || l.includes("whatsapp")) return "message_whatsapp"
  if (t === "trigger_ai_call" || t === "ai_call" || l.includes("ai call") || l.includes("start ai call")) return "call"
  if (t === "action_split" || t === "decision_split" || l.includes("split")) return "split"
  if (t === "check_attribute" || t === "condition" || t === "has_done_event" || l.startsWith("check attribute") || l.startsWith("has done")) return "condition"
  if (t === "wait" || t === "wait_time" || t === "wait_until" || l.startsWith("wait")) return "wait"
  if (t === "trigger_human_campaign" || t === "human_campaign" || l.includes("human campaign")) return "human"
  if (t === "end_journey" || t === "end" || l.startsWith("end")) return "end"
  if (t.startsWith("event_trigger") || t.endsWith("_trigger") || l.includes("segment entry") || l.includes("trigger")) return "trigger"
  return "other"
}

/* ─────────── Per-node borrower list ─────────── */

/**
 * Build the borrower list for a single node — every borrower who reached it
 * and their state as of "now". States are inferred from the hop's outcome
 * and, for the current-position hop of active borrowers, marked "in_progress"
 * (or "waiting" on a wait node).
 */
export function buildNodeBorrowerList(
  journeyId: string,
  nodeId: string,
  fallbackLabel?: string,
  fallbackKind?: NodeKind,
): NodeBorrowerRow[] {
  const enrolled = listBorrowersInJourney(journeyId, 400)
  const out: NodeBorrowerRow[] = []
  for (const e of enrolled) {
    const trace = synthesizeTrace(e.borrower.id, journeyId)
    // Exact id match first — matches the seeded template's node ids.
    let hop = trace.hops.find((h) => h.nodeId === nodeId)
    if (!hop && fallbackLabel) {
      // Fallback: match by exact label from the ReactFlow node config.
      const label = fallbackLabel.toLowerCase()
      hop = trace.hops.find((h) => h.label.toLowerCase() === label)
    }
    if (!hop && fallbackKind) {
      // Second fallback: first hop matching the node kind. Approximate — but
      // guarantees the drill-down shows *something* even when the seeded
      // template diverges from the actual flow.
      hop = trace.hops.find((h) => {
        if (fallbackKind === "message_email") return h.outcome.kind === "message" && h.outcome.channel === "email"
        if (fallbackKind === "message_sms") return h.outcome.kind === "message" && h.outcome.channel === "sms"
        if (fallbackKind === "message_whatsapp") return h.outcome.kind === "message" && h.outcome.channel === "whatsapp"
        if (fallbackKind === "call") return h.outcome.kind === "call"
        if (fallbackKind === "wait") return h.outcome.kind === "wait"
        if (fallbackKind === "split" || fallbackKind === "condition") return h.outcome.kind === "branch"
        if (fallbackKind === "human") return h.outcome.kind === "human"
        if (fallbackKind === "end") return h.outcome.kind === "end"
        if (fallbackKind === "trigger") return h.outcome.kind === "trigger"
        return false
      })
    }
    if (!hop) continue
    const row = hopToRow(trace, hop, e.borrower)
    out.push(row)
  }
  return out
}

function hopToRow(trace: BorrowerTrace, hop: TraceHop, borrower: Borrower): NodeBorrowerRow {
  const isCurrent = trace.currentNodeId === hop.nodeId
  const base: NodeBorrowerRow = {
    borrower,
    state: "passed",
    at: hop.at,
    converted: trace.status === "converted",
    recoveredAED: trace.recoveredAED,
  }
  switch (hop.outcome.kind) {
    case "trigger":
      return { ...base, state: "passed" }
    case "message":
      return {
        ...base,
        state:
          hop.outcome.events.includes("bounced")
            ? "failed"
            : isCurrent
              ? "in_progress"
              : "passed",
        messageEvents: hop.outcome.events,
      }
    case "branch":
      return {
        ...base,
        state: isCurrent ? "in_progress" : "passed",
        branchLabel: hop.outcome.label,
      }
    case "wait": {
      const now = new Date("2026-08-02T09:00:00Z").getTime()
      const startedAt = new Date(hop.at).getTime()
      const waited = Math.max(0, (now - startedAt) / 3_600_000)
      return {
        ...base,
        state: isCurrent ? "waiting" : "passed",
        waitedHours: Math.round(waited * 10) / 10,
      }
    }
    case "call":
      return {
        ...base,
        state:
          hop.outcome.result === "no_answer" || hop.outcome.result === "busy"
            ? "failed"
            : isCurrent
              ? "in_progress"
              : "passed",
        callResult: hop.outcome.result,
      }
    case "human":
      return { ...base, state: isCurrent ? "in_progress" : "passed" }
    case "end":
      return { ...base, state: "passed", endTag: hop.outcome.tag }
  }
}

/* ─────────── Per-node breakdown ─────────── */

export function buildNodeBreakdown(
  journeyId: string,
  nodeId: string,
  kind: NodeKind,
  fallbackLabel?: string,
): NodeBreakdown {
  const rows = buildNodeBorrowerList(journeyId, nodeId, fallbackLabel, kind)
  const states: Record<NodeBorrowerState, number> = {
    passed: 0,
    waiting: 0,
    failed: 0,
    skipped: 0,
    in_progress: 0,
  }
  for (const r of rows) states[r.state]++

  const total = rows.length

  const breakdown: NodeBreakdown = {
    total,
    states,
    kind,
    metrics: [],
  }

  switch (kind) {
    case "message_email":
    case "message_sms":
    case "message_whatsapp": {
      const delivered = rows.filter((r) => r.messageEvents?.includes("delivered")).length
      const opened = rows.filter((r) => r.messageEvents?.includes("opened")).length
      const clicked = rows.filter((r) => r.messageEvents?.includes("clicked")).length
      const converted = rows.filter((r) => r.converted).length
      breakdown.metrics = [
        { label: "Delivered", value: delivered, format: "count" },
        ...(kind !== "message_sms"
          ? [{ label: "Opened", value: opened, format: "count" as const, tone: "info" as const }]
          : []),
        { label: "Clicked", value: clicked, format: "count", tone: "primary" },
        { label: "Converted", value: converted, format: "count", tone: "primary" },
      ]
      break
    }
    case "call": {
      const connected = rows.filter((r) => r.callResult === "connected").length
      const ptpCaptured = rows.filter((r) => r.callResult === "ptp_captured").length
      const rpc = connected + ptpCaptured
      const noAnswer = rows.filter((r) => r.callResult === "no_answer" || r.callResult === "busy").length
      breakdown.metrics = [
        { label: "Connected", value: connected, format: "count", tone: "primary" },
        { label: "RPC", value: rpc, format: "count", tone: "info" },
        { label: "PTP captured", value: ptpCaptured, format: "count", tone: "primary" },
        { label: "No answer / busy", value: noAnswer, format: "count", tone: "warn" },
      ]
      break
    }
    case "split":
    case "condition": {
      const branchCounts = new Map<string, number>()
      for (const r of rows) {
        if (!r.branchLabel) continue
        branchCounts.set(r.branchLabel, (branchCounts.get(r.branchLabel) ?? 0) + 1)
      }
      const branches: Array<{ label: string; count: number; pct: number }> = []
      const totalBranches = Array.from(branchCounts.values()).reduce((s, n) => s + n, 0)
      for (const [label, count] of branchCounts) {
        branches.push({
          label,
          count,
          pct: totalBranches === 0 ? 0 : count / totalBranches,
        })
      }
      branches.sort((a, b) => b.count - a.count)
      breakdown.branches = branches
      breakdown.metrics = [{ label: "Total evaluated", value: totalBranches, format: "count" }]
      break
    }
    case "wait": {
      const waiting = rows.filter((r) => r.state === "waiting").length
      const passedThrough = rows.filter((r) => r.state === "passed").length
      const waitedHours = rows.map((r) => r.waitedHours).filter((h): h is number => typeof h === "number")
      waitedHours.sort((a, b) => a - b)
      const median = waitedHours.length > 0 ? waitedHours[Math.floor(waitedHours.length / 2)] : 0
      breakdown.waitingCount = waiting
      breakdown.medianWaitHours = median
      breakdown.metrics = [
        { label: "Currently waiting", value: waiting, format: "count", tone: "info" },
        { label: "Passed through", value: passedThrough, format: "count" },
      ]
      break
    }
    case "end":
      breakdown.metrics = [{ label: "Ended here", value: total, format: "count", tone: "muted" }]
      break
    case "trigger":
      breakdown.metrics = [{ label: "Enrolled here", value: total, format: "count" }]
      break
    default:
      breakdown.metrics = [{ label: "Reached", value: total, format: "count" }]
  }

  return breakdown
}

/* ─────────── Aggregate metrics ─────────── */

const SMS_SEGMENTS_PER_MESSAGE_ESTIMATE = 1.4 // mixed GSM-7 + occasional UCS-2 in seed
const AI_CALL_MINUTES_PER = DEFAULT_COSTS.aiCallAvgMinutes

/**
 * Big aggregate for the top of the report — enrolled, converted, uplift,
 * cost, net, time-to-convert. Reads live counts + business-metrics config
 * so both the report and settings preview stay in sync.
 */
export function buildJourneyAggregate(
  journeyId: string,
  workspaceEvents: ConversionEventDefinition[],
  settings: JourneySettings,
): JourneyAggregate {
  const enrolled = listBorrowersInJourney(journeyId, 400)
  const traces = enrolled.map((e) => synthesizeTrace(e.borrower.id, journeyId))
  const enrolledCount = traces.length

  const convertedCount = traces.filter((t) => t.status === "converted").length
  const exitedCount = traces.filter((t) => t.status === "exited" || t.status === "errored").length
  const activeCount = traces.filter((t) => t.status === "active").length

  const conversionRate = enrolledCount === 0 ? 0 : convertedCount / enrolledCount

  // Uplift vs holdout — assume a 15% holdout with a naïve baseline conversion
  // rate. Deterministic per journey.
  const holdoutSeed = hash(`uplift:${journeyId}`)
  const rand = prng(holdoutSeed)
  const holdoutRate = Math.max(0.02, conversionRate * (0.35 + rand() * 0.4))
  const upliftPct = conversionRate - holdoutRate

  // Costs — count message + call hops across every trace.
  let smsCount = 0
  let callCount = 0
  for (const t of traces) {
    for (const h of t.hops) {
      if (h.outcome.kind === "message" && h.outcome.channel === "sms") smsCount++
      if (h.outcome.kind === "call") callCount++
    }
  }
  const smsSegmentsTotal = Math.round(smsCount * SMS_SEGMENTS_PER_MESSAGE_ESTIMATE)
  const smsCostAED = Math.round(smsSegmentsTotal * settings.costs.smsPerSegmentAED * 100) / 100
  const aiCallMinutesTotal = Math.round(callCount * settings.costs.aiCallAvgMinutes)
  const aiCallCostAED = Math.round(aiCallMinutesTotal * settings.costs.aiCallPerMinuteAED * 100) / 100
  const totalCostAED = Math.round((smsCostAED + aiCallCostAED) * 100) / 100

  const recoveredAED = traces.reduce((s, t) => s + t.recoveredAED, 0)
  const netAED = Math.round((recoveredAED - totalCostAED) * 100) / 100

  // Time-to-convert distribution.
  const now = new Date("2026-08-02T09:00:00Z").getTime()
  const convertHours: number[] = []
  for (const t of traces) {
    if (t.status !== "converted") continue
    const firstConversion = t.conversions[0]
    if (!firstConversion) continue
    const enrolAt = new Date(t.enrolledAt).getTime()
    const convAt = new Date(firstConversion.at).getTime()
    const hrs = Math.max(0, (convAt - enrolAt) / 3_600_000)
    convertHours.push(hrs)
  }
  convertHours.sort((a, b) => a - b)
  const p50 = convertHours.length > 0 ? convertHours[Math.floor(convertHours.length / 2)] : 0
  const p90Idx = Math.min(convertHours.length - 1, Math.floor(convertHours.length * 0.9))
  const p90 = convertHours.length > 0 ? convertHours[p90Idx] : 0

  const buckets: Array<{ bucketLabel: string; count: number }> = [
    { bucketLabel: "<1h", count: 0 },
    { bucketLabel: "1-6h", count: 0 },
    { bucketLabel: "6-24h", count: 0 },
    { bucketLabel: "1-3d", count: 0 },
    { bucketLabel: "3-7d", count: 0 },
    { bucketLabel: "7d+", count: 0 },
  ]
  for (const h of convertHours) {
    if (h < 1) buckets[0].count++
    else if (h < 6) buckets[1].count++
    else if (h < 24) buckets[2].count++
    else if (h < 72) buckets[3].count++
    else if (h < 168) buckets[4].count++
    else buckets[5].count++
  }

  return {
    enrolled: enrolledCount,
    converted: convertedCount,
    exited: exitedCount,
    active: activeCount,
    conversionRate,
    upliftVsHoldoutPct: upliftPct,
    cost: { smsSegmentsTotal, smsCostAED, aiCallMinutesTotal, aiCallCostAED, totalCostAED },
    recoveredAED,
    netAED,
    timeToConvert: { p50Hours: Math.round(p50 * 10) / 10, p90Hours: Math.round(p90 * 10) / 10 },
    timeToConvertDist: buckets,
  }
}

/* ─────────── Drop-off funnel ─────────── */

/**
 * Per-node "reached" + "exited between here and next" — powers the drop-off
 * funnel visualization. Nodes are ordered by the seeded journey template
 * (borrower-traces JOURNEY_TEMPLATES).
 */
export function buildDropOffFunnel(journeyId: string): DropOffStage[] {
  const enrolled = listBorrowersInJourney(journeyId, 400)
  const nodeOrder: string[] = []
  const nodeLabel = new Map<string, string>()
  // Seed the node order from any borrower's trace (they share the template).
  const sampleTrace = enrolled.length > 0 ? synthesizeTrace(enrolled[0].borrower.id, journeyId) : null
  if (!sampleTrace) return []
  for (const hop of sampleTrace.hops) {
    if (!nodeOrder.includes(hop.nodeId)) {
      nodeOrder.push(hop.nodeId)
      nodeLabel.set(hop.nodeId, hop.label)
    }
  }
  // Count reach per node index across all traces.
  const reachCounts = new Array(nodeOrder.length).fill(0)
  for (const e of enrolled) {
    const t = synthesizeTrace(e.borrower.id, journeyId)
    for (let i = 0; i < nodeOrder.length; i++) {
      if (t.hops.some((h) => h.nodeId === nodeOrder[i])) reachCounts[i]++
    }
  }
  const stages: DropOffStage[] = []
  for (let i = 0; i < nodeOrder.length; i++) {
    const reached = reachCounts[i]
    const nextReached = i + 1 < nodeOrder.length ? reachCounts[i + 1] : 0
    const exited = Math.max(0, reached - nextReached)
    const exitedPct = reached === 0 ? 0 : exited / reached
    stages.push({
      nodeId: nodeOrder[i],
      label: nodeLabel.get(nodeOrder[i]) ?? nodeOrder[i],
      reached,
      exited,
      exitedPct,
    })
  }
  return stages
}

/* ─────────── Breakdown by segment / lender / channel ─────────── */

export function buildBreakdowns(
  journeyId: string,
): {
  bySegment: AnalyticsBreakdown[]
  byLender: AnalyticsBreakdown[]
  byChannel: AnalyticsBreakdown[]
} {
  const enrolled = listBorrowersInJourney(journeyId, 400)

  const bySeg = new Map<string, { enrolled: number; converted: number; recoveredAED: number }>()
  const byLen = new Map<string, { enrolled: number; converted: number; recoveredAED: number }>()
  const byCh = new Map<string, { enrolled: number; converted: number; recoveredAED: number }>()

  for (const e of enrolled) {
    const trace = synthesizeTrace(e.borrower.id, journeyId)
    const converted = trace.status === "converted" ? 1 : 0

    // Segment = DPD bucket
    bumpMap(bySeg, e.borrower.dpdBucket, converted, trace.recoveredAED)
    // Lender is inferred from the borrower's product — prototype-only.
    const lender = inferLender(e.borrower.product)
    bumpMap(byLen, lender, converted, trace.recoveredAED)
    // Channel = which message channels were used in the trace.
    const channels = new Set<string>()
    for (const h of trace.hops) if (h.outcome.kind === "message") channels.add(h.outcome.channel)
    if (channels.size === 0) channels.add("no-message")
    for (const c of channels) bumpMap(byCh, c, converted, trace.recoveredAED)
  }

  const toRows = (m: Map<string, { enrolled: number; converted: number; recoveredAED: number }>): AnalyticsBreakdown[] =>
    Array.from(m.entries())
      .map(([key, v]) => ({
        key,
        label: key,
        enrolled: v.enrolled,
        converted: v.converted,
        recoveredAED: v.recoveredAED,
        conversionRate: v.enrolled === 0 ? 0 : v.converted / v.enrolled,
      }))
      .sort((a, b) => b.enrolled - a.enrolled)

  return {
    bySegment: toRows(bySeg),
    byLender: toRows(byLen),
    byChannel: toRows(byCh),
  }
}

function bumpMap(
  m: Map<string, { enrolled: number; converted: number; recoveredAED: number }>,
  key: string,
  converted: number,
  recoveredAED: number,
) {
  const v = m.get(key) ?? { enrolled: 0, converted: 0, recoveredAED: 0 }
  v.enrolled++
  v.converted += converted
  v.recoveredAED += recoveredAED
  m.set(key, v)
}

function inferLender(product: string): string {
  if (product.toLowerCase().includes("bnpl")) return "Tamara"
  if (product.toLowerCase().includes("personal")) return "Mashreq"
  if (product.toLowerCase().includes("card")) return "Emirates NBD"
  return "Other"
}

/* ─────────── Business metric values ─────────── */

/**
 * Resolve a BusinessMetricConfig against the built aggregate + resolved
 * events. Returns the numeric value + a formatted string for display.
 */
export function computeBusinessMetric(
  config: BusinessMetricConfig,
  agg: JourneyAggregate,
  resolvedEvents: ResolvedConversionEvent[],
  perEventFired: Map<string, { fired: number; recoveredAED: number }>,
): { value: number; display: string } {
  let value = 0
  switch (config.source) {
    case "conversions.count":
      value = Array.from(perEventFired.values()).reduce((s, v) => s + v.fired, 0)
      break
    case "conversions.aed":
      value = agg.recoveredAED
      break
    case "conversions.event":
      value = perEventFired.get(config.eventId ?? "")?.fired ?? 0
      break
    case "conversions.event_aed":
      value = perEventFired.get(config.eventId ?? "")?.recoveredAED ?? 0
      break
    case "cost.total_aed":
      value = agg.cost.totalCostAED
      break
    case "cost.per_conversion_aed": {
      const totalConv = Array.from(perEventFired.values()).reduce((s, v) => s + v.fired, 0)
      value = totalConv === 0 ? 0 : agg.cost.totalCostAED / totalConv
      break
    }
    case "impact.net_aed":
      value = agg.netAED
      break
    case "impact.uplift_pct":
      value = agg.upliftVsHoldoutPct * 100
      break
    case "flow.enrolled":
      value = agg.enrolled
      break
    case "flow.active":
      value = agg.active
      break
    case "flow.conversion_rate":
      value = agg.conversionRate * 100
      break
    case "flow.time_to_convert_p50":
      value = agg.timeToConvert.p50Hours
      break
    case "flow.time_to_convert_p90":
      value = agg.timeToConvert.p90Hours
      break
  }

  const display = formatBusinessMetric(value, config.format)
  return { value, display }
}

export function formatBusinessMetric(value: number, format: BusinessMetricConfig["format"]): string {
  switch (format) {
    case "number":
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    case "aed":
      return `AED ${Math.round(value).toLocaleString()}`
    case "percent":
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
    case "duration_hours":
      if (value < 1) return `${Math.round(value * 60)}m`
      if (value < 24) return `${value.toFixed(1)}h`
      return `${(value / 24).toFixed(1)}d`
  }
}

/* ─────────── Per-event fired counts ─────────── */

export function buildPerEventFired(
  journeyId: string,
  workspaceEvents: ConversionEventDefinition[],
  settings: JourneySettings,
): Map<string, { fired: number; recoveredAED: number }> {
  const resolved = resolveConversionEvents(workspaceEvents, settings.conversionOverrides)
  const enrolled = listBorrowersInJourney(journeyId, 400)
  const traces = enrolled.map((e) => synthesizeTrace(e.borrower.id, journeyId))
  const out = new Map<string, { fired: number; recoveredAED: number }>()
  for (const ev of resolved) {
    out.set(ev.id, { fired: 0, recoveredAED: 0 })
  }
  for (const t of traces) {
    for (const c of t.conversions) {
      const bucket = out.get(c.eventId)
      if (!bucket) continue
      bucket.fired++
      bucket.recoveredAED += c.amountAED
    }
  }
  return out
}
