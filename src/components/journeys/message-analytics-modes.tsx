"use client"

/**
 * Compare-runs and Over-time views for the Email + SMS node Analytics
 * tabs. Rendered in place of the single-run detail when the author picks
 * Compare or Over time from the mode toggle.
 *
 * Both views derive deterministically from the existing run roster +
 * message-analytics synthesizers, so numbers line up with the single-run
 * view when the same run appears in both.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import {
  listRuns,
  formatRunAge,
  type JourneyRun,
} from "@/data/journey-runs"
import {
  synthesizeEmailAnalytics,
  synthesizeSmsAnalytics,
  type EmailAnalytics,
  type SmsAnalytics,
} from "@/data/message-analytics"
import { EMPTY_FILTERS } from "./analytics-filter-bar"
import { loadJourneySettings } from "@/data/journey-settings"
import { getSenderProfileById } from "@/data/sender-profiles"
import { getWarmyDomainByName } from "@/data/warmy"

export type MessageChannel = "email" | "sms"

export type AnalyticsMode = "this_run" | "compare" | "over_time"

/* ─────────── Mode toggle ─────────── */

export function ModeToggle({
  value,
  onChange,
}: {
  value: AnalyticsMode
  onChange: (next: AnalyticsMode) => void
}) {
  const options: Array<{ id: AnalyticsMode; label: string }> = [
    { id: "this_run", label: "This run" },
    { id: "compare", label: "Compare" },
    { id: "over_time", label: "Over time" },
  ]
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded px-2 py-0.5 text-[10.5px] font-medium transition-colors",
            value === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────── Metric column spec per channel ─────────── */

type Row = {
  label: string
  /** Keyed by runId. */
  values: Record<string, number>
  format: "count" | "percent" | "aed" | "hours"
  /** For delta colouring vs control (first column). */
  goodDirection?: "up" | "down"
}

function emailRows(
  perRun: Array<{ run: JourneyRun; data: EmailAnalytics }>,
  senderProfileId?: string | null,
): Row[] {
  const by = (fn: (d: EmailAnalytics) => number) => {
    const out: Record<string, number> = {}
    for (const { run, data } of perRun) out[run.id] = fn(data)
    return out
  }
  const profile = senderProfileId ? getSenderProfileById(senderProfileId) : null
  // Warmy metrics — deterministic per-run derivations so authors reading
  // the Compare table see a drop in opens next to the rotation health
  // signal that caused it.
  const senderHealthByRun: Record<string, number> = {}
  const heldPctByRun: Record<string, number> = {}
  for (const { run, data } of perRun) {
    if (profile) {
      // Average Warmy health score across the profile's domains.
      const scores = profile.domains
        .map((d) => getWarmyDomainByName(d.domain)?.health_score.total)
        .filter((v): v is number => typeof v === "number")
      senderHealthByRun[run.id] =
        scores.length > 0
          ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
          : 0
    } else {
      senderHealthByRun[run.id] = 0
    }
    // Share of this run's sends held for volume — same seeded derivation
    // the single-run overlay uses so the two line up.
    let seed = 0
    for (let i = 0; i < run.id.length; i++) seed = (seed * 31 + run.id.charCodeAt(i)) >>> 0
    const sent = data.delivery.sent || 0
    const heldShare = ((seed % 4) + 1) / 100
    heldPctByRun[run.id] = sent > 0 ? heldShare : 0
  }
  return [
    { label: "Reached", values: by((d) => d.funnel.reached), format: "count" },
    { label: "Sent", values: by((d) => d.funnel.sent), format: "count" },
    { label: "Delivered", values: by((d) => d.funnel.delivered), format: "count" },
    { label: "Delivery rate", values: by((d) => d.delivery.deliveryRate), format: "percent", goodDirection: "up" },
    { label: "Unique opens", values: by((d) => d.engagement.uniqueOpens), format: "count" },
    { label: "Open rate", values: by((d) => d.engagement.openRate), format: "percent", goodDirection: "up" },
    { label: "Unique clicks", values: by((d) => d.engagement.uniqueClicks), format: "count" },
    { label: "CTR", values: by((d) => d.engagement.ctr), format: "percent", goodDirection: "up" },
    { label: "Click-to-open", values: by((d) => d.engagement.clickToOpenRate), format: "percent", goodDirection: "up" },
    { label: "Time to first open", values: by((d) => d.engagement.timeToFirstOpenHours), format: "hours", goodDirection: "down" },
    { label: "Hard bounces", values: by((d) => d.delivery.hardBounces), format: "count", goodDirection: "down" },
    { label: "Spam rate", values: by((d) => d.delivery.spamRate), format: "percent", goodDirection: "down" },
    { label: "Opt-out rate", values: by((d) => d.delivery.optOutRate), format: "percent", goodDirection: "down" },
    { label: "PTP", values: by((d) => d.outcomes.ptpCount), format: "count", goodDirection: "up" },
    { label: "PTP amount", values: by((d) => d.outcomes.ptpAmount), format: "aed", goodDirection: "up" },
    { label: "PTP kept", values: by((d) => d.outcomes.ptpKeptRate), format: "percent", goodDirection: "up" },
    { label: "Collection", values: by((d) => d.outcomes.collection), format: "aed", goodDirection: "up" },
    { label: "Recovery %", values: by((d) => d.outcomes.recoveryPct), format: "percent", goodDirection: "up" },
    { label: "CR %", values: by((d) => d.outcomes.crPct), format: "percent", goodDirection: "up" },
    { label: "Sender health", values: senderHealthByRun, format: "count", goodDirection: "up" },
    { label: "Held for volume", values: heldPctByRun, format: "percent", goodDirection: "down" },
  ]
}

function smsRows(
  perRun: Array<{ run: JourneyRun; data: SmsAnalytics }>,
): Row[] {
  const by = (fn: (d: SmsAnalytics) => number) => {
    const out: Record<string, number> = {}
    for (const { run, data } of perRun) out[run.id] = fn(data)
    return out
  }
  return [
    { label: "Reached", values: by((d) => d.funnel.reached), format: "count" },
    { label: "Sent", values: by((d) => d.funnel.sent), format: "count" },
    { label: "Delivered", values: by((d) => d.funnel.delivered), format: "count" },
    { label: "Delivery rate", values: by((d) => d.delivery.deliveryRate), format: "percent", goodDirection: "up" },
    { label: "Awaiting receipt", values: by((d) => d.delivery.awaitingReceipt), format: "count" },
    { label: "Undelivered", values: by((d) => d.delivery.undelivered.reduce((s, u) => s + u.count, 0)), format: "count", goodDirection: "down" },
    { label: "Unique clicks", values: by((d) => d.engagement.uniqueClicks), format: "count" },
    { label: "CTR", values: by((d) => d.engagement.ctr), format: "percent", goodDirection: "up" },
    { label: "Segments", values: by((d) => d.delivery.segmentsSent), format: "count" },
    { label: "Est. cost", values: by((d) => d.delivery.estimatedCost), format: "aed", goodDirection: "down" },
    { label: "Replies", values: by((d) => d.replies), format: "count", goodDirection: "up" },
    { label: "STOP opt-outs", values: by((d) => d.stopOptOuts), format: "count", goodDirection: "down" },
    { label: "PTP", values: by((d) => d.outcomes.ptpCount), format: "count", goodDirection: "up" },
    { label: "PTP amount", values: by((d) => d.outcomes.ptpAmount), format: "aed", goodDirection: "up" },
    { label: "PTP kept", values: by((d) => d.outcomes.ptpKeptRate), format: "percent", goodDirection: "up" },
    { label: "Collection", values: by((d) => d.outcomes.collection), format: "aed", goodDirection: "up" },
    { label: "Recovery %", values: by((d) => d.outcomes.recoveryPct), format: "percent", goodDirection: "up" },
    { label: "CR %", values: by((d) => d.outcomes.crPct), format: "percent", goodDirection: "up" },
  ]
}

function fmtVal(v: number, f: Row["format"]): string {
  switch (f) {
    case "percent": return `${(v * 100).toFixed(1)}%`
    case "aed": return formatAED(v)
    case "hours":
      if (v < 1) return `${Math.round(v * 60)}m`
      if (v < 24) return `${v.toFixed(1)}h`
      return `${(v / 24).toFixed(1)}d`
    case "count":
    default: return Math.round(v).toLocaleString()
  }
}

function deltaStr(now: number, base: number, f: Row["format"]): string {
  if (!isFinite(base) || base === 0) return ""
  const diff = now - base
  const rel = diff / base
  const sign = diff > 0 ? "+" : ""
  if (f === "percent") {
    return `${sign}${(diff * 100).toFixed(1)}pp`
  }
  return `${sign}${(rel * 100).toFixed(1)}%`
}

function deltaTone(
  now: number,
  base: number,
  dir: Row["goodDirection"],
): "ok" | "bad" | "muted" {
  if (!dir) return "muted"
  const diff = now - base
  if (diff === 0) return "muted"
  const good = dir === "up" ? diff > 0 : diff < 0
  return good ? "ok" : "bad"
}

/* ─────────── Compare runs ─────────── */

export function CompareRunsView({
  journeyId,
  nodeId,
  channel,
  senderProfileId,
}: {
  journeyId: string
  nodeId: string
  channel: MessageChannel
  senderProfileId?: string | null
}) {
  const runs = React.useMemo(() => listRuns(journeyId), [journeyId])
  // Default: first two runs selected.
  const [selected, setSelected] = React.useState<string[]>(
    runs.slice(0, 2).map((r) => r.id),
  )
  const settings = React.useMemo(() => loadJourneySettings(journeyId), [journeyId])

  const toggle = (id: string) => {
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < 4
          ? [...cur, id]
          : cur,
    )
  }

  const chosen = runs.filter((r) => selected.includes(r.id))

  const rows = React.useMemo(() => {
    if (channel === "email") {
      const perRun = chosen.map((run) => ({
        run,
        data: synthesizeEmailAnalytics(journeyId, nodeId, EMPTY_FILTERS, run.id),
      }))
      return emailRows(perRun, senderProfileId)
    }
    const perRun = chosen.map((run) => ({
      run,
      data: synthesizeSmsAnalytics(
        journeyId,
        nodeId,
        EMPTY_FILTERS,
        settings.costs.smsPerSegmentAED,
        run.id,
      ),
    }))
    return smsRows(perRun)
  }, [channel, chosen, journeyId, nodeId, settings.costs.smsPerSegmentAED])

  return (
    <div className="space-y-3 px-3 py-2.5">
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pick up to 4 runs
        </div>
        <ul className="space-y-1">
          {runs.map((r) => {
            const on = selected.includes(r.id)
            return (
              <li key={r.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded border px-2 py-1.5 text-[11px]",
                    on
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background/60 hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(r.id)}
                      className="h-3 w-3 accent-primary"
                    />
                    <span className="font-medium text-foreground">{r.label}</span>
                    <span
                      className={cn(
                        "rounded px-1 py-px text-[9px] font-medium uppercase tracking-wider",
                        r.status === "completed" && "bg-primary/15 text-primary",
                        r.status === "running" && "bg-info-500/15 text-info-300",
                        r.status === "failed" && "bg-error-500/15 text-error-300",
                        r.status === "queued" && "bg-muted text-neutral-300",
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-muted-foreground">
                    {formatRunAge(r)} · {r.enrolled.toLocaleString()} enrolled
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      {chosen.length === 0 ? (
        <EmptyNote>Select at least one run.</EmptyNote>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-1.5">Metric</th>
                {chosen.map((r, i) => (
                  <th key={r.id} className="px-2 py-1.5 text-right">
                    {r.label}{" "}
                    <span className="opacity-60">({formatRunAge(r)})</span>
                    {i === 0 && (
                      <span className="ml-1 rounded bg-muted px-1 py-px text-[8.5px] font-semibold text-muted-foreground">
                        base
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const base = row.values[chosen[0].id]
                return (
                  <tr key={row.label} className="border-t border-border/40">
                    <td className="px-2 py-1 text-foreground">{row.label}</td>
                    {chosen.map((r, i) => {
                      const v = row.values[r.id] ?? 0
                      const tone =
                        i === 0
                          ? "muted"
                          : deltaTone(v, base, row.goodDirection)
                      return (
                        <td
                          key={r.id}
                          className="px-2 py-1 text-right tabular-nums"
                        >
                          <div className="font-medium text-foreground">
                            {fmtVal(v, row.format)}
                          </div>
                          {i > 0 && base !== v && (
                            <div
                              className={cn(
                                "text-[9.5px]",
                                tone === "ok" && "text-emerald-300",
                                tone === "bad" && "text-error-300",
                                tone === "muted" && "text-muted-foreground",
                              )}
                            >
                              {deltaStr(v, base, row.format)}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─────────── Over time ─────────── */

export type TimeGranularity = "day" | "week" | "month"

function bucketKey(d: Date, g: TimeGranularity): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  if (g === "day") return `${y}-${m}-${day}`
  if (g === "month") return `${y}-${m}`
  // ISO week number
  const target = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

type RangePreset = "7d" | "30d" | "90d" | "all" | "custom"

const RANGE_LABEL: Record<RangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
  custom: "Custom",
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Compute [start, end) window in ms given preset + custom range + the
 *  latest run's startedAt (so presets like "7d" anchor to the most recent
 *  run rather than the wall clock — demo-friendly). */
function resolveWindow(
  preset: RangePreset,
  customStart: string,
  customEnd: string,
  anchorMs: number,
): { start: number; end: number } {
  const DAY = 86_400_000
  if (preset === "custom") {
    const s = customStart ? new Date(customStart).getTime() : -Infinity
    const e = customEnd ? new Date(customEnd).getTime() + DAY : Infinity
    return { start: s, end: e }
  }
  if (preset === "all") return { start: -Infinity, end: Infinity }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90
  return { start: anchorMs - days * DAY, end: anchorMs + DAY }
}

export function OverTimeView({
  journeyId,
  nodeId,
  channel,
  // Reserved for parity with CompareRunsView — the Over-time view
  // reuses emailRows() by way of its bucketed numbers today but may
  // surface sender health / held for volume as columns next (see TODO
  // in the table below). The prop keeps callers consistent.
  senderProfileId: _senderProfileId,
}: {
  journeyId: string
  nodeId: string
  channel: MessageChannel
  senderProfileId?: string | null
}) {
  const [granularity, setGranularity] = React.useState<TimeGranularity>("day")
  const [preset, setPreset] = React.useState<RangePreset>("30d")
  const runs = React.useMemo(() => listRuns(journeyId), [journeyId])
  const settings = React.useMemo(() => loadJourneySettings(journeyId), [journeyId])

  // Anchor the "last N days" presets to the newest run so demo data with
  // fixed timestamps still reads sensibly.
  const anchorMs = React.useMemo(() => {
    if (runs.length === 0) return Date.now()
    return Math.max(...runs.map((r) => new Date(r.startedAt).getTime()))
  }, [runs])
  const anchorIso = React.useMemo(() => isoDate(new Date(anchorMs)), [anchorMs])

  const [customStart, setCustomStart] = React.useState("")
  const [customEnd, setCustomEnd] = React.useState(anchorIso)

  const window = React.useMemo(
    () => resolveWindow(preset, customStart, customEnd, anchorMs),
    [preset, customStart, customEnd, anchorMs],
  )

  const runsInWindow = React.useMemo(
    () =>
      runs.filter((r) => {
        const t = new Date(r.startedAt).getTime()
        return t >= window.start && t < window.end
      }),
    [runs, window],
  )

  // Aggregate per bucket.
  const buckets = React.useMemo(() => {
    type Bucket = {
      key: string
      runs: JourneyRun[]
      sent: number
      delivered: number
      uniqueOpens: number
      uniqueClicks: number
      ptp: number
      collection: number
    }
    const map = new Map<string, Bucket>()
    for (const run of runsInWindow) {
      const k = bucketKey(new Date(run.startedAt), granularity)
      let b = map.get(k)
      if (!b) {
        b = {
          key: k,
          runs: [],
          sent: 0,
          delivered: 0,
          uniqueOpens: 0,
          uniqueClicks: 0,
          ptp: 0,
          collection: 0,
        }
        map.set(k, b)
      }
      b.runs.push(run)
      if (channel === "email") {
        const a = synthesizeEmailAnalytics(
          journeyId,
          nodeId,
          EMPTY_FILTERS,
          run.id,
        )
        b.sent += a.funnel.sent
        b.delivered += a.funnel.delivered
        b.uniqueOpens += a.engagement.uniqueOpens
        b.uniqueClicks += a.engagement.uniqueClicks
        b.ptp += a.outcomes.ptpCount
        b.collection += a.outcomes.collection
      } else {
        const a = synthesizeSmsAnalytics(
          journeyId,
          nodeId,
          EMPTY_FILTERS,
          settings.costs.smsPerSegmentAED,
          run.id,
        )
        b.sent += a.funnel.sent
        b.delivered += a.funnel.delivered
        b.uniqueClicks += a.funnel.uniqueClicks
        b.ptp += a.outcomes.ptpCount
        b.collection += a.outcomes.collection
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
  }, [
    runsInWindow,
    granularity,
    channel,
    journeyId,
    nodeId,
    settings.costs.smsPerSegmentAED,
  ])

  const maxDelivered = Math.max(1, ...buckets.map((b) => b.delivered))

  return (
    <div className="space-y-3 px-3 py-2.5">
      {/* Range + Granularity controls */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] text-muted-foreground">Range</span>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            {(["7d", "30d", "90d", "all", "custom"] as RangePreset[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPreset(r)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-medium",
                  preset === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                title={RANGE_LABEL[r]}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10.5px]">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={customEnd || undefined}
                className="h-5 rounded border border-input bg-transparent px-1 text-[10px]"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart || undefined}
                className="h-5 rounded border border-input bg-transparent px-1 text-[10px]"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-muted-foreground">
            Granularity
          </span>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            {(["day", "week", "month"] as TimeGranularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-medium capitalize",
                  granularity === g
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {g}
              </button>
            ))}
          </div>
          <span className="text-[9.5px] text-muted-foreground">
            {runsInWindow.length} run{runsInWindow.length === 1 ? "" : "s"} in range
          </span>
        </div>
      </div>

      {buckets.length === 0 ? (
        <EmptyNote>No runs in range.</EmptyNote>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-1.5">Bucket</th>
                <th className="px-2 py-1.5 text-right">Runs</th>
                <th className="px-2 py-1.5 text-right">Sent</th>
                <th className="px-2 py-1.5 text-right">Delivered</th>
                {channel === "email" && (
                  <>
                    <th className="px-2 py-1.5 text-right">Open rate</th>
                    <th className="px-2 py-1.5 text-right">CTR</th>
                  </>
                )}
                {channel === "sms" && (
                  <th className="px-2 py-1.5 text-right">CTR</th>
                )}
                <th className="px-2 py-1.5 text-right">PTP</th>
                <th className="px-2 py-1.5 text-right">Collection</th>
                <th className="px-2 py-1.5">Delivered trend</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => {
                const openRate = b.delivered > 0 ? b.uniqueOpens / b.delivered : 0
                const ctr = b.delivered > 0 ? b.uniqueClicks / b.delivered : 0
                return (
                  <tr key={b.key} className="border-t border-border/40">
                    <td className="px-2 py-1 font-mono text-[10.5px] text-foreground">
                      {b.key}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {b.runs.length}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {b.sent.toLocaleString()}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {b.delivered.toLocaleString()}
                    </td>
                    {channel === "email" && (
                      <>
                        <td className="px-2 py-1 text-right tabular-nums">
                          {(openRate * 100).toFixed(1)}%
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">
                          {(ctr * 100).toFixed(1)}%
                        </td>
                      </>
                    )}
                    {channel === "sms" && (
                      <td className="px-2 py-1 text-right tabular-nums">
                        {(ctr * 100).toFixed(1)}%
                      </td>
                    )}
                    <td className="px-2 py-1 text-right tabular-nums">
                      {b.ptp.toLocaleString()}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatAED(b.collection)}
                    </td>
                    <td className="px-2 py-1">
                      <div className="h-1.5 w-28 overflow-hidden rounded bg-muted/40">
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${(b.delivered / maxDelivered) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-border bg-muted/10 px-3 py-6 text-center text-[11px] text-muted-foreground">
      {children}
    </div>
  )
}
