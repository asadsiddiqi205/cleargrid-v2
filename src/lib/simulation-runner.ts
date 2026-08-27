/**
 * Deterministic simulation runner.
 *
 * Given a journey (nodes + edges), a cohort of borrowers, and outcome-preset
 * choices per action node, produce a `SimulationResult` with per-node counts,
 * branch counts, cost estimates, empty-attribute findings, sample borrowers,
 * and full traces.
 *
 * This is NOT a real execution engine — it approximates flow-through with
 * a topological walk + weighted branching driven by the outcome presets.
 * That's the point of the simulator: fast, deterministic, design-time.
 */

import type { Edge, Node } from "@xyflow/react"
import type { Borrower } from "@/data/borrowers"
import {
  estimateNodeCost,
  hashCode,
  mulberry32,
  OUTCOME_DEFAULTS,
  type CohortMode,
  type NodeSimulation,
  type OutcomePresetId,
  type SimulatedTrace,
  type SimulationResult,
  type SimulationSample,
} from "@/lib/simulation"

interface RunInputs {
  journeyId: string
  cohort: Borrower[]
  cohortLabel: string
  cohortMode: CohortMode
  cap: number
  nodes: Node[]
  edges: Edge[]
  outcomeChoices: Record<string, OutcomePresetId>
}

interface OutcomeSample {
  outcome: string
  branch?: string
}

/**
 * Some nodes route by outcome. Map (blockType|actionType) → outcome kind.
 */
function outcomeKindFor(node: Node): keyof typeof OUTCOME_DEFAULTS | null {
  const data = (node.data ?? {}) as Record<string, unknown>
  const at = data.actionType as string | undefined
  if (at === "call") return "call"
  if (at === "email") return "email"
  if (at === "sms") return "sms"
  if (at === "whatsapp") return "whatsapp"
  return null
}

/**
 * Pick a weighted outcome from a distribution.
 */
function pickOutcome(rand: () => number, dist: Record<string, number>): string {
  const total = Object.values(dist).reduce((a, b) => a + b, 0)
  if (total <= 0) return Object.keys(dist)[0] ?? "unknown"
  const target = rand() * total
  let acc = 0
  for (const [k, v] of Object.entries(dist)) {
    acc += v
    if (target <= acc) return k
  }
  return Object.keys(dist)[0]
}

/**
 * Scan a node's config for merge tags and return which tags resolve empty
 * against a sampled borrower. Uses a light-weight `{{tag}}` regex.
 */
function findEmptyTags(node: Node, borrower: Borrower): string[] {
  const data = (node.data ?? {}) as Record<string, unknown>
  const bodyCandidates = [
    data.prompt,
    data.script,
    data.body,
    data.subject,
    data.message,
    data.template,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
  const tags = new Set<string>()
  const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(bodyCandidates)) !== null) tags.add(m[1])
  const record = borrower as unknown as Record<string, unknown>
  const empty: string[] = []
  for (const tag of tags) {
    const path = tag.split(".")
    // Only inspect the first hop; deeper attributes always empty in prototype.
    if (path[0] === "borrower" || path[0] === "deal") {
      const key = path.slice(1).join(".")
      const known: Record<string, keyof Borrower> = {
        first_name: "name",
        name: "name",
        outstanding: "outstanding",
        outstanding_amount: "outstanding",
        dpd_bucket: "dpdBucket",
        dpd: "dpdBucket",
        product: "product",
        phone: "phone",
        status: "status",
      }
      const bkey = known[key]
      const val = bkey ? borrower[bkey] : undefined
      if (val === undefined || val === "" || val === null) empty.push(tag)
    } else if (record[tag] === undefined || record[tag] === "" || record[tag] === null) {
      empty.push(tag)
    }
  }
  return empty
}

/**
 * Walk from `startId` through the flow, sampling branches probabilistically
 * for split nodes and outcomes probabilistically for action nodes. Returns
 * the ordered path.
 */
function walkPath(
  startId: string,
  byId: Map<string, Node>,
  outgoing: Map<string, Edge[]>,
  outcomeChoices: Record<string, OutcomePresetId>,
  rand: () => number,
): Array<{ nodeId: string; branch?: string; outcome?: string; tOffsetMinutes: number }> {
  const out: Array<{ nodeId: string; branch?: string; outcome?: string; tOffsetMinutes: number }> = []
  const visited = new Set<string>()
  let cursor: string | null = startId
  let t = 0
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor)
    const node = byId.get(cursor)
    if (!node) break
    const outs: Edge[] = outgoing.get(cursor) ?? []
    let outcome: string | undefined
    let branch: string | undefined
    let next: string | null = null
    const outcomeKind = outcomeKindFor(node)

    if (outcomeKind && outs.length > 0) {
      const presetId = outcomeChoices[cursor] ?? "realistic"
      const dist = OUTCOME_DEFAULTS[outcomeKind]?.[presetId] ?? {}
      outcome = pickOutcome(rand, dist)
      // Map outcome → branch by name match (loose); fall back to first edge.
      const match: Edge | undefined = outs.find((e: Edge) => {
        const label = ((e.data ?? {}) as { label?: string })?.label
        return Boolean(
          label && outcome && (label.toLowerCase().includes(outcome.toLowerCase()) || outcome.toLowerCase().includes(label.toLowerCase())),
        )
      })
      const chosen = match ?? outs[0]
      next = chosen.target
      branch = ((chosen.data as { label?: string } | undefined)?.label)
    } else if (outs.length > 1) {
      // Non-action split — pick branch weighted uniformly.
      const picked = outs[Math.floor(rand() * outs.length)]
      next = picked.target
      branch = ((picked.data as { label?: string } | undefined)?.label)
    } else if (outs.length === 1) {
      next = outs[0].target
    } else {
      next = null
    }

    out.push({ nodeId: cursor, branch, outcome, tOffsetMinutes: t })
    // Advance time — waits contribute more, actions less.
    const nodeType = node.type
    if (nodeType === "wait") {
      const dur = ((node.data as { duration?: number } | undefined)?.duration) ?? 24
      const unit = ((node.data as { unit?: string } | undefined)?.unit) ?? "hours"
      const mult = unit === "minutes" ? 1 : unit === "hours" ? 60 : 1440
      t += dur * mult
    } else {
      t += 1
    }
    cursor = next
  }
  return out
}

/**
 * Determine a borrower's final journey state from their path's terminal node.
 */
function classifyFinal(
  path: ReturnType<typeof walkPath>,
  byId: Map<string, Node>,
): SimulatedTrace["final"] {
  const last = path[path.length - 1]
  if (!last) return "errored"
  const node = byId.get(last.nodeId)
  if (!node) return "errored"
  if (node.type === "end") {
    const outcome = ((node.data as { outcome?: string } | undefined)?.outcome) ?? ""
    if (/convert|complete/i.test(outcome)) return "converted"
    if (/exit|unresponsive|exhausted/i.test(outcome)) return "exited"
    return "converted"
  }
  return "still_active"
}

/**
 * Main runner. Returns a fully-populated SimulationResult.
 */
export function runSimulation(input: RunInputs): SimulationResult {
  const { journeyId, cohort, cohortLabel, cohortMode, cap, nodes, edges, outcomeChoices } = input
  const capped = cohort.slice(0, cap)
  const entered = capped.length

  // Build node lookups
  const byId = new Map(nodes.map((n) => [n.id, n] as const))
  const outgoing = new Map<string, Edge[]>()
  for (const e of edges) {
    const arr = outgoing.get(e.source) ?? []
    arr.push(e)
    outgoing.set(e.source, arr)
  }

  // Find entry
  const entry = nodes.find(
    (n) => n.type === "trigger" || String(((n.data ?? {}) as { blockType?: string }).blockType ?? "").endsWith("_trigger"),
  )

  const perNode: Record<string, NodeSimulation> = {}
  const traces: Record<string, SimulatedTrace> = {}

  for (const n of nodes) {
    perNode[n.id] = {
      nodeId: n.id,
      count: 0,
      percent: 0,
      branchCounts: {},
      emptyAttributes: [],
      costAed: 0,
      outcomePreset: outcomeChoices[n.id] ?? "realistic",
      sample: [],
    }
  }

  if (!entry || entered === 0) {
    return finalizeResult({
      id: `sim_${hashCode(journeyId + Date.now())}_${Math.floor(Math.random() * 9999)}`,
      journeyId,
      cohortLabel,
      cohortMode,
      cohortSize: cohort.length,
      entered,
      perNode,
      traces,
      nodes,
      outcomeChoices,
    })
  }

  // Track per-node empty-tag counts across the cohort.
  const emptyTagCounts: Record<string, Map<string, number>> = {}
  for (const n of nodes) emptyTagCounts[n.id] = new Map()

  // Simulate each borrower
  for (let i = 0; i < capped.length; i++) {
    const b = capped[i]
    const seed = hashCode(journeyId + b.id)
    const rand = mulberry32(seed)
    const path = walkPath(entry.id, byId, outgoing, outcomeChoices, rand)
    const trace: SimulatedTrace = {
      borrowerId: b.id,
      borrowerName: b.name,
      dealId: `deal-${b.id.slice(-4)}-${(seed % 9000) + 1000}`,
      hops: path.map((h) => {
        const nd = byId.get(h.nodeId)
        const label = ((nd?.data as { label?: string } | undefined)?.label) ?? h.nodeId
        return { nodeId: h.nodeId, label, branch: h.branch, outcome: h.outcome, tOffsetMinutes: h.tOffsetMinutes }
      }),
      final: classifyFinal(path, byId),
    }
    // Store first 200 traces
    if (Object.keys(traces).length < 200) traces[b.id] = trace

    for (const hop of path) {
      const sim = perNode[hop.nodeId]
      if (!sim) continue
      sim.count += 1
      if (hop.branch) {
        sim.branchCounts![hop.branch] = (sim.branchCounts![hop.branch] ?? 0) + 1
      }
      // Sample up to 200 borrowers per node — matches Eternals' "showing first 200"
      if (sim.sample.length < 200) {
        sim.sample.push(sampleFor(b, trace.dealId))
      }
      // Empty-attribute scan
      const node = byId.get(hop.nodeId)
      if (node) {
        const empties = findEmptyTags(node, b)
        for (const tag of empties) {
          const m = emptyTagCounts[hop.nodeId]
          m.set(tag, (m.get(tag) ?? 0) + 1)
        }
      }
    }
  }

  // Finalize per-node data — percents, empty-tag %, cost estimates.
  for (const n of nodes) {
    const sim = perNode[n.id]
    sim.percent = entered === 0 ? 0 : Math.round((sim.count / entered) * 1000) / 10
    const empties: Array<{ tag: string; percent: number }> = []
    for (const [tag, cnt] of emptyTagCounts[n.id]) {
      const pct = sim.count === 0 ? 0 : Math.round((cnt / sim.count) * 1000) / 10
      if (pct > 0) empties.push({ tag, percent: pct })
    }
    sim.emptyAttributes = empties.sort((a, b) => b.percent - a.percent).slice(0, 3)
    const data = (n.data ?? {}) as Record<string, unknown>
    sim.costAed = estimateNodeCost(data.actionType as string | undefined, sim.count)
  }

  return finalizeResult({
    id: `sim_${hashCode(journeyId + Date.now())}_${Math.floor(Math.random() * 9999)}`,
    journeyId,
    cohortLabel,
    cohortMode,
    cohortSize: cohort.length,
    entered,
    perNode,
    traces,
    nodes,
    outcomeChoices,
  })
}

function sampleFor(b: Borrower, dealId: string): SimulationSample {
  return {
    borrowerId: b.id,
    borrowerName: b.name,
    dealId,
    dpd: b.dpdBucket,
    outstanding: b.outstanding,
    product: b.product,
    status: b.status,
  }
}

interface FinalizeInput {
  id: string
  journeyId: string
  cohortLabel: string
  cohortMode: CohortMode
  cohortSize: number
  entered: number
  perNode: Record<string, NodeSimulation>
  traces: Record<string, SimulatedTrace>
  nodes: Node[]
  outcomeChoices: Record<string, OutcomePresetId>
}

function finalizeResult(input: FinalizeInput): SimulationResult {
  const totalCostAed = Object.values(input.perNode).reduce(
    (sum, n) => sum + (n.costAed ?? 0),
    0,
  )
  return {
    id: input.id,
    createdAt: new Date().toISOString(),
    cohortLabel: input.cohortLabel,
    cohortMode: input.cohortMode,
    cohortSize: input.cohortSize,
    entered: input.entered,
    perNode: input.perNode,
    totalCostAed,
    traces: input.traces,
    nodeIdsSnapshot: input.nodes.map((n) => n.id),
    outcomeChoices: input.outcomeChoices,
  }
}

/**
 * Collect action nodes that need outcome-preset configuration.
 */
export function actionNodesForOutcomeConfig(nodes: Node[]): Array<{ id: string; label: string; kind: keyof typeof OUTCOME_DEFAULTS }> {
  const out: Array<{ id: string; label: string; kind: keyof typeof OUTCOME_DEFAULTS }> = []
  for (const n of nodes) {
    const data = (n.data ?? {}) as Record<string, unknown>
    const at = data.actionType as string | undefined
    if (at === "call" || at === "email" || at === "sms" || at === "whatsapp") {
      out.push({
        id: n.id,
        label: (data.label as string) ?? n.id,
        kind: at,
      })
    }
  }
  return out
}
