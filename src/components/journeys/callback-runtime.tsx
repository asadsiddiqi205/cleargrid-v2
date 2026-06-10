"use client"

/**
 * Part 3 — Callback runtime stub.
 *
 * Mocks the data model + behavior described in the spec:
 *
 *  • Schedule:    when a human reviewer confirms a captured callback, the
 *                 AI Call node creates a ScheduledCallback record.
 *                 Snapshots clearvoice project + script + borrower + deal
 *                 + originating journey instance.
 *
 *  • Fire-time:   DNC first (hard cancel). Then DND, contact window, 7-in-7
 *                 (any blocking → hold). If still held when max hold duration
 *                 elapses, exit with outcome "Errored".
 *
 *  • Journey-end: per user decision, ANY journey end cancels the scheduled
 *                 callback. Logged with reason "Journey ended".
 *
 * This module owns the in-memory store of scheduled callbacks. The monitoring
 * view + node config simulate-button both read/write through it.
 */

import { borrowers } from "@/data/borrowers"

export type CallbackStatus =
  | "pending"     // scheduled, will fire when fire time arrives
  | "held"        // fire time arrived but a hold-condition (DND / contact window / 7-in-7) is blocking
  | "fired"       // call placed
  | "cancelled"   // cancelled with a logged reason (DNC, opt-out, consent revoked, journey ended)
  | "errored"     // held past max duration → exited

export type CallbackHoldReason = "dnd" | "contact_window"
export type CallbackCancelReason =
  | "dnc_at_schedule"
  | "dnc_at_fire"
  | "opted_out"
  | "consent_revoked"
  | "journey_ended"
  | "max_callbacks_reached"
  | "skipped_late_commit"
  | "held_past_working_day"

export interface ScheduledCallback {
  id: string
  /** Originating AI Call node id (so we can label the source) */
  originatingNodeId: string
  /** Originating journey instance id — informational only, not used to gate fire. */
  originatingJourneyInstanceId: string
  /** Borrower + deal */
  borrowerId: string
  borrowerName: string
  dealId: string
  /** Snapshotted at schedule time (so journey unpublish doesn't break it) */
  clearvoiceProjectId: string
  clearvoiceScriptId: string
  /** Fire time (ISO) */
  fireAtIso: string
  status: CallbackStatus
  /** When `held`, which guard is blocking */
  holdReason?: CallbackHoldReason
  /** When `cancelled` or `errored`, the reason logged for ops */
  endReason?: CallbackCancelReason | CallbackHoldReason
  /** ISO timestamps */
  scheduledAt: string
  firedAt?: string
  cancelledAt?: string
  /** Human-readable log of state changes */
  log: Array<{ at: string; message: string }>
}

// ───────────────────────── In-memory store ─────────────────────────

const STORE: ScheduledCallback[] = (() => {
  // Seed a handful of mock callbacks so the monitoring view has content
  // on first load. These mirror the four states ops should be able to see.
  const now = Date.now()
  const iso = (msFromNow: number) => new Date(now + msFromNow).toISOString()

  return [
    {
      id: "cb-mock-1",
      originatingNodeId: "node-ai-call-1",
      originatingJourneyInstanceId: "jrn-high-dpd-001",
      borrowerId: "bor-001",
      borrowerName: "Ahmed Al-Mansoori",
      dealId: "deal-1",
      clearvoiceProjectId: "proj_001",
      clearvoiceScriptId: "script_001_v3",
      fireAtIso: iso(1000 * 60 * 60 * 4), // 4h from now
      status: "pending",
      scheduledAt: iso(-1000 * 60 * 30),
      log: [
        { at: iso(-1000 * 60 * 30), message: "Scheduled by AI Call node (Mashreq Reminder AR)" },
        { at: iso(-1000 * 60 * 30), message: "ClearVoice project + script snapshotted" },
      ],
    },
    {
      id: "cb-mock-2",
      originatingNodeId: "node-ai-call-1",
      originatingJourneyInstanceId: "jrn-broken-promise-014",
      borrowerId: "bor-002",
      borrowerName: "Yaser Shoshana",
      dealId: "deal-3",
      clearvoiceProjectId: "proj_001",
      clearvoiceScriptId: "script_001_v3",
      fireAtIso: iso(-1000 * 60 * 5), // 5 min in past — fire time arrived
      status: "held",
      holdReason: "dnd",
      scheduledAt: iso(-1000 * 60 * 90),
      log: [
        { at: iso(-1000 * 60 * 90), message: "Scheduled by AI Call node" },
        { at: iso(-1000 * 60 * 5), message: "Fire time arrived. DND active (21:00–08:00). Holding." },
        { at: iso(-1000 * 60 * 4), message: "Re-evaluating in 5 minutes." },
      ],
    },
    {
      id: "cb-mock-3",
      originatingNodeId: "node-ai-call-1",
      originatingJourneyInstanceId: "jrn-settlement-007",
      borrowerId: "bor-003",
      borrowerName: "Abdullatif Houri",
      dealId: "deal-6",
      clearvoiceProjectId: "proj_003",
      clearvoiceScriptId: "script_003_v1",
      fireAtIso: iso(-1000 * 60 * 60 * 2), // 2h in past
      status: "fired",
      scheduledAt: iso(-1000 * 60 * 60 * 26),
      firedAt: iso(-1000 * 60 * 60 * 2),
      log: [
        { at: iso(-1000 * 60 * 60 * 26), message: "Scheduled by AI Call node (Mashreq Settlement EN)" },
        { at: iso(-1000 * 60 * 60 * 2), message: "Compliance guard passed (DNC, DND, contact window, 7-in-7)." },
        { at: iso(-1000 * 60 * 60 * 2), message: "Call placed via ClearVoice." },
      ],
    },
    {
      id: "cb-mock-4",
      originatingNodeId: "node-ai-call-1",
      originatingJourneyInstanceId: "jrn-final-notice-022",
      borrowerId: "bor-004",
      borrowerName: "Rabab Abbas",
      dealId: "deal-10",
      clearvoiceProjectId: "proj_006",
      clearvoiceScriptId: "script_006_v2",
      fireAtIso: iso(1000 * 60 * 60 * 12),
      status: "cancelled",
      endReason: "dnc_at_fire",
      scheduledAt: iso(-1000 * 60 * 60 * 8),
      cancelledAt: iso(-1000 * 60 * 30),
      log: [
        { at: iso(-1000 * 60 * 60 * 8), message: "Scheduled by AI Call node (FAB Final Notice EN)" },
        { at: iso(-1000 * 60 * 30), message: "Borrower added to Regulatory DNC. Cancelling (DNC is a hard cancel, not a hold)." },
      ],
    },
  ]
})()

const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribeCallbacks(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getScheduledCallbacks(): ScheduledCallback[] {
  return [...STORE]
}

let counter = 100
function nextId(): string {
  counter += 1
  return `cb-${counter}`
}

// ───────────────────── Schedule / simulate commit ─────────────────────

interface SimulateCommitArgs {
  nodeData: Record<string, unknown>
  fireAtIso: string
}
interface SimulateCommitResult {
  scheduled: boolean
  fireAtIso: string
  reason?: string
}

export function simulateCallbackCommit({
  nodeData,
  fireAtIso,
}: SimulateCommitArgs): SimulateCommitResult {
  // 1. Cap check
  const cap = (nodeData.callbackMaxPerBorrower as number) ?? 3
  const borrower = borrowers[0]
  const existingForBorrower = STORE.filter(
    (cb) => cb.borrowerId === borrower.id && cb.status !== "cancelled" && cb.status !== "errored",
  ).length
  if (existingForBorrower >= cap) {
    return { scheduled: false, fireAtIso, reason: `Max callbacks per borrower (${cap}) reached` }
  }

  // 2. Snapshot + write record
  const projectId = (nodeData.clearvoiceProjectId as string) ?? "proj_001"
  const projectName = (nodeData.clearvoiceProjectName as string) ?? "CashNow PTP EN"
  const now = new Date().toISOString()
  const record: ScheduledCallback = {
    id: nextId(),
    originatingNodeId: "node-ai-call-current",
    originatingJourneyInstanceId: `jrn-${Math.random().toString(36).slice(2, 8)}`,
    borrowerId: borrower.id,
    borrowerName: borrower.name,
    dealId: "deal-1",
    clearvoiceProjectId: projectId,
    clearvoiceScriptId: `${projectId}_v1`,
    fireAtIso,
    status: "pending",
    scheduledAt: now,
    log: [
      { at: now, message: `Scheduled by AI Call node (${projectName})` },
      { at: now, message: "ClearVoice project + script snapshotted at schedule time" },
    ],
  }
  STORE.unshift(record)
  emit()
  return { scheduled: true, fireAtIso }
}

// ───────────────────── Journey-end cancellation ─────────────────────

/**
 * Per the simplified ownership rule: callbacks live only as long as the
 * journey instance. Any journey end cancels pending/held callbacks with
 * reason "Journey ended".
 */
export function cancelCallbacksForJourneyInstance(journeyInstanceId: string): number {
  let n = 0
  const now = new Date().toISOString()
  for (const cb of STORE) {
    if (cb.originatingJourneyInstanceId !== journeyInstanceId) continue
    if (cb.status !== "pending" && cb.status !== "held") continue
    cb.status = "cancelled"
    cb.endReason = "journey_ended"
    cb.cancelledAt = now
    cb.log.push({ at: now, message: "Journey ended. Callback cancelled (callbacks live only as long as the journey)." })
    n++
  }
  if (n > 0) emit()
  return n
}

export function cancelCallback(id: string, reason: CallbackCancelReason): boolean {
  const cb = STORE.find((c) => c.id === id)
  if (!cb) return false
  if (cb.status !== "pending" && cb.status !== "held") return false
  cb.status = "cancelled"
  cb.endReason = reason
  cb.cancelledAt = new Date().toISOString()
  cb.log.push({
    at: cb.cancelledAt,
    message: `Cancelled — ${CANCEL_REASON_LABEL[reason]}`,
  })
  emit()
  return true
}

export const CANCEL_REASON_LABEL: Record<CallbackCancelReason, string> = {
  dnc_at_schedule: "Borrower was on DNC at schedule time",
  dnc_at_fire: "Borrower on DNC at fire time (hard cancel)",
  opted_out: "Borrower opted out",
  consent_revoked: "Borrower consent revoked (non-contactable)",
  journey_ended: "Journey ended",
  max_callbacks_reached: "Max callbacks per borrower (this journey) reached",
  skipped_late_commit: "Reviewer confirmed after fire time; node policy = skip",
  held_past_working_day: "Still blocked at end of working day → exited",
}

export const HOLD_REASON_LABEL: Record<CallbackHoldReason, string> = {
  dnd: "DND hours active",
  contact_window: "Outside contact window",
}
