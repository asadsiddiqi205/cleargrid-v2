/**
 * Call-node analytics — AI call and human call synthesizers.
 *
 * Follows the same deterministic FNV+LCG pattern as `message-analytics.ts`
 * so a given (journey, node, arm, borrower cohort) always resolves to the
 * same numbers. The real data will land under one endpoint per channel,
 * and the shapes here already match what that endpoint should return.
 *
 * TODO (backend contract):
 *  - AI call: `/analytics/ai-call/{nodeId}?journey=…&arm=…` → `AiCallAnalytics`
 *  - Human call: `/analytics/human-call/{nodeId}?journey=…&arm=…` → `HumanCallAnalytics`
 *  - Both must honour the attribution window from the journey settings and the
 *    experiment config; the current mock ignores it (returns the whole cohort).
 */

export type CallChannel = "ai_call" | "human_call"

/** Attempts/connects/RPC/PTP + duration summary for one call node. */
export interface CallAnalytics {
  channel: CallChannel
  attempts: number
  connected: number
  connectRate: number
  rpc: number
  rpcRate: number
  ptpsFromCalls: number
  /** Mean duration in seconds (AI: per call; Human: per agent connected call). */
  avgDurationSec: number
  /** AI only: total minutes talked across all calls. */
  aiMinutesTotal?: number
  /** Human only: agent hours (connected time) across the whole cohort. */
  agentHoursTotal?: number
  /** Human only: average agent talk time per connected call, in seconds. */
  avgTalkTimeSec?: number
}

/* ─────────── Deterministic PRNG ─────────── */

function hash(str: string): number {
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

/* ─────────── AI call ─────────── */

export function synthesizeAiCallAnalytics(
  journeyId: string,
  nodeId: string,
  cohortSize: number,
  armId: string | undefined = undefined,
): CallAnalytics {
  const rng = seeded(hash(`ai_call|${journeyId}|${nodeId}|${armId ?? "all"}`))
  const attemptsPerBorrower = 1 + Math.floor(rng() * 3)
  const attempts = Math.max(0, Math.round(cohortSize * attemptsPerBorrower))
  // Connect rate ~30-55%
  const connectRate = clamp(0.3 + rng() * 0.25, 0.1, 0.9)
  const connected = Math.round(attempts * connectRate)
  // RPC rate (right-party-contact over connected) ~50-85%
  const rpcOfConnected = clamp(0.5 + rng() * 0.35, 0.3, 0.95)
  const rpc = Math.round(connected * rpcOfConnected)
  const rpcRate = attempts > 0 ? rpc / attempts : 0
  // PTP from calls — ~15-35% of RPC
  const ptpOfRpc = clamp(0.15 + rng() * 0.2, 0.05, 0.6)
  const ptpsFromCalls = Math.round(rpc * ptpOfRpc)
  // Avg call duration ~45-120s
  const avgDurationSec = Math.round(45 + rng() * 75)
  const aiMinutesTotal = Math.round((attempts * avgDurationSec) / 60)
  return {
    channel: "ai_call",
    attempts,
    connected,
    connectRate,
    rpc,
    rpcRate,
    ptpsFromCalls,
    avgDurationSec,
    aiMinutesTotal,
  }
}

/* ─────────── Human call ─────────── */

export function synthesizeHumanCallAnalytics(
  journeyId: string,
  nodeId: string,
  cohortSize: number,
  armId: string | undefined = undefined,
): CallAnalytics {
  const rng = seeded(hash(`human_call|${journeyId}|${nodeId}|${armId ?? "all"}`))
  // Human campaigns typically dial fewer times than AI
  const attemptsPerBorrower = 1 + Math.floor(rng() * 2)
  const attempts = Math.max(0, Math.round(cohortSize * attemptsPerBorrower))
  // Connect rate ~35-60%
  const connectRate = clamp(0.35 + rng() * 0.25, 0.1, 0.9)
  const connected = Math.round(attempts * connectRate)
  // RPC of connected ~70-90%
  const rpcOfConnected = clamp(0.7 + rng() * 0.2, 0.3, 0.98)
  const rpc = Math.round(connected * rpcOfConnected)
  const rpcRate = attempts > 0 ? rpc / attempts : 0
  // PTP of RPC ~20-45%
  const ptpOfRpc = clamp(0.2 + rng() * 0.25, 0.05, 0.7)
  const ptpsFromCalls = Math.round(rpc * ptpOfRpc)
  // Talk time ~90-240s
  const avgTalkTimeSec = Math.round(90 + rng() * 150)
  const avgDurationSec = avgTalkTimeSec
  const agentHoursTotal = (connected * avgTalkTimeSec) / 3600
  return {
    channel: "human_call",
    attempts,
    connected,
    connectRate,
    rpc,
    rpcRate,
    ptpsFromCalls,
    avgDurationSec,
    avgTalkTimeSec,
    agentHoursTotal: Math.round(agentHoursTotal * 10) / 10,
  }
}

/* ─────────── Helpers ─────────── */

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function callAnalyticsCostAED(
  a: CallAnalytics,
  costs: { aiCallPerMinuteAED?: number; humanCallPerAttemptAED?: number },
): number | null {
  if (a.channel === "ai_call") {
    if (costs.aiCallPerMinuteAED == null) return null
    return (a.aiMinutesTotal ?? 0) * costs.aiCallPerMinuteAED
  }
  if (costs.humanCallPerAttemptAED == null) return null
  return a.attempts * costs.humanCallPerAttemptAED
}
