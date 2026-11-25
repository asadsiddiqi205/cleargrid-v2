"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSenderProfileById, type SenderProfile } from "@/data/sender-profiles"
import {
  evaluateProfileDomains,
  detectBorrowerProvider,
  type BorrowerProvider,
} from "@/data/sending-rotation"
import {
  STATUS_DOT_CLASS,
  STATUS_LABEL,
  statusForDomain,
  STATUS_PILL_CLASS,
} from "@/data/domain-health"
import { getSentToday, getWarmyDomainByName, getComposerOvershoot, type DnsState } from "@/data/warmy"

/** Compact "Sending domains" list shown under the sender profile picker
 *  on the Send Email node's Delivery tab. One row per domain with its
 *  prefix@address, status, volume left for the worst provider, and
 *  In rotation / Skipped. Set `showDns` to append SPF / DKIM / DMARC /
 *  MX chips from Warmy on each row. */
export function SendingDomainsList({
  profileId,
  previewEmail = "preview@gmail.com",
  showDns = false,
}: {
  profileId: string | null
  previewEmail?: string
  showDns?: boolean
}) {
  const profile: SenderProfile | undefined = profileId
    ? getSenderProfileById(profileId)
    : undefined
  if (!profile) return null

  const provider = detectBorrowerProvider(previewEmail)
  const rows = evaluateProfileDomains(profile, provider)

  const sending = rows.filter((r) => r.eligible).length
  const skipped = rows.length - sending

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sending domains
        </div>
        <Link
          href="/sender-profiles"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline"
        >
          Manage in Sender profiles
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-[10px] text-muted-foreground">
        For a Gmail recipient preview: {sending} sending · {skipped} skipped.
      </p>
      <div className="overflow-hidden rounded border border-border/60">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/30 text-[9.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Address</th>
              <th className="px-2 py-1 text-left font-medium">Status</th>
              <th className="px-2 py-1 text-right font-medium">Volume left</th>
              <th className="px-2 py-1 text-left font-medium">In rotation</th>
              {showDns && <th className="px-2 py-1 text-left font-medium">DNS</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const summary = statusForDomain(r.domain)
              const w = summary.warmy
              const gmailSent = w ? getSentToday(r.domain, "gmail") : 0
              const gmailRec = w?.recommended_volume_today.gmail.volume ?? null
              const gmailLeft = gmailRec != null ? Math.max(0, gmailRec - gmailSent) : null
              const left = r.volumeLeft
              return (
                <tr key={r.domain} className="border-t border-border/60">
                  <td className="px-2 py-1 font-mono">{profile.prefix}@{r.domain}</td>
                  <td className="px-2 py-1">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          STATUS_DOT_CLASS[summary.status],
                        )}
                      />
                      <span
                        className={cn(
                          "rounded border px-1 py-0.5 text-[9px] uppercase tracking-wider",
                          STATUS_PILL_CLASS[summary.status],
                        )}
                      >
                        {STATUS_LABEL[summary.status]}
                      </span>
                      {r.paused && (
                        <span className="rounded bg-neutral-500/20 px-1 text-[9px] uppercase text-neutral-700 dark:text-neutral-200">
                          Paused
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-foreground">
                    {left === null
                      ? "Unlimited"
                      : gmailLeft != null && gmailRec != null
                      ? `${gmailLeft.toLocaleString()} / ${gmailRec.toLocaleString()}`
                      : left.toLocaleString()}
                    {getComposerOvershoot(r.domain, "gmail") > 0 && (
                      <div className="text-[10px] font-medium text-amber-600 dark:text-amber-300">
                        {getComposerOvershoot(r.domain, "gmail")} over from Composer sends
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    {r.eligible ? (
                      <span className="text-emerald-600 dark:text-emerald-300">In rotation</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Skipped — {skipLabel(r.skipReason)}
                      </span>
                    )}
                  </td>
                  {showDns && (
                    <td className="px-2 py-1">
                      <DnsChipRow dns={w?.dns_records} />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DnsChipRow({
  dns,
}: {
  dns: { spf: DnsState; dkim: DnsState; dmarc: DnsState; mx: DnsState } | undefined
}) {
  if (!dns) return <span className="text-[10px] text-muted-foreground">—</span>
  return (
    <div className="flex gap-0.5">
      <DnsChip label="SPF" s={dns.spf} />
      <DnsChip label="DKIM" s={dns.dkim} />
      <DnsChip label="DMARC" s={dns.dmarc} />
      <DnsChip label="MX" s={dns.mx} />
    </div>
  )
}

function DnsChip({ label, s }: { label: string; s: DnsState }) {
  const tone =
    s === "valid"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : s === "not_received"
      ? "bg-neutral-500/15 text-neutral-700 dark:text-neutral-300"
      : "bg-red-500/15 text-red-700 dark:text-red-300"
  return <span className={cn("rounded px-1 py-0.5 text-[9px]", tone)} title={s}>{label}</span>
}

function skipLabel(reason: string | undefined): string {
  switch (reason) {
    case "blocked":
      return "blocked"
    case "paused":
      return "paused by ops"
    case "used_up":
      return "used up for provider"
    case "warmy_zero":
      return "Warmy says 0"
    case "stale_warmy_fallback":
      return "stale Warmy sync"
    default:
      return "not eligible"
  }
}

/** Short one-liner used by the profile picker option and the canvas
 *  card subtitle: "4 domains · 3 sending · 1 used up for Gmail" or
 *  "KSA-Non Banking · 1 domain blocked". */
export function describeProfileHealth(profile: SenderProfile): string {
  const rows = evaluateProfileDomains(profile, "gmail")
  const total = rows.length
  const sending = rows.filter((r) => r.eligible).length
  const blocked = rows.filter((r) => r.skipReason === "blocked").length
  const paused = rows.filter((r) => r.skipReason === "paused").length
  const usedUp = rows.filter((r) => r.skipReason === "used_up" || r.skipReason === "warmy_zero").length
  const parts: string[] = [`${total} domain${total === 1 ? "" : "s"}`]
  if (blocked) parts.push(`${blocked} blocked`)
  if (paused) parts.push(`${paused} paused`)
  if (usedUp) parts.push(`${usedUp} used up for Gmail`)
  if (!blocked && !paused && !usedUp) parts.push(`${sending} sending`)
  return parts.join(" · ")
}

/** Rotation-aware summary for Journey sends: "Rotates across N domains ·
 *  3 sending · 1 at risk (fallback only) · 1 blocked (support.cleararabia.ai)".
 *  Fed to the Compose tab preview on journey nodes; the canvas subtitle
 *  uses the short-form helper below. */
export function describeProfileRotationHealth(
  profile: SenderProfile,
  provider: BorrowerProvider = "gmail",
): string {
  const rows = evaluateProfileDomains(profile, provider)
  const total = rows.length
  const healthyOrWatch = rows.filter((r) => {
    if (!r.eligible) return false
    return r.status === "healthy" || r.status === "watch" || r.status === "no_data"
  })
  const atRiskEligible = rows.filter((r) => r.eligible && r.status === "at_risk")
  const blockedRows = rows.filter((r) => r.skipReason === "blocked")
  const pausedRows = rows.filter((r) => r.skipReason === "paused")
  const usedUpRows = rows.filter(
    (r) => r.skipReason === "used_up" || r.skipReason === "warmy_zero",
  )
  const parts: string[] = [
    `Rotates across ${total} domain${total === 1 ? "" : "s"}`,
    `${healthyOrWatch.length} sending`,
  ]
  const joinNames = (rs: typeof rows) =>
    rs.length === 1 ? rs[0]!.domain : `${rs.length}`
  if (atRiskEligible.length)
    parts.push(`${atRiskEligible.length} at risk (fallback only)`)
  if (blockedRows.length) parts.push(`${blockedRows.length} blocked (${joinNames(blockedRows)})`)
  if (pausedRows.length) parts.push(`${pausedRows.length} paused (${joinNames(pausedRows)})`)
  if (usedUpRows.length) parts.push(`${usedUpRows.length} used up for Gmail`)
  return parts.join(" · ")
}

/** Short-form rotation summary for the canvas card: picks the most
 *  attention-worthy signal only. "KSA-Non Banking · 1 domain blocked".
 *  The caller is expected to prefix the profile name. */
export function shortProfileRotationHealth(
  profile: SenderProfile,
  provider: BorrowerProvider = "gmail",
): string {
  const rows = evaluateProfileDomains(profile, provider)
  const blockedRows = rows.filter((r) => r.skipReason === "blocked")
  const pausedRows = rows.filter((r) => r.skipReason === "paused")
  const atRiskEligible = rows.filter((r) => r.eligible && r.status === "at_risk")
  const usedUpRows = rows.filter(
    (r) => r.skipReason === "used_up" || r.skipReason === "warmy_zero",
  )
  if (blockedRows.length)
    return `${blockedRows.length} domain${blockedRows.length === 1 ? "" : "s"} blocked`
  if (pausedRows.length)
    return `${pausedRows.length} domain${pausedRows.length === 1 ? "" : "s"} paused`
  if (atRiskEligible.length)
    return `${atRiskEligible.length} at risk (fallback)`
  if (usedUpRows.length)
    return `${usedUpRows.length} used up for Gmail`
  const sending = rows.filter((r) => r.eligible).length
  return `${sending} sending`
}

/** Worst domain state on the profile — used by the canvas card. */
export function worstDomainState(
  profile: SenderProfile,
): "blocked" | "at_risk" | "watch" | "healthy" | "no_data" {
  const statuses = profile.domains.map((d) => statusForDomain(d.domain).status)
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("at_risk")) return "at_risk"
  if (statuses.includes("watch")) return "watch"
  if (statuses.every((s) => s === "no_data")) return "no_data"
  return "healthy"
}
