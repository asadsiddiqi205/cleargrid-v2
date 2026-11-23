"use client"

/**
 * Experiment node → Analytics tab.
 *
 * Replaces the per-arm KPI cards that used to live in `experiment-results.tsx`
 * with a full ITT read of the experiment: header + sample-ratio check,
 * verdict card, arm comparison table, channel breakdown, over-time chart,
 * segment slices, borrower list and CSV export.
 *
 * Scope is the whole experiment VERSION (all runs since it started), not a
 * single journey run — the version picker switches between the current
 * version and any archived ones in `cfg.previousVersions`.
 */

import { useMemo, useState } from "react"
import { AlertTriangle, Check, ChevronDown, ChevronRight, Download, Pause as PauseIcon, X } from "lucide-react"
import type { Edge, Node } from "@xyflow/react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { loadJourneySettings } from "@/data/journey-settings"
import {
  PRIMARY_METRIC_DIRECTION,
  PRIMARY_METRIC_LABEL,
  readExperimentConfig,
  statusLabel,
} from "@/data/experiments"
import type { ExperimentConfig, ExperimentConfigVersion } from "@/data/experiments"
import {
  DEFAULT_SEGMENT_DIMENSIONS,
  listExperimentBorrowers,
  primaryMetricValue,
  SEGMENT_DIMENSION_CATALOG,
  synthesizeExperimentAnalytics,
} from "@/data/experiment-analytics"
import type {
  ArmResult,
  BorrowerRow,
  ExperimentAnalytics,
  SegmentDimension,
} from "@/data/experiment-analytics"

interface Props {
  journeyId: string
  nodeId: string
  nodes: Node[]
  edges: Edge[]
  /** Fallback data from the React Flow node. Config read from `data.experiment`. */
  data: Record<string, unknown>
  journeyEnrolled?: number
}

export function ExperimentAnalyticsTab(props: Props) {
  const { journeyId, nodeId, nodes, edges, data, journeyEnrolled = 500 } = props
  const currentCfg = readExperimentConfig(data)
  const versions = [currentCfg, ...currentCfg.previousVersions]
  const [versionIdx, setVersionIdx] = useState(0)
  const activeVersion = versions[versionIdx] ?? currentCfg

  const settings = useMemo(() => loadJourneySettings(journeyId), [journeyId])

  const [segmentDimensions, setSegmentDimensions] = useSegmentDimensions(journeyId, nodeId)

  const analytics = useMemo(
    () =>
      synthesizeExperimentAnalytics({
        journeyId,
        nodeId,
        cfg: configFromVersion(activeVersion, currentCfg),
        nodes,
        edges,
        journeyEnrolled,
        segmentDimensions,
        costs: {
          emailPerSendAED: settings.costs.emailPerSendAED,
          smsPerSegmentAED: settings.costs.smsPerSegmentAED,
          aiCallPerMinuteAED: settings.costs.aiCallPerMinuteAED,
          humanCallPerAttemptAED: (settings.costs as { humanCallPerAttemptAED?: number }).humanCallPerAttemptAED,
        },
      }),
    [journeyId, nodeId, activeVersion, currentCfg, nodes, edges, journeyEnrolled, settings, segmentDimensions],
  )

  return (
    <div className="space-y-4">
      {versions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Version</span>
          <NativeSelect
            value={String(versionIdx)}
            onChange={(e) => setVersionIdx(Number(e.target.value))}
          >
            {versions.map((v, i) => (
              <option key={v.experimentId} value={i}>
                {v.experimentId}
                {i === 0 ? " (current)" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <Header analytics={analytics} />
      <VerdictCard analytics={analytics} />
      <ArmComparisonTable analytics={analytics} />
      <ChannelBreakdown analytics={analytics} />
      <OverTime analytics={analytics} />
      <Segments
        analytics={analytics}
        selected={segmentDimensions}
        onChange={setSegmentDimensions}
      />
      <Borrowers journeyId={journeyId} cfg={analytics.cfg} analytics={analytics} />
    </div>
  )
}

/* ─────────── Header ─────────── */

function Header({ analytics }: { analytics: ExperimentAnalytics }) {
  const { cfg, daysElapsed, daysPlanned, attributionDays, sampleRatioCheck, arms } = analytics
  const sampleTarget = perArmTargetFromConfig(cfg)
  return (
    <section className="space-y-2">
      {sampleRatioCheck.red && (
        <div className="rounded-md border border-error-500/60 bg-error-500/15 p-2 text-[11px] text-error-400">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            Sample ratio mismatch (p = {sampleRatioCheck.pValue.toExponential(1)})
          </div>
          <p className="mt-0.5 text-error-400/90">
            Assignment counts don't match the configured split — results can't be trusted until this is explained.
          </p>
        </div>
      )}
      <div className="rounded-md border border-border/40 bg-muted/5 p-3">
        <div className="grid grid-cols-4 gap-3 text-[10px]">
          <HeaderStat label="Status" value={statusLabel(cfg.status)} />
          <HeaderStat
            label="Days"
            value={daysPlanned ? `${daysElapsed} of ${daysPlanned}` : `${daysElapsed} elapsed`}
          />
          <HeaderStat label="Attribution" value={`${attributionDays}d`} />
          <HeaderStat label="Primary metric" value={PRIMARY_METRIC_LABEL[cfg.primaryMetric]} />
        </div>
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Borrowers per arm</p>
          {arms.map((r) => {
            const pct = sampleTarget > 0 ? Math.min(100, (r.assignment.assigned / sampleTarget) * 100) : 0
            return (
              <div key={r.arm.id} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-foreground">{r.arm.name}</span>
                  <span className="text-muted-foreground">
                    {r.assignment.assigned.toLocaleString()}
                    {sampleTarget > 0 && ` / ${sampleTarget.toLocaleString()}`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/20">
                  <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-foreground">{value}</p>
    </div>
  )
}

/* ─────────── Verdict ─────────── */

function VerdictCard({ analytics }: { analytics: ExperimentAnalytics }) {
  const { verdict, arms, cfg, baselineArmId } = analytics
  const leading = arms.find((r) => r.arm.id === verdict.leadingArmId)
  return (
    <section className="rounded-md border border-border/40 bg-muted/5 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Verdict · {verdict.primaryMetricLabel}</p>
          {verdict.notEnoughData ? (
            <p className="mt-1 text-xs text-foreground">Not enough data yet (&lt; 100 per arm or window still open).</p>
          ) : leading ? (
            <p className="mt-1 text-xs font-semibold text-foreground">
              {leading.arm.name} leading · {fmtPrimary(primaryMetricValue(cfg.primaryMetric, leading), cfg.primaryMetric)}
            </p>
          ) : null}
        </div>
        <VerdictActions />
      </div>

      <div className="mt-3 overflow-hidden rounded border border-border/40">
        <table className="w-full text-[10px]">
          <thead className="bg-muted/10 text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left">Arm</th>
              <th className="px-2 py-1.5 text-right">{verdict.primaryMetricLabel}</th>
              <th className="px-2 py-1.5 text-right">Uplift vs {baselineLabel(arms, baselineArmId)}</th>
              <th className="px-2 py-1.5 text-right">95% CI</th>
              <th className="px-2 py-1.5 text-right">Confident</th>
            </tr>
          </thead>
          <tbody>
            {arms.map((r) => {
              const v = primaryMetricValue(cfg.primaryMetric, r)
              const line = verdict.lines.find((l) => l.armId === r.arm.id)
              const isBase = r.arm.id === baselineArmId
              return (
                <tr key={r.arm.id} className="border-t border-border/40">
                  <td className="px-2 py-1.5 text-foreground">
                    {r.arm.name}
                    {isBase && <span className="ml-1 text-[9px] text-muted-foreground">(baseline)</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right text-foreground">{fmtPrimary(v, cfg.primaryMetric)}</td>
                  <td className="px-2 py-1.5 text-right">
                    {isBase ? <span className="text-muted-foreground">—</span> : <DeltaChip delta={line?.delta ?? 0} format={line?.deltaFormat ?? "pp"} good={PRIMARY_METRIC_DIRECTION[cfg.primaryMetric]} />}
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">
                    {isBase || !line ? "—" : `[${fmtDelta(line.ci95[0], line.deltaFormat)}, ${fmtDelta(line.ci95[1], line.deltaFormat)}]`}
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">
                    {isBase || !line ? "—" : `${(line.confidence * 100).toFixed(0)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 rounded bg-muted/10 px-2 py-1.5 text-[11px] text-foreground">
        <RecommendationLine analytics={analytics} />
      </p>
    </section>
  )
}

function VerdictActions() {
  return (
    <div className="flex gap-1.5">
      <button className="flex items-center gap-1 rounded border border-primary-500/40 bg-primary-500/10 px-2 py-1 text-[10px] text-primary-400 hover:bg-primary-500/20">
        <Check className="h-3 w-3" /> Roll out winner
      </button>
      <button className="flex items-center gap-1 rounded border border-border/40 bg-muted/20 px-2 py-1 text-[10px] text-foreground hover:bg-muted/40">
        <PauseIcon className="h-3 w-3" /> Pause
      </button>
      <button className="flex items-center gap-1 rounded border border-border/40 bg-muted/20 px-2 py-1 text-[10px] text-foreground hover:bg-muted/40">
        <X className="h-3 w-3" /> End
      </button>
    </div>
  )
}

function RecommendationLine({ analytics }: { analytics: ExperimentAnalytics }) {
  const rec = analytics.verdict.recommendation
  switch (rec.kind) {
    case "not_enough_data":
      return <>Keep running — need ≥ 100 borrowers per arm and one full attribution window.</>
    case "no_difference":
      return <>No meaningful difference on {analytics.verdict.primaryMetricLabel} yet.</>
    case "guardrail_breached":
      return (
        <>
          Guardrail breached on <strong>{rec.armName}</strong> — {rec.guardrailLabel}.
        </>
      )
    case "roll_out":
      return (
        <>
          Roll out <strong>{rec.armName}</strong>.
        </>
      )
  }
}

/* ─────────── Arm comparison table ─────────── */

function ArmComparisonTable({ analytics }: { analytics: ExperimentAnalytics }) {
  const { arms, cfg, guardrails } = analytics
  const base = arms.find((r) => r.isBaseline)!
  const rows: GroupRow[] = [
    groupRow("Assignment", [
      row("Assigned", arms.map((r) => r.assignment.assigned), "count"),
      row("Reached first step", arms.map((r) => r.assignment.reachedFirstStep), "count"),
      row("Exited early", arms.map((r) => r.assignment.exitedEarly), "count", "down"),
      row("Still active", arms.map((r) => r.assignment.stillActive), "count"),
    ]),
    groupRow("Outcomes", [
      badged(cfg, "ptp_rate", row("PTP rate", arms.map((r) => r.outcomes.ptpRate), "pp", "up")),
      row("PTP", arms.map((r) => r.outcomes.ptp), "count"),
      row("PTP amount", arms.map((r) => r.outcomes.ptpAmount), "aed"),
      badged(cfg, "ptp_kept_rate", row("PTP kept rate", arms.map((r) => r.outcomes.ptpKeptRate), "pp", "up")),
      row("PTP broken rate", arms.map((r) => r.outcomes.ptpBrokenRate), "pp", "down"),
      badged(cfg, "payment_rate", row("Payment rate", arms.map((r) => r.outcomes.paymentRate), "pp", "up")),
      row("Collection", arms.map((r) => r.outcomes.collection), "aed", "up"),
      badged(cfg, "collection_pct", row("Collection %", arms.map((r) => r.outcomes.collectionPct), "pp", "up")),
      badged(cfg, "recovery_pct", row("Recovery %", arms.map((r) => r.outcomes.recoveryPct), "pp", "up")),
      row("Collection / borrower", arms.map((r) => r.outcomes.collectionPerBorrower), "aed", "up"),
      row("Median time to resolution", arms.map((r) => r.outcomes.medianTimeToResolutionDays), "days", "down"),
    ]),
    groupRow("Contact", [
      row("Touches / borrower", arms.map((r) => r.contact.touchesPerBorrower), "count"),
      row("Contacted on any channel", arms.map((r) => r.contact.contactedAnyChannelPct), "pp", "up"),
      badged(cfg, "rpc_rate", row("RPC rate", arms.map((r) => r.contact.rpcRate), "pp", "up")),
    ]),
    groupRow("Cost", [
      row("Email cost", arms.map((r) => r.cost.emailCost), "aed", "down"),
      row("SMS cost", arms.map((r) => r.cost.smsCost), "aed", "down"),
      row("AI call cost", arms.map((r) => r.cost.aiCallCost), "aed", "down"),
      row("Human call cost", arms.map((r) => r.cost.humanCallCost), "aed", "down"),
      row("Total cost", arms.map((r) => r.cost.totalCost), "aed", "down"),
      row("Cost / borrower", arms.map((r) => r.cost.costPerBorrower), "aed", "down"),
      badged(cfg, "cost_per_recovery", row("Cost / recovery", arms.map((r) => r.cost.costPerRecovery), "aed", "down")),
      row("Net recovered", arms.map((r) => r.cost.netRecovered), "aed", "up"),
      row("Incremental net vs baseline", arms.map((r) => r.cost.incrementalNetVsControl), "aed", "up"),
    ]),
  ]
  return (
    <section>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">Arm comparison</h4>
        <button
          onClick={() => exportArmComparisonCsv(analytics)}
          className="flex items-center gap-1 rounded border border-border/40 bg-muted/20 px-2 py-1 text-[10px] text-foreground hover:bg-muted/40"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="mt-2 overflow-hidden rounded border border-border/40">
        <table className="w-full text-[10px]">
          <thead className="bg-muted/10 text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left">Metric</th>
              {arms.map((r) => (
                <th key={r.arm.id} className="px-2 py-1.5 text-right">
                  {r.arm.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <RowGroup key={g.title} group={g} arms={arms} base={base} guardrails={guardrails} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ─────────── Channel breakdown ─────────── */

function ChannelBreakdown({ analytics }: { analytics: ExperimentAnalytics }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold text-foreground">Channel breakdown</h4>
      <ChannelTable
        title="Email"
        arms={analytics.arms}
        pick={(r) => r.channels.email}
        rows={[
          ["Sent", (a) => a?.funnel.sent],
          ["Delivered", (a) => a?.funnel.delivered],
          ["Delivery rate", (a) => a?.delivery.deliveryRate, "pct"],
          ["Hard bounces", (a) => a?.delivery.hardBounces],
          ["Open rate", (a) => a?.engagement.openRate, "pct"],
          ["CTR", (a) => a?.engagement.ctr, "pct"],
          ["Opt-out rate", (a) => a?.delivery.optOutRate, "pct"],
          ["Spam rate", (a) => a?.delivery.spamRate, "pct"],
        ]}
      />
      <ChannelTable
        title="SMS"
        arms={analytics.arms}
        pick={(r) => r.channels.sms}
        rows={[
          ["Sent", (a) => a?.funnel.sent],
          ["Delivered", (a) => a?.funnel.delivered],
          ["Delivery rate", (a) => a?.delivery.deliveryRate, "pct"],
          ["Awaiting receipt", (a) => a?.delivery.awaitingReceipt],
          ["CTR", (a) => a?.engagement.ctr, "pct"],
          ["Segments", (a) => a?.delivery.segmentsSent],
          ["Opt-outs", (a) => a?.stopOptOuts],
        ]}
      />
      <ChannelTable
        title="AI calls"
        arms={analytics.arms}
        pick={(r) => r.channels.aiCall}
        rows={[
          ["Attempts", (a) => a?.attempts],
          ["Connected", (a) => a?.connected],
          ["Connect rate", (a) => a?.connectRate, "pct"],
          ["RPC", (a) => a?.rpc],
          ["RPC rate", (a) => a?.rpcRate, "pct"],
          ["Avg call duration (s)", (a) => a?.avgDurationSec],
          ["PTPs from calls", (a) => a?.ptpsFromCalls],
          ["AI minutes", (a) => a?.aiMinutesTotal],
        ]}
      />
      <ChannelTable
        title="Human calls"
        arms={analytics.arms}
        pick={(r) => r.channels.humanCall}
        rows={[
          ["Attempts", (a) => a?.attempts],
          ["Connected", (a) => a?.connected],
          ["Connect rate", (a) => a?.connectRate, "pct"],
          ["RPC", (a) => a?.rpc],
          ["RPC rate", (a) => a?.rpcRate, "pct"],
          ["Avg talk time (s)", (a) => a?.avgTalkTimeSec],
          ["PTPs from agents", (a) => a?.ptpsFromCalls],
          ["Agent hours", (a) => a?.agentHoursTotal],
        ]}
      />
    </section>
  )
}

type ChannelRow<T> = [string, (a: T) => number | undefined] | [string, (a: T) => number | undefined, "count" | "pct"]

function ChannelTable<T>({
  title,
  arms,
  pick,
  rows,
}: {
  title: string
  arms: ArmResult[]
  pick: (r: ArmResult) => T | null | undefined
  rows: Array<ChannelRow<T>>
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded border border-border/40">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between bg-muted/10 px-2 py-1.5 text-[10px] font-semibold text-foreground hover:bg-muted/20"
      >
        <span className="flex items-center gap-1">
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {title}
        </span>
      </button>
      {expanded && (
        <table className="w-full text-[10px]">
          <thead className="bg-muted/5 text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left">Metric</th>
              {arms.map((r) => (
                <th key={r.arm.id} className="px-2 py-1 text-right">
                  {r.arm.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, read, format]) => (
              <tr key={label} className="border-t border-border/40">
                <td className="px-2 py-1 text-foreground">{label}</td>
                {arms.map((r) => {
                  const channel = pick(r)
                  if (channel == null) {
                    return (
                      <td key={r.arm.id} className="px-2 py-1 text-right text-muted-foreground">
                        Not on this arm
                      </td>
                    )
                  }
                  const raw = read(channel as T)
                  return (
                    <td key={r.arm.id} className="px-2 py-1 text-right text-foreground">
                      {raw == null ? "—" : fmtNumber(raw, format)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ─────────── Over time ─────────── */

function OverTime({ analytics }: { analytics: ExperimentAnalytics }) {
  const { overTime, arms, baselineArmId, verdict } = analytics
  const upliftData = overTime.map((p) => {
    const row: Record<string, number | string> = { date: p.date }
    arms.forEach((a) => {
      if (a.arm.id === baselineArmId) return
      row[a.arm.name] = p.cumulativeUplift[a.arm.id]
      row[`${a.arm.name} CI-`] = p.cumulativeUplift[a.arm.id] - p.ciHalf[a.arm.id]
      row[`${a.arm.name} CI+`] = p.cumulativeUplift[a.arm.id] + p.ciHalf[a.arm.id]
    })
    return row
  })
  const assignData = overTime.map((p) => {
    const row: Record<string, number | string> = { date: p.date }
    arms.forEach((a) => (row[a.arm.name] = p.assignments[a.arm.id]))
    return row
  })
  return (
    <section>
      <h4 className="text-xs font-semibold text-foreground">Over time</h4>
      <div className="mt-2 rounded border border-border/40 p-2">
        <p className="mb-1 text-[10px] text-muted-foreground">
          Cumulative uplift on {verdict.primaryMetricLabel} vs baseline
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={upliftData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="date" fontSize={9} tick={{ fill: "currentColor", opacity: 0.6 }} />
            <YAxis fontSize={9} tick={{ fill: "currentColor", opacity: 0.6 }} tickFormatter={(v) => `${(v * 100).toFixed(1)}pp`} />
            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {arms
              .filter((a) => a.arm.id !== baselineArmId)
              .map((a, i) => (
                <Line key={a.arm.id} type="monotone" dataKey={a.arm.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            <Line type="monotone" dataKey="zero" stroke="currentColor" strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 rounded border border-border/40 p-2">
        <p className="mb-1 text-[10px] text-muted-foreground">Daily assignments by arm</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={assignData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="date" fontSize={9} tick={{ fill: "currentColor", opacity: 0.6 }} />
            <YAxis fontSize={9} tick={{ fill: "currentColor", opacity: 0.6 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {arms.map((a, i) => (
              <Bar key={a.arm.id} dataKey={a.arm.name} stackId="assign" fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

/* ─────────── Segments ─────────── */

function Segments({
  analytics,
  selected,
  onChange,
}: {
  analytics: ExperimentAnalytics
  selected: SegmentDimension[]
  onChange: (next: SegmentDimension[]) => void
}) {
  const { segments, arms, cfg } = analytics
  const toggle = (id: SegmentDimension) => {
    if (selected.includes(id)) {
      // Keep at least one dimension selected so the section stays useful.
      if (selected.length === 1) return
      onChange(selected.filter((d) => d !== id))
    } else {
      onChange([...selected, id])
    }
  }
  const allSelected = selected.length === SEGMENT_DIMENSION_CATALOG.length
  return (
    <section>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-foreground">Segments</h4>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Uplift per arm on {PRIMARY_METRIC_LABEL[cfg.primaryMetric]}. Slices below 100 borrowers per arm are greyed out.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SEGMENT_DIMENSIONS)}
            className="rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-[9px] text-muted-foreground hover:bg-muted/40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() =>
              allSelected
                ? onChange(DEFAULT_SEGMENT_DIMENSIONS)
                : onChange(SEGMENT_DIMENSION_CATALOG.map((d) => d.id))
            }
            className="rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-[9px] text-muted-foreground hover:bg-muted/40"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SEGMENT_DIMENSION_CATALOG.map((dim) => {
          const on = selected.includes(dim.id)
          return (
            <button
              key={dim.id}
              type="button"
              onClick={() => toggle(dim.id)}
              title={dim.description}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                on
                  ? "bg-primary-500/20 text-primary-400"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/40",
              )}
            >
              {dim.label}
            </button>
          )
        })}
      </div>
      {segments.length === 0 ? (
        <p className="mt-2 rounded border border-dashed border-border/60 p-3 text-center text-[10px] text-muted-foreground">
          Pick at least one dimension above to see segment breakdowns.
        </p>
      ) : (
      <div className="mt-2 space-y-3">
        {segments.map((g) => (
          <div key={g.dimension} className="rounded border border-border/40">
            <div className="bg-muted/10 px-2 py-1 text-[10px] font-semibold text-foreground">
              {segmentLabel(g.dimension)}
            </div>
            <table className="w-full text-[10px]">
              <thead className="bg-muted/5 text-[9px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left">Slice</th>
                  {arms.map((r) => (
                    <th key={r.arm.id} className="px-2 py-1 text-right">
                      {r.arm.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.slices.map((sl) => (
                  <tr key={sl.key} className={cn("border-t border-border/40", sl.minPerArm < 100 && "opacity-50")}>
                    <td className="px-2 py-1 text-foreground">
                      {sl.label}
                      {sl.minPerArm < 100 && <span className="ml-1 text-[9px] text-muted-foreground">small sample</span>}
                    </td>
                    {arms.map((r) => {
                      const perArm = sl.perArm[r.arm.id]
                      return (
                        <td key={r.arm.id} className="px-2 py-1 text-right text-foreground">
                          {fmtPrimary(perArm.value, cfg.primaryMetric)}
                          <span className="ml-1 text-[9px] text-muted-foreground">(n={perArm.size})</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      )}
    </section>
  )
}

/* ─────────── Borrowers ─────────── */

function Borrowers({
  journeyId,
  cfg,
}: {
  journeyId: string
  cfg: ExperimentConfig
  analytics: ExperimentAnalytics
}) {
  const [armFilter, setArmFilter] = useState<string>("any")
  const [outcomeFilter, setOutcomeFilter] = useState<"any" | "ptp" | "paid" | "none">("any")
  const [search, setSearch] = useState("")
  const rows = useMemo(
    () =>
      listExperimentBorrowers(journeyId, cfg, {
        armId: armFilter === "any" ? undefined : armFilter,
        outcome: outcomeFilter === "any" ? undefined : outcomeFilter,
        search,
      }),
    [journeyId, cfg, armFilter, outcomeFilter, search],
  )
  return (
    <section>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">Borrowers ({rows.length.toLocaleString()})</h4>
        <button
          onClick={() => exportBorrowersCsv(cfg, rows)}
          className="flex items-center gap-1 rounded border border-border/40 bg-muted/20 px-2 py-1 text-[10px] text-foreground hover:bg-muted/40"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <NativeSelect value={armFilter} onChange={(e) => setArmFilter(e.target.value)}>
          <option value="any">All arms</option>
          {cfg.arms.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value as "any" | "ptp" | "paid" | "none")}>
          <option value="any">All outcomes</option>
          <option value="ptp">PTP</option>
          <option value="paid">Paid</option>
          <option value="none">None</option>
        </NativeSelect>
        <Input
          placeholder="Search name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 flex-1 text-xs"
        />
      </div>
      <div className="mt-2 max-h-[300px] overflow-auto rounded border border-border/40">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-muted/10 text-[9px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left">Borrower</th>
              <th className="px-2 py-1 text-left">Arm</th>
              <th className="px-2 py-1 text-left">Assigned</th>
              <th className="px-2 py-1 text-left">Channels</th>
              <th className="px-2 py-1 text-left">Last touch</th>
              <th className="px-2 py-1 text-left">Outcome</th>
              <th className="px-2 py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.borrowerId} className="border-t border-border/40">
                <td className="px-2 py-1 text-foreground">{row.borrowerName}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.armName}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.assignmentDate}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.channelsReceived.join(" · ")}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.lastTouch}</td>
                <td className="px-2 py-1 text-foreground">{row.outcome}</td>
                <td className="px-2 py-1 text-right text-foreground">{row.amount > 0 ? `AED ${row.amount.toLocaleString()}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ─────────── Row/group helpers for the comparison table ─────────── */

interface Row {
  label: string
  values: Array<number | null>
  format: "count" | "pp" | "aed" | "days"
  good: "up" | "down" | null
  badge?: "primary" | "secondary" | "guardrail"
  breachedForArmIds?: string[]
}

interface GroupRow {
  title: string
  rows: Row[]
}

function row(
  label: string,
  values: Array<number | null | undefined>,
  format: Row["format"],
  good: Row["good"] = null,
): Row {
  return { label, values: values.map((v) => (v == null ? null : v)), format, good }
}

function groupRow(title: string, rows: Row[]): GroupRow {
  return { title, rows }
}

function badged(cfg: ExperimentConfig, metric: string, r: Row): Row {
  if (cfg.primaryMetric === metric) return { ...r, badge: "primary" }
  if ((cfg.secondaryMetrics as string[]).includes(metric)) return { ...r, badge: "secondary" }
  return r
}

function RowGroup({
  group,
  arms,
  base,
  guardrails,
}: {
  group: GroupRow
  arms: ArmResult[]
  base: ArmResult
  guardrails: ExperimentAnalytics["guardrails"]
}) {
  return (
    <>
      <tr className="bg-muted/10">
        <td colSpan={arms.length + 1} className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {group.title}
        </td>
      </tr>
      {group.rows.map((r) => {
        const baseIdx = arms.indexOf(base)
        const baseVal = r.values[baseIdx]
        return (
          <tr key={r.label} className="border-t border-border/40">
            <td className="px-2 py-1 text-foreground">
              {r.label}
              {r.badge === "primary" && <BadgeDot tone="primary">Primary</BadgeDot>}
              {r.badge === "secondary" && <BadgeDot tone="info">Secondary</BadgeDot>}
            </td>
            {arms.map((a, i) => {
              const v = r.values[i]
              if (v == null) {
                return (
                  <td key={a.arm.id} className="px-2 py-1 text-right text-muted-foreground">
                    Not available yet
                  </td>
                )
              }
              const isBase = a.isBaseline
              const delta = baseVal == null || isBase ? 0 : v - baseVal
              return (
                <td key={a.arm.id} className="px-2 py-1 text-right text-foreground">
                  <div>{fmtValue(v, r.format)}</div>
                  {!isBase && baseVal != null && (
                    <div className={cn("text-[9px]", deltaColor(delta, r.good))}>
                      {delta > 0 ? "+" : ""}
                      {fmtValue(delta, r.format === "aed" ? "aed" : r.format === "pp" ? "pp" : "count")}
                    </div>
                  )}
                </td>
              )
            })}
          </tr>
        )
      })}
      {group.title === "Cost" && guardrails.some((g) => g.status === "breached") && (
        <tr>
          <td colSpan={arms.length + 1} className="px-2 py-1 text-[9px] text-error-400">
            Guardrail breached: {guardrails.filter((g) => g.status === "breached").map((g) => `${g.guardrailLabel} on ${armName(arms, g.armId)}`).join(", ")}
          </td>
        </tr>
      )}
    </>
  )
}

function BadgeDot({ tone, children }: { tone: "primary" | "info"; children: React.ReactNode }) {
  const cls = tone === "primary" ? "bg-primary-500/20 text-primary-400" : "bg-info-500/20 text-info-400"
  return <span className={cn("ml-1.5 rounded px-1 py-0 text-[9px]", cls)}>{children}</span>
}

function DeltaChip({ delta, format, good }: { delta: number; format: "pp" | "pct" | "aed"; good: "up" | "down" }) {
  const cls = deltaColor(delta, good)
  const sign = delta > 0 ? "+" : ""
  return (
    <span className={cn("font-semibold", cls)}>
      {sign}
      {format === "pp" ? `${(delta * 100).toFixed(1)}pp` : format === "pct" ? `${(delta * 100).toFixed(1)}%` : `AED ${Math.round(delta).toLocaleString()}`}
    </span>
  )
}

/* ─────────── Formatters ─────────── */

function fmtValue(v: number, f: Row["format"]): string {
  if (f === "pp") return `${(v * 100).toFixed(1)}%`
  if (f === "aed") return `AED ${Math.round(v).toLocaleString()}`
  if (f === "days") return `${v.toFixed(1)}d`
  return Math.round(v).toLocaleString()
}

function fmtNumber(v: number, format?: "count" | "pct"): string {
  if (format === "pct") return `${(v * 100).toFixed(1)}%`
  return Math.round(v).toLocaleString()
}

function fmtPrimary(v: number, metric: ExperimentConfig["primaryMetric"]): string {
  if (metric === "cost_per_recovery") return `AED ${Math.round(v).toLocaleString()}`
  return `${(v * 100).toFixed(1)}%`
}

function fmtDelta(v: number, format: "pp" | "pct" | "aed"): string {
  if (format === "pp") return `${(v * 100).toFixed(1)}pp`
  if (format === "pct") return `${(v * 100).toFixed(1)}%`
  return `AED ${Math.round(v).toLocaleString()}`
}

function deltaColor(delta: number, good: "up" | "down" | null): string {
  if (!good || delta === 0) return "text-muted-foreground"
  const better = (good === "up" && delta > 0) || (good === "down" && delta < 0)
  return better ? "text-primary-400" : "text-error-400"
}

function segmentLabel(dim: string): string {
  const entry = SEGMENT_DIMENSION_CATALOG.find((d) => d.id === dim)
  return entry?.label ?? dim
}

function baselineLabel(arms: ArmResult[], baselineArmId: string): string {
  return arms.find((r) => r.arm.id === baselineArmId)?.arm.name ?? "baseline"
}

function armName(arms: ArmResult[], armId: string): string {
  return arms.find((r) => r.arm.id === armId)?.arm.name ?? armId
}

function perArmTargetFromConfig(cfg: ExperimentConfig): number {
  if (cfg.duration.mode === "per_arm_count" && cfg.duration.perArmBorrowers) {
    return cfg.duration.perArmBorrowers
  }
  return 0
}

function configFromVersion(v: ExperimentConfigVersion, current: ExperimentConfig): ExperimentConfig {
  if ("previousVersions" in v) return v as ExperimentConfig
  return { ...v, previousVersions: current.previousVersions }
}

/* ─────────── CSV export ─────────── */

function exportArmComparisonCsv(analytics: ExperimentAnalytics) {
  const header = ["Metric", ...analytics.arms.map((a) => a.arm.name)]
  const lines: string[] = [header.join(",")]
  const push = (label: string, values: Array<number | null>) => {
    lines.push([csvEscape(label), ...values.map((v) => (v == null ? "" : String(v)))].join(","))
  }
  push("Assigned", analytics.arms.map((r) => r.assignment.assigned))
  push("PTP rate", analytics.arms.map((r) => r.outcomes.ptpRate))
  push("Payment rate", analytics.arms.map((r) => r.outcomes.paymentRate))
  push("Collection", analytics.arms.map((r) => r.outcomes.collection))
  push("Total cost", analytics.arms.map((r) => r.cost.totalCost))
  push("Net recovered", analytics.arms.map((r) => r.cost.netRecovered))
  downloadCsv(`${analytics.cfg.experimentId}_arms.csv`, lines.join("\n"))
}

function exportBorrowersCsv(cfg: ExperimentConfig, rows: BorrowerRow[]) {
  const header = ["BorrowerId", "Name", "Arm", "Assigned", "Channels", "LastTouch", "Outcome", "AmountAED"]
  const lines: string[] = [header.join(",")]
  rows.forEach((r) => {
    lines.push(
      [
        csvEscape(r.borrowerId),
        csvEscape(r.borrowerName),
        csvEscape(r.armName),
        r.assignmentDate,
        csvEscape(r.channelsReceived.join("|")),
        r.lastTouch,
        r.outcome,
        r.amount,
      ].join(","),
    )
  })
  downloadCsv(`${cfg.experimentId}_borrowers.csv`, lines.join("\n"))
}

function csvEscape(s: string): string {
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename: string, body: string) {
  if (typeof window === "undefined") return
  const blob = new Blob([body], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const CHART_COLORS = ["#6366f1", "#a855f7", "#f59e0b", "#ef4444", "#10b981"]

/** Persisted (per journey × node) selection of segment dimensions.
 *  localStorage keeps it per-viewer; the picker lives inside the tab, so the
 *  selection stays on the same experiment the next time the user opens it. */
function useSegmentDimensions(
  journeyId: string,
  nodeId: string,
): [SegmentDimension[], (next: SegmentDimension[]) => void] {
  const storageKey = `cleargrid:exp-segments:${journeyId}:${nodeId}`
  const [value, setValue] = useState<SegmentDimension[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SEGMENT_DIMENSIONS
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return DEFAULT_SEGMENT_DIMENSIONS
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return DEFAULT_SEGMENT_DIMENSIONS
      const valid = parsed.filter((d): d is SegmentDimension =>
        SEGMENT_DIMENSION_CATALOG.some((c) => c.id === d),
      )
      return valid.length > 0 ? valid : DEFAULT_SEGMENT_DIMENSIONS
    } catch {
      return DEFAULT_SEGMENT_DIMENSIONS
    }
  })
  const setPersisted = (next: SegmentDimension[]) => {
    setValue(next)
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // ignore
    }
  }
  return [value, setPersisted]
}
