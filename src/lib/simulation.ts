/**
 * Shared simulation domain — data model, cost estimates, outcome presets,
 * cohort-filter evaluation, and localStorage cache. Everything the simulator
 * drawer, canvas overlays, trace modal, and simulation-view chip read from
 * lives here.
 */

import { borrowers, type Borrower } from "@/data/borrowers"
import type { FilterGroup } from "@/components/segments/filter-builder"

/* ---------------------------------------------------------------------- */
/*  Types                                                                 */
/* ---------------------------------------------------------------------- */

export type CohortMode = "full" | "specific" | "filter"

export interface CohortSpec {
  mode: CohortMode
  /** Comma-or-newline-separated deal IDs for `specific` mode. */
  dealIds?: string
  /** Filter groups (from FilterBuilder) for `filter` mode. */
  filterGroups?: FilterGroup[]
  /** Top-level AND/OR between groups. */
  groupJoin?: "AND" | "OR"
  /** Cap on cohort size. */
  cap: number
}

/** One simulated borrower's path through the flow. */
export interface SimulatedTrace {
  borrowerId: string
  borrowerName: string
  dealId: string
  hops: Array<{
    nodeId: string
    label: string
    /** Which outgoing branch label this hop took (if any). */
    branch?: string
    /** For action nodes: the sampled outcome (e.g. "PTP", "Voicemail"). */
    outcome?: string
    /** Minutes since enrollment when this hop fired. */
    tOffsetMinutes: number
  }>
  final: "converted" | "exited" | "errored" | "still_active"
}

export interface SimulationSample {
  borrowerId: string
  borrowerName: string
  dealId: string
  dpd?: string
  outstanding?: number
  product?: string
  status?: string
}

export interface NodeSimulation {
  nodeId: string
  count: number
  percent: number
  branchCounts?: Record<string, number>
  emptyAttributes?: Array<{ tag: string; percent: number }>
  costAed?: number
  /** Which outcome preset was applied (only meaningful for action nodes). */
  outcomePreset?: OutcomePresetId
  sample: SimulationSample[]
}

export interface SimulationResult {
  /** Client-side id used to key the localStorage cache + share via URL. */
  id: string
  /** ISO timestamp. */
  createdAt: string
  /** Human-readable cohort description ("Full audience", "12 deals", filter summary). */
  cohortLabel: string
  cohortMode: CohortMode
  cohortSize: number
  /** Total borrowers that entered (cohort ∩ cap). */
  entered: number
  perNode: Record<string, NodeSimulation>
  /** Total estimated cost across all action nodes, in AED. */
  totalCostAed: number
  /** Simulated traces keyed by borrower id — capped at 200 to keep localStorage sane. */
  traces: Record<string, SimulatedTrace>
  /** Snapshot of node ids at simulation time — used to detect edits. */
  nodeIdsSnapshot: string[]
  /** Outcome-preset choices used for this run. */
  outcomeChoices: Record<string, OutcomePresetId>
}

/* ---------------------------------------------------------------------- */
/*  Cost estimates                                                        */
/* ---------------------------------------------------------------------- */

export const COST_ESTIMATES = {
  aiCallMinutesPerCall: 3,
  aiCallRatePerMinute: 0.35,
  smsRate: 0.03,
  whatsappRate: 0.05,
}

export function estimateNodeCost(actionType: string | undefined, count: number): number {
  if (!count) return 0
  switch (actionType) {
    case "call":
      return count * COST_ESTIMATES.aiCallMinutesPerCall * COST_ESTIMATES.aiCallRatePerMinute
    case "sms":
      return count * COST_ESTIMATES.smsRate
    case "whatsapp":
      return count * COST_ESTIMATES.whatsappRate
    default:
      return 0
  }
}

export function formatAed(value: number): string {
  if (!isFinite(value)) return "AED 0"
  return `AED ${Math.round(value).toLocaleString()}`
}

/* ---------------------------------------------------------------------- */
/*  Outcome presets (Part 2.5)                                            */
/* ---------------------------------------------------------------------- */

export type OutcomePresetId = "realistic" | "best" | "worst" | "custom"

export const OUTCOME_PRESETS: Array<{
  id: OutcomePresetId
  label: string
  description: string
}> = [
  { id: "realistic", label: "Realistic", description: "Use 30-day rates for this lender / DPD" },
  { id: "best", label: "Best case", description: "90% success outcome, rest neutral" },
  { id: "worst", label: "Worst case", description: "90% failure outcome, rest neutral" },
  { id: "custom", label: "Custom", description: "Author-defined per outcome" },
]

/**
 * Fallback outcome distributions when no historical data is available.
 * Percentages sum to 100 within each action type.
 */
export const OUTCOME_DEFAULTS: Record<string, Record<OutcomePresetId, Record<string, number>>> = {
  call: {
    realistic: {
      "Connected (other)": 25,
      "PTP captured": 20,
      "Dispute raised": 5,
      "Callback requested": 3,
      Voicemail: 25,
      "No answer": 20,
      "Technical failure": 2,
    },
    best: {
      "PTP captured": 90,
      "Connected (other)": 5,
      Voicemail: 3,
      "No answer": 2,
    },
    worst: {
      "No answer": 90,
      Voicemail: 5,
      "Technical failure": 5,
    },
    custom: {
      "Connected (other)": 25,
      "PTP captured": 20,
      "Dispute raised": 5,
      "Callback requested": 3,
      Voicemail: 25,
      "No answer": 20,
      "Technical failure": 2,
    },
  },
  email: {
    realistic: {
      Delivered: 95,
      Opened: 60,
      Clicked: 15,
      Replied: 3,
      Bounced: 2,
      Unsubscribed: 1,
    },
    best: { Delivered: 95, Opened: 90, Clicked: 60, Replied: 15 },
    worst: { Bounced: 60, Delivered: 30, Unsubscribed: 10 },
    custom: {
      Delivered: 95,
      Opened: 60,
      Clicked: 15,
      Replied: 3,
      Bounced: 2,
      Unsubscribed: 1,
    },
  },
  sms: {
    realistic: { Delivered: 96, Failed: 3, "Opted out": 1 },
    best: { Delivered: 99, Failed: 1 },
    worst: { Failed: 80, Delivered: 15, "Opted out": 5 },
    custom: { Delivered: 96, Failed: 3, "Opted out": 1 },
  },
  whatsapp: {
    realistic: { Delivered: 92, Read: 55, Replied: 4, Failed: 4 },
    best: { Delivered: 99, Read: 90, Replied: 15 },
    worst: { Failed: 60, Delivered: 30, Read: 10 },
    custom: { Delivered: 92, Read: 55, Replied: 4, Failed: 4 },
  },
}

/* ---------------------------------------------------------------------- */
/*  Cohort filter evaluation                                              */
/* ---------------------------------------------------------------------- */

/**
 * Very forgiving field-name → borrower-attribute mapping. The FilterBuilder
 * emits human-readable field names like "DPD (raw)" or "Outstanding Amount";
 * we map them onto the prototype's Borrower shape. Anything we don't know
 * about is treated as "not matched" — which is fine for a prototype since
 * the field catalog is large and we only have a handful of seeded borrowers.
 */
function resolveBorrowerField(b: Borrower, field: string): string | number | null {
  const f = field.toLowerCase()
  if (f.includes("dpd bucket")) return b.dpdBucket
  if (f.includes("dpd")) {
    // Extract midpoint of "31-60" etc, "121+" → 130
    const m = b.dpdBucket.match(/(\d+)/g)
    if (!m) return null
    if (m.length === 1) return Number(m[0]) + 10
    return Math.round((Number(m[0]) + Number(m[1])) / 2)
  }
  if (f.includes("outstanding")) return b.outstanding
  if (f.includes("product") || f.includes("loan type")) return b.product
  if (f.includes("risk")) return b.riskScore
  if (f.includes("status") || f.includes("deal stage")) return b.status
  if (f.includes("name") || f.includes("borrower id")) return b.name
  if (f.includes("phone")) return b.phone
  return null
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, ""))
    return isFinite(n) ? n : null
  }
  return null
}

function evalCondition(b: Borrower, filter: { field: string; operator: string; value: string; value2?: string }): boolean {
  if (!filter.field || !filter.operator) return true // unfinished row → don't filter out
  const raw = resolveBorrowerField(b, filter.field)
  if (raw === null || raw === undefined) return false
  const op = filter.operator.toLowerCase()
  const v = filter.value ?? ""
  const values = v.split(",").map((s) => s.trim()).filter(Boolean)

  if (op.includes("is set") || op === "isset") return true // resolved is truthy
  if (op.includes("not set")) return false

  if (op === "one of" || op.includes("in") || op === "equals") {
    return values.some((val) => String(raw).toLowerCase() === val.toLowerCase())
  }
  if (op === "none of" || op.includes("not one of") || op === "not equals") {
    return !values.some((val) => String(raw).toLowerCase() === val.toLowerCase())
  }
  if (op === "contains") return String(raw).toLowerCase().includes(v.toLowerCase())
  if (op === "starts with") return String(raw).toLowerCase().startsWith(v.toLowerCase())

  const rawNum = coerceNumber(raw)
  const valNum = coerceNumber(v)
  const val2Num = coerceNumber(filter.value2 ?? "")
  if (rawNum === null || valNum === null) return false
  if (op.includes("greater")) return rawNum > valNum
  if (op.includes("less")) return rawNum < valNum
  if (op === "between") return val2Num !== null && rawNum >= valNum && rawNum <= val2Num
  return true
}

function evalGroup(b: Borrower, group: FilterGroup): boolean {
  const filters = group.filters.filter((f) => f.field)
  if (filters.length === 0) return true
  if (group.joinLogic === "AND") return filters.every((f) => evalCondition(b, f))
  return filters.some((f) => evalCondition(b, f))
}

export function evaluateFilterCohort(groups: FilterGroup[], groupJoin: "AND" | "OR"): Borrower[] {
  const active = groups.filter((g) => g.filters.some((f) => f.field))
  if (active.length === 0) return borrowers.slice()
  return borrowers.filter((b) =>
    groupJoin === "AND" ? active.every((g) => evalGroup(b, g)) : active.some((g) => evalGroup(b, g)),
  )
}

export function summarizeFilterGroups(groups: FilterGroup[]): string {
  const rows = groups.flatMap((g) => g.filters.filter((f) => f.field))
  if (rows.length === 0) return "All borrowers"
  if (rows.length === 1) {
    const r = rows[0]
    const val = r.value || (r.operator || "")
    return `${r.field} ${r.operator} ${val}`.trim()
  }
  return `${rows.length} conditions`
}

/* ---------------------------------------------------------------------- */
/*  Deterministic hash + sampling                                         */
/* ---------------------------------------------------------------------- */

export function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Deterministic PRNG seeded by a string. Produces a repeatable sequence so
 * simulation results are stable across renders/reruns (the simulator caches
 * results, so re-simulating with the same inputs must produce the same
 * numbers).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------------------------------------------------------------------- */
/*  localStorage cache                                                    */
/* ---------------------------------------------------------------------- */

const SIM_TTL_MS = 7 * 24 * 60 * 60 * 1000
const SIM_KEY = (journeyId: string) => `journey-sim:${journeyId}`
const COHORT_KEY = (journeyId: string) => `journey-cohort:${journeyId}`
const NUDGE_KEY = (journeyId: string) => `journey-sim-nudge:${journeyId}`

export function saveSimulation(journeyId: string, sim: SimulationResult): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SIM_KEY(journeyId), JSON.stringify(sim))
  } catch {
    // localStorage quota — ignore silently in the prototype
  }
}

export function loadSimulation(journeyId: string): SimulationResult | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SIM_KEY(journeyId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SimulationResult
    const age = Date.now() - new Date(parsed.createdAt).getTime()
    if (age > SIM_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSimulation(journeyId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(SIM_KEY(journeyId))
  } catch {
    /* noop */
  }
}

export function saveCohortSpec(journeyId: string, spec: CohortSpec): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(COHORT_KEY(journeyId), JSON.stringify(spec))
  } catch {
    /* noop */
  }
}

export function loadCohortSpec(journeyId: string): CohortSpec | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(COHORT_KEY(journeyId))
    if (!raw) return null
    return JSON.parse(raw) as CohortSpec
  } catch {
    return null
  }
}

export function markPublishNudgeSeen(journeyId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(NUDGE_KEY(journeyId), "1")
  } catch {
    /* noop */
  }
}

export function wasPublishNudgeSeen(journeyId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(NUDGE_KEY(journeyId)) === "1"
  } catch {
    return false
  }
}
