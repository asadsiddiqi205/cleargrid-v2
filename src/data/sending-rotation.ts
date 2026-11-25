/**
 * Journey rotation that skips unhealthy and used-up domains.
 *
 * Journey sends rotate `prefix@domain` across the sender profile's
 * domain list; this file owns the pure rules that pick one.
 *
 * TODO: backend owns the real rotation at run time. This frontend
 * module is the spec the backend mirrors, and the source of truth for
 * every preview on the Send Email node.
 */

import {
  getSentToday,
  getWarmyDomainByName,
  recordCommandSend,
  type WarmyProvider,
} from "@/data/warmy"
import { statusForDomain, type DomainStatus } from "@/data/domain-health"
import type { SenderProfile } from "@/data/sender-profiles"
import { WARMY_THRESHOLDS } from "@/data/warmy-thresholds"

/* ──────────────────────── Borrower provider ──────────────────────── */

const GMAIL = /^(gmail\.com|googlemail\.com)$/i
const OUTLOOK = /^(outlook\.(com|co\.[a-z]{2,3})|hotmail\..+|live\..+|msn\.com)$/i
const YAHOO = /^yahoo\./i

export type BorrowerProvider =
  | "gmail"
  | "outlook"
  | "yahoo"
  | "other"

export function detectBorrowerProvider(email: string): BorrowerProvider {
  const at = email.lastIndexOf("@")
  if (at < 0) return "other"
  const d = email.slice(at + 1).toLowerCase()
  if (GMAIL.test(d)) return "gmail"
  if (OUTLOOK.test(d)) return "outlook"
  if (YAHOO.test(d)) return "yahoo"
  // TODO: MX lookup to split Other into Google Workspace / Microsoft 365.
  return "other"
}

/** Volume left today for a (domain, provider) pair. Null means the
 *  domain has no Warmy data AND no ops cap — treat as unlimited. */
function volumeLeft(domain: string, provider: BorrowerProvider): number | null {
  const w = getWarmyDomainByName(domain)
  if (!w) {
    // No Warmy data. Fall back to ops cap on the Command side only
    // (zero caps today — the senderProfile doesn't carry it).
    return null
  }
  let recommended: number | null
  if (provider === "other") {
    const gw = w.recommended_volume_today.google_workspace
    const ms = w.recommended_volume_today.microsoft_365
    // Lower of the two numbers; null if one of them is missing_data.
    if (gw.volume == null || ms.volume == null) {
      recommended = null
    } else {
      recommended = Math.min(gw.volume, ms.volume)
    }
  } else {
    const rv = w.recommended_volume_today[provider]
    recommended = rv.volume
  }
  const warmyProvider: WarmyProvider = provider === "other" ? "google_workspace" : provider
  const sent = getSentToday(domain, warmyProvider)
  // Warmy says 0 → no volume for that provider.
  if (recommended === 0) return 0
  const opsCap = w.ops_daily_cap_per_provider
  const effectiveCap =
    recommended == null && opsCap == null
      ? null
      : Math.min(recommended ?? Infinity, opsCap ?? Infinity)
  if (effectiveCap == null) return null
  return Math.max(0, effectiveCap - sent)
}

/* ────────────────────── pickSendingDomain ───────────────────────── */

export type PickSkipReason =
  | "blocked"
  | "paused"
  | "used_up"
  | "warmy_zero"
  | "stale_warmy_fallback"

export interface DomainEligibility {
  domain: string
  status: DomainStatus
  paused: boolean
  provider: BorrowerProvider
  volumeLeft: number | null
  eligible: boolean
  skipReason?: PickSkipReason
}

export interface PickResult {
  profileId: string
  provider: BorrowerProvider
  pickedDomain: string | null
  pickedPrefix: string
  pickedAddress: string | null
  /** Why the pick was made (healthy > watch > at risk fallback). */
  tier: "healthy_or_watch" | "at_risk_fallback" | "no_eligible"
  eligibility: DomainEligibility[]
}

/** The rotation seed: today's date + profile id. Produces the same
 *  starting index every time within a day so a journey that previews
 *  the pick gets the same answer the sender will. TODO: backend owns
 *  the real seed.
 */
function dailyIndex(profileId: string): number {
  const d = new Date()
  const key = `${profileId}|${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}

export function evaluateProfileDomains(
  profile: SenderProfile,
  provider: BorrowerProvider,
): DomainEligibility[] {
  return profile.domains.map((d) => {
    const s = statusForDomain(d.domain)
    const left = volumeLeft(d.domain, provider)
    let eligible = true
    let skipReason: PickSkipReason | undefined
    if (s.status === "blocked") {
      eligible = false
      skipReason = "blocked"
    } else if (s.paused) {
      eligible = false
      skipReason = "paused"
    } else if (left === 0) {
      // Warmy says 0 vs out-of-budget — distinguish for the UI.
      const w = s.warmy
      const rv =
        w &&
        (provider === "other"
          ? w.recommended_volume_today.google_workspace
          : w.recommended_volume_today[provider])
      skipReason = rv && rv.volume === 0 ? "warmy_zero" : "used_up"
      eligible = false
    }
    return {
      domain: d.domain,
      status: s.status,
      paused: s.paused,
      provider,
      volumeLeft: left,
      eligible,
      skipReason,
    }
  })
}

export function pickSendingDomain(
  profile: SenderProfile,
  borrowerEmail: string,
  _now: Date = new Date(),
): PickResult {
  const provider = detectBorrowerProvider(borrowerEmail)
  const eligibility = evaluateProfileDomains(profile, provider)

  const order = [...eligibility]
  // Keep today's rotation order: rotate the array by dailyIndex so the
  // first eligible changes across days but stays consistent within.
  const i0 = dailyIndex(profile.id) % Math.max(1, order.length)
  const rotated = [...order.slice(i0), ...order.slice(0, i0)]

  // Prefer Healthy / Watch first, fall back to At risk.
  const primary = rotated.find(
    (e) => e.eligible && (e.status === "healthy" || e.status === "watch" || e.status === "no_data"),
  )
  const fallback = !primary
    ? rotated.find((e) => e.eligible && e.status === "at_risk")
    : undefined
  const picked = primary ?? fallback ?? null

  return {
    profileId: profile.id,
    provider,
    pickedDomain: picked?.domain ?? null,
    pickedPrefix: profile.prefix,
    pickedAddress: picked ? `${profile.prefix}@${picked.domain}` : null,
    tier: picked ? (primary ? "healthy_or_watch" : "at_risk_fallback") : "no_eligible",
    eligibility,
  }
}

/* ────────────────────────── Rotation log ──────────────────────────── */

export type RotationLogReason =
  | "used_up"
  | "blocked"
  | "paused"
  | "put_back"
  | "taken_out"

export interface RotationLogEntry {
  at: string
  profileId: string
  profileName: string
  domain: string
  provider: WarmyProvider | "other"
  reason: RotationLogReason
  emailsMoved: number
  by?: string
}

const LOG: RotationLogEntry[] = []

export function appendRotationLog(entry: Omit<RotationLogEntry, "at">): RotationLogEntry {
  const row: RotationLogEntry = { ...entry, at: new Date().toISOString() }
  LOG.unshift(row)
  return row
}

export function listRotationLog(opts: { domain?: string; profileId?: string } = {}): RotationLogEntry[] {
  return LOG.filter(
    (r) =>
      (!opts.domain || r.domain.toLowerCase() === opts.domain.toLowerCase()) &&
      (!opts.profileId || r.profileId === opts.profileId),
  )
}

/** Seed a few log entries so the drawer isn't empty on first load. */
appendRotationLog({
  profileId: "sp-cleargrid-general",
  profileName: "ClearGrid Collections",
  domain: "cleargrid.ae",
  provider: "gmail",
  reason: "used_up",
  emailsMoved: 120,
})
appendRotationLog({
  profileId: "sp-fab-notices",
  profileName: "FAB Formal Notices",
  domain: "bankfab.com",
  provider: "gmail",
  reason: "blocked",
  emailsMoved: 0,
})

/* ────────────────── Shadow write-back from rotation ─────────────── */

export function recordRotationSend(
  profile: SenderProfile,
  borrowerEmail: string,
  delta = 1,
): PickResult {
  const result = pickSendingDomain(profile, borrowerEmail)
  if (result.pickedDomain) {
    const provider: WarmyProvider =
      result.provider === "other" ? "google_workspace" : result.provider
    recordCommandSend(result.pickedDomain, provider, delta)
  }
  return result
}

export const WARMY_STALE_MS = WARMY_THRESHOLDS.staleSyncMs
