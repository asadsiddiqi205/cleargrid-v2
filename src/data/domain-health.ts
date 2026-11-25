/**
 * Domain health status — the one function that turns Warmy data into a
 * Command status (Healthy / Watch / At risk / Blocked / No data). Every
 * screen that shows a status dot or picker option reads from here.
 *
 * Paused-by-ops is NOT a health status; it's a separate flag the UI
 * renders alongside the status.
 */

import {
  listAlertsForDomain,
  getWarmyDomainByName,
  type WarmyDomain,
  type WarmupAlert,
  type WarmyProvider,
} from "@/data/warmy"
import { WARMY_THRESHOLDS } from "@/data/warmy-thresholds"

export type DomainStatus = "healthy" | "watch" | "at_risk" | "blocked" | "no_data"

export const STATUS_LABEL: Record<DomainStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At risk",
  blocked: "Blocked",
  no_data: "No data",
}

export interface DomainHealthSummary {
  name: string
  status: DomainStatus
  paused: boolean
  warmy: WarmyDomain | null
  alerts: WarmupAlert[]
  reasons: string[]
}

function hasRejectionAlert(alerts: WarmupAlert[]): WarmupAlert | undefined {
  return alerts.find(
    (a) =>
      a.state !== "resolved" &&
      (a.alert_key === "reject_domain_by_gmail" ||
        a.alert_key === "reject_domain_by_gsuit" ||
        a.alert_key === "reject_domain_by_outlook" ||
        a.alert_key === "reject_domain_by_outlook_business" ||
        a.alert_key === "reject_domain_by_yahoo"),
  )
}

function hasNotSyncedOnReceiver(alerts: WarmupAlert[]): boolean {
  return alerts.some(
    (a) => a.state !== "resolved" && a.alert_key === "domain_not_synced_on_receiver",
  )
}

function allMailboxesOutOfService(w: WarmyDomain): boolean {
  const { active, paused, blocked, stopped } = w.mailboxes
  const total = active + paused + blocked + stopped
  if (total === 0) return true
  return active === 0 && (blocked + stopped) > 0
}

function dnsCritical(w: WarmyDomain): string[] {
  const out: string[] = []
  ;(["spf", "dkim", "dmarc"] as const).forEach((k) => {
    const s = w.dns_records[k]
    if (s === "invalid" || s === "missing") out.push(`${k.toUpperCase()} ${s}`)
  })
  return out
}

/** The rule. Pure — given Warmy data + alerts, returns a status. */
export function statusForDomain(domainName: string): DomainHealthSummary {
  const w = getWarmyDomainByName(domainName) ?? null
  const alerts = listAlertsForDomain(domainName)
  const paused = Boolean(w?.paused_by_ops.paused)

  if (!w) {
    return {
      name: domainName,
      status: "no_data",
      paused,
      warmy: null,
      alerts,
      reasons: ["Not matched to a Warmy domain"],
    }
  }

  const reasons: string[] = []

  // Blocked wins over everything else.
  const rejection = hasRejectionAlert(alerts)
  if (rejection) reasons.push(`Open provider rejection alert (${rejection.target_provider})`)
  const mailboxesOut = allMailboxesOutOfService(w)
  if (mailboxesOut) reasons.push("Every mailbox blocked or stopped")
  // Bounce-guard-blocked is encoded in webhook events; we treat a
  // mailbox state of all-blocked/stopped as the frontend equivalent.
  if (rejection || mailboxesOut) {
    return { name: domainName, status: "blocked", paused, warmy: w, alerts, reasons }
  }

  // At risk.
  const atRiskReasons: string[] = []
  if (w.adeline_ai_info.domain_reputation === "bad") atRiskReasons.push("Gmail reputation: bad")
  if (w.health_score.total < WARMY_THRESHOLDS.healthAtRisk) {
    atRiskReasons.push(`Health score ${w.health_score.total} below At-risk threshold`)
  }
  const dnsBad = dnsCritical(w)
  if (dnsBad.length > 0) atRiskReasons.push(dnsBad.join(", "))
  if (w.gpm.spam_rate > WARMY_THRESHOLDS.gmailSpamRateAtRisk) {
    atRiskReasons.push(`Gmail spam rate ${(w.gpm.spam_rate * 100).toFixed(2)} %`)
  }
  if (atRiskReasons.length > 0) {
    return {
      name: domainName,
      status: "at_risk",
      paused,
      warmy: w,
      alerts,
      reasons: atRiskReasons,
    }
  }

  // Watch.
  const watchReasons: string[] = []
  if (w.adeline_ai_info.domain_reputation === "medium") watchReasons.push("Gmail reputation: medium")
  if (w.health_score.total < WARMY_THRESHOLDS.healthWatch) {
    watchReasons.push(`Health score ${w.health_score.total} below Watch threshold`)
  }
  if (w.gpm.spam_rate > WARMY_THRESHOLDS.gmailSpamRateWatch) {
    watchReasons.push(`Gmail spam rate ${(w.gpm.spam_rate * 100).toFixed(2)} %`)
  }
  if (hasNotSyncedOnReceiver(alerts)) watchReasons.push("Domain not synced on receiver")
  if (watchReasons.length > 0) {
    return {
      name: domainName,
      status: "watch",
      paused,
      warmy: w,
      alerts,
      reasons: watchReasons,
    }
  }

  return { name: domainName, status: "healthy", paused, warmy: w, alerts, reasons }
}

export const STATUS_DOT_CLASS: Record<DomainStatus, string> = {
  healthy: "bg-emerald-500",
  watch: "bg-amber-400",
  at_risk: "bg-orange-500",
  blocked: "bg-red-500",
  no_data: "bg-neutral-500",
}

export const STATUS_PILL_CLASS: Record<DomainStatus, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  watch: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  at_risk: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  blocked: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  no_data: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 border-neutral-500/30",
}

/** Rank for "worst-first" sort on the Domains tab. Lower = worse. */
export const STATUS_RANK: Record<DomainStatus, number> = {
  blocked: 0,
  at_risk: 1,
  watch: 2,
  no_data: 3,
  healthy: 4,
}

/** The Warmy provider the author should care about on a per-domain row
 *  — whichever has the least volume left today. Used for the
 *  compact "today's volume" column on the Domains tab. */
export function worstProviderForDomain(domainName: string): WarmyProvider | null {
  const w = getWarmyDomainByName(domainName)
  if (!w) return null
  const providers: WarmyProvider[] = [
    "gmail",
    "outlook",
    "yahoo",
    "google_workspace",
    "microsoft_365",
  ]
  let worst: WarmyProvider | null = null
  let worstLeft = Infinity
  for (const p of providers) {
    const rv = w.recommended_volume_today[p]
    if (rv.volume == null) continue
    const left = Math.max(0, rv.volume) // (sent today applied in rotation layer)
    if (left < worstLeft) {
      worstLeft = left
      worst = p
    }
  }
  return worst
}
