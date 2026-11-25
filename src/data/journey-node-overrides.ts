/**
 * Journey node-data overrides — localStorage layer that survives a
 * reload for authors editing seeded journey flows in the prototype.
 *
 * The canonical shape of a node's data stays in src/data/journeys.ts.
 * This file layers a per-node data patch on top, keyed by journey id
 * and node id, so sender profile picks (and any other edits authors
 * make on the canvas) persist across page loads.
 *
 * Patches are shallow merges onto node.data. Fields explicitly set to
 * `null` here clear a seeded value; everything else just overrides.
 *
 * TODO: backend stores the authoritative journey; this layer disappears
 * once we're reading from it.
 */

const KEY_PREFIX = "cg_journey_node_overrides::"

export type NodeDataOverride = Record<string, unknown>
export type JourneyNodeOverrides = Record<string, NodeDataOverride>

function storageKey(journeyId: string) {
  return `${KEY_PREFIX}${journeyId}`
}

export function loadJourneyNodeOverrides(journeyId: string): JourneyNodeOverrides {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(storageKey(journeyId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === "object") {
      return parsed as JourneyNodeOverrides
    }
    return {}
  } catch {
    return {}
  }
}

export function saveJourneyNodeOverrides(
  journeyId: string,
  overrides: JourneyNodeOverrides,
): void {
  if (typeof window === "undefined") return
  try {
    const entries = Object.entries(overrides).filter(
      ([, patch]) => patch && Object.keys(patch).length > 0,
    )
    if (entries.length === 0) {
      window.localStorage.removeItem(storageKey(journeyId))
      return
    }
    window.localStorage.setItem(
      storageKey(journeyId),
      JSON.stringify(Object.fromEntries(entries)),
    )
  } catch {
    // Non-fatal: localStorage can be full or disabled.
  }
}

/** Apply persisted overrides on top of a seed node's data. Shallow
 *  merge so individual fields win without stomping unrelated ones. */
export function applyOverrideToData(
  seedData: Record<string, unknown> | undefined,
  patch: NodeDataOverride | undefined,
): Record<string, unknown> {
  if (!patch) return (seedData ?? {}) as Record<string, unknown>
  return { ...(seedData ?? {}), ...patch } as Record<string, unknown>
}

/** Field allowlist: only these edits persist. Keeps storage small and
 *  keeps us from accidentally serializing transient state. */
export const PERSISTED_FIELDS = new Set<string>([
  "senderProfileId",
  "senderFromName",
  "senderFromEmail",
  "senderReplyTo",
  "template",
  "composeMode",
  "subject",
  "body",
  "trackedLinks",
  "recipientRule",
  "senderProfileFallback",
  "customFromName",
])

/** Build a shallow patch for one node by taking only persisted fields
 *  whose values differ from the seed. */
export function diffNodePatch(
  seedData: Record<string, unknown> | undefined,
  currentData: Record<string, unknown> | undefined,
): NodeDataOverride {
  const seed = (seedData ?? {}) as Record<string, unknown>
  const current = (currentData ?? {}) as Record<string, unknown>
  const patch: NodeDataOverride = {}
  for (const field of PERSISTED_FIELDS) {
    const seedVal = seed[field]
    const curVal = current[field]
    if (!equalish(seedVal, curVal)) {
      patch[field] = curVal
    }
  }
  return patch
}

function equalish(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}
