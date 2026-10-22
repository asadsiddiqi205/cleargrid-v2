/**
 * Global feature-flag mechanism for frontend-only prototype gating.
 *
 * This complements the per-lender flag mechanism in `src/data/lenders.ts`
 * (which is scoped to a lender's borrowers). Journey-canvas features that
 * depend on backend readiness, not on which lender is active, live here.
 *
 * Flags default to the values in `DEFAULT_FEATURE_FLAGS` and can be
 * overridden through `localStorage` under the `cg_feature_flags` key.
 * A `cg-feature-flags-changed` CustomEvent fires whenever a flag is
 * written so open editors can re-render live.
 */

export interface FeatureFlags {
  /**
   * When true (default), the following palette entries are hidden from
   * node creation and quarantined on the canvas with an "Unavailable"
   * badge:
   *   - Inbound Message (`inbound_message_trigger`)
   *   - Incoming Call   (`incoming_call_trigger`)
   *   - Send Slack      (`send_slack`)
   *   - WhatsApp / OTT  (`whatsapp_ott`)
   * Existing journeys that contain them still load, but authors can't
   * add new instances until the flag is turned off.
   */
  hideUntestedNodes: boolean
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  hideUntestedNodes: true,
}

const STORAGE_KEY = "cg_feature_flags"
const CHANGED_EVENT = "cg-feature-flags-changed"

/**
 * Hardcoded list of node palette entries considered "untested" and
 * therefore gated behind `hideUntestedNodes`. Exported so the canvas
 * duplicate-guard and the Unavailable badge logic agree.
 */
export const UNTESTED_BLOCK_TYPES: ReadonlySet<string> = new Set([
  "inbound_message_trigger",
  "incoming_call_trigger",
  "whatsapp_ott",
  "send_slack",
])

export function readFeatureFlags(): FeatureFlags {
  if (typeof window === "undefined") return { ...DEFAULT_FEATURE_FLAGS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<FeatureFlags>) : {}
    return { ...DEFAULT_FEATURE_FLAGS, ...parsed }
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS }
  }
}

export function writeFeatureFlags(next: Partial<FeatureFlags>): void {
  if (typeof window === "undefined") return
  try {
    const merged = { ...readFeatureFlags(), ...next }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT))
  } catch {
    /* noop */
  }
}

export function featureFlag<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
  return readFeatureFlags()[flag]
}

/** Convenience: true when `blockType` is both untested and hidden by the flag. */
export function isBlockHiddenByFlag(blockType: string | undefined): boolean {
  if (!blockType) return false
  if (!UNTESTED_BLOCK_TYPES.has(blockType)) return false
  return featureFlag("hideUntestedNodes")
}
