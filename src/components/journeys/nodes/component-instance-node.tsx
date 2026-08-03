"use client"

/**
 * ComponentGroupNode — the violet frame that wraps a component instance's
 * inner nodes on the canvas. Renders as a ReactFlow parent node; the master's
 * inner nodes are placed as its `parentId`-linked children and use their
 * normal renderers (TriggerNode/ActionNode/…).
 *
 * The group carries the component reference (`ComponentInstanceData`) and
 * exposes the header controls (open master, expand/collapse, name).
 *
 * Violet is reserved for component surfaces — the entire frame is violet-
 * tinted so authors can see at a glance which nodes are inside a component.
 */

import * as React from "react"
import Link from "next/link"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Boxes, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComponentInstanceData } from "@/data/components"
import { getMasterById } from "@/data/components"

const HANDLE_CLS =
  "!h-3.5 !w-3.5 !rounded-full !border-2 !border-[var(--background)] !bg-violet-500"

export function ComponentInstanceNode({ data, selected, id }: NodeProps) {
  const d = data as unknown as ComponentInstanceData
  const master = getMasterById(d.componentId)
  const overrideCount = d.overrides?.length ?? 0
  const masterDrift = master ? master.version > d.componentVersion : false
  const outputPorts = d.outputPorts ?? []

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-2xl border-2 border-dashed transition-all",
        selected
          ? "border-violet-300 bg-violet-500/[0.05] shadow-lg shadow-violet-500/20"
          : "border-violet-500/60 bg-violet-500/[0.03] hover:border-violet-400",
      )}
    >
      {/* Header bar */}
      <div className="pointer-events-auto absolute left-3 right-3 top-3 flex items-center gap-2 rounded-lg border border-violet-500/40 bg-canvas/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20 ring-1 ring-violet-400/40">
          <Boxes className="h-3 w-3 text-violet-200" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12px] font-semibold text-foreground">{d.name}</span>
            {master && (
              <span className="shrink-0 rounded bg-violet-500/20 px-1 py-px text-[9px] font-medium text-violet-100">
                v{master.version}
              </span>
            )}
            {overrideCount > 0 && (
              <span className="shrink-0 rounded bg-violet-500/15 px-1 py-px text-[9px] font-medium text-violet-200">
                {overrideCount} override{overrideCount === 1 ? "" : "s"}
              </span>
            )}
            {masterDrift && (
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center" title={`Master updated to v${master?.version}. Your overrides are preserved.`}>
                <span className="absolute h-full w-full animate-ping rounded-full bg-violet-400/70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-violet-300" />
              </span>
            )}
          </div>
          <div className="text-[9px] uppercase tracking-[0.14em] text-violet-300/90">
            Component · {d.category}
          </div>
        </div>
        <Link
          href={`/components/${d.componentId}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-500/40 bg-violet-500/10 px-1.5 py-1 text-[10px] font-medium text-violet-200 hover:bg-violet-500/20"
          title="Open master"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          Master
        </Link>
      </div>

      {/* Input port (top) */}
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />

      {/* Output ports (bottom) */}
      {outputPorts.length <= 1 ? (
        <Handle
          type="source"
          position={Position.Bottom}
          id={outputPorts[0]?.id}
          className={HANDLE_CLS}
        />
      ) : (
        <>
          {outputPorts.map((p, i) => {
            // Distribute output handles evenly along the bottom edge.
            const pct = ((i + 1) / (outputPorts.length + 1)) * 100
            return (
              <Handle
                key={p.id}
                id={p.id}
                type="source"
                position={Position.Bottom}
                className={HANDLE_CLS}
                style={{ left: `${pct}%` }}
              />
            )
          })}
          {/* Labeled stubs above each handle so the ports read */}
          <div className="pointer-events-none absolute -bottom-6 left-0 right-0 flex justify-around text-[9px] font-medium text-violet-200">
            {outputPorts.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-violet-500/20 px-1.5 py-0.5"
              >
                {p.label}
              </span>
            ))}
          </div>
        </>
      )}
      {/* Suppress unused id warning */}
      <span data-id={id} className="hidden" />
    </div>
  )
}
