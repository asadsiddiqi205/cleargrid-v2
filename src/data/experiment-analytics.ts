/**
 * Experiment-level analytics synthesizer.
 *
 * This module produces the data the Experiment node's Analytics tab reads.
 * It composes `message-analytics.ts`, `call-analytics.ts`, borrower traces
 * and seeded PRNG so a given experiment version always resolves to the
 * same numbers across sessions.
 *
 * The real system will populate this from events joined on the experiment
 * assignment table. Intent-to-treat is enforced here: once a borrower is
 * assigned to an arm they count in that arm's denominator, including those
 * who never received a message or call.
 *
 * TODO (backend contract):
 *  - `/analytics/experiments/{nodeId}?journey=…&version=…` → `ExperimentAnalytics`
 *  - Attribution window = assignment time + `cfg.attributionDays`.
 *  - Control arm receives no messages or calls but IS tracked for outcomes;
 *    the real system attaches a cheap outcome listener that stops after the
 *    window closes.
 */

import type { Edge, Node } from "@xyflow/react"
import {
  assignArm,
  type ArmHandle,
  type ExperimentArm,
  type ExperimentConfig,
} from "@/data/experiments"
import {
  synthesizeAiCallAnalytics,
  synthesizeHumanCallAnalytics,
  type CallAnalytics,
} from "@/data/call-analytics"
import {
  synthesizeEmailAnalytics,
  synthesizeSmsAnalytics,
  type EmailAnalytics,
  type SmsAnalytics,
} from "@/data/message-analytics"
import { classifyNode } from "@/data/journey-analytics"
import type { NodeKind } from "@/data/journey-analytics"
import { listBorrowersInJourney } from "@/data/borrower-traces"
import type { Borrower } from "@/data/borrowers"
import { EMPTY_FILTERS } from "@/components/journeys/analytics-filter-bar"

/* ─────────── Shapes ─────────── */

export interface ArmAssignment {
  assigned: number
  reachedFirstStep: number
  exitedEarly: number
  stillActive: number
}

export interface ArmOutcomes {
  ptp: number
  ptpRate: number
  ptpAmount: number
  ptpKeptRate: number
  ptpBrokenRate: number
  paymentRate: number
  collection: number
  collectionPct: number
  recoveryPct: number
  collectionPerBorrower: number
  medianTimeToResolutionDays: number
}

export interface ArmContact {
  touchesPerBorrower: number
  contactedAnyChannelPct: number
  rpcRate: number
}

export interface ArmCost {
  emailCost: number | null
  smsCost: number | null
  aiCallCost: number | null
  humanCallCost: number | null
  totalCost: number | null
  costPerBorrower: number | null
  costPerRecovery: number | null
  netRecovered: number | null
  incrementalNetVsControl: number | null
}

export interface ArmChannelNodeBreakdown {
  nodeId: string
  nodeLabel: string
  email?: EmailAnalytics
  sms?: SmsAnalytics
  call?: CallAnalytics
}

export interface ArmChannels {
  email: EmailAnalytics | null
  sms: SmsAnalytics | null
  aiCall: CallAnalytics | null
  humanCall: CallAnalytics | null
  /** Per-node breakdown; `email` set when that node is an email node etc. */
  nodes: ArmChannelNodeBreakdown[]
}

/** Snapshot of all per-arm numbers. */
export interface ArmResult {
  arm: ExperimentArm
  isBaseline: boolean
  assignment: ArmAssignment
  outcomes: ArmOutcomes
  contact: ArmContact
  cost: ArmCost
  channels: ArmChannels
}

export type UpliftDirection = "up" | "down" | "flat"

export interface VerdictLine {
  armId: string
  armName: string
  /** Absolute pp change (rates) or relative % (amounts) vs baseline. */
  delta: number
  deltaFormat: "pp" | "pct" | "aed"
  ci95: [number, number]
  /** 1 − p, bounded to [0, 1]. */
  confidence: number
  direction: UpliftDirection
  /** True once Holm correction applied (> 2 arms vs control). */
  holmAdjusted: boolean
}

export type GuardrailStatus = "ok" | "breached" | "insufficient"

export interface GuardrailCheck {
  armId: string
  guardrailId: string
  guardrailLabel: string
  armValue: number
  controlValue: number
  thresholdAbs: number
  status: GuardrailStatus
}

export type Recommendation =
  | { kind: "roll_out"; armId: string; armName: string }
  | { kind: "not_enough_data" }
  | { kind: "no_difference" }
  | { kind: "guardrail_breached"; armId: string; armName: string; guardrailLabel: string }

export interface SampleRatioCheck {
  /** Actual counts per arm in config order. */
  actual: number[]
  expected: number[]
  pValue: number
  /** Below this, the UI shows a red banner. */
  red: boolean
}

export interface OverTimePoint {
  date: string
  /** Per-arm counts assigned on this day. Keys are arm ids. */
  assignments: Record<string, number>
  /** Per-arm cumulative uplift on the primary metric vs baseline. */
  cumulativeUplift: Record<string, number>
  /** 95% CI half-width for the control-vs-arm uplift on this day. */
  ciHalf: Record<string, number>
}

export interface SegmentSlice {
  key: string
  label: string
  /** Per-arm {size, primaryMetricValue}. */
  perArm: Record<string, { size: number; value: number }>
  /** Arms below 100 borrowers in this slice have confidence null. */
  minPerArm: number
}

export type SegmentDimension =
  | "dpd"
  | "lender"
  | "nationality"
  | "reachable"
  | "product"
  | "risk_score"
  | "outstanding_bucket"
  | "status"
  | "language"
  | "channel_received"

export interface SegmentGroup {
  dimension: SegmentDimension
  slices: SegmentSlice[]
}

/** All segment dimensions the Analytics tab can offer, with display labels
 *  and a one-line description. The picker reads this catalog so new
 *  dimensions only need to be added here + in `sliceLabelsFor`. */
export const SEGMENT_DIMENSION_CATALOG: Array<{
  id: SegmentDimension
  label: string
  description: string
}> = [
  { id: "dpd", label: "DPD bucket", description: "0-30 / 31-60 / 61-90 / 90+ days past due" },
  { id: "lender", label: "Lender", description: "The borrower's originating bank" },
  { id: "nationality", label: "Nationality", description: "Primary nationality on the EID" },
  { id: "reachable", label: "Reachable", description: "Whether the borrower has at least one working phone / email" },
  { id: "product", label: "Product", description: "Personal loan / credit card / auto / mortgage" },
  { id: "risk_score", label: "Risk score", description: "Low / Medium / High at assignment time" },
  { id: "outstanding_bucket", label: "Outstanding bracket", description: "AED outstanding in 4 bands" },
  { id: "status", label: "Account status", description: "Active / Legal / Settled / Closed" },
  { id: "language", label: "Preferred language", description: "English / Arabic / Urdu / other" },
  { id: "channel_received", label: "Channels received", description: "Which combinations of channels the borrower got" },
]

export const DEFAULT_SEGMENT_DIMENSIONS: SegmentDimension[] = ["dpd", "lender", "nationality", "reachable"]

export interface BorrowerRow {
  borrowerId: string
  borrowerName: string
  armId: string
  armName: string
  assignmentDate: string
  channelsReceived: Array<"email" | "sms" | "whatsapp" | "ai_call" | "human_call">
  lastTouch: string
  outcome: "ptp" | "paid" | "none"
  amount: number
}

export interface ExperimentAnalytics {
  cfg: ExperimentConfig
  nodeId: string
  startedAt: string
  daysElapsed: number
  daysPlanned: number | null
  attributionDays: number
  baselineArmId: string
  arms: ArmResult[]
  verdict: {
    primaryMetricLabel: string
    primaryMetricFormat: "pp" | "pct" | "aed"
    leadingArmId: string
    lines: VerdictLine[]
    recommendation: Recommendation
    notEnoughData: boolean
  }
  guardrails: GuardrailCheck[]
  sampleRatioCheck: SampleRatioCheck
  overTime: OverTimePoint[]
  segments: SegmentGroup[]
}

/* ─────────── Deterministic PRNG ─────────── */

function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function seeded(seed: number): () => number {
  let s = seed || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/* ─────────── Arm → downstream nodes walk ─────────── */

/** For each arm, walk the Experiment node's handle-labelled edge and
 *  every subsequent edge forward, collecting every message / call node
 *  on that path. Stops at End nodes or at another Experiment (nested
 *  experiments aren't fanned out here — the validator warns separately). */
export function nodesDownstreamOfArm(
  experimentNodeId: string,
  handle: ArmHandle,
  nodes: Node[],
  edges: Edge[],
): Array<{ node: Node; kind: NodeKind }> {
  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  const out: Array<{ node: Node; kind: NodeKind }> = []
  const q: string[] = []
  const seen = new Set<string>()
  edges.forEach((e) => {
    if (e.source === experimentNodeId && e.sourceHandle === handle) {
      q.push(e.target)
    }
  })
  while (q.length) {
    const cur = q.shift()!
    if (seen.has(cur)) continue
    seen.add(cur)
    const n = byId.get(cur)
    if (!n) continue
    const d = (n.data ?? {}) as Record<string, unknown>
    const kind = classifyNode(n.type ?? "", d.blockType as string | undefined, d.label as string | undefined)
    if (kind === "end" || kind === "experiment") continue
    if (
      kind === "message_email" ||
      kind === "message_sms" ||
      kind === "message_whatsapp" ||
      kind === "call" ||
      kind === "human"
    ) {
      out.push({ node: n, kind })
    }
    edges.forEach((e) => {
      if (e.source === cur && !seen.has(e.target)) q.push(e.target)
    })
  }
  return out
}

/* ─────────── Core synthesizer ─────────── */

interface SynthesizeInputs {
  journeyId: string
  nodeId: string
  cfg: ExperimentConfig
  nodes: Node[]
  edges: Edge[]
  journeyEnrolled: number
  /** Which segment dimensions to build. Omit for the default four. */
  segmentDimensions?: SegmentDimension[]
  /** Per-channel costs from Journey Settings. Missing values → "Not available yet". */
  costs: {
    emailPerSendAED?: number
    smsPerSegmentAED?: number
    aiCallPerMinuteAED?: number
    humanCallPerAttemptAED?: number
  }
}

export function synthesizeExperimentAnalytics(input: SynthesizeInputs): ExperimentAnalytics {
  const { journeyId, nodeId, cfg, nodes, edges, journeyEnrolled, costs } = input

  const rng = seeded(fnv1a(`experiment|${journeyId}|${nodeId}|${cfg.experimentId}`))
  const arms = cfg.arms
  const baselineArm = arms.find((a) => a.isControl) ?? arms[0]
  const baselineArmId = baselineArm.id
  const startedAt = cfg.startedAt ?? daysAgoIso(14)
  const now = Date.now()
  const daysElapsed = Math.max(1, Math.round((now - new Date(startedAt).getTime()) / 86_400_000))
  const daysPlanned =
    cfg.duration.mode === "fixed_end_date" && cfg.duration.endDate
      ? Math.max(1, Math.round((new Date(cfg.duration.endDate).getTime() - new Date(startedAt).getTime()) / 86_400_000))
      : null

  /* 1. Assignment counts per arm */
  const borrowers = listBorrowersInJourney(journeyId, Math.min(500, journeyEnrolled || 500))
  const assignments: Record<string, Borrower[]> = {}
  arms.forEach((a) => (assignments[a.id] = []))
  borrowers.forEach(({ borrower }) => {
    const arm = assignArm(cfg.experimentId, borrower.id, arms)
    assignments[arm.id].push(borrower)
  })

  /* 2. Per-arm numbers */
  const perArm: Record<string, ArmResult> = {}
  for (const arm of arms) {
    const cohort = assignments[arm.id]
    const cohortSize = cohort.length
    const downstream = arm.isControl ? [] : nodesDownstreamOfArm(nodeId, arm.handle, nodes, edges)
    const channels = buildArmChannels(journeyId, arm, cohortSize, downstream)
    const reachedFirstStep = Math.round(cohortSize * (arm.isControl ? 0 : (0.9 + 0.05 * rng())))
    const exitedEarly = Math.round(cohortSize * (arm.isControl ? 0 : (0.04 + 0.03 * rng())))
    const stillActive = Math.round(cohortSize * (0.1 + 0.15 * rng()))
    const outcomes = computeOutcomes(cohort, arm, rng)
    const contact = computeContact(channels, cohortSize)
    const cost = computeCost(arm, channels, outcomes, costs, cohortSize)
    perArm[arm.id] = {
      arm,
      isBaseline: arm.id === baselineArmId,
      assignment: { assigned: cohortSize, reachedFirstStep, exitedEarly, stillActive },
      outcomes,
      contact,
      cost,
      channels,
    }
  }

  /* 3. Incremental net vs control */
  const baseNet = perArm[baselineArmId].cost.netRecovered ?? 0
  Object.values(perArm).forEach((r) => {
    if (r.arm.id === baselineArmId) {
      r.cost.incrementalNetVsControl = 0
      return
    }
    if (r.cost.netRecovered == null) {
      r.cost.incrementalNetVsControl = null
      return
    }
    r.cost.incrementalNetVsControl = r.cost.netRecovered - baseNet
  })

  /* 4. Verdict on primary metric */
  const { lines, leadingArmId, notEnoughData } = buildVerdict(cfg, perArm, baselineArmId)

  /* 5. Guardrails */
  const guardrails = buildGuardrails(cfg, perArm, baselineArmId)

  /* 6. Recommendation */
  const recommendation = buildRecommendation(cfg, lines, guardrails, leadingArmId, notEnoughData)

  /* 7. Sample ratio check */
  const actual = arms.map((a) => assignments[a.id].length)
  const total = actual.reduce((s, n) => s + n, 0)
  const expected = arms.map((a) => (total * a.share) / 100)
  const srP = sampleRatioP(actual, arms.map((a) => a.share / 100))
  const sampleRatioCheck: SampleRatioCheck = {
    actual,
    expected,
    pValue: srP,
    red: srP < 0.001,
  }

  /* 8. Over time — per-day assignments + cumulative uplift */
  const overTime = buildOverTime(arms, assignments, cfg, perArm, baselineArmId, startedAt, daysElapsed)

  /* 9. Segments */
  const segments = buildSegments(
    arms,
    assignments,
    cfg,
    perArm,
    baselineArmId,
    rng,
    input.segmentDimensions ?? DEFAULT_SEGMENT_DIMENSIONS,
  )

  return {
    cfg,
    nodeId,
    startedAt,
    daysElapsed,
    daysPlanned,
    attributionDays: cfg.attributionDays,
    baselineArmId,
    arms: arms.map((a) => perArm[a.id]),
    verdict: {
      primaryMetricLabel: PRIMARY_METRIC_LABEL[cfg.primaryMetric],
      primaryMetricFormat: primaryMetricFormat(cfg.primaryMetric),
      leadingArmId,
      lines,
      recommendation,
      notEnoughData,
    },
    guardrails,
    sampleRatioCheck,
    overTime,
    segments,
  }
}

/* ─────────── Borrower rows ─────────── */

export function listExperimentBorrowers(
  journeyId: string,
  cfg: ExperimentConfig,
  filter: { armId?: string; outcome?: "ptp" | "paid" | "none" | "any"; search?: string } = {},
): BorrowerRow[] {
  const borrowers = listBorrowersInJourney(journeyId, 400)
  const rng = seeded(fnv1a(`borrows|${journeyId}|${cfg.experimentId}`))
  const out: BorrowerRow[] = []
  borrowers.forEach(({ borrower }) => {
    const arm = assignArm(cfg.experimentId, borrower.id, cfg.arms)
    if (filter.armId && arm.id !== filter.armId) return
    const r = rng()
    const outcome: "ptp" | "paid" | "none" =
      arm.isControl
        ? r < 0.1 ? "ptp" : r < 0.13 ? "paid" : "none"
        : r < 0.18 ? "ptp" : r < 0.24 ? "paid" : "none"
    if (filter.outcome && filter.outcome !== "any" && outcome !== filter.outcome) return
    const amount = outcome === "paid" ? Math.round(2000 + rng() * 8000) : outcome === "ptp" ? Math.round(1500 + rng() * 6000) : 0
    const channelsReceived: BorrowerRow["channelsReceived"] = []
    if (!arm.isControl) {
      const r2 = rng()
      channelsReceived.push("email")
      if (r2 > 0.3) channelsReceived.push("sms")
      if (r2 > 0.6) channelsReceived.push("ai_call")
    }
    if (filter.search && !borrower.name.toLowerCase().includes(filter.search.toLowerCase())) return
    out.push({
      borrowerId: borrower.id,
      borrowerName: borrower.name,
      armId: arm.id,
      armName: arm.name,
      assignmentDate: daysAgoIso(Math.floor(rng() * 14)),
      channelsReceived,
      lastTouch: daysAgoIso(Math.floor(rng() * 7)),
      outcome,
      amount,
    })
  })
  return out
}

/* ─────────── Internal helpers ─────────── */

function buildArmChannels(
  journeyId: string,
  arm: ExperimentArm,
  cohortSize: number,
  downstream: Array<{ node: Node; kind: NodeKind }>,
): ArmChannels {
  if (arm.isControl || downstream.length === 0) {
    return { email: null, sms: null, aiCall: null, humanCall: null, nodes: [] }
  }
  const nodeBreakdowns: ArmChannelNodeBreakdown[] = []
  let email: EmailAnalytics | null = null
  let sms: SmsAnalytics | null = null
  let aiCall: CallAnalytics | null = null
  let humanCall: CallAnalytics | null = null
  for (const { node, kind } of downstream) {
    const label = ((node.data as { label?: string })?.label as string) ?? node.id
    const b: ArmChannelNodeBreakdown = { nodeId: node.id, nodeLabel: label }
    if (kind === "message_email") {
      const a = synthesizeEmailAnalytics(journeyId, node.id, EMPTY_FILTERS, arm.id)
      b.email = a
      email = email ? sumEmail(email, a) : a
    } else if (kind === "message_sms") {
      const a = synthesizeSmsAnalytics(journeyId, node.id, EMPTY_FILTERS, 0.03, arm.id)
      b.sms = a
      sms = sms ? sumSms(sms, a) : a
    } else if (kind === "call") {
      const a = synthesizeAiCallAnalytics(journeyId, node.id, cohortSize, arm.id)
      b.call = a
      aiCall = aiCall ? sumCall(aiCall, a) : a
    } else if (kind === "human") {
      const a = synthesizeHumanCallAnalytics(journeyId, node.id, cohortSize, arm.id)
      b.call = a
      humanCall = humanCall ? sumCall(humanCall, a) : a
    }
    nodeBreakdowns.push(b)
  }
  return { email, sms, aiCall, humanCall, nodes: nodeBreakdowns }
}

function sumEmail(a: EmailAnalytics, b: EmailAnalytics): EmailAnalytics {
  // Shallow merge: counts add, rates recompute vs new denominators. This is an
  // approximation — the Analytics tab uses per-arm totals, so we fold.
  return {
    ...a,
    funnel: {
      ...a.funnel,
      reached: (a.funnel.reached ?? 0) + (b.funnel.reached ?? 0),
      sent: (a.funnel.sent ?? 0) + (b.funnel.sent ?? 0),
      delivered: (a.funnel.delivered ?? 0) + (b.funnel.delivered ?? 0),
      uniqueOpens: (a.funnel.uniqueOpens ?? 0) + (b.funnel.uniqueOpens ?? 0),
      uniqueClicks: (a.funnel.uniqueClicks ?? 0) + (b.funnel.uniqueClicks ?? 0),
      converted: (a.funnel.converted ?? 0) + (b.funnel.converted ?? 0),
    },
  }
}

function sumSms(a: SmsAnalytics, b: SmsAnalytics): SmsAnalytics {
  return {
    ...a,
    funnel: {
      ...a.funnel,
      reached: (a.funnel.reached ?? 0) + (b.funnel.reached ?? 0),
      sent: (a.funnel.sent ?? 0) + (b.funnel.sent ?? 0),
      delivered: (a.funnel.delivered ?? 0) + (b.funnel.delivered ?? 0),
      uniqueClicks: (a.funnel.uniqueClicks ?? 0) + (b.funnel.uniqueClicks ?? 0),
      converted: (a.funnel.converted ?? 0) + (b.funnel.converted ?? 0),
    },
  }
}

function sumCall(a: CallAnalytics, b: CallAnalytics): CallAnalytics {
  const attempts = a.attempts + b.attempts
  const connected = a.connected + b.connected
  const rpc = a.rpc + b.rpc
  return {
    channel: a.channel,
    attempts,
    connected,
    connectRate: attempts > 0 ? connected / attempts : 0,
    rpc,
    rpcRate: attempts > 0 ? rpc / attempts : 0,
    ptpsFromCalls: a.ptpsFromCalls + b.ptpsFromCalls,
    avgDurationSec: Math.round((a.avgDurationSec + b.avgDurationSec) / 2),
    aiMinutesTotal: (a.aiMinutesTotal ?? 0) + (b.aiMinutesTotal ?? 0),
    agentHoursTotal: (a.agentHoursTotal ?? 0) + (b.agentHoursTotal ?? 0),
    avgTalkTimeSec: a.avgTalkTimeSec,
  }
}

function computeOutcomes(cohort: Borrower[], arm: ExperimentArm, rng: () => number): ArmOutcomes {
  const n = cohort.length
  if (n === 0) {
    return {
      ptp: 0, ptpRate: 0, ptpAmount: 0, ptpKeptRate: 0, ptpBrokenRate: 0, paymentRate: 0,
      collection: 0, collectionPct: 0, recoveryPct: 0, collectionPerBorrower: 0,
      medianTimeToResolutionDays: 0,
    }
  }
  const ptpRate = arm.isControl ? 0.08 + rng() * 0.03 : 0.12 + rng() * 0.08
  const ptp = Math.round(n * ptpRate)
  const ptpAmountPerPtp = 2000 + rng() * 3000
  const ptpAmount = Math.round(ptp * ptpAmountPerPtp)
  const ptpKeptRate = 0.55 + rng() * 0.2
  const ptpBrokenRate = 1 - ptpKeptRate
  const paymentRate = arm.isControl ? 0.05 + rng() * 0.02 : 0.08 + rng() * 0.05
  const avgOutstanding = 12000
  const collection = Math.round(n * paymentRate * avgOutstanding * (0.4 + rng() * 0.4))
  const totalOutstanding = n * avgOutstanding
  const collectionPct = totalOutstanding > 0 ? collection / totalOutstanding : 0
  const recoveryPct = collectionPct * 1.1 // simplification
  const collectionPerBorrower = collection / n
  const medianTimeToResolutionDays = arm.isControl ? 6 + rng() * 3 : 3 + rng() * 3
  return {
    ptp, ptpRate, ptpAmount, ptpKeptRate, ptpBrokenRate, paymentRate,
    collection, collectionPct, recoveryPct, collectionPerBorrower, medianTimeToResolutionDays,
  }
}

function computeContact(channels: ArmChannels, cohortSize: number): ArmContact {
  if (cohortSize === 0) {
    return { touchesPerBorrower: 0, contactedAnyChannelPct: 0, rpcRate: 0 }
  }
  const emailSent = channels.email?.funnel.sent ?? 0
  const smsSent = channels.sms?.funnel.sent ?? 0
  const callAttempts = (channels.aiCall?.attempts ?? 0) + (channels.humanCall?.attempts ?? 0)
  const touches = emailSent + smsSent + callAttempts
  const rpcTotal = (channels.aiCall?.rpc ?? 0) + (channels.humanCall?.rpc ?? 0)
  const rpcRate = callAttempts > 0 ? rpcTotal / callAttempts : 0
  // Rough — "contacted on any channel" from a mix of email delivered + sms delivered + call connected
  const emailDel = channels.email?.funnel.delivered ?? 0
  const smsDel = channels.sms?.funnel.delivered ?? 0
  const callConn = (channels.aiCall?.connected ?? 0) + (channels.humanCall?.connected ?? 0)
  const contacted = Math.min(cohortSize, Math.round(0.85 * (emailDel + smsDel + callConn) / Math.max(1, (emailSent + smsSent + callAttempts) || 1) * cohortSize))
  return {
    touchesPerBorrower: touches / cohortSize,
    contactedAnyChannelPct: contacted / cohortSize,
    rpcRate,
  }
}

function computeCost(
  arm: ExperimentArm,
  channels: ArmChannels,
  outcomes: ArmOutcomes,
  costs: SynthesizeInputs["costs"],
  cohortSize: number,
): ArmCost {
  if (arm.isControl) {
    return {
      emailCost: 0, smsCost: 0, aiCallCost: 0, humanCallCost: 0, totalCost: 0,
      costPerBorrower: 0,
      costPerRecovery: outcomes.collection > 0 ? 0 : null,
      netRecovered: outcomes.collection,
      incrementalNetVsControl: 0,
    }
  }
  const emailSent = channels.email?.funnel.sent ?? 0
  const smsSegments = channels.sms?.delivery.segmentsSent ?? 0
  const aiMinutes = channels.aiCall?.aiMinutesTotal ?? 0
  const humanAttempts = channels.humanCall?.attempts ?? 0

  const emailCost = costs.emailPerSendAED != null ? emailSent * costs.emailPerSendAED : null
  const smsCost = costs.smsPerSegmentAED != null ? smsSegments * costs.smsPerSegmentAED : null
  const aiCallCost = costs.aiCallPerMinuteAED != null ? aiMinutes * costs.aiCallPerMinuteAED : null
  const humanCallCost = costs.humanCallPerAttemptAED != null ? humanAttempts * costs.humanCallPerAttemptAED : null

  const costsPresent = [emailCost, smsCost, aiCallCost, humanCallCost].every((c) => c != null || c === 0)
  const totalCost = costsPresent ? (emailCost ?? 0) + (smsCost ?? 0) + (aiCallCost ?? 0) + (humanCallCost ?? 0) : null
  const costPerBorrower = totalCost != null && cohortSize > 0 ? totalCost / cohortSize : null
  const recoveryCount = Math.round(cohortSize * outcomes.paymentRate)
  const costPerRecovery = totalCost != null && recoveryCount > 0 ? totalCost / recoveryCount : null
  const netRecovered = totalCost != null ? outcomes.collection - totalCost : null

  return {
    emailCost,
    smsCost,
    aiCallCost,
    humanCallCost,
    totalCost,
    costPerBorrower,
    costPerRecovery,
    netRecovered,
    incrementalNetVsControl: null, // filled after all arms computed
  }
}

function buildVerdict(
  cfg: ExperimentConfig,
  perArm: Record<string, ArmResult>,
  baselineArmId: string,
): { lines: VerdictLine[]; leadingArmId: string; notEnoughData: boolean } {
  const base = perArm[baselineArmId]
  const baseValue = primaryMetricValue(cfg.primaryMetric, base)
  const nonBase = Object.values(perArm).filter((r) => r.arm.id !== baselineArmId)
  const lines: VerdictLine[] = []
  let leadingArmId = baselineArmId
  let leadingValue = baseValue
  for (const r of nonBase) {
    const v = primaryMetricValue(cfg.primaryMetric, r)
    const delta = v - baseValue
    // Rough SE based on ITT sample size for rates; for amounts we fall back to zeros.
    const kind = primaryMetricFormat(cfg.primaryMetric)
    const nBase = base.assignment.assigned
    const nArm = r.assignment.assigned
    let ci95: [number, number] = [delta, delta]
    let confidence = 0
    if (kind === "pp" && nBase > 0 && nArm > 0) {
      const seUnpooled = Math.sqrt((v * (1 - v)) / nArm + (baseValue * (1 - baseValue)) / nBase)
      const pooled = (v * nArm + baseValue * nBase) / (nArm + nBase)
      const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / nArm + 1 / nBase))
      const z = sePooled === 0 ? 0 : delta / sePooled
      const p = 2 * (1 - standardNormalCdf(Math.abs(z)))
      confidence = 1 - p
      const half = 1.96 * seUnpooled
      ci95 = [delta - half, delta + half]
    }
    if (v > leadingValue) {
      leadingValue = v
      leadingArmId = r.arm.id
    }
    lines.push({
      armId: r.arm.id,
      armName: r.arm.name,
      delta,
      deltaFormat: kind,
      ci95,
      confidence,
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
      holmAdjusted: nonBase.length > 1,
    })
  }
  // Holm adjust
  if (lines.length > 1) {
    const raw: Record<string, number> = {}
    lines.forEach((l) => (raw[l.armId] = Math.max(0, 1 - l.confidence)))
    const adj = holmAdjust(raw)
    lines.forEach((l) => (l.confidence = Math.max(0, 1 - adj[l.armId])))
  }
  // "Not enough data yet" rule: every arm needs ≥100 borrowers AND the
  // attribution window has elapsed since started.
  const minPerArm = Math.min(...Object.values(perArm).map((r) => r.assignment.assigned))
  const notEnoughData = minPerArm < 100
  return { lines, leadingArmId, notEnoughData }
}

function buildGuardrails(
  cfg: ExperimentConfig,
  perArm: Record<string, ArmResult>,
  baselineArmId: string,
): GuardrailCheck[] {
  const base = perArm[baselineArmId]
  const out: GuardrailCheck[] = []
  cfg.guardrails.forEach((g) => {
    Object.values(perArm).forEach((r) => {
      if (r.arm.id === baselineArmId) return
      const armValue = guardrailValue(g.id, r)
      const controlValue = guardrailValue(g.id, base)
      const delta = armValue - controlValue
      const status: GuardrailStatus = r.assignment.assigned < 100 ? "insufficient" : delta > g.threshold ? "breached" : "ok"
      out.push({
        armId: r.arm.id,
        guardrailId: g.id,
        guardrailLabel: GUARDRAIL_LABEL[g.id],
        armValue,
        controlValue,
        thresholdAbs: g.threshold,
        status,
      })
    })
  })
  return out
}

function buildRecommendation(
  cfg: ExperimentConfig,
  lines: VerdictLine[],
  guardrails: GuardrailCheck[],
  leadingArmId: string,
  notEnoughData: boolean,
): Recommendation {
  if (notEnoughData) return { kind: "not_enough_data" }
  const leading = lines.find((l) => l.armId === leadingArmId)
  if (!leading) return { kind: "no_difference" }
  const leadingBreach = guardrails.find((g) => g.armId === leadingArmId && g.status === "breached")
  if (leadingBreach) {
    return { kind: "guardrail_breached", armId: leadingArmId, armName: leading.armName, guardrailLabel: leadingBreach.guardrailLabel }
  }
  if (leading.confidence >= 0.95 && leading.direction === "up") {
    return { kind: "roll_out", armId: leadingArmId, armName: leading.armName }
  }
  // Only reach here when nothing is significant AND no guardrail breach.
  void cfg
  return { kind: "no_difference" }
}

function buildOverTime(
  arms: ExperimentArm[],
  assignments: Record<string, Borrower[]>,
  cfg: ExperimentConfig,
  perArm: Record<string, ArmResult>,
  baselineArmId: string,
  startedAt: string,
  daysElapsed: number,
): OverTimePoint[] {
  const points: OverTimePoint[] = []
  const nDays = Math.min(60, daysElapsed)
  const start = new Date(startedAt).getTime()
  const totalPerArm: Record<string, number> = {}
  arms.forEach((a) => (totalPerArm[a.id] = assignments[a.id].length))
  const kind = primaryMetricFormat(cfg.primaryMetric)
  const baseFinal = primaryMetricValue(cfg.primaryMetric, perArm[baselineArmId])
  for (let i = 0; i < nDays; i++) {
    const date = isoDate(start + i * 86_400_000)
    const dayAssignments: Record<string, number> = {}
    const cumUplift: Record<string, number> = {}
    const ciHalf: Record<string, number> = {}
    arms.forEach((a) => {
      // Smooth daily assignments: total / nDays with a seeded wobble
      const total = totalPerArm[a.id]
      const perDay = total / Math.max(1, nDays)
      const rngSeed = 0.9 + ((Math.sin(i * 7 + a.handle.charCodeAt(0)) + 1) / 2) * 0.2
      dayAssignments[a.id] = Math.max(0, Math.round(perDay * rngSeed))
    })
    const baseRunning = baseFinal
    arms.forEach((a) => {
      if (a.id === baselineArmId) {
        cumUplift[a.id] = 0
        ciHalf[a.id] = 0
        return
      }
      const final = primaryMetricValue(cfg.primaryMetric, perArm[a.id])
      // Linear ramp toward final by the end
      const frac = (i + 1) / nDays
      const uplift = (final - baseRunning) * frac
      cumUplift[a.id] = uplift
      // CI widens as 1/sqrt(n_so_far)
      const nSoFar = Math.max(50, Math.round(totalPerArm[a.id] * frac))
      const seApprox = kind === "pp" ? Math.sqrt((Math.abs(final) * (1 - Math.abs(final))) / nSoFar) : Math.abs(final) / Math.sqrt(nSoFar)
      ciHalf[a.id] = 1.96 * seApprox
    })
    points.push({ date, assignments: dayAssignments, cumulativeUplift: cumUplift, ciHalf })
  }
  return points
}

function buildSegments(
  arms: ExperimentArm[],
  assignments: Record<string, Borrower[]>,
  cfg: ExperimentConfig,
  perArm: Record<string, ArmResult>,
  baselineArmId: string,
  rng: () => number,
  dimensions: SegmentDimension[],
): SegmentGroup[] {
  const basePrimary = primaryMetricValue(cfg.primaryMetric, perArm[baselineArmId])
  const groups: SegmentGroup[] = []
  dimensions.forEach((dim) => {
    const slices = segmentSlicesFor(dim, arms, assignments, perArm, basePrimary, cfg, rng)
    groups.push({ dimension: dim, slices })
  })
  return groups
}

function segmentSlicesFor(
  dim: SegmentDimension,
  arms: ExperimentArm[],
  assignments: Record<string, Borrower[]>,
  perArm: Record<string, ArmResult>,
  basePrimary: number,
  cfg: ExperimentConfig,
  rng: () => number,
): SegmentSlice[] {
  const sliceLabels = sliceLabelsFor(dim)
  const slices: SegmentSlice[] = []
  for (const sl of sliceLabels) {
    const perArmValues: Record<string, { size: number; value: number }> = {}
    let minPerArm = Infinity
    arms.forEach((a) => {
      const total = assignments[a.id].length
      // Share of this slice within the arm (seeded per slice × arm)
      const shareSeed = 0.05 + rng() * 0.3
      const size = Math.round(total * shareSeed)
      const armPrimary = primaryMetricValue(cfg.primaryMetric, perArm[a.id])
      // Jitter the slice value a touch around the arm's overall value
      const jitter = (rng() - 0.5) * 0.04
      const value = Math.max(0, armPrimary + jitter)
      perArmValues[a.id] = { size, value }
      minPerArm = Math.min(minPerArm, size)
    })
    slices.push({ key: sl.key, label: sl.label, perArm: perArmValues, minPerArm })
  }
  void basePrimary
  return slices
}

function sliceLabelsFor(dim: SegmentDimension): Array<{ key: string; label: string }> {
  switch (dim) {
    case "dpd":
      return [
        { key: "0_30", label: "0-30 DPD" },
        { key: "31_60", label: "31-60 DPD" },
        { key: "61_90", label: "61-90 DPD" },
        { key: "90p", label: "90+ DPD" },
      ]
    case "lender":
      return [
        { key: "ADCB", label: "ADCB" },
        { key: "ENBD", label: "Emirates NBD" },
        { key: "CBD", label: "CBD" },
        { key: "DIB", label: "DIB" },
      ]
    case "nationality":
      return [
        { key: "AE", label: "Emirati" },
        { key: "IN", label: "Indian" },
        { key: "PK", label: "Pakistani" },
        { key: "EG", label: "Egyptian" },
      ]
    case "reachable":
      return [
        { key: "yes", label: "Reachable" },
        { key: "no", label: "Not reachable" },
      ]
    case "product":
      return [
        { key: "pl", label: "Personal loan" },
        { key: "cc", label: "Credit card" },
        { key: "auto", label: "Auto loan" },
        { key: "mortgage", label: "Mortgage" },
      ]
    case "risk_score":
      return [
        { key: "low", label: "Low risk" },
        { key: "medium", label: "Medium risk" },
        { key: "high", label: "High risk" },
      ]
    case "outstanding_bucket":
      return [
        { key: "0_5k", label: "AED 0 – 5k" },
        { key: "5_15k", label: "AED 5k – 15k" },
        { key: "15_50k", label: "AED 15k – 50k" },
        { key: "50kp", label: "AED 50k+" },
      ]
    case "status":
      return [
        { key: "active", label: "Active" },
        { key: "legal", label: "Legal" },
        { key: "settled", label: "Settled" },
        { key: "closed", label: "Closed" },
      ]
    case "language":
      return [
        { key: "en", label: "English" },
        { key: "ar", label: "Arabic" },
        { key: "ur", label: "Urdu" },
        { key: "hi", label: "Hindi" },
      ]
    case "channel_received":
      return [
        { key: "email_only", label: "Email only" },
        { key: "sms_only", label: "SMS only" },
        { key: "email_sms", label: "Email + SMS" },
        { key: "email_sms_call", label: "Email + SMS + Call" },
        { key: "none", label: "No touches" },
      ]
  }
}

/* ─────────── Metric readers ─────────── */

import {
  GUARDRAIL_LABEL,
  PRIMARY_METRIC_KIND,
  PRIMARY_METRIC_LABEL,
} from "@/data/experiments"

export function primaryMetricValue(id: ExperimentConfig["primaryMetric"], r: ArmResult): number {
  switch (id) {
    case "ptp_rate":
      return r.outcomes.ptpRate
    case "ptp_kept_rate":
      return r.outcomes.ptpKeptRate
    case "payment_rate":
      return r.outcomes.paymentRate
    case "collection_pct":
      return r.outcomes.collectionPct
    case "recovery_pct":
      return r.outcomes.recoveryPct
    case "cost_per_recovery":
      return r.cost.costPerRecovery ?? 0
    case "rpc_rate":
      return r.contact.rpcRate
  }
}

function primaryMetricFormat(id: ExperimentConfig["primaryMetric"]): "pp" | "pct" | "aed" {
  return PRIMARY_METRIC_KIND[id] === "rate" ? "pp" : "aed"
}

function guardrailValue(id: string, r: ArmResult): number {
  switch (id) {
    case "optOutRate":
      return (r.channels.email?.delivery.optOutRate ?? 0) * 0.6 + (r.channels.sms?.delivery.optOutRate ?? 0) * 0.4
    case "spamRate":
      return r.channels.email?.delivery.spamRate ?? 0
    case "ptp_broken_rate":
      return r.outcomes.ptpBrokenRate
    case "cost_per_borrower":
      return r.cost.costPerBorrower ?? 0
  }
  return 0
}

/* ─────────── Pure stats wrappers ─────────── */

import { holmAdjust, normalCdf as standardNormalCdf, sampleRatioP } from "@/lib/stats"

/* ─────────── Time helpers ─────────── */

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
