"use client"

/**
 * Trace modal (Part 2.6). Shows a single borrower's simulated path through
 * the journey: ordered hops on the left, per-hop details (branch taken,
 * outcome, time offset), and a mini-map on the right with their path
 * highlighted in emerald.
 */

import * as React from "react"
import type { Node } from "@xyflow/react"
import { CheckCircle2, LogOut, User, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SimulatedTrace } from "@/lib/simulation"

export function SimulationTraceModal({
  open,
  onClose,
  trace,
  nodes,
}: {
  open: boolean
  onClose: () => void
  trace: SimulatedTrace | null
  nodes: Node[]
}) {
  if (!open || !trace) return null
  const hopIds = new Set(trace.hops.map((h) => h.nodeId))

  const bounds = React.useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x)
      minY = Math.min(minY, n.position.y)
      maxX = Math.max(maxX, n.position.x)
      maxY = Math.max(maxY, n.position.y)
    }
    return { minX, minY, maxX: maxX + 260, maxY: maxY + 100 }
  }, [nodes])

  const w = 320
  const h = 320
  const scaleX = w / Math.max(1, bounds.maxX - bounds.minX)
  const scaleY = h / Math.max(1, bounds.maxY - bounds.minY)
  const scale = Math.min(scaleX, scaleY, 1)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="grid w-[880px] max-w-[95vw] grid-cols-[1fr_360px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Left: hop list */}
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">{trace.borrowerName}</p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {trace.borrowerId} · {trace.dealId}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                trace.final === "converted"
                  ? "border-primary-500/40 bg-primary-500/10 text-primary-300"
                  : trace.final === "exited"
                    ? "border-error-500/40 bg-error-500/10 text-error-300"
                    : trace.final === "errored"
                      ? "border-error-500/40 bg-error-500/10 text-error-300"
                      : "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
              )}
            >
              {trace.final.replace("_", " ")}
            </span>
          </div>

          <div className="max-h-[520px] overflow-y-auto p-4">
            <ol className="space-y-2">
              {trace.hops.map((h, i) => (
                <li
                  key={`${h.nodeId}-${i}`}
                  className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium text-foreground">{h.label}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        +{formatMinutes(h.tOffsetMinutes)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                      {h.branch && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">
                          Branch: {h.branch}
                        </span>
                      )}
                      {h.outcome && (
                        <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-medium text-indigo-300">
                          Outcome: {h.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              <li className="flex items-center gap-2 rounded-md border border-primary-500/40 bg-primary-500/5 px-3 py-2 text-[11px] text-primary-300">
                {trace.final === "converted" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                Final: {trace.final.replace("_", " ")}
              </li>
            </ol>
          </div>
        </div>

        {/* Right: mini-map */}
        <div className="flex min-h-0 flex-col border-l border-border bg-muted/20">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Path preview</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close trace"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 p-3">
            <svg viewBox={`${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`} className="h-full w-full">
              {/* Draw edges (dimmed) */}
              {nodes.map((n) => {
                const hit = hopIds.has(n.id)
                return (
                  <g key={n.id}>
                    <rect
                      x={n.position.x}
                      y={n.position.y}
                      width={260}
                      height={64}
                      rx={12}
                      fill={hit ? "rgba(52,211,153,0.15)" : "rgba(63,63,70,0.35)"}
                      stroke={hit ? "rgb(52 211 153)" : "rgb(63 63 70)"}
                      strokeWidth={hit ? 3 / scale : 1 / scale}
                    />
                    <text
                      x={n.position.x + 14}
                      y={n.position.y + 38}
                      fontSize={22 / scale}
                      fill={hit ? "rgb(52 211 153)" : "rgb(161 161 170)"}
                      style={{ pointerEvents: "none" }}
                    >
                      {((n.data as { label?: string })?.label ?? n.id).slice(0, 24)}
                    </text>
                  </g>
                )
              })}
              {/* Draw path polyline through hop centers */}
              {trace.hops.length > 1 && (
                <polyline
                  points={trace.hops
                    .map((h) => nodes.find((n) => n.id === h.nodeId))
                    .filter((n): n is Node => Boolean(n))
                    .map((n) => `${n.position.x + 130},${n.position.y + 32}`)
                    .join(" ")}
                  fill="none"
                  stroke="rgb(52 211 153)"
                  strokeWidth={4 / scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${6 / scale} ${4 / scale}`}
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.round(m / 60)}h`
  return `${Math.round(m / 1440)}d`
}
