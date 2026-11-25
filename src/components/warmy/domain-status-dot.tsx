"use client"

import * as React from "react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  statusForDomain,
  STATUS_DOT_CLASS,
  STATUS_LABEL,
  STATUS_PILL_CLASS,
} from "@/data/domain-health"
import { getSentToday } from "@/data/warmy"
import { cn } from "@/lib/utils"

/** Small status dot with a hover card showing health score, Gmail
 *  reputation estimate and today's volume used. Reused on the profiles
 *  table, picker options, and the Send Email node's Sending domains
 *  list. */
export function DomainStatusDot({
  domain,
  size = "sm",
}: {
  domain: string
  size?: "xs" | "sm" | "md"
}) {
  const summary = statusForDomain(domain)
  const paused = summary.paused
  const w = summary.warmy
  const gmailRec = w?.recommended_volume_today.gmail.volume ?? 0
  const sent = getSentToday(domain, "gmail")
  const left = Math.max(0, gmailRec - sent)
  const dotSize =
    size === "xs" ? "h-1.5 w-1.5" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2"

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <span className={cn("inline-flex items-center", paused && "opacity-70")}>
            <span
              className={cn("inline-block rounded-full", dotSize, STATUS_DOT_CLASS[summary.status])}
              aria-label={`${domain} — ${STATUS_LABEL[summary.status]}${paused ? " · Paused" : ""}`}
            />
          </span>
        }
      />
      <HoverCardContent className="w-72 space-y-1.5 p-3 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-foreground">{domain}</span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
              STATUS_PILL_CLASS[summary.status],
            )}
          >
            {STATUS_LABEL[summary.status]}
          </span>
        </div>
        {paused && (
          <div className="rounded bg-neutral-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-neutral-200">
            Paused by ops
          </div>
        )}
        {w ? (
          <>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Health score</span>
              <span className="tabular-nums text-foreground">{w.health_score.total}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Gmail reputation</span>
              <span className="text-foreground capitalize">
                {w.adeline_ai_info.domain_reputation}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Gmail today</span>
              <span className="tabular-nums text-foreground">
                {sent.toLocaleString()} / {gmailRec.toLocaleString()} · {left.toLocaleString()} left
              </span>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Not matched to a Warmy domain.</p>
        )}
        {summary.reasons.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            {summary.reasons.slice(0, 2).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
