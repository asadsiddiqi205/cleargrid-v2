"use client"

/**
 * Aggregate analytics sections shown on the journey report page — drop-off
 * funnel, breakdowns by segment / lender / channel, time-to-convert
 * distribution, and the impact tile band driven by BusinessMetricsConfig.
 *
 * Each section is a standalone card so they can be reordered or A/B-tested
 * without touching the parent page.
 */

import * as React from "react"
import Link from "next/link"
import {
  Layers,
  TrendingDown,
  Timer,
  DollarSign,
  ArrowRight,
  Info,
} from "lucide-react"
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import {
  buildDropOffFunnel,
  buildBreakdowns,
  buildJourneyAggregate,
  buildPerEventFired,
  computeBusinessMetric,
  type JourneyAggregate,
  type AnalyticsBreakdown,
  type DropOffStage,
} from "@/data/journey-analytics"
import { loadJourneySettings, resolveConversionEvents } from "@/data/journey-settings"
import { loadConversionEvents } from "@/data/conversion-events"

/* ─────────── Drop-off funnel ─────────── */

export function DropOffFunnel({ journeyId }: { journeyId: string }) {
  const [stages, setStages] = React.useState<DropOffStage[]>([])
  React.useEffect(() => {
    setStages(buildDropOffFunnel(journeyId))
  }, [journeyId])

  if (stages.length === 0) return null
  const maxReach = Math.max(...stages.map((s) => s.reached))

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
            <TrendingDown className="h-4 w-4 text-warning-300" />
            Drop-off funnel
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Where borrowers fall out across the journey. Bar width shows reach; the amber wedge shows how many exited before the next node.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <ol className="space-y-2">
          {stages.map((stage, i) => {
            const reachedPct = maxReach === 0 ? 0 : stage.reached / maxReach
            const isBiggestDrop = stages.filter((_, j) => j < stages.length - 1).reduce((max, s) => (s.exited > max.exited ? s : max), stages[0]).nodeId === stage.nodeId && i < stages.length - 1
            return (
              <li key={stage.nodeId} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="truncate text-foreground">{stage.label}</span>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="text-foreground">{stage.reached.toLocaleString()}</span>
                        {i < stages.length - 1 && stage.exited > 0 && (
                          <span className={cn("text-warning-300", isBiggestDrop && "font-semibold")}>
                            −{stage.exited.toLocaleString()} ({(stage.exitedPct * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 h-4 overflow-hidden rounded bg-muted/40">
                      <div
                        className="h-full bg-gradient-to-r from-primary/70 to-primary/40"
                        style={{ width: `${(reachedPct * 100).toFixed(1)}%` }}
                      />
                    </div>
                    {isBiggestDrop && stage.exited > 0 && i < stages.length - 1 && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-warning-300">
                        <Info className="h-2.5 w-2.5" />
                        Biggest drop in the flow — investigate before the next node.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ─────────── Breakdowns ─────────── */

export function Breakdowns({ journeyId }: { journeyId: string }) {
  const [data, setData] = React.useState<{
    bySegment: AnalyticsBreakdown[]
    byLender: AnalyticsBreakdown[]
    byChannel: AnalyticsBreakdown[]
  }>({ bySegment: [], byLender: [], byChannel: [] })

  React.useEffect(() => {
    setData(buildBreakdowns(journeyId))
  }, [journeyId])

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
            <Layers className="h-4 w-4 text-info-300" />
            Breakdowns
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Conversion and recovery grouped by DPD segment, lender, and channel.
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownCard title="By DPD segment" rows={data.bySegment} />
        <BreakdownCard title="By lender" rows={data.byLender} />
        <BreakdownCard title="By channel used" rows={data.byChannel} />
      </div>
    </section>
  )
}

function BreakdownCard({ title, rows }: { title: string; rows: AnalyticsBreakdown[] }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      <div className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="p-4 text-center text-[11px] text-muted-foreground">No data.</div>
      ) : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-1.5 font-semibold">Group</th>
              <th className="px-2 py-1.5 text-right font-semibold">Enrolled</th>
              <th className="px-2 py-1.5 text-right font-semibold">Conv %</th>
              <th className="px-2 py-1.5 text-right font-semibold">Recovered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-1.5 truncate text-foreground">{r.label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                  {r.enrolled.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                  {(r.conversionRate * 100).toFixed(1)}%
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-primary">
                  {formatAED(r.recoveredAED)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ─────────── Time to convert ─────────── */

export function TimeToConvertDistribution({ journeyId }: { journeyId: string }) {
  const [agg, setAgg] = React.useState<JourneyAggregate | null>(null)
  React.useEffect(() => {
    const events = loadConversionEvents()
    const settings = loadJourneySettings(journeyId)
    setAgg(buildJourneyAggregate(journeyId, events, settings))
  }, [journeyId])

  if (!agg) return null

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
          <Timer className="h-4 w-4 text-info-300" />
          Time to convert
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Distribution of hours from enrolment to the first conversion event.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <MiniStat label="Converted" value={agg.converted.toLocaleString()} />
          <MiniStat
            label="Median"
            value={formatDuration(agg.timeToConvert.p50Hours)}
            tone="primary"
          />
          <MiniStat label="P90" value={formatDuration(agg.timeToConvert.p90Hours)} />
          <MiniStat
            label="Conversion rate"
            value={`${(agg.conversionRate * 100).toFixed(1)}%`}
            tone="primary"
          />
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={agg.timeToConvertDist}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                dataKey="bucketLabel"
                tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
                width={30}
              />
              <RTooltip
                contentStyle={{
                  background: "var(--color-bg-elevated)",
                  borderRadius: 6,
                  border: "1px solid var(--color-border-default)",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="count" fill="var(--cg-primary-500)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "primary"
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-heading text-lg font-semibold tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  )
}

function formatDuration(hours: number): string {
  if (hours <= 0) return "—"
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

/* ─────────── Configurable business metrics band ─────────── */

const ACCENT_CLASS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  primary: { border: "border-primary/40", bg: "bg-primary/[0.06]", text: "text-primary", label: "text-muted-foreground" },
  info: { border: "border-info-500/40", bg: "bg-info-500/[0.06]", text: "text-info-300", label: "text-muted-foreground" },
  warning: { border: "border-warning-500/40", bg: "bg-warning-500/[0.06]", text: "text-warning-300", label: "text-muted-foreground" },
  error: { border: "border-error-500/40", bg: "bg-error-500/[0.06]", text: "text-error-300", label: "text-muted-foreground" },
  neutral: { border: "border-border", bg: "bg-card/40", text: "text-foreground", label: "text-muted-foreground" },
}

export function ConfigurableBusinessMetricsBand({ journeyId }: { journeyId: string }) {
  const [tiles, setTiles] = React.useState<Array<{ label: string; accent: string; display: string; net?: boolean }>>([])

  React.useEffect(() => {
    const events = loadConversionEvents()
    const settings = loadJourneySettings(journeyId)
    const agg = buildJourneyAggregate(journeyId, events, settings)
    const resolved = resolveConversionEvents(events, settings.conversionOverrides)
    const perEventFired = buildPerEventFired(journeyId, events, settings)
    const rendered = settings.businessMetrics
      .filter((m) => m.enabled)
      .map((m) => {
        const { display } = computeBusinessMetric(m, agg, resolved, perEventFired)
        return { label: m.label, accent: m.accent, display, net: m.source === "impact.net_aed" }
      })
    setTiles(rendered)
  }, [journeyId])

  if (tiles.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">Business metrics</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Configured for this journey. Change the roster in{" "}
            <Link href={`/journeys/${journeyId}/settings`} className="text-primary hover:underline">
              Settings → Business metrics
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-3">
        {tiles.map((tile) => {
          const accent = ACCENT_CLASS[tile.accent] ?? ACCENT_CLASS.neutral
          return (
            <div
              key={tile.label}
              className={cn("rounded-xl border px-4 py-3 transition-colors", accent.border, accent.bg)}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {tile.label}
              </div>
              <div className={cn("mt-1 font-heading text-2xl font-semibold tabular-nums", accent.text)}>
                {tile.display}
              </div>
              {tile.net && (
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <DollarSign className="h-2.5 w-2.5" />
                  Recovered − Send cost
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
