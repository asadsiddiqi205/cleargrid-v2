"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSenderProfileById, type SenderProfile } from "@/data/sender-profiles"
import { evaluateProfileDomains, detectBorrowerProvider } from "@/data/sending-rotation"
import {
  STATUS_DOT_CLASS,
  STATUS_LABEL,
  statusForDomain,
  STATUS_PILL_CLASS,
} from "@/data/domain-health"
import { getSentToday } from "@/data/warmy"

/** Compact "Sending domains" list shown under the sender profile picker
 *  on the Send Email node's Delivery tab. One row per domain with its
 *  prefix@address, status, volume left for the worst provider, and
 *  In rotation / Skipped. */
export function SendingDomainsList({
  profileId,
  previewEmail = "preview@gmail.com",
}: {
  profileId: string | null
  previewEmail?: string
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
          href="/lender-config/sender-profiles"
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const summary = statusForDomain(r.domain)
              const w = summary.warmy
              const gmailSent = w ? getSentToday(r.domain, "gmail") : 0
              const gmailRec = w?.recommended_volume_today.gmail.volume ?? null
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
                        <span className="rounded bg-neutral-500/20 px-1 text-[9px] uppercase text-neutral-200">
                          Paused
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-foreground">
                    {left === null
                      ? "Unlimited"
                      : gmailRec != null
                      ? `${(gmailRec - gmailSent).toLocaleString()} / ${gmailRec.toLocaleString()}`
                      : left.toLocaleString()}
                  </td>
                  <td className="px-2 py-1">
                    {r.eligible ? (
                      <span className="text-emerald-300">In rotation</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Skipped — {skipLabel(r.skipReason)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
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
