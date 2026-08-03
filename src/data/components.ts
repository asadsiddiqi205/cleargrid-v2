/**
 * Component (Template Block) data model + localStorage-backed store.
 *
 * Components are reusable subgraphs. A Master defines the canonical
 * subgraph + locked properties. An Instance is a reference to a master,
 * placed on a journey canvas, with per-property Overrides.
 *
 * Live inheritance model — modeled after Figma components:
 *   - Auto-propagate on master change (no opt-in gate)
 *   - Any property overridable by default (master author can lock)
 *   - Overrides win against master changes
 *   - Instances editable inline; edits become overrides
 */

import type { Node, Edge } from "@xyflow/react"

/* ---------------------------------------------------------------------- */
/* Types                                                                  */
/* ---------------------------------------------------------------------- */

export type ComponentCategory =
  | "Post-call"
  | "Compliance"
  | "Routing"
  | "Retry"
  | "Notification"
  | "Custom"

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  "Post-call",
  "Compliance",
  "Routing",
  "Retry",
  "Notification",
  "Custom",
]

export interface ComponentPort {
  id: string
  label: string
}

export interface LockedProperty {
  nodeId: string
  propertyPath: string
  reason?: string
}

export interface ComponentPublishHistoryEntry {
  version: number
  publishedAt: string // ISO
  authorId: string
  note?: string
}

export interface ComponentMaster {
  id: string
  name: string
  description: string
  category: ComponentCategory
  version: number
  createdAt: string // ISO
  updatedAt: string // ISO
  authorId: string
  nodes: Node[]
  edges: Edge[]
  lockedProperties: LockedProperty[]
  inputPort: { label: string }
  outputPorts: ComponentPort[]
  publishHistory: ComponentPublishHistoryEntry[]
}

export interface ComponentOverride {
  nodeId: string
  propertyPath: string
  value: unknown
  overriddenAt: string // ISO
}

/**
 * The `node.data` shape for a `component_group` node on a journey canvas.
 *
 * A component "instance" is now expressed as a ReactFlow parent node (this
 * type) whose children are the master's inner nodes — each rendered with
 * its normal renderer (TriggerNode/ActionNode/…). The group node itself
 * carries the component reference + overrides.
 */
export interface ComponentInstanceData {
  kind: "component_instance"
  componentId: string
  componentVersion: number
  overrides: ComponentOverride[]
  /** Denormalized for label/tooltip perf. */
  name: string
  category: ComponentCategory
  outputPorts: ComponentPort[]
}

/**
 * Marker placed on each child node's `data` when it lives inside a component
 * instance. Enables:
 *   - The child renderer to draw a violet dot (Part 4.2)
 *   - The config-panel wrapper to know which instance / master-node-id to
 *     resolve for override tracking (Part 4.3)
 */
export interface ComponentChildMarker {
  /** ID of the parent `component_group` node on the canvas. */
  componentInstanceId: string
  /** ID of this node WITHIN the master's node list. */
  masterNodeId: string
  /** Denormalized for the drift indicator. */
  componentId: string
}

/* ---------------------------------------------------------------------- */
/* localStorage keys                                                      */
/* ---------------------------------------------------------------------- */

const MASTERS_KEY = "cleargrid:components:masters"
const SEED_MARKER_KEY = "cleargrid:components:seeded"

/* ---------------------------------------------------------------------- */
/* Store                                                                  */
/* ---------------------------------------------------------------------- */

function readMasters(): ComponentMaster[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(MASTERS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ComponentMaster[]
  } catch {
    return []
  }
}

function writeMasters(list: ComponentMaster[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(MASTERS_KEY, JSON.stringify(list))
    // Broadcast so other tabs / panels can rerender.
    window.dispatchEvent(new CustomEvent("cg:components:changed"))
  } catch {
    /* quota — ignore */
  }
}

export function listMasters(): ComponentMaster[] {
  return readMasters().sort((a, b) =>
    a.category === b.category
      ? a.name.localeCompare(b.name)
      : a.category.localeCompare(b.category),
  )
}

export function getMasterById(id: string): ComponentMaster | undefined {
  return readMasters().find((m) => m.id === id)
}

export function saveMaster(master: ComponentMaster): void {
  const list = readMasters()
  const i = list.findIndex((m) => m.id === master.id)
  const updated = { ...master, updatedAt: new Date().toISOString() }
  if (i >= 0) list[i] = updated
  else list.push(updated)
  writeMasters(list)
}

export function deleteMaster(id: string): void {
  writeMasters(readMasters().filter((m) => m.id !== id))
}

/**
 * Publish a new version of a master:
 *   - increments version
 *   - appends a publish-history entry
 *   - broadcasts change so instances repaint immediately
 *
 * Returns the new version number.
 */
export function publishMaster(id: string, note?: string): number | undefined {
  const list = readMasters()
  const i = list.findIndex((m) => m.id === id)
  if (i < 0) return undefined
  const current = list[i]
  const next: ComponentMaster = {
    ...current,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    publishHistory: [
      {
        version: current.version + 1,
        publishedAt: new Date().toISOString(),
        authorId: current.authorId,
        note,
      },
      ...current.publishHistory,
    ].slice(0, 20),
  }
  list[i] = next
  writeMasters(list)
  return next.version
}

/* ---------------------------------------------------------------------- */
/* Runtime resolution                                                     */
/* ---------------------------------------------------------------------- */

/**
 * Apply overrides onto a master's nodes. Locked properties always take the
 * master value; overrides on locked properties are silently ignored (per
 * the design decision).
 */
export function resolveInstance(
  master: ComponentMaster,
  overrides: ComponentOverride[],
): { nodes: Node[]; edges: Edge[] } {
  const lockedSet = new Set(
    master.lockedProperties.map((lp) => `${lp.nodeId}::${lp.propertyPath}`),
  )
  const overrideMap = new Map<string, ComponentOverride>()
  for (const o of overrides) {
    const key = `${o.nodeId}::${o.propertyPath}`
    if (lockedSet.has(key)) continue // locked master value wins
    overrideMap.set(key, o)
  }

  const nodes = master.nodes.map((n) => {
    const nextData = { ...(n.data ?? {}) } as Record<string, unknown>
    for (const o of overrides) {
      if (o.nodeId !== n.id) continue
      if (lockedSet.has(`${o.nodeId}::${o.propertyPath}`)) continue
      setByPath(nextData, o.propertyPath, o.value)
    }
    return { ...n, data: nextData }
  })

  return { nodes, edges: master.edges }
}

export function isPropertyLocked(
  master: ComponentMaster,
  nodeId: string,
  propertyPath: string,
): boolean {
  return master.lockedProperties.some(
    (lp) => lp.nodeId === nodeId && lp.propertyPath === propertyPath,
  )
}

export function getOverride(
  overrides: ComponentOverride[],
  nodeId: string,
  propertyPath: string,
): ComponentOverride | undefined {
  return overrides.find(
    (o) => o.nodeId === nodeId && o.propertyPath === propertyPath,
  )
}

export function upsertOverride(
  overrides: ComponentOverride[],
  entry: Omit<ComponentOverride, "overriddenAt">,
): ComponentOverride[] {
  const idx = overrides.findIndex(
    (o) => o.nodeId === entry.nodeId && o.propertyPath === entry.propertyPath,
  )
  const next: ComponentOverride = { ...entry, overriddenAt: new Date().toISOString() }
  if (idx >= 0) {
    const clone = overrides.slice()
    clone[idx] = next
    return clone
  }
  return [...overrides, next]
}

export function removeOverride(
  overrides: ComponentOverride[],
  nodeId: string,
  propertyPath: string,
): ComponentOverride[] {
  return overrides.filter(
    (o) => !(o.nodeId === nodeId && o.propertyPath === propertyPath),
  )
}

/* ---------------------------------------------------------------------- */
/* Dotted-path helpers (compat with node.data structure)                  */
/* ---------------------------------------------------------------------- */

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined
  const parts = path.split(".")
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".")
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (typeof cur[p] !== "object" || cur[p] === null) {
      cur[p] = {}
    }
    cur = cur[p] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

/* ---------------------------------------------------------------------- */
/* Instance factory                                                       */
/* ---------------------------------------------------------------------- */

export function createInstanceData(master: ComponentMaster): ComponentInstanceData {
  return {
    kind: "component_instance",
    componentId: master.id,
    componentVersion: master.version,
    overrides: [],
    name: master.name,
    category: master.category,
    outputPorts: master.outputPorts,
  }
}

/**
 * Given a master + position + a fresh unique id for the group, produce the
 * full canvas payload for inserting a component instance:
 *   - one `component_group` node (the violet frame)
 *   - one child node per master node, each with `parentId = group.id`,
 *     `extent: "parent"`, and a ComponentChildMarker on data
 *   - the master's edges, rewired to reference the child ids
 *
 * Positions on children are RELATIVE to the parent (ReactFlow requirement),
 * shifted below the group header. The group's outer size auto-fits.
 */
export function buildInstanceCanvasPayload(
  master: ComponentMaster,
  groupPos: { x: number; y: number },
  groupId: string,
  overrides: ComponentOverride[] = [],
): {
  groupNode: import("@xyflow/react").Node
  childNodes: import("@xyflow/react").Node[]
  childEdges: import("@xyflow/react").Edge[]
} {
  const HEADER_H = 56
  const PAD_X = 24
  const PAD_Y = 20

  // Bounds of the master's node positions so we can size the group.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const n of master.nodes) {
    const x = n.position?.x ?? 0
    const y = n.position?.y ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + 300) // approximate node width
    maxY = Math.max(maxY, y + 140) // approximate node height
  }
  if (!isFinite(minX)) {
    minX = 0
    minY = 0
    maxX = 320
    maxY = 200
  }
  const width = Math.max(340, maxX - minX + PAD_X * 2)
  const height = Math.max(200, maxY - minY + PAD_Y * 2 + HEADER_H)

  const childIdMap = new Map<string, string>()
  const childNodes = master.nodes.map((mn) => {
    const childId = `${groupId}__${mn.id}`
    childIdMap.set(mn.id, childId)
    const resolvedData = applyOverridesToNodeData(
      (mn.data ?? {}) as Record<string, unknown>,
      mn.id,
      overrides,
      master.lockedProperties,
    )
    return {
      ...mn,
      id: childId,
      parentId: groupId,
      extent: "parent" as const,
      // Relative positions inside the group; shift below the header.
      position: {
        x: ((mn.position?.x ?? 0) - minX) + PAD_X,
        y: ((mn.position?.y ?? 0) - minY) + PAD_Y + HEADER_H,
      },
      data: {
        ...resolvedData,
        _componentInstance: {
          componentInstanceId: groupId,
          masterNodeId: mn.id,
          componentId: master.id,
        },
      } as Record<string, unknown>,
      // Prevent selection/deletion via the delete key while inside a component.
      deletable: false,
      draggable: false,
    }
  }) as import("@xyflow/react").Node[]

  const childEdges = master.edges.map((e) => ({
    ...e,
    id: `${groupId}__${e.id}`,
    source: childIdMap.get(e.source) ?? e.source,
    target: childIdMap.get(e.target) ?? e.target,
  })) as import("@xyflow/react").Edge[]

  const groupNode = {
    id: groupId,
    type: "component_group",
    position: groupPos,
    data: createInstanceData(master) as unknown as Record<string, unknown>,
    style: { width, height },
    // Group node is selectable (opens the instance panel) but not deletable
    // through the same delete-key path as regular nodes; canvas guards it.
    zIndex: 0,
  } as import("@xyflow/react").Node

  return { groupNode, childNodes, childEdges }
}

/** Apply overrides inline to a node's data map (dotted-path aware). */
function applyOverridesToNodeData(
  data: Record<string, unknown>,
  masterNodeId: string,
  overrides: ComponentOverride[],
  lockedProperties: LockedProperty[],
): Record<string, unknown> {
  const lockedSet = new Set(
    lockedProperties
      .filter((lp) => lp.nodeId === masterNodeId)
      .map((lp) => lp.propertyPath),
  )
  const next = { ...data }
  for (const o of overrides) {
    if (o.nodeId !== masterNodeId) continue
    if (lockedSet.has(o.propertyPath)) continue
    setByPathLocal(next, o.propertyPath, o.value)
  }
  return next
}

function setByPathLocal(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".")
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {}
    cur = cur[p] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

/* ---------------------------------------------------------------------- */
/* Seed library — 5 starter components                                    */
/* ---------------------------------------------------------------------- */

function seedNode(
  id: string,
  type: string,
  blockType: string,
  label: string,
  x: number,
  y: number,
  extraData: Record<string, unknown> = {},
): Node {
  return {
    id,
    type,
    position: { x, y },
    data: { label, blockType, ...extraData } as Record<string, unknown>,
  } as Node
}

function seedEdge(
  id: string,
  source: string,
  target: string,
  label?: string,
): Edge {
  return {
    id,
    source,
    target,
    ...(label ? { label, data: { label } } : {}),
  } as Edge
}

export const SEED_MASTERS: ComponentMaster[] = [
  {
    id: "cmp-callback-handling",
    name: "Callback Handling",
    description: "Capture and schedule borrower-requested callbacks with compliance guard",
    category: "Post-call",
    version: 1,
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z",
    authorId: "system",
    inputPort: { label: "Callback captured" },
    outputPorts: [
      { id: "out-completed", label: "Call complete" },
      { id: "out-blocked", label: "Blocked by compliance" },
    ],
    lockedProperties: [
      { nodeId: "cb-guard", propertyPath: "checks.dnd", reason: "DND is a lender-config setting" },
      { nodeId: "cb-guard", propertyPath: "checks.contactWindow", reason: "Contact window is a lender-config setting" },
      { nodeId: "cb-guard", propertyPath: "checks.dnc", reason: "DNC list is regulatory" },
    ],
    publishHistory: [
      { version: 1, publishedAt: "2026-06-01T09:00:00Z", authorId: "system", note: "Initial version" },
    ],
    nodes: [
      seedNode("cb-wait", "wait", "wait_until_date", "Wait until callback time", 240, 40, {
        mode: "dynamic",
        source: "borrower.callback_scheduled_at",
      }),
      seedNode("cb-guard", "generic", "compliance_guard", "Compliance guard", 240, 180, {
        checks: { dnd: true, contactWindow: true, dnc: true },
      }),
      seedNode("cb-call", "action", "trigger_ai_call", "Trigger AI call", 240, 320, {
        actionType: "call",
      }),
    ],
    edges: [
      seedEdge("e-cb-1", "cb-wait", "cb-guard"),
      seedEdge("e-cb-2", "cb-guard", "cb-call", "Passed"),
    ],
  },
  {
    id: "cmp-redial-escalation",
    name: "Redial with Escalation",
    description: "AI call with escalating retry intervals — 30m / 2h / 24h, exit on PTP",
    category: "Retry",
    version: 1,
    createdAt: "2026-06-05T09:00:00Z",
    updatedAt: "2026-06-05T09:00:00Z",
    authorId: "system",
    inputPort: { label: "Enter" },
    outputPorts: [
      { id: "out-ptp", label: "PTP captured" },
      { id: "out-unreachable", label: "Unreachable after 3 attempts" },
    ],
    lockedProperties: [],
    publishHistory: [
      { version: 1, publishedAt: "2026-06-05T09:00:00Z", authorId: "system" },
    ],
    nodes: [
      seedNode("rd-call", "action", "trigger_ai_call", "Trigger AI call", 200, 40, {
        actionType: "call",
        redialEnabled: true,
        redialMaxAttempts: 3,
        redialIntervalMode: "escalating",
        redialEscalatingPreset: "gentle",
      }),
      seedNode("rd-split", "split", "action_path_split", "Split on outcome", 200, 200),
    ],
    edges: [
      seedEdge("e-rd-1", "rd-call", "rd-split"),
    ],
  },
  {
    id: "cmp-consent-preflight",
    name: "Consent Pre-flight",
    description: "Consent + DNC check before any outbound communication",
    category: "Compliance",
    version: 1,
    createdAt: "2026-06-08T09:00:00Z",
    updatedAt: "2026-06-08T09:00:00Z",
    authorId: "system",
    inputPort: { label: "Enter" },
    outputPorts: [
      { id: "out-allowed", label: "Allowed" },
      { id: "out-blocked", label: "Blocked" },
    ],
    lockedProperties: [
      { nodeId: "cp-dnc", propertyPath: "list", reason: "DNC list is regulatory — pull from lender config" },
      { nodeId: "cp-dnc", propertyPath: "matchMode", reason: "DNC match rules are compliance-controlled" },
    ],
    publishHistory: [
      { version: 1, publishedAt: "2026-06-08T09:00:00Z", authorId: "system" },
    ],
    nodes: [
      seedNode("cp-dnc", "generic", "dnc_gate", "DNC gate", 200, 40, {
        list: "regulatory_default",
        matchMode: "strict",
      }),
      seedNode("cp-consent", "condition", "consent_check", "Consent check", 200, 180, {
        conditionType: "consent",
      }),
    ],
    edges: [
      seedEdge("e-cp-1", "cp-dnc", "cp-consent", "Cleared"),
    ],
  },
  {
    id: "cmp-preferred-channel",
    name: "Preferred Channel Routing",
    description: "Route by borrower's preferred channel with reachability fallbacks",
    category: "Routing",
    version: 1,
    createdAt: "2026-06-12T09:00:00Z",
    updatedAt: "2026-06-12T09:00:00Z",
    authorId: "system",
    inputPort: { label: "Enter" },
    outputPorts: [
      { id: "out-call", label: "Call" },
      { id: "out-email", label: "Email" },
      { id: "out-sms", label: "SMS" },
      { id: "out-whatsapp", label: "WhatsApp" },
    ],
    lockedProperties: [],
    publishHistory: [
      { version: 1, publishedAt: "2026-06-12T09:00:00Z", authorId: "system" },
    ],
    nodes: [
      seedNode("pc-router", "split", "best_channel", "Best channel", 200, 40, {
        strategy: "preferred_with_fallback",
      }),
    ],
    edges: [],
  },
  {
    id: "cmp-post-ptp-followup",
    name: "Post-PTP Follow-up",
    description: "PTP reminder → break check → escalate to human on broken PTP",
    category: "Post-call",
    version: 1,
    createdAt: "2026-06-15T09:00:00Z",
    updatedAt: "2026-06-15T09:00:00Z",
    authorId: "system",
    inputPort: { label: "PTP captured" },
    outputPorts: [
      { id: "out-honored", label: "PTP honored" },
      { id: "out-broken", label: "PTP broken · escalated" },
    ],
    lockedProperties: [],
    publishHistory: [
      { version: 1, publishedAt: "2026-06-15T09:00:00Z", authorId: "system" },
    ],
    nodes: [
      seedNode("pp-wait-ptp", "wait", "wait_until_date", "Wait until PTP date", 200, 40, {
        mode: "dynamic",
        source: "deal.ptp_date",
      }),
      seedNode("pp-sms", "action", "send_sms", "PTP reminder SMS", 200, 180, {
        actionType: "sms",
        template: "PTP reminder",
      }),
      seedNode("pp-wait-1d", "wait", "wait_duration", "Wait 1 day", 200, 320, {
        duration: 1,
        unit: "days",
      }),
      seedNode("pp-event", "condition", "has_done_event", "Payment received?", 200, 460, {
        conditionType: "has_done_event",
        event: "payment_received",
      }),
      seedNode("pp-agent", "action", "assign_agent", "Escalate to human", 480, 460, {
        actionType: "agent",
      }),
    ],
    edges: [
      seedEdge("e-pp-1", "pp-wait-ptp", "pp-sms"),
      seedEdge("e-pp-2", "pp-sms", "pp-wait-1d"),
      seedEdge("e-pp-3", "pp-wait-1d", "pp-event"),
      seedEdge("e-pp-4", "pp-event", "pp-agent", "No"),
    ],
  },
]

/**
 * First-run seeding. Runs once per browser (marker in localStorage). Safe to
 * call on every module load — no-op after the first success.
 */
export function seedComponentsIfEmpty(): void {
  if (typeof window === "undefined") return
  try {
    if (window.localStorage.getItem(SEED_MARKER_KEY)) return
    // If there are already user-created components, honor them; don't clobber.
    if (readMasters().length === 0) {
      writeMasters(SEED_MASTERS)
    }
    window.localStorage.setItem(SEED_MARKER_KEY, "1")
  } catch {
    /* ignore */
  }
}

/**
 * Reset the store to the seed set. Testing helper — exposed to the UI as
 * an admin action if we ever want it.
 */
export function resetSeedComponents(): void {
  if (typeof window === "undefined") return
  writeMasters(SEED_MASTERS)
}

/* ---------------------------------------------------------------------- */
/* Instance-usage index (which journeys use which components)             */
/* ---------------------------------------------------------------------- */

export interface InstanceUsage {
  journeyId: string
  journeyName: string
  instanceId: string
}

/**
 * Given a set of journey flows + names, find every component instance and
 * group by componentId. Used by the master editor sidebar + the delete-guard.
 */
export function indexInstancesAcross(
  journeys: Array<{ id: string; name: string; nodes: Node[] }>,
): Record<string, InstanceUsage[]> {
  const out: Record<string, InstanceUsage[]> = {}
  for (const j of journeys) {
    for (const n of j.nodes) {
      const d = (n.data ?? {}) as { kind?: string; componentId?: string }
      if (d.kind === "component_instance" && typeof d.componentId === "string") {
        const list = out[d.componentId] ?? (out[d.componentId] = [])
        list.push({ journeyId: j.id, journeyName: j.name, instanceId: n.id })
      }
    }
  }
  return out
}
