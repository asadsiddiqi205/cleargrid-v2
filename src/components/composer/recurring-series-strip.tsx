"use client"

/**
 * RecurringSeriesStrip — a horizontal card strip surfacing every active or
 * paused recurring campaign at the top of the Messages listing. Each card
 * shows the series name, cadence, status, occurrence count, and a jump-in
 * link to the parent detail page.
 *
 * Occurrence copies are hidden from the flat messages table (they'd bloat
 * the list). This strip is where authors see the recurring campaigns as a
 * distinct first-class concept.
 */

import * as React from "react"
import Link from "next/link"
import { Repeat, PauseCircle, StopCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  messagesList,
  type MessageListItem,
  type RecurringMeta,
} from "@/data/messages"
import { lenders } from "@/data/lenders"

function getLenderName(id: string): string {
  if (id === "general") return "General"
  return lenders.find((l) => l.id === id)?.shortName ?? id
}

function formatCadence(r: RecurringMeta): string {
  const c = r.cadence
  if (c.kind === "daily") return `Daily · ${c.time}`
  if (c.daysOfWeek.length > 0) {
    const days = ["S", "M", "T", "W", "T", "F", "S"]
    return `Custom (${c.daysOfWeek.map((d) => days[d]).join("")}) · ${c.time}`
  }
  return `Every ${c.everyN} days · ${c.time}`
}

export function RecurringSeriesStrip() {
  const series = messagesList.filter(
    (m): m is MessageListItem & { recurring: RecurringMeta } =>
      Boolean(m.recurring?.isParent),
  )
  if (series.length === 0) return null

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Repeat className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Recurring campaigns · {series.length}
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Each series generates a copy per occurrence. Manage cadence / pause / stop from any copy.
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {series.map((s) => (
          <RecurringSeriesCard key={s.id} message={s} />
        ))}
      </div>
    </div>
  )
}

function RecurringSeriesCard({ message }: { message: MessageListItem & { recurring: RecurringMeta } }) {
  const r = message.recurring
  const statusTone =
    r.status === "paused"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : r.status === "ended"
        ? "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
        : "border-primary/40 bg-primary/10 text-primary"
  const StatusIcon =
    r.status === "paused" ? PauseCircle : r.status === "ended" ? StopCircle : Repeat

  return (
    <Link
      href={`/email-generator/${message.id}`}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card/60 p-3.5 transition-colors hover:border-primary/40 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {r.seriesName}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {getLenderName(message.lenderId)} · {message.channel === "email" ? "Email" : message.channel === "sms" ? "SMS" : "WhatsApp"} · {message.audience}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
            statusTone,
          )}
        >
          <StatusIcon className="h-2.5 w-2.5" />
          {r.status}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cadence</p>
          <p className="mt-0.5 truncate text-[11px] text-foreground">{formatCadence(r)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Occurrences
          </p>
          <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground">
            {r.totalOccurrences}
          </p>
        </div>
      </div>

      <div className="mt-1 inline-flex items-center gap-1 self-start text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open series
        <ExternalLink className="h-2.5 w-2.5" />
      </div>
    </Link>
  )
}
