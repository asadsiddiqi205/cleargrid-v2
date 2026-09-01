/**
 * Journey runs — deterministic seeded roster of "recent runs" per journey
 * used by the canvas Analytics chip + per-node Analytics tab.
 *
 * A run is one execution of the journey against its audience (either from
 * a cron schedule, a manual trigger, or a test run). Each run reports its
 * status, enrolled / resolved counts, and timestamp. The reporting layer
 * derives per-node borrower breakdowns for the currently-selected run.
 *
 * This is a prototype seed — a real backend would store runs in a table
 * and stream them to the client. Keeping the shape narrow makes the swap
 * mechanical.
 */

import { synthesizeTrace, listBorrowersInJourney, type BorrowerTrace } from "./borrower-traces"
import type { Borrower } from "./borrowers"
import type { NodeKind } from "./journey-analytics"

/* ─────────── Types ─────────── */

export type RunStatus = "completed" | "running" | "failed" | "queued"
export type RunTrigger = "cron" | "manual" | "test" | "webhook"

export interface JourneyRun {
  id: string
  journeyId: string
  status: RunStatus
  trigger: RunTrigger
  /** Display label — e.g. "Scheduled (cron)", "Manual", "Test run". */
  label: string
  startedAt: string
  finishedAt: string | null
  enrolled: number
  resolved: number
  /** Optional trigger-specific tag rendered next to the label. */
  tag?: string
}

/* ─────────── Deterministic PRNG ─────────── */

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

const NOW = new Date("2026-08-25T09:00:00Z").getTime()
const ONE_HOUR = 3_600_000
const ONE_DAY = ONE_HOUR * 24

/* ─────────── Roster ─────────── */

/**
 * List runs for a journey. Prototype seeds 5 runs per journey — the most
 * recent is "running", the rest are "completed" with varying age.
 */
export function listRuns(journeyId: string): JourneyRun[] {
  const seed = hash(`runs:${journeyId}`)
  const rand = prng(seed)
  const out: JourneyRun[] = []
  const enrollBase = Math.floor(rand() * 400_000) + 20_000
  const ages = [8 * ONE_HOUR, 1 * ONE_DAY, 2 * ONE_DAY, 4 * ONE_DAY, 7 * ONE_DAY]
  for (let i = 0; i < ages.length; i++) {
    const startedAt = new Date(NOW - ages[i])
    const jitter = 0.85 + rand() * 0.3
    const enrolled = Math.round(enrollBase * jitter)
    const resolved = Math.round(enrolled * (0.72 + rand() * 0.2))
    const status: RunStatus = i === 0 ? (rand() < 0.3 ? "running" : "completed") : "completed"
    out.push({
      id: `run-${journeyId}-${i}`,
      journeyId,
      status,
      trigger: i === 0 && rand() < 0.4 ? "manual" : "cron",
      label: i === 0 && rand() < 0.4 ? "Manual" : "Scheduled (cron)",
      startedAt: startedAt.toISOString(),
      finishedAt: status === "running" ? null : new Date(startedAt.getTime() + Math.floor(rand() * 90 * 60 * 1000)).toISOString(),
      enrolled,
      resolved: status === "running" ? Math.round(resolved * 0.4) : resolved,
    })
  }
  return out
}

export function getRun(journeyId: string, runId: string): JourneyRun | null {
  return listRuns(journeyId).find((r) => r.id === runId) ?? null
}

/* ─────────── Per-run per-node borrower list ─────────── */

/**
 * Given a run + a node, return the borrowers who entered that node in that
 * run. Derived from the seeded borrower-traces module — the per-run twist
 * is that each run samples a different deterministic subset of enrolled
 * borrowers (older runs use a bigger + shifted subset).
 */
export interface RunNodeRow {
  borrower: Borrower
  state: "passed" | "waiting" | "failed" | "in_progress"
  at: string
  /** Message events / call outcome / branch / wait — mirrors NodeBorrowerRow. */
  messageEvents?: string[]
  callResult?: string
  branchLabel?: string
  waitedHours?: number
  endTag?: string
  converted: boolean
  recoveredAED: number
}

export function listRunNodeBorrowers(
  run: JourneyRun,
  nodeId: string,
  fallbackLabel?: string,
  fallbackKind?: NodeKind,
): RunNodeRow[] {
  const seed = hash(`${run.id}:${nodeId}`)
  const rand = prng(seed)
  const enrolled = listBorrowersInJourney(run.journeyId, 400)
  // Per-run sampling — each run "runs" over a subset. Deterministic slice.
  const startIdx = Math.floor(rand() * Math.max(1, enrolled.length - 10))
  const takeCount = Math.max(6, Math.floor(enrolled.length * (0.4 + rand() * 0.4)))
  const subset = [...enrolled].slice(startIdx, startIdx + takeCount)
  const out: RunNodeRow[] = []
  for (const e of subset) {
    const trace = synthesizeTrace(e.borrower.id, run.journeyId)
    let hop = trace.hops.find((h) => h.nodeId === nodeId)
    if (!hop && fallbackLabel) {
      const label = fallbackLabel.toLowerCase()
      hop = trace.hops.find((h) => h.label.toLowerCase() === label)
    }
    if (!hop && fallbackKind) {
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
    const row = hopToRunRow(trace, hop, e.borrower, run)
    // Condition nodes (Has Done Event / Check Attribute) resolve to Yes / No,
    // not to the free-form label the trace synthesiser inherits from
    // action_split. Override deterministically so the analytics distribution
    // reads as a clean two-sided split.
    if (fallbackKind === "condition") {
      const s = hash(e.borrower.id + "|" + nodeId + "|" + run.id)
      row.branchLabel = s % 100 < 65 ? "Yes" : "No"
    }
    out.push(row)
  }
  return out
}

function hopToRunRow(
  trace: BorrowerTrace,
  hop: import("./borrower-traces").TraceHop,
  borrower: Borrower,
  run: JourneyRun,
): RunNodeRow {
  const runStart = new Date(run.startedAt).getTime()
  // Shift the hop timestamp to sit inside the run's window so timestamps look
  // consistent with the picked run rather than the far-past template time.
  const shifted = new Date(runStart + (hash(borrower.id + hop.id) % (60 * 60 * 1000))).toISOString()
  const base: RunNodeRow = {
    borrower,
    state: "passed",
    at: shifted,
    converted: trace.status === "converted",
    recoveredAED: trace.recoveredAED,
  }
  switch (hop.outcome.kind) {
    case "trigger":
      return { ...base, state: "passed" }
    case "message":
      return {
        ...base,
        state: hop.outcome.events.includes("bounced") ? "failed" : "passed",
        messageEvents: hop.outcome.events,
      }
    case "branch":
      return { ...base, state: "passed", branchLabel: hop.outcome.label }
    case "wait": {
      const now = Date.now()
      const started = new Date(shifted).getTime()
      const stillWaiting = run.status === "running" && (now - started) < 24 * ONE_HOUR
      return {
        ...base,
        state: stillWaiting ? "waiting" : "passed",
        waitedHours: Math.max(0, Math.round((now - started) / ONE_HOUR)),
      }
    }
    case "call":
      return {
        ...base,
        state: hop.outcome.result === "no_answer" || hop.outcome.result === "busy" ? "failed" : "passed",
        callResult: hop.outcome.result,
      }
    case "human":
      return { ...base, state: "passed" }
    case "end":
      return { ...base, state: "passed", endTag: hop.outcome.tag }
  }
}

export function formatRunAge(run: JourneyRun): string {
  const start = new Date(run.startedAt).getTime()
  const diffMs = Math.max(0, NOW - start)
  const hrs = diffMs / ONE_HOUR
  if (hrs < 1) return `${Math.round(hrs * 60)}m ago`
  if (hrs < 24) return `${Math.round(hrs)}h ago`
  return `${Math.round(hrs / 24)}d ago`
}
