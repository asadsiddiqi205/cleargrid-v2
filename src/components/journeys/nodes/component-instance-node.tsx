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
        "relative h-full w-full rounded-lg border border-dashed transition-all",
        selected
          ? "border-violet-300 bg-violet-500/[0.04] shadow-md shadow-violet-500/15"
          : "border-violet-500/50 bg-violet-500/[0.02] hover:border-violet-400",
      )}
    >
      {/* Header bar — slim so the frame doesn't crowd child nodes */}
      <div className="pointer-events-auto absolute left-1.5 right-1.5 top-1.5 flex h-6 items-center gap-1.5 rounded-md border border-violet-500/40 bg-canvas/95 px-2 shadow-sm backdrop-blur-sm">
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-violet-500/20 ring-1 ring-violet-400/40">
          <Boxes className="h-2.5 w-2.5 text-violet-200" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-[11px] font-semibold text-foreground">{d.name}</span>
            {master && (
              <span className="shrink-0 rounded bg-violet-500/20 px-1 text-[8px] font-medium text-violet-100">
                v{master.version}
              </span>
            )}
            {overrideCount > 0 && (
              <span
                title={`${overrideCount} override${overrideCount === 1 ? "" : "s"}`}
                className="shrink-0 rounded bg-violet-500/15 px-1 text-[8px] font-medium text-violet-200"
              >
                {overrideCount}·o
              </span>
            )}
            {masterDrift && (
              <span
                className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center"
                title={`Master updated to v${master?.version}. Your overrides are preserved.`}
              >
                <span className="absolute h-full w-full animate-ping rounded-full bg-violet-400/70" />
                <span className="relative h-1 w-1 rounded-full bg-violet-300" />
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/components/${d.componentId}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center gap-0.5 rounded border border-violet-500/40 bg-violet-500/10 px-1 py-0.5 text-[9px] font-medium text-violet-200 hover:bg-violet-500/20"
          title="Open master"
        >
          <ExternalLink className="h-2 w-2" />
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
