"use client"

/**
 * Experiment Results view — rendered inside the Experiment / A-B Test node
 * config, below its Variant Split and Auto-Optimization sections.
 *
 * Shape: one column per arm (variant A / B / C / D). Each column shows:
 *   - Cohort size (deterministic split from the node's share %).
 *   - Channels used — derived from the blockTypes of every downstream node
 *     reachable from that variant's output handle.
 *   - Test duration + days elapsed (prototype: started 10 days ago).
 *   - Primary KPIs: Cost per recovery, Collection %, PTP CR%.
 *   - Secondary KPI: Median time to resolution.
 *   - Difference vs Control (A) for each KPI, absolute + relative.
 *
 * Channel cost inputs come from `JourneySettings.costs` today; a TODO
 * flags the move to Lender Configurations.
 */

import * as React from "react"
import type { Node, Edge } from "@xyflow/react"
import { cn } from "@/lib/utils"
import { loadJourneySettings } from "@/data/journey-settings"
import { fmt } from "@/data/journey-metrics"

interface ExperimentResultsProps {
  journeyId: string
  nodeId: string
  data: Record<string, unknown>
  nodes: Node[]
  edges: Edge[]
}

const VARIANT_HANDLES = ["out-0", "out-1", "out-2", "out-3"] as const
const VARIANT_LABELS = ["Control (A)", "Variant B", "Variant C", "Variant D"]
const VARIANT_SHARE_FIELDS = ["splitA", "splitB", "splitC", "splitD"] as const

interface ArmSummary {
  label: string
  share: number
  cohort: number
  channels: string[]
  costPerRecovery: number
  collectionPct: number
  ptpCrPct: number
  timeToResolutionDays: number
}

function hash(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function seeded(seed: number): () => number {
  let s = seed || 1
  return () => {
    s = Math.imul(1664525, s) + 1013904223
    return ((s >>> 8) & 0xffffff) / 0xffffff
  }
}

/** Walk downstream from (nodeId, sourceHandle) and collect the channel
 *  blockType labels reachable along that branch. Only follows action-kind
 *  nodes; stops at end / exit nodes. */
function walkChannels(
  nodes: Node[],
  edges: Edge[],
  startId: string,
  sourceHandle: string,
): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const outgoing = new Map<string, Edge[]>()
  for (const e of edges) {
    const arr = outgoing.get(e.source) ?? []
    arr.push(e)
    outgoing.set(e.source, arr)
  }
  const found = new Set<string>()
  const visited = new Set<string>()
  const queue: Array<{ id: string; handle?: string }> = [
    { id: startId, handle: sourceHandle },
  ]
  while (queue.length > 0) {
    const { id, handle } = queue.shift()!
    const edgesOut = outgoing.get(id) ?? []
    for (const e of edgesOut) {
      if (handle && e.sourceHandle && e.sourceHandle !== handle) continue
      if (visited.has(e.target)) continue
      visited.add(e.target)
      const n = byId.get(e.target)
      if (!n) continue
      const d = (n.data ?? {}) as { blockType?: string; label?: string }
      const bt = d.blockType ?? ""
      if (bt === "send_email") found.add("Email")
      else if (bt === "send_sms") found.add("SMS")
      else if (bt === "whatsapp_ott") found.add("WhatsApp")
      else if (bt === "trigger_ai_call") found.add("AI Call")
      else if (bt === "hybrid_campaign") found.add("Hybrid")
      else if (
        bt === "trigger_human_campaign" ||
        bt === "use_human_campaign"
      )
        found.add("Human Call")
      queue.push({ id: e.target })
    }
  }
  return Array.from(found)
}

export function ExperimentResults({
  journeyId,
  nodeId,
  data,
  nodes,
  edges,
}: ExperimentResultsProps) {
  const settings = React.useMemo(() => loadJourneySettings(journeyId), [journeyId])
  const variantCount = Math.max(2, Math.min(4, (data.variantCount as number) ?? 2))
  const totalCohort = 1200 // prototype cohort

  const arms: ArmSummary[] = React.useMemo(() => {
    return Array.from({ length: variantCount }, (_, i) => {
      const share = Math.max(0, Math.min(100, (data[VARIANT_SHARE_FIELDS[i]] as number) ?? 0))
      const cohort = Math.round(totalCohort * (share / 100))
      const channels = walkChannels(nodes, edges, nodeId, VARIANT_HANDLES[i])
      const rng = seeded(hash(`arm|${journeyId}|${nodeId}|${i}`))

      // Per-channel cost assumption (prototype):
      //   Email ≈ 1 send / borrower, SMS ≈ 1.2 segments / borrower, AI call
      //   ≈ settings.costs.aiCallAvgMinutes minutes per attempt.
      const costPerBorrower =
        (channels.includes("Email") ? settings.costs.emailPerSendAED : 0) +
        (channels.includes("SMS") ? 1.2 * settings.costs.smsPerSegmentAED : 0) +
        (channels.includes("AI Call")
          ? settings.costs.aiCallPerMinuteAED * settings.costs.aiCallAvgMinutes
          : 0)
      const totalCost = cohort * costPerBorrower

      // Collection scales with channel mix; Control (i==0) full bundle sets
      // the baseline, dropping Call costs collection by ~8%.
      const base = 220 + rng() * 60
      const callPenalty = channels.includes("AI Call") ? 1.0 : 0.92
      const collection = Math.round(cohort * base * callPenalty)
      const collectionPct = collection > 0 ? collection / (cohort * 6000) : 0
      const ptpCrPct = 0.06 + rng() * 0.02 - (channels.includes("AI Call") ? 0 : 0.008)
      const timeToResolutionDays = 5 + rng() * 2 + (channels.includes("AI Call") ? 0 : 0.8)
      const costPerRecovery = collection > 0 ? totalCost / collection : 0

      return {
        label: VARIANT_LABELS[i],
        share,
        cohort,
        channels,
        costPerRecovery,
        collectionPct,
        ptpCrPct,
        timeToResolutionDays,
      }
    })
  }, [
    variantCount,
    data,
    nodes,
    edges,
    nodeId,
    journeyId,
    settings.costs.aiCallAvgMinutes,
    settings.costs.aiCallPerMinuteAED,
    settings.costs.emailPerSendAED,
    settings.costs.smsPerSegmentAED,
  ])

  const control = arms[0]
  const testDurationDays = 10
  const daysElapsed = 7

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold text-foreground">
          Results · day {daysElapsed} of {testDurationDays}
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Channel costs and collection estimates come from Journey Settings.{" "}
          <span className="italic">
            TODO: move per-channel costs to Lender Configurations.
          </span>
        </p>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${arms.length}, minmax(0, 1fr))` }}>
        {arms.map((a, i) => (
          <ArmColumn
            key={i}
            arm={a}
            control={control}
            isControl={i === 0}
            daysElapsed={daysElapsed}
            testDurationDays={testDurationDays}
          />
        ))}
      </div>
    </div>
  )
}

function ArmColumn({
  arm,
  control,
  isControl,
  daysElapsed,
  testDurationDays,
}: {
  arm: ArmSummary
  control: ArmSummary
  isControl: boolean
  daysElapsed: number
  testDurationDays: number
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/60 p-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-foreground">{arm.label}</div>
        <span className="text-[9.5px] text-muted-foreground">
          {arm.share.toFixed(0)}%
        </span>
      </div>
      <Row label="Cohort" value={arm.cohort.toLocaleString()} />
      <Row
        label="Channels"
        value={
          arm.channels.length === 0 ? (
            <span className="italic text-muted-foreground">None wired</span>
          ) : (
            arm.channels.join(" · ")
          )
        }
      />
      <Row label="Duration" value={`${daysElapsed} / ${testDurationDays} days`} />

      <KpiRow
        label="Cost per recovery"
        value={fmt("collection", arm.costPerRecovery).replace("AED ", "AED ")}
        delta={!isControl ? arm.costPerRecovery - control.costPerRecovery : null}
        deltaRel={
          !isControl && control.costPerRecovery > 0
            ? (arm.costPerRecovery - control.costPerRecovery) / control.costPerRecovery
            : null
        }
        /** Lower is better for cost. */
        goodDirection="down"
      />
      <KpiRow
        label="Collection %"
        value={fmt("recovery_pct", arm.collectionPct)}
        delta={!isControl ? arm.collectionPct - control.collectionPct : null}
        deltaRel={
          !isControl && control.collectionPct > 0
            ? (arm.collectionPct - control.collectionPct) / control.collectionPct
            : null
        }
        goodDirection="up"
      />
      <KpiRow
        label="PTP CR%"
        value={fmt("cr_pct", arm.ptpCrPct)}
        delta={!isControl ? arm.ptpCrPct - control.ptpCrPct : null}
        deltaRel={
          !isControl && control.ptpCrPct > 0
            ? (arm.ptpCrPct - control.ptpCrPct) / control.ptpCrPct
            : null
        }
        goodDirection="up"
      />
      <KpiRow
        label="Time to resolution"
        value={`${arm.timeToResolutionDays.toFixed(1)} d`}
        delta={!isControl ? arm.timeToResolutionDays - control.timeToResolutionDays : null}
        deltaRel={
          !isControl && control.timeToResolutionDays > 0
            ? (arm.timeToResolutionDays - control.timeToResolutionDays) / control.timeToResolutionDays
            : null
        }
        goodDirection="down"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-1 text-[10.5px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function KpiRow({
  label,
  value,
  delta,
  deltaRel,
  goodDirection,
}: {
  label: string
  value: string
  delta: number | null
  deltaRel: number | null
  goodDirection: "up" | "down"
}) {
  const positive = delta != null && delta > 0
  const good = delta == null
    ? null
    : goodDirection === "up"
      ? delta > 0
      : delta < 0
  return (
    <div className="rounded border border-border/60 bg-background/40 px-1.5 py-1 text-[10.5px]">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      {delta != null && deltaRel != null && (
        <div
          className={cn(
            "mt-0.5 text-right text-[9.5px]",
            good === true && "text-emerald-300",
            good === false && "text-error-300",
            good == null && "text-muted-foreground",
          )}
        >
          {positive ? "+" : ""}
          {delta.toFixed(label.includes("%") ? 3 : 2)}
          {" ("}
          {positive ? "+" : ""}
          {(deltaRel * 100).toFixed(1)}%)
        </div>
      )}
    </div>
  )
}
