"use client"

/**
 * Journey Report → Experiments section.
 *
 * Lists every Experiment node in the journey with its verdict at a glance:
 * version, status, duration, arms + shares, primary metric result (leading
 * arm + uplift + confidence), and guardrail status. Each row links to the
 * node's Analytics tab in the canvas editor.
 *
 * Reads the same seeded synthesizer as the per-node Analytics tab so the
 * report and the tab never disagree. Honors the Report's visible date
 * range by trimming which runs count; since the prototype's experiments
 * are versioned (not run-scoped) the only filter today is "experiment
 * started on/before dateEnd".
 */

import Link from "next/link"
import { useMemo } from "react"
import type { Edge, Node } from "@xyflow/react"
import { ChevronRight, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { loadJourneySettings } from "@/data/journey-settings"
import {
  PRIMARY_METRIC_DIRECTION,
  PRIMARY_METRIC_LABEL,
  readExperimentConfig,
  statusLabel,
} from "@/data/experiments"
import { synthesizeExperimentAnalytics } from "@/data/experiment-analytics"
import type { ExperimentAnalytics } from "@/data/experiment-analytics"

interface Props {
  journeyId: string
  nodes: Node[]
  edges: Edge[]
  /** Optional date range from the Report's existing filter. */
  dateStart?: string
  dateEnd?: string
}

export function ExperimentsReportSection({ journeyId, nodes, edges, dateStart, dateEnd }: Props) {
  const settings = useMemo(() => loadJourneySettings(journeyId), [journeyId])

  const experimentNodes = useMemo(
    () =>
      nodes.filter((n) => {
        const d = (n.data ?? {}) as Record<string, unknown>
        return d.blockType === "experiment"
      }),
    [nodes],
  )

  const rows = useMemo(() => {
    return experimentNodes
      .map((n) => {
        const cfg = readExperimentConfig((n.data ?? {}) as Record<string, unknown>)
        // Date filter: skip experiments that started after the range end,
        // or finished before the range start. A draft (no startedAt) is kept.
        if (cfg.startedAt) {
          if (dateEnd && cfg.startedAt > dateEnd) return null
          if (dateStart && cfg.endedAt && cfg.endedAt < dateStart) return null
        }
        const analytics = synthesizeExperimentAnalytics({
          journeyId,
          nodeId: n.id,
          cfg,
          nodes,
          edges,
          journeyEnrolled: 500,
          costs: {
            emailPerSendAED: settings.costs.emailPerSendAED,
            smsPerSegmentAED: settings.costs.smsPerSegmentAED,
            aiCallPerMinuteAED: settings.costs.aiCallPerMinuteAED,
            humanCallPerAttemptAED: settings.costs.humanCallPerAttemptAED,
          },
        })
        return { nodeId: n.id, analytics }
      })
      .filter((x): x is { nodeId: string; analytics: ExperimentAnalytics } => x !== null)
  }, [experimentNodes, journeyId, nodes, edges, settings, dateStart, dateEnd])

  if (experimentNodes.length === 0) return null

  return (
    <section className="rounded-xl border border-border bg-card/40">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[16px] font-semibold text-foreground">Experiments</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Every Experiment / A-B Test node in this journey, with its verdict at a glance.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-[12px] text-muted-foreground">
          No experiments started in the selected date range.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map(({ nodeId, analytics }) => (
            <ExperimentRow key={nodeId} journeyId={journeyId} nodeId={nodeId} analytics={analytics} />
          ))}
        </div>
      )}
    </section>
  )
}

function ExperimentRow({
  journeyId,
  nodeId,
  analytics,
}: {
  journeyId: string
  nodeId: string
  analytics: ExperimentAnalytics
}) {
  const { cfg, daysElapsed, daysPlanned, verdict, guardrails, arms, baselineArmId } = analytics
  const leading = verdict.lines.find((l) => l.armId === verdict.leadingArmId)
  const breach = guardrails.find((g) => g.status === "breached")
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[13px] font-semibold text-foreground">{cfg.name}</h3>
          <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            v{cfg.version}
          </span>
          <StatusPill status={cfg.status} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {daysPlanned != null ? `Day ${daysElapsed} of ${daysPlanned}` : `${daysElapsed}d elapsed`}
          {" · "}Attribution {cfg.attributionDays}d
        </p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {arms.map((r) => (
            <span
              key={r.arm.id}
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5",
                r.arm.id === baselineArmId
                  ? "bg-muted/30 text-muted-foreground"
                  : r.arm.id === verdict.leadingArmId
                    ? "bg-primary-500/15 text-primary-400"
                    : "bg-muted/15 text-foreground",
              )}
            >
              {r.arm.isControl && <Shield className="h-2.5 w-2.5" />}
              {r.arm.name} · {r.arm.share}%
            </span>
          ))}
        </div>
      </div>
      <div className="flex w-[280px] shrink-0 flex-col items-end gap-1 text-[11px]">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
          {PRIMARY_METRIC_LABEL[cfg.primaryMetric]}
        </p>
        {verdict.notEnoughData ? (
          <p className="text-muted-foreground">Not enough data yet</p>
        ) : leading ? (
          <>
            <p className="font-semibold text-foreground">{leading.armName}</p>
            <Delta delta={leading.delta} format={leading.deltaFormat} good={PRIMARY_METRIC_DIRECTION[cfg.primaryMetric]} />
            <p className="text-muted-foreground">{(leading.confidence * 100).toFixed(0)}% confident</p>
          </>
        ) : (
          <p className="text-muted-foreground">No non-baseline arm yet</p>
        )}
        <GuardrailPill
          status={
            breach ? "breached" : guardrails.some((g) => g.status === "insufficient") ? "insufficient" : "ok"
          }
          breachLabel={breach ? `${breach.guardrailLabel} on ${arms.find((r) => r.arm.id === breach.armId)?.arm.name ?? breach.armId}` : undefined}
        />
        <Link
          href={`/journeys/${journeyId}?node=${nodeId}&tab=analytics`}
          className="mt-1 flex items-center gap-0.5 rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-primary-400 hover:bg-primary-500/10"
        >
          Open Analytics <ChevronRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: ExperimentAnalytics["cfg"]["status"] }) {
  const cls =
    status === "running"
      ? "bg-primary-500/15 text-primary-400"
      : status === "paused"
        ? "bg-warning-500/15 text-warning-400"
        : status === "concluded_winner"
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-muted/30 text-muted-foreground"
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider", cls)}>
      {statusLabel(status).split(" · ")[0]}
    </span>
  )
}

function GuardrailPill({
  status,
  breachLabel,
}: {
  status: "ok" | "breached" | "insufficient"
  breachLabel?: string
}) {
  if (status === "breached") {
    return (
      <span className="rounded bg-error-500/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-error-400">
        Guardrail: {breachLabel}
      </span>
    )
  }
  if (status === "insufficient") {
    return (
      <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        Guardrail: not enough data
      </span>
    )
  }
  return (
    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-400">
      Guardrails OK
    </span>
  )
}

function Delta({ delta, format, good }: { delta: number; format: "pp" | "pct" | "aed"; good: "up" | "down" }) {
  const better = (good === "up" && delta > 0) || (good === "down" && delta < 0)
  const cls = delta === 0 ? "text-muted-foreground" : better ? "text-primary-400" : "text-error-400"
  const sign = delta > 0 ? "+" : ""
  return (
    <span className={cn("font-semibold", cls)}>
      {sign}
      {format === "pp"
        ? `${(delta * 100).toFixed(1)}pp`
        : format === "pct"
          ? `${(delta * 100).toFixed(1)}%`
          : `AED ${Math.round(delta).toLocaleString()}`}
    </span>
  )
}
