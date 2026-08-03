"use client"

/**
 * ComponentInstancePanel — right-side panel that appears when a component
 * instance node is selected on the journey canvas.
 *
 * Tabs:
 *   - Subgraph   → list of nodes inside the component (click to edit inline)
 *   - Overrides  → all per-property overrides on this instance + Reset all
 *   - Advanced   → Detach from master
 *
 * When the author picks a node from the Subgraph tab, the parent lifts the
 * "focused inner node" state and the NodeConfigPanel takes over with the
 * instance-context banner (Part 4.3). Property edits become overrides;
 * structural changes are blocked with a toast (Part 4.4).
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightLeft,
  Boxes,
  ExternalLink,
  Info,
  Lock,
  RotateCcw,
  Unlink,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  getMasterById,
  removeOverride,
  type ComponentInstanceData,
  type ComponentMaster,
  type ComponentOverride,
} from "@/data/components"

interface ComponentInstancePanelProps {
  instanceNodeId: string
  data: ComponentInstanceData
  onOpenChildNode: (masterNodeId: string) => void
  onOverridesChange: (next: ComponentOverride[]) => void
  onDetach: () => void
  onClose: () => void
}

export function ComponentInstancePanel({
  instanceNodeId,
  data,
  onOpenChildNode,
  onOverridesChange,
  onDetach,
  onClose,
}: ComponentInstancePanelProps) {
  const [tab, setTab] = React.useState<"subgraph" | "overrides" | "advanced">("subgraph")
  const [master, setMaster] = React.useState<ComponentMaster | null>(null)

  React.useEffect(() => {
    setMaster(getMasterById(data.componentId) ?? null)
    const on = () => setMaster(getMasterById(data.componentId) ?? null)
    window.addEventListener("cg:components:changed", on)
    return () => window.removeEventListener("cg:components:changed", on)
  }, [data.componentId])

  if (!master) {
    return (
      <div className="flex h-full w-[380px] shrink-0 flex-col border-l border-violet-500/25 bg-card/60 p-6">
        <p className="text-sm text-muted-foreground">Component master not found.</p>
      </div>
    )
  }

  const masterDrift = master.version > data.componentVersion
  const overrideCount = data.overrides.length

  const overridesByNode = new Map<string, ComponentOverride[]>()
  for (const o of data.overrides) {
    const arr = overridesByNode.get(o.nodeId) ?? []
    arr.push(o)
    overridesByNode.set(o.nodeId, arr)
  }

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-l border-violet-500/25 bg-card/80 backdrop-blur-sm">
      <div className="flex items-start justify-between border-b border-violet-500/25 bg-violet-500/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-violet-300">Component instance</p>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
              <Boxes className="h-3 w-3 text-violet-200" />
            </div>
            <h3 className="truncate text-sm font-semibold text-foreground">{data.name}</h3>
            <span className="shrink-0 rounded bg-violet-500/15 px-1 py-px text-[9px] font-medium text-violet-300">
              v{master.version}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Instance id · {instanceNodeId.slice(0, 20)}</p>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {masterDrift && (
        <div className="flex items-start gap-2 border-b border-violet-500/40 bg-violet-500/[0.08] px-4 py-2 text-[11px] text-violet-100">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-violet-300" />
          <p>
            Master updated to <strong>v{master.version}</strong>. Your overrides are preserved.
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab((v as typeof tab) ?? "subgraph")} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-2 pt-2">
          <TabsList variant="line" className="h-7 w-full justify-start gap-0">
            <TabsTrigger value="subgraph" className="flex-none px-2 text-[10px]">
              <Boxes className="h-3 w-3" />
              Subgraph
            </TabsTrigger>
            <TabsTrigger value="overrides" className="flex-none px-2 text-[10px]">
              <ArrowRightLeft className="h-3 w-3" />
              Overrides
              {overrideCount > 0 && (
                <span className="ml-1 rounded-full bg-violet-500/25 px-1 text-[9px] font-semibold text-violet-100">
                  {overrideCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex-none px-2 text-[10px]">
              <Unlink className="h-3 w-3" />
              Advanced
            </TabsTrigger>
          </TabsList>
        </div>

        {/* SUBGRAPH TAB */}
        <TabsContent value="subgraph" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div className="rounded-md border border-border bg-muted/10 p-3 text-[11px] text-muted-foreground">
            {master.description}
          </div>

          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Nodes inside · {master.nodes.length}
            </p>
            <div className="space-y-1.5">
              {master.nodes.map((n) => {
                const label = (n.data as { label?: string })?.label ?? n.id
                const nodeOverrides = overridesByNode.get(n.id) ?? []
                const locked = master.lockedProperties.filter((lp) => lp.nodeId === n.id)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onOpenChildNode(n.id)}
                    className="group flex w-full items-start justify-between gap-2 rounded-md border border-border bg-muted/10 px-2.5 py-1.5 text-left transition-colors hover:border-violet-500/60 hover:bg-violet-500/[0.08]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        <span className="truncate text-[12px] font-medium text-foreground">{label}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[9px]">
                        <span className="uppercase tracking-wider text-muted-foreground">
                          {(n.data as { blockType?: string })?.blockType ?? n.type ?? "node"}
                        </span>
                        {nodeOverrides.length > 0 && (
                          <span className="rounded bg-violet-500/15 px-1 py-px text-violet-200">
                            {nodeOverrides.length} override{nodeOverrides.length === 1 ? "" : "s"}
                          </span>
                        )}
                        {locked.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-warning-400">
                            <Lock className="h-2 w-2" />
                            {locked.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )
              })}
            </div>
          </div>

          <Link
            href={`/components/${master.id}/edit`}
            className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1.5 text-[12px] font-medium text-violet-200 transition-colors hover:bg-violet-500/20"
          >
            <ExternalLink className="h-3 w-3" />
            Open master
          </Link>
          <p className="text-center text-[10px] text-muted-foreground">
            Add/remove/rewire nodes in the master. Edits there propagate to every instance.
          </p>
        </TabsContent>

        {/* OVERRIDES TAB */}
        <TabsContent value="overrides" className="min-h-0 flex-1 overflow-y-auto p-4">
          {overrideCount === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/10 p-4 text-center text-[11px] text-muted-foreground">
              This instance uses master values for all properties. Edit any node inside the
              component to create an override.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Overrides · {overrideCount}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => onOverridesChange([])}
                >
                  Reset all
                </Button>
              </div>
              {Array.from(overridesByNode.entries()).map(([nodeId, list]) => {
                const masterNode = master.nodes.find((n) => n.id === nodeId)
                const nodeLabel = (masterNode?.data as { label?: string })?.label ?? nodeId
                return (
                  <div
                    key={nodeId}
                    className="rounded-md border border-violet-500/30 bg-violet-500/[0.05] p-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenChildNode(nodeId)}
                      className="flex w-full items-center gap-1.5 text-[11px] font-semibold text-foreground hover:text-violet-200"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      {nodeLabel}
                    </button>
                    <ul className="mt-1.5 space-y-1">
                      {list.map((o) => (
                        <li
                          key={o.propertyPath}
                          className="flex items-center justify-between gap-2 text-[10px]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-muted-foreground">{o.propertyPath}</p>
                            <p className="truncate text-violet-200">{formatValue(o.value)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onOverridesChange(removeOverride(data.overrides, o.nodeId, o.propertyPath))
                            }
                            className="inline-flex shrink-0 items-center gap-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                            Reset
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div className="rounded-md border border-warning-500/30 bg-warning-500/[0.08] p-3">
            <p className="text-[11px] font-semibold text-warning-100">Detach from master</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Turn this instance into regular nodes. You'll lose the connection to the master —
              future master updates won't propagate. This can't be undone.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  !window.confirm(
                    "Detaching turns this into regular nodes. You'll lose the connection to the master — future updates won't propagate. This can't be undone. Continue?",
                  )
                )
                  return
                onDetach()
              }}
              className="mt-3 border-warning-500/40 text-warning-100 hover:bg-warning-500/10"
            >
              <Unlink className="h-3 w-3" />
              Detach from master
            </Button>
          </div>

          <div className="rounded-md border border-border bg-muted/10 p-3 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground">Component master version</p>
            <p className="mt-0.5">
              Inserted at v{data.componentVersion} · Master is now v{master.version}
              {masterDrift && (
                <span className="ml-1 text-violet-300">· drift</span>
              )}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function formatValue(v: unknown): string {
  if (typeof v === "string") return `"${v}"`
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (v === null || v === undefined) return "—"
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
