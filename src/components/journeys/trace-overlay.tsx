"use client"

/**
 * TraceOverlay — highlights one borrower's exact executed path on the
 * journey canvas. Mounts when the URL carries `?trace=<borrowerId>`.
 *
 * Visual language matches Eternals verbatim:
 *   - Every hit node gets a coloured badge (1st pass green, 2nd amber,
 *     3rd blue, 4th violet). Multi-pass hops (redials) get one badge per
 *     pass, stacked.
 *   - Failed hops show a red badge instead.
 *   - The node they're currently parked at (last active hop) gets a
 *     dashed blue ring drawn around the whole card.
 *   - A floating info card top-right shows the borrower + a legend.
 *   - Anchors to ReactFlow via [data-id="<nodeId>"] — no schema change.
 */

import * as React from "react"
import { X, User, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { BorrowerTrace } from "@/data/borrower-traces"

interface TraceOverlayProps {
  trace: BorrowerTrace | null
  borrowerName: string
  onDismiss: () => void
  journeyId: string
}

const PASS_COLORS = [
  {
    label: "1st pass",
    ring: "border-success-500 shadow-[0_0_0_2px_rgba(30,175,96,0.55)]",
    badge: "bg-success-500/85 text-success-950 border-success-500",
  },
  {
    label: "2nd pass",
    ring: "border-warning-500 shadow-[0_0_0_2px_rgba(214,167,44,0.55)]",
    badge: "bg-warning-500/85 text-warning-950 border-warning-500",
  },
  {
    label: "3rd pass",
    ring: "border-info-500 shadow-[0_0_0_2px_rgba(38,112,220,0.55)]",
    badge: "bg-info-500/85 text-white border-info-500",
  },
  {
    label: "4th+ pass",
    ring: "border-violet-500 shadow-[0_0_0_2px_rgba(124,58,237,0.55)]",
    badge: "bg-violet-500/85 text-white border-violet-500",
  },
]

const FAILED_BADGE = "bg-error-500/90 text-white border-error-500"
const CURRENT_RING = "outline outline-2 outline-info-500 outline-offset-2 outline-dashed animate-pulse"

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
      const containerRect = container?.getBoundingClientRect() ?? null
      if (!containerRect) return
      const next = new Map<string, AnchorRect>()
      for (const id of nodeIds) {
        const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`) as HTMLElement | null
        if (!el) continue
        const r = el.getBoundingClientRect()
        next.set(id, {
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
  }, [nodeIds])
  return anchors
}

export function TraceOverlay({ trace, borrowerName, onDismiss, journeyId }: TraceOverlayProps) {
  const nodeIds = React.useMemo(() => (trace ? Array.from(new Set(trace.hops.map((h) => h.nodeId))) : []), [trace])
  const anchors = useNodeAnchors(nodeIds)

  if (!trace) return null

  // Group hops by nodeId + assign per-pass index (0 → green, 1 → amber…).
  const passesByNode = new Map<string, Array<{ hopIndex: number; passIndex: number; failed: boolean }>>()
  const nodeHopCounts = new Map<string, number>()
  trace.hops.forEach((hop, hopIndex) => {
    const count = nodeHopCounts.get(hop.nodeId) ?? 0
    nodeHopCounts.set(hop.nodeId, count + 1)
    const failed =
      (hop.outcome.kind === "message" && hop.outcome.events.includes("bounced")) ||
      (hop.outcome.kind === "call" && (hop.outcome.result === "no_answer" || hop.outcome.result === "busy" || hop.outcome.result === "dropped"))
    passesByNode.get(hop.nodeId) ?? passesByNode.set(hop.nodeId, [])
    passesByNode.get(hop.nodeId)!.push({ hopIndex, passIndex: count, failed })
  })

  const currentNodeId = trace.status === "active" ? trace.currentNodeId : null

  return (
    <>
      {/* Per-node overlays: pass badges + current-node ring */}
      {Array.from(anchors.entries()).map(([nodeId, rect]) => {
        const passes = passesByNode.get(nodeId) ?? []
        const isCurrent = nodeId === currentNodeId
        return (
          <React.Fragment key={`trace-${nodeId}`}>
            {/* Pass badges stacked at top-left */}
            <div
              className="absolute z-30 flex flex-col gap-0.5 pointer-events-none"
              style={{ top: rect.top - 12, left: rect.left - 8 }}
            >
              {passes.map((p) => {
                const color = p.failed
                  ? FAILED_BADGE
                  : PASS_COLORS[Math.min(p.passIndex, PASS_COLORS.length - 1)].badge
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
                        : PASS_COLORS[Math.min(p.passIndex, PASS_COLORS.length - 1)].label
                    }
                  >
                    {p.passIndex + 1}
                  </span>
                )
              })}
            </div>
            {/* Current-node ring — dashed blue outline */}
            {isCurrent && (
              <div
                className={cn("absolute z-25 rounded-lg pointer-events-none", CURRENT_RING)}
                style={{
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                }}
              />
            )}
          </React.Fragment>
        )
      })}

      {/* Top-right floating info card */}
      <div className="absolute right-4 top-4 z-40 w-[280px] rounded-xl border border-info-500/40 bg-info-500/[0.05] shadow-lg backdrop-blur-sm">
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
        <div className="px-3 py-2 text-[11px]">
          <div className="font-medium text-foreground">{borrowerName}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {trace.hops.length} hop{trace.hops.length === 1 ? "" : "s"} · status{" "}
            <span
              className={cn(
                "rounded px-1 py-px text-[9px] uppercase tracking-wider",
                trace.status === "converted"
                  ? "bg-primary/15 text-primary"
                  : trace.status === "active"
                    ? "bg-info-500/15 text-info-300"
                    : "bg-muted text-neutral-300",
              )}
            >
              {trace.status}
            </span>
          </div>
          {/* Legend */}
          <div className="mt-2 space-y-1 border-t border-info-500/25 pt-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Pass colours
            </p>
            {PASS_COLORS.map((p) => (
              <div key={p.label} className="flex items-center gap-1.5 text-[10px] text-foreground">
                <span
                  className={cn(
                    "flex h-3 w-3 items-center justify-center rounded-full border text-[8px] font-bold",
                    p.badge,
                  )}
                >
                  {p.label[0]}
                </span>
                {p.label}
              </div>
            ))}
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-foreground">
              <span
                className={cn(
                  "flex h-3 w-3 items-center justify-center rounded-full border text-[8px] font-bold",
                  FAILED_BADGE,
                )}
              >
                ×
              </span>
              Failed hop
            </div>
          </div>
          <Link
            href={`/journeys/${journeyId}/validator`}
            className="mt-3 inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
          >
            Back to Validator
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </>
  )
}
