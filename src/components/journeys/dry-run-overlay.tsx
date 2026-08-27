"use client"

/**
 * DryRunOverlay — Eternals-style canvas decoration that turns a
 * SimulationResult into per-node count pills + per-edge count labels +
 * a right-side aggregate panel grouped by node kind.
 *
 * Renders inside the ReactFlow container as two absolutely-positioned
 * overlays keyed to the DOM node ids ReactFlow assigns
 * (`data-id="<nodeId>"`) — no ReactFlow custom nodes needed, so any
 * canvas gets decorated without a schema change.
 *
 * Purpose-built for the Journey Builder Dry-run tool that replaces the
 * old canvas count pills. Retire the old NodeCountPillOverlay in favour
 * of this component.
 */

import * as React from "react"
import type { Edge, Node } from "@xyflow/react"
import type { SimulationResult } from "@/lib/simulation"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import {
  BarChart3,
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  Users,
  DollarSign,
  X,
  Info,
} from "lucide-react"

interface DryRunOverlayProps {
  result: SimulationResult | null
  nodes: Node[]
  edges: Edge[]
  hidden: boolean
  onDismiss: () => void
}

/* ─────────── Per-node + per-edge decoration ─────────── */

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

function useNodeAnchors(nodes: Node[], result: SimulationResult | null): Map<string, AnchorRect> {
  const [anchors, setAnchors] = React.useState<Map<string, AnchorRect>>(new Map())
  React.useEffect(() => {
    if (!result) return
    const measure = () => {
      const next = new Map<string, AnchorRect>()
      const container = document.querySelector(".react-flow__viewport") as HTMLElement | null
      const containerRect =
        container?.getBoundingClientRect() ??
        document.querySelector(".react-flow")?.getBoundingClientRect() ??
        null
      if (!containerRect) return
      for (const n of nodes) {
        const el = document.querySelector(`[data-id="${CSS.escape(n.id)}"]`) as HTMLElement | null
        if (!el) continue
        const r = el.getBoundingClientRect()
        next.set(n.id, {
          top: r.top - containerRect.top,
          left: r.left - containerRect.left,
          width: r.width,
          height: r.height,
        })
      }
      setAnchors(next)
    }
    measure()
    const interval = window.setInterval(measure, 300)
    return () => window.clearInterval(interval)
  }, [nodes, result])
  return anchors
}

export function DryRunOverlay({
  result,
  nodes,
  edges,
  hidden,
  onDismiss,
}: DryRunOverlayProps) {
  const anchors = useNodeAnchors(nodes, result)
  if (!result || hidden) return null

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return (
    <>
      {/* Per-node count pills */}
      {Array.from(anchors.entries()).map(([nodeId, rect]) => {
        const sim = result.perNode[nodeId]
        if (!sim) return null
        const node = nodeById.get(nodeId)
        const kind = classifyKind(node)
        return (
          <span
            key={`count-${nodeId}`}
            className={cn(
              "absolute z-30 pointer-events-none rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm backdrop-blur-sm",
              KIND_TONE[kind],
            )}
            style={{
              top: rect.top - 14,
              left: rect.left + 4,
            }}
          >
            {sim.count.toLocaleString()}
          </span>
        )
      })}

      {/* Per-edge count labels — placed between source + target anchor centers */}
      {edges.map((edge) => {
        const src = anchors.get(edge.source)
        const tgt = anchors.get(edge.target)
        if (!src || !tgt) return null
        const srcSim = result.perNode[edge.source]
        if (!srcSim) return null
        const label = (edge.label as string | undefined) ?? edge.sourceHandle ?? ""
        // Resolve edge count: prefer branch label match, fall back to target sim.
        const branchCounts = srcSim.branchCounts ?? {}
        const branchKeys = Object.keys(branchCounts)
        let count: number | null = null
        let matched: string | null = null
        // Explicit label match (case-insensitive)
        for (const key of branchKeys) {
          if (label && key.toLowerCase() === String(label).toLowerCase()) {
            count = branchCounts[key]
            matched = key
            break
          }
        }
        // No explicit label — if only one outgoing edge, use src count.
        if (count === null) {
          const outgoing = edges.filter((e) => e.source === edge.source)
          if (outgoing.length === 1) {
            count = srcSim.count
          } else if (branchKeys.length > 0 && label) {
            // Fuzzy — look up by contains
            const key = branchKeys.find((k) => label.toLowerCase().includes(k.toLowerCase()))
            if (key) {
              count = branchCounts[key]
              matched = key
            }
          }
        }
        if (count === null) return null

        // Midpoint of source-bottom + target-top
        const midX = (src.left + src.width / 2 + tgt.left + tgt.width / 2) / 2
        const midY = (src.top + src.height + tgt.top) / 2
        const tone = branchTone(matched ?? label)
        return (
          <span
            key={`edge-${edge.id}`}
            className={cn(
              "absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider tabular-nums shadow-sm backdrop-blur-sm",
              tone,
            )}
            style={{ top: midY, left: midX }}
          >
            {matched ? `${matched} ` : ""}
            {count.toLocaleString()}
          </span>
        )
      })}

      {/* Right-side aggregate panel */}
      <DryRunAggregatePanel result={result} nodes={nodes} onDismiss={onDismiss} />

      {/* Color legend bottom-left */}
      <DryRunLegend />
    </>
  )
}

/* ─────────── Right-side aggregate panel ─────────── */

function DryRunAggregatePanel({
  result,
  nodes,
  onDismiss,
}: {
  result: SimulationResult
  nodes: Node[]
  onDismiss: () => void
}) {
  const grouped = React.useMemo(() => aggregateByKind(result, nodes), [result, nodes])
  const totalCost = result.totalCostAed
  return (
    <div className="absolute right-4 top-4 z-30 w-[300px] rounded-xl border border-border/60 bg-card/95 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">
          Dry-run
        </span>
        <span className="text-[10px] text-muted-foreground">
          · {result.entered.toLocaleString()} members
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Hide"
          className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="max-h-[52vh] overflow-y-auto p-3 text-[10px]">
        {grouped.map((group) => (
          <div key={group.kind} className="mb-3 last:mb-0">
            <div className="mb-1 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <KindIcon kind={group.kind} />
                <span className="font-semibold uppercase tracking-wider text-foreground">
                  {KIND_LABEL[group.kind]}
                </span>
                <span className="text-muted-foreground">· {group.rows.length} node{group.rows.length === 1 ? "" : "s"}</span>
              </div>
            </div>
            <ul className="divide-y divide-border/60 rounded border border-border/60">
              {group.rows.map((r) => (
                <li key={r.nodeId} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-foreground">{r.label}</span>
                  <span className="tabular-nums text-foreground">{r.count.toLocaleString()}</span>
                  {r.secondary !== undefined && (
                    <span className="tabular-nums text-muted-foreground">
                      · {r.secondary.toLocaleString()}
                    </span>
                  )}
                </li>
              ))}
              <li className="flex items-center gap-2 bg-muted/[0.06] px-2 py-1.5 text-[10px] font-semibold">
                <span className="min-w-0 flex-1">Total</span>
                <span className="tabular-nums text-primary">
                  {group.rows.reduce((s, r) => s + r.count, 0).toLocaleString()}
                </span>
                {group.rows.some((r) => r.secondary !== undefined) && (
                  <span className="tabular-nums text-muted-foreground">
                    · {group.rows.reduce((s, r) => s + (r.secondary ?? 0), 0).toLocaleString()}
                  </span>
                )}
              </li>
            </ul>
          </div>
        ))}

        {totalCost > 0 && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-primary">
            <DollarSign className="h-3 w-3" />
            <span className="font-semibold uppercase tracking-wider">Est. send cost</span>
            <span className="ml-auto font-semibold tabular-nums">{formatAED(totalCost)}</span>
          </div>
        )}

        <p className="mt-3 flex items-center gap-1 text-[9px] text-muted-foreground">
          <Info className="h-2.5 w-2.5" />
          Dry-run only — the journey hasn&apos;t enrolled these borrowers.
        </p>
      </div>
    </div>
  )
}

/* ─────────── Legend bottom-left ─────────── */

function DryRunLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-2.5 py-1 text-[10px] shadow-sm backdrop-blur-sm">
      {(
        [
          ["Trigger", "bg-success-400"],
          ["Condition", "bg-chart-2"],
          ["Action", "bg-primary"],
          ["Flow / Exit", "bg-warning-400"],
          ["Global exit", "bg-error-500"],
        ] as const
      ).map(([label, dot]) => (
        <span key={label} className="inline-flex items-center gap-1 text-neutral-500">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          {label}
        </span>
      ))}
    </div>
  )
}

/* ─────────── Kind classifier + aggregate grouping ─────────── */

type NodeKind =
  | "trigger"
  | "condition"
  | "action_email"
  | "action_sms"
  | "action_whatsapp"
  | "action_call"
  | "action_other"
  | "wait"
  | "human"
  | "end"
  | "global_exit"
  | "other"

function classifyKind(node: Node | undefined): NodeKind {
  if (!node) return "other"
  const t = String(((node.data ?? {}) as { blockType?: string }).blockType ?? node.type ?? "")
  const at = String(((node.data ?? {}) as { actionType?: string }).actionType ?? "")
  if (t.endsWith("_trigger") || t === "trigger") return "trigger"
  if (t === "send_email" || at === "email") return "action_email"
  if (t === "send_sms" || at === "sms") return "action_sms"
  if (t === "whatsapp_ott" || at === "whatsapp") return "action_whatsapp"
  if (t === "trigger_ai_call" || at === "call") return "action_call"
  if (t === "action_split" || t === "decision_split" || t === "check_attribute" || t === "condition" || t === "has_done_event") return "condition"
  if (t === "wait" || t === "wait_time" || t === "wait_until") return "wait"
  if (t === "trigger_human_campaign") return "human"
  if (t === "end_journey" || t === "end") return "end"
  if (t.includes("global_exit")) return "global_exit"
  return "other"
}

const KIND_LABEL: Record<NodeKind, string> = {
  trigger: "Triggers",
  condition: "Conditions",
  action_email: "Emails",
  action_sms: "SMS",
  action_whatsapp: "WhatsApp",
  action_call: "AI Calls",
  action_other: "Actions",
  wait: "Waits",
  human: "Human campaigns",
  end: "Ends",
  global_exit: "Global exits",
  other: "Other",
}

const KIND_TONE: Record<NodeKind, string> = {
  trigger: "border-success-500/40 bg-success-500/10 text-success-300",
  condition: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  action_email: "border-primary/40 bg-primary/10 text-primary",
  action_sms: "border-primary/40 bg-primary/10 text-primary",
  action_whatsapp: "border-primary/40 bg-primary/10 text-primary",
  action_call: "border-primary/40 bg-primary/10 text-primary",
  action_other: "border-primary/40 bg-primary/10 text-primary",
  wait: "border-warning-500/40 bg-warning-500/10 text-warning-300",
  human: "border-warning-500/40 bg-warning-500/10 text-warning-300",
  end: "border-warning-500/40 bg-warning-500/10 text-warning-300",
  global_exit: "border-error-500/40 bg-error-500/10 text-error-300",
  other: "border-border bg-background text-foreground",
}

function KindIcon({ kind }: { kind: NodeKind }) {
  const cls = "h-2.5 w-2.5"
  if (kind === "action_email") return <Mail className={cls} />
  if (kind === "action_sms") return <MessageSquare className={cls} />
  if (kind === "action_whatsapp") return <MessageCircle className={cls} />
  if (kind === "action_call") return <Phone className={cls} />
  return <Users className={cls} />
}

interface AggregateRow {
  nodeId: string
  label: string
  count: number
  secondary?: number
}

function aggregateByKind(
  result: SimulationResult,
  nodes: Node[],
): Array<{ kind: NodeKind; rows: AggregateRow[] }> {
  const groups = new Map<NodeKind, AggregateRow[]>()
  for (const n of nodes) {
    const kind = classifyKind(n)
    if (kind === "other" || kind === "end" || kind === "trigger" || kind === "condition" || kind === "wait") continue
    const sim = result.perNode[n.id]
    if (!sim || sim.count === 0) continue
    const data = (n.data ?? {}) as { label?: string }
    groups.get(kind) ?? groups.set(kind, [])
    const arr = groups.get(kind)!
    const row: AggregateRow = {
      nodeId: n.id,
      label: data.label ?? n.id,
      count: sim.count,
    }
    // For AI Call nodes, add attempts (borrowers × 1.2 for redial average — approximation).
    if (kind === "action_call") {
      row.secondary = Math.round(sim.count * 1.2)
    }
    arr.push(row)
  }
  return Array.from(groups.entries()).map(([kind, rows]) => ({ kind, rows }))
}

/* ─────────── Branch label tone ─────────── */

function branchTone(label: string | null | undefined): string {
  if (!label) return "border-border/60 bg-background/95 text-foreground"
  const l = String(label).toLowerCase()
  if (l === "yes" || l === "true") return "border-success-500/40 bg-success-500/[0.08] text-success-300"
  if (l === "no" || l === "false") return "border-error-500/40 bg-error-500/[0.08] text-error-300"
  if (l === "event") return "border-primary/40 bg-primary/[0.08] text-primary"
  if (l === "timeout") return "border-warning-500/40 bg-warning-500/[0.08] text-warning-300"
  return "border-border/60 bg-background/95 text-foreground"
}
