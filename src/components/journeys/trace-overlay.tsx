"use client"

/**
 * TraceOverlay — the "watch this borrower walk the journey" view.
 *
 * Renders when the canvas URL carries `?trace=<borrowerId>`. Auto-animates
 * one hop per second — no playback controls, just watch:
 *
 *   1. Path highlighting — nodes reveal one at a time. Each visited node
 *      gets a coloured pass badge (1st green / 2nd amber / 3rd blue /
 *      4th+ violet, red for failed), the node the borrower is at right
 *      now gets a pulsing dashed blue ring, and traversed edges are drawn
 *      on top of ReactFlow's edges in the same pass palette.
 *   2. Analytics — the info card carries a compact profile: total hops,
 *      messages sent / opened / clicked, calls, PTPs, recovered AED, plus
 *      a scrollable hop-by-hop timeline you can click to jump to any hop.
 *
 * The overlay is a pure sibling of ReactFlow — no custom nodes, no schema
 * changes — anchored via `[data-id="<nodeId>"]` inside `.react-flow`.
 */

import * as React from "react"
import type { Edge, Node } from "@xyflow/react"
import {
  X,
  User,
  ArrowRight,
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import type { BorrowerTrace, TraceHop } from "@/data/borrower-traces"
import type { Borrower } from "@/data/borrowers"

interface TraceOverlayProps {
  trace: BorrowerTrace | null
  borrower: Borrower
  onDismiss: () => void
  journeyId: string
  edges: Edge[]
  nodes: Node[]
}

const PASS_COLORS = [
  {
    label: "1st pass",
    badge: "bg-success-500/85 text-success-950 border-success-500",
    stroke: "rgba(30,175,96,0.9)",
  },
  {
    label: "2nd pass",
    badge: "bg-warning-500/85 text-warning-950 border-warning-500",
    stroke: "rgba(214,167,44,0.9)",
  },
  {
    label: "3rd pass",
    badge: "bg-info-500/85 text-white border-info-500",
    stroke: "rgba(38,112,220,0.9)",
  },
  {
    label: "4th+ pass",
    badge: "bg-violet-500/85 text-white border-violet-500",
    stroke: "rgba(124,58,237,0.9)",
  },
]

const FAILED_BADGE = "bg-error-500/90 text-white border-error-500"
const FAILED_STROKE = "rgba(220,58,58,0.9)"
const CURRENT_RING =
  "outline outline-2 outline-info-500 outline-offset-2 outline-dashed animate-pulse"

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

function useNodeAnchors(nodeIds: string[]): Map<string, AnchorRect> {
  const [anchors, setAnchors] = React.useState<Map<string, AnchorRect>>(new Map())
  React.useEffect(() => {
    const measure = () => {
      const container = document.querySelector(".react-flow") as HTMLElement | null
      if (!container) return
      const containerRect = container.getBoundingClientRect()
      const next = new Map<string, AnchorRect>()
      for (const id of nodeIds) {
        const el = container.querySelector(
          `[data-id="${CSS.escape(id)}"]`,
        ) as HTMLElement | null
        if (!el) continue
        const r = el.getBoundingClientRect()
        next.set(id, {
          top: r.top - containerRect.top,
          left: r.left - containerRect.left,
          width: r.width,
          height: r.height,
        })
      }
      setAnchors((prev) => {
        if (prev.size !== next.size) return next
        for (const [id, a] of next) {
          const b = prev.get(id)
          if (!b) return next
          if (
            Math.abs(a.top - b.top) > 0.5 ||
            Math.abs(a.left - b.left) > 0.5 ||
            Math.abs(a.width - b.width) > 0.5 ||
            Math.abs(a.height - b.height) > 0.5
          )
            return next
        }
        return prev
      })
    }
    measure()
    const interval = window.setInterval(measure, 100)
    const onResize = () => measure()
    window.addEventListener("resize", onResize)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("resize", onResize)
    }
  }, [nodeIds])
  return anchors
}

/* ─────────── Auto-walk engine ─────────── */

/** How long each hop lingers before advancing. */
const MS_PER_HOP = 1400

function useAutoWalk(totalHops: number) {
  const [playHead, setPlayHead] = React.useState(0)

  // Reset when the trace changes.
  React.useEffect(() => {
    setPlayHead(0)
  }, [totalHops])

  // Auto-advance one hop at a time until the path is fully revealed.
  React.useEffect(() => {
    if (playHead >= totalHops) return
    const t = window.setTimeout(() => {
      setPlayHead((v) => Math.min(totalHops, v + 1))
    }, MS_PER_HOP)
    return () => window.clearTimeout(t)
  }, [playHead, totalHops])

  return { playHead, setPlayHead }
}

/* ─────────── Hop failure classifier ─────────── */

function hopFailed(hop: TraceHop): boolean {
  if (hop.outcome.kind === "message") return hop.outcome.events.includes("bounced")
  if (hop.outcome.kind === "call")
    return (
      hop.outcome.result === "no_answer" ||
      hop.outcome.result === "busy" ||
      hop.outcome.result === "dropped"
    )
  return false
}

/* ─────────── Analytics summary ─────────── */

interface AnalyticsSummary {
  hops: number
  messagesSent: number
  messagesOpened: number
  messagesClicked: number
  messagesBounced: number
  callsMade: number
  callsConnected: number
  ptpsCaptured: number
  recoveredAED: number
  totalWaitHours: number
}

function summarize(hops: TraceHop[], recoveredAED: number): AnalyticsSummary {
  let messagesSent = 0
  let messagesOpened = 0
  let messagesClicked = 0
  let messagesBounced = 0
  let callsMade = 0
  let callsConnected = 0
  let ptpsCaptured = 0
  let totalWaitHours = 0
  for (const h of hops) {
    if (h.outcome.kind === "message") {
      messagesSent++
      if (h.outcome.events.includes("opened")) messagesOpened++
      if (h.outcome.events.includes("clicked")) messagesClicked++
      if (h.outcome.events.includes("bounced")) messagesBounced++
    } else if (h.outcome.kind === "call") {
      callsMade++
      if (h.outcome.result === "connected" || h.outcome.result === "ptp_captured")
        callsConnected++
      if (h.outcome.result === "ptp_captured") ptpsCaptured++
    } else if (h.outcome.kind === "wait") {
      totalWaitHours += h.outcome.hours
    }
  }
  return {
    hops: hops.length,
    messagesSent,
    messagesOpened,
    messagesClicked,
    messagesBounced,
    callsMade,
    callsConnected,
    ptpsCaptured,
    recoveredAED,
    totalWaitHours,
  }
}

/* ─────────── Overlay ─────────── */

export function TraceOverlay({
  trace,
  borrower,
  onDismiss,
  journeyId,
  edges,
  nodes,
}: TraceOverlayProps) {
  const nodeIds = React.useMemo(
    () => (trace ? Array.from(new Set(trace.hops.map((h) => h.nodeId))) : []),
    [trace],
  )
  const anchors = useNodeAnchors(nodeIds)
  const { playHead, setPlayHead } = useAutoWalk(trace?.hops.length ?? 0)

  if (!trace) return null

  const totalHops = trace.hops.length
  const hopsShown = trace.hops.slice(0, playHead)

  // Aggregate passes per node — only through the current playhead.
  const passesByNode = new Map<
    string,
    Array<{ hopIndex: number; passIndex: number; failed: boolean }>
  >()
  const nodeHopCounts = new Map<string, number>()
  hopsShown.forEach((hop, hopIndex) => {
    const count = nodeHopCounts.get(hop.nodeId) ?? 0
    nodeHopCounts.set(hop.nodeId, count + 1)
    const failed = hopFailed(hop)
    if (!passesByNode.has(hop.nodeId)) passesByNode.set(hop.nodeId, [])
    passesByNode.get(hop.nodeId)!.push({ hopIndex, passIndex: count, failed })
  })

  const currentHop = playHead > 0 ? trace.hops[playHead - 1] : null
  const currentNodeId =
    playHead > 0
      ? currentHop?.nodeId ?? null
      : trace.status === "active"
        ? trace.currentNodeId
        : null

  // Resolve traversed edges — a directed pair (hopA.nodeId → hopB.nodeId).
  const edgeById = React.useMemo(() => {
    const map = new Map<string, Edge[]>()
    for (const e of edges) {
      const key = `${e.source}::${e.target}`
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return map
  }, [edges])

  const traversedEdgeIds = new Set<string>()
  const traversedEdgePassIndex = new Map<string, number>()
  for (let i = 0; i + 1 < hopsShown.length; i++) {
    const from = hopsShown[i].nodeId
    const to = hopsShown[i + 1].nodeId
    const matches = edgeById.get(`${from}::${to}`) ?? []
    for (const e of matches) {
      traversedEdgeIds.add(e.id)
      // Pass index (redial number) inherits from the source node's visit count.
      const passesAtFrom = passesByNode.get(from) ?? []
      const passIndex = Math.min(
        passesAtFrom.length - 1,
        PASS_COLORS.length - 1,
      )
      traversedEdgePassIndex.set(e.id, Math.max(0, passIndex))
    }
  }

  const summary = summarize(hopsShown, sumRecoveredThroughHop(trace, playHead))
  const overall = summarize(trace.hops, trace.recoveredAED)

  return (
    <>
      {/* Traversed edges — coloured SVG overlay on top of ReactFlow's edges */}
      <TraversedEdgesLayer
        edges={edges}
        traversedIds={traversedEdgeIds}
        passIndexByEdge={traversedEdgePassIndex}
      />

      {/* Per-node badges + current-node ring */}
      {Array.from(anchors.entries()).map(([nodeId, rect]) => {
        const passes = passesByNode.get(nodeId) ?? []
        const isCurrent = nodeId === currentNodeId
        return (
          <React.Fragment key={`trace-${nodeId}`}>
            {passes.length > 0 && (
              <div
                className="absolute z-30 flex flex-col gap-0.5 pointer-events-none"
                style={{ top: rect.top - 12, left: rect.left - 8 }}
              >
                {passes.map((p) => {
                  const color = p.failed
                    ? FAILED_BADGE
                    : PASS_COLORS[Math.min(p.passIndex, PASS_COLORS.length - 1)]
                        .badge
                  return (
                    <span
                      key={`${nodeId}-${p.passIndex}`}
                      className={cn(
                        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border px-1.5 text-[9px] font-bold tabular-nums shadow-sm",
                        color,
                      )}
                      title={
                        p.failed
                          ? "Failed"
                          : PASS_COLORS[
                              Math.min(p.passIndex, PASS_COLORS.length - 1)
                            ].label
                      }
                    >
                      {p.passIndex + 1}
                    </span>
                  )
                })}
              </div>
            )}
            {isCurrent && (
              <div
                className={cn(
                  "absolute z-25 rounded-lg pointer-events-none",
                  CURRENT_RING,
                )}
                style={{
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                }}
              />
            )}
            {/* "Borrower is here" chip */}
            {isCurrent && (
              <div
                className="absolute z-40 pointer-events-none"
                style={{ top: rect.top + rect.height + 4, left: rect.left }}
              >
                <span className="inline-flex items-center gap-1 rounded-full border border-info-500/60 bg-info-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-info-300 shadow-sm backdrop-blur-sm">
                  <User className="h-2.5 w-2.5" />
                  {borrower.name.split(" ")[0]} here
                </span>
              </div>
            )}
          </React.Fragment>
        )
      })}

      {/* Right-side info card — playback + analytics + timeline */}
      <div className="absolute right-4 top-4 z-40 flex max-h-[calc(100vh-80px)] w-[340px] flex-col rounded-xl border border-info-500/40 bg-card/95 shadow-xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-1.5 border-b border-info-500/30 px-3 py-2">
          <User className="h-3.5 w-3.5 text-info-300" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-info-300">
            Real executed flow
          </span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Clear trace"
            className="ml-auto rounded p-0.5 text-info-300 hover:bg-info-500/20"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Borrower + status */}
        <div className="border-b border-info-500/20 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-foreground">
                {borrower.name}
              </div>
              <div className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">
                {borrower.id} · {borrower.dpdBucket} DPD · {borrower.product}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                trace.status === "converted"
                  ? "bg-primary/15 text-primary"
                  : trace.status === "active"
                    ? "bg-info-500/15 text-info-300"
                    : trace.status === "errored"
                      ? "bg-error-500/15 text-error-300"
                      : "bg-muted text-neutral-300",
              )}
            >
              {trace.status}
            </span>
          </div>
        </div>

        {/* Analytics tiles */}
        <div className="border-b border-info-500/20 px-3 py-2">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            What they did {playHead < totalHops ? "(so far)" : "(overall)"}
          </p>
          <div className="grid grid-cols-4 gap-1">
            <AnalyticTile
              icon={<Circle className="h-2.5 w-2.5" />}
              label="Hops"
              value={summary.hops}
              total={overall.hops}
              tone="foreground"
            />
            <AnalyticTile
              icon={<Mail className="h-2.5 w-2.5" />}
              label="Msgs"
              value={summary.messagesSent}
              total={overall.messagesSent}
              tone="primary"
            />
            <AnalyticTile
              icon={<Phone className="h-2.5 w-2.5" />}
              label="Calls"
              value={summary.callsMade}
              total={overall.callsMade}
              tone="info"
            />
            <AnalyticTile
              icon={<DollarSign className="h-2.5 w-2.5" />}
              label="AED"
              value={summary.recoveredAED}
              total={overall.recoveredAED}
              tone="primary"
              money
            />
          </div>
          {(overall.messagesOpened > 0 ||
            overall.messagesClicked > 0 ||
            overall.callsConnected > 0 ||
            overall.ptpsCaptured > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1 text-[9px]">
              {overall.messagesOpened > 0 && (
                <ChipStat
                  label="opened"
                  value={summary.messagesOpened}
                  total={overall.messagesOpened}
                  tone="info"
                />
              )}
              {overall.messagesClicked > 0 && (
                <ChipStat
                  label="clicked"
                  value={summary.messagesClicked}
                  total={overall.messagesClicked}
                  tone="primary"
                />
              )}
              {overall.messagesBounced > 0 && (
                <ChipStat
                  label="bounced"
                  value={summary.messagesBounced}
                  total={overall.messagesBounced}
                  tone="error"
                />
              )}
              {overall.callsConnected > 0 && (
                <ChipStat
                  label="RPC"
                  value={summary.callsConnected}
                  total={overall.callsConnected}
                  tone="info"
                />
              )}
              {overall.ptpsCaptured > 0 && (
                <ChipStat
                  label="PTPs"
                  value={summary.ptpsCaptured}
                  total={overall.ptpsCaptured}
                  tone="primary"
                />
              )}
              {overall.totalWaitHours > 0 && (
                <ChipStat
                  label="wait"
                  suffix="h"
                  value={summary.totalWaitHours}
                  total={overall.totalWaitHours}
                  tone="warn"
                />
              )}
            </div>
          )}
        </div>

        {/* Timeline — click to jump */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <p className="px-1 pb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline · {totalHops} hop{totalHops === 1 ? "" : "s"}
          </p>
          <ol className="space-y-0.5">
            {trace.hops.map((h, i) => {
              const played = i < playHead
              const isCurrent = i === playHead - 1
              const failed = hopFailed(h)
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setPlayHead(i + 1)}
                    className={cn(
                      "flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left text-[10px] transition-colors",
                      isCurrent
                        ? "bg-info-500/15 ring-1 ring-info-500/40"
                        : played
                          ? "hover:bg-muted/40"
                          : "opacity-50 hover:bg-muted/20 hover:opacity-80",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full border text-[7px] font-bold",
                        failed
                          ? "border-error-500 bg-error-500/20 text-error-300"
                          : played
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {played ? (
                        failed ? (
                          "×"
                        ) : (
                          <CheckCircle2 className="h-2 w-2" />
                        )
                      ) : (
                        i + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-foreground">
                        <HopKindIcon hop={h} /> {h.label}
                      </div>
                      <div className="truncate text-[9px] text-muted-foreground">
                        <HopSummary hop={h} />
                      </div>
                    </div>
                    <span className="shrink-0 text-[8px] tabular-nums text-muted-foreground">
                      {new Date(h.at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Footer link */}
        <div className="border-t border-info-500/20 px-3 py-2">
          <Link
            href={`/journeys/${journeyId}/validator`}
            className="inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
          >
            Back to Validator
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </>
  )
}

/* ─────────── Analytics helpers ─────────── */

function sumRecoveredThroughHop(trace: BorrowerTrace, throughIndex: number): number {
  if (throughIndex <= 0) return 0
  const shownHopIds = new Set(trace.hops.slice(0, throughIndex).map((h) => h.id))
  return trace.conversions
    .filter((c) => shownHopIds.has(c.attributedToHopId))
    .reduce((sum, c) => sum + c.amountAED, 0)
}

function AnalyticTile({
  icon,
  label,
  value,
  total,
  tone,
  money,
}: {
  icon: React.ReactNode
  label: string
  value: number
  total: number
  tone: "foreground" | "primary" | "info" | "warn" | "error"
  money?: boolean
}) {
  const shown = money ? formatAED(value) : value.toLocaleString()
  return (
    <div className="rounded border border-border/60 bg-background/50 px-1.5 py-1">
      <div className="flex items-center gap-0.5 text-[8px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 truncate text-[12px] font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "info" && "text-info-300",
          tone === "warn" && "text-warning-300",
          tone === "error" && "text-error-300",
          tone === "foreground" && "text-foreground",
        )}
      >
        {shown}
      </div>
      {value < total && (
        <div className="text-[8px] tabular-nums text-muted-foreground">
          of {money ? formatAED(total) : total.toLocaleString()}
        </div>
      )}
    </div>
  )
}

function ChipStat({
  label,
  value,
  total,
  tone,
  suffix,
}: {
  label: string
  value: number
  total: number
  tone: "primary" | "info" | "warn" | "error"
  suffix?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-px font-medium",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "info" && "bg-info-500/10 text-info-300",
        tone === "warn" && "bg-warning-500/10 text-warning-300",
        tone === "error" && "bg-error-500/10 text-error-300",
      )}
    >
      <span className="tabular-nums">
        {value}
        {suffix ?? ""}
      </span>
      {value < total && (
        <span className="text-muted-foreground">
          /{total}
          {suffix ?? ""}
        </span>
      )}
      <span className="uppercase">{label}</span>
    </span>
  )
}

/* ─────────── Hop summary helpers ─────────── */

function HopKindIcon({ hop }: { hop: TraceHop }) {
  const cls = "-mt-0.5 inline h-2.5 w-2.5"
  switch (hop.outcome.kind) {
    case "message":
      if (hop.outcome.channel === "email") return <Mail className={cls} />
      if (hop.outcome.channel === "sms") return <MessageSquare className={cls} />
      return <MessageCircle className={cls} />
    case "call":
      return <Phone className={cls} />
    case "wait":
      return <Clock className={cls} />
    case "branch":
      return <Users className={cls} />
    default:
      return null
  }
}

function HopSummary({ hop }: { hop: TraceHop }) {
  switch (hop.outcome.kind) {
    case "message":
      return <>{hop.outcome.channel} · {hop.outcome.events.join(", ")}</>
    case "call":
      return <>{hop.outcome.result.replace("_", " ")}{hop.outcome.duration_s ? ` · ${hop.outcome.duration_s}s` : ""}</>
    case "wait":
      return <>Waited {hop.outcome.hours}h</>
    case "branch":
      return <>Branch: {hop.outcome.label}</>
    case "human":
      return <>Human · {hop.outcome.queue} · {hop.outcome.status}</>
    case "end":
      return <>End · {hop.outcome.tag}</>
    case "trigger":
      return <>{hop.outcome.reason}</>
  }
}

/* ─────────── Traversed edges SVG layer ─────────── */

function TraversedEdgesLayer({
  edges,
  traversedIds,
  passIndexByEdge,
}: {
  edges: Edge[]
  traversedIds: Set<string>
  passIndexByEdge: Map<string, number>
}) {
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 100)
    return () => window.clearInterval(t)
  }, [])

  if (traversedIds.size === 0) return null

  // ReactFlow renders every edge as a `<path>` inside `.react-flow__edges` with
  // `data-id="<edgeId>"`. We can't restyle that path directly (ReactFlow owns
  // it), so we draw a coloured stroke on top with an animated dash to signal
  // motion in playback direction.
  const container = typeof document !== "undefined"
    ? (document.querySelector(".react-flow") as HTMLElement | null)
    : null
  if (!container) return null
  const containerRect = container.getBoundingClientRect()

  return (
    <svg
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    >
      {edges.map((edge) => {
        if (!traversedIds.has(edge.id)) return null
        const el = container.querySelector(
          `.react-flow__edge[data-id="${CSS.escape(edge.id)}"] path.react-flow__edge-path, .react-flow__edges [data-id="${CSS.escape(edge.id)}"] path`,
        ) as SVGPathElement | null
        if (!el) return null
        const rfSvg = el.ownerSVGElement
        if (!rfSvg) return null
        const rfSvgRect = rfSvg.getBoundingClientRect()
        const d = el.getAttribute("d") ?? ""
        if (!d) return null
        const passIndex = passIndexByEdge.get(edge.id) ?? 0
        const stroke =
          PASS_COLORS[Math.min(passIndex, PASS_COLORS.length - 1)].stroke
        return (
          <g
            key={`traversed-${edge.id}`}
            transform={`translate(${rfSvgRect.left - containerRect.left}, ${rfSvgRect.top - containerRect.top})`}
          >
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={3}
              strokeDasharray="8 4"
              className="animate-[trace-flow_1s_linear_infinite]"
              style={{ filter: "drop-shadow(0 0 4px rgba(56,161,105,0.4))" }}
            />
          </g>
        )
      })}
      <style jsx>{`
        @keyframes trace-flow {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  )
}
