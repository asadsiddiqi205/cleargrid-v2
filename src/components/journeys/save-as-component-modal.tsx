"use client"

/**
 * Save-as-component modal (Part 2).
 *
 * Author selects 2+ nodes on the canvas → clicks "Save as component" in the
 * floating action bar → this modal opens. It:
 *   - validates the selection (single entry, ≥1 exit, no triggers/exits, no
 *     existing component instances inside)
 *   - lets the author name/describe/categorize the new component
 *   - auto-detects output ports from edges leaving the selection
 *   - shows a mini preview of the subgraph on the right
 *   - on save: creates the ComponentMaster, replaces the selected nodes with
 *     a single ComponentInstance on the canvas at the selection's centroid
 */

import * as React from "react"
import type { Edge, Node } from "@xyflow/react"
import { X, AlertTriangle, Boxes } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  COMPONENT_CATEGORIES,
  saveMaster,
  buildInstanceCanvasPayload,
  type ComponentCategory,
  type ComponentMaster,
  type ComponentPort,
} from "@/data/components"
import { toast } from "sonner"

interface ValidationResult {
  ok: boolean
  reason?: string
  entryNodeId?: string
  outputPorts: ComponentPort[]
}

const TRIGGER_TYPES = new Set([
  "trigger",
  "event_trigger",
  "segment_trigger",
  "profile_change_trigger",
  "specific_users_trigger",
  "inbound_message_trigger",
  "incoming_call_trigger",
  "journey_handoff_entry",
])

const EXIT_TYPES = new Set(["end", "end_journey"])

function validateSelection(nodes: Node[], edges: Edge[], selectedIds: string[]): ValidationResult {
  if (selectedIds.length < 2) {
    return { ok: false, reason: "Select at least 2 nodes to save as a component.", outputPorts: [] }
  }
  const set = new Set(selectedIds)
  const selectedNodes = nodes.filter((n) => set.has(n.id))

  // Reject triggers
  for (const n of selectedNodes) {
    const bt = (n.data as { blockType?: string })?.blockType
    if (n.type === "trigger" || (bt && TRIGGER_TYPES.has(bt))) {
      return {
        ok: false,
        reason: `"${(n.data as { label?: string })?.label ?? n.id}" is a Trigger. Triggers can't be inside a component — they belong to the journey.`,
        outputPorts: [],
      }
    }
    if (n.type === "end" || (bt && EXIT_TYPES.has(bt))) {
      return {
        ok: false,
        reason: `"${(n.data as { label?: string })?.label ?? n.id}" is an Exit Journey node. Exit nodes can't be inside a component.`,
        outputPorts: [],
      }
    }
    if ((n.data as { kind?: string })?.kind === "component_instance") {
      return {
        ok: false,
        reason: "Selection contains an existing component instance. v1 doesn't support nested components.",
        outputPorts: [],
      }
    }
  }

  // Entry: nodes in selection with no incoming edge from another selected node
  const incomingFromSelection = new Set<string>()
  const outgoingToOutside: Edge[] = []
  for (const e of edges) {
    if (set.has(e.source) && set.has(e.target)) {
      incomingFromSelection.add(e.target)
    } else if (set.has(e.source) && !set.has(e.target)) {
      outgoingToOutside.push(e)
    }
  }
  const entries = selectedNodes.filter((n) => !incomingFromSelection.has(n.id))
  if (entries.length !== 1) {
    return {
      ok: false,
      reason:
        entries.length === 0
          ? "Selection forms a loop — no single entry point. Adjust the selection."
          : `Selection has ${entries.length} entry points. Components need exactly one.`,
      outputPorts: [],
    }
  }

  const outputPorts: ComponentPort[] =
    outgoingToOutside.length > 0
      ? outgoingToOutside.map((e, i) => ({
          id: `out-${i + 1}`,
          label:
            ((e as { label?: string; data?: { label?: string } }).label as string | undefined) ??
            (e.data as { label?: string } | undefined)?.label ??
            `Output ${i + 1}`,
        }))
      : // If no outside edges, the last node in canvas order acts as the sole output
        [{ id: "out-1", label: "Exit" }]

  return { ok: true, entryNodeId: entries[0].id, outputPorts }
}

/** Compute the centroid of a set of nodes — used to place the instance. */
function centroidOf(nodes: Node[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 320, y: 200 }
  const sx = nodes.reduce((s, n) => s + n.position.x, 0)
  const sy = nodes.reduce((s, n) => s + n.position.y, 0)
  return { x: Math.round(sx / nodes.length), y: Math.round(sy / nodes.length) }
}

export function SaveAsComponentModal({
  open,
  onClose,
  nodes,
  edges,
  selectedIds,
  onCommit,
}: {
  open: boolean
  onClose: () => void
  nodes: Node[]
  edges: Edge[]
  selectedIds: string[]
  /** Called with the created master + the replacement instance node + edges. */
  onCommit: (payload: {
    master: ComponentMaster
    /** The synthetic parent group node placed at the selection centroid. */
    groupNode: Node
    /** The master's inner nodes, parented under the group. */
    childNodes: Node[]
    /** Master's edges rewired to the child ids. */
    childEdges: Edge[]
    /** The original selected ids to remove from the journey canvas. */
    nodesToRemove: Set<string>
    /** External edges to rewire: incoming ones point at the group, outgoing
     *  ones source from the group; internal edges get dropped. */
    edgesToRewire: Array<{ edgeId: string; rewriteSource?: string; rewriteTarget?: string; drop?: boolean }>
  }) => void
}) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [category, setCategory] = React.useState<ComponentCategory>("Custom")
  const [inputPortLabel, setInputPortLabel] = React.useState("Enter")
  const [outputPorts, setOutputPorts] = React.useState<ComponentPort[]>([])

  const validation = React.useMemo(
    () => validateSelection(nodes, edges, selectedIds),
    [nodes, edges, selectedIds],
  )

  React.useEffect(() => {
    if (open) {
      setName("")
      setDescription("")
      setCategory("Custom")
      setInputPortLabel("Enter")
      setOutputPorts(validation.outputPorts)
    }
  }, [open, validation.outputPorts])

  if (!open) return null

  const selectedNodes = nodes.filter((n) => selectedIds.includes(n.id))
  const canSave =
    validation.ok && name.trim().length > 0 && description.trim().length > 0 && outputPorts.length > 0

  const handleSave = () => {
    if (!canSave) return
    // Build the master
    const now = new Date().toISOString()
    const master: ComponentMaster = {
      id: `cmp-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      name: name.trim(),
      description: description.trim(),
      category,
      version: 1,
      createdAt: now,
      updatedAt: now,
      authorId: "current-user",
      inputPort: { label: inputPortLabel },
      outputPorts,
      lockedProperties: [],
      publishHistory: [
        { version: 1, publishedAt: now, authorId: "current-user", note: "Initial version" },
      ],
      nodes: selectedNodes.map((n) => ({ ...n })),
      edges: edges.filter((e) => selectedIds.includes(e.source) && selectedIds.includes(e.target)),
    }
    saveMaster(master)

    // Build the group + child nodes at the selection centroid.
    const centroid = centroidOf(selectedNodes)
    const groupId = `cmp-${Date.now()}`
    const { groupNode, childNodes, childEdges } = buildInstanceCanvasPayload(
      master,
      centroid,
      groupId,
    )

    // Edges to rewire:
    //   - internal (both ends in selection) → dropped (they live inside master's own edges)
    //   - incoming (target in selection)   → retarget to the group node
    //   - outgoing (source in selection)   → resource from the group node
    const rewires: Array<{ edgeId: string; rewriteSource?: string; rewriteTarget?: string; drop?: boolean }> = []
    for (const e of edges) {
      const sIn = selectedIds.includes(e.source)
      const tIn = selectedIds.includes(e.target)
      if (sIn && tIn) {
        rewires.push({ edgeId: e.id, drop: true })
      } else if (sIn && !tIn) {
        rewires.push({ edgeId: e.id, rewriteSource: groupId })
      } else if (!sIn && tIn) {
        rewires.push({ edgeId: e.id, rewriteTarget: groupId })
      }
    }

    onCommit({
      master,
      groupNode,
      childNodes,
      childEdges,
      nodesToRemove: new Set(selectedIds),
      edgesToRewire: rewires,
    })

    toast.success(`Component "${master.name}" saved`, {
      description: `${selectedNodes.length} nodes now share this component. Any journey can reuse it.`,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="grid w-[820px] max-w-[95vw] grid-cols-[1fr_320px] overflow-hidden rounded-xl border border-violet-500/30 bg-card shadow-2xl">
        {/* Left column: form */}
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/20">
                <Boxes className="h-3.5 w-3.5 text-violet-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Save as component</h3>
                <p className="text-[10px] uppercase tracking-wider text-violet-300">
                  {selectedIds.length} nodes selected
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            {!validation.ok && (
              <div className="flex items-start gap-2 rounded-md border border-warning-500/40 bg-warning-500/10 px-3 py-2.5 text-[12px] text-warning-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Can't save this selection as a component</p>
                  <p className="mt-0.5 text-warning-200/80">{validation.reason}</p>
                </div>
              </div>
            )}

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Name *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Callback Handling"
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Description *
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Shown in the palette. Keep to a single line."
                className="mt-1 min-h-[52px] text-[11px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Category *
                </Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComponentCategory)}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  {COMPONENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Input port label
                </Label>
                <Input
                  value={inputPortLabel}
                  onChange={(e) => setInputPortLabel(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Output ports
              </Label>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Auto-detected from edges leaving the selection. Rename freely.
              </p>
              <div className="mt-2 space-y-1.5">
                {outputPorts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-center font-mono text-[10px] text-violet-200">
                      {p.id}
                    </span>
                    <Input
                      value={p.label}
                      onChange={(e) => {
                        const next = [...outputPorts]
                        next[i] = { ...p, label: e.target.value }
                        setOutputPorts(next)
                      }}
                      className="h-7 flex-1 text-xs"
                    />
                  </div>
                ))}
                {outputPorts.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    No outbound edges — the component will have a single default exit.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              className={cn("bg-violet-500 text-white hover:bg-violet-400", !canSave && "opacity-60")}
            >
              Save component
            </Button>
          </div>
        </div>

        {/* Right column: mini preview */}
        <div className="flex min-h-0 flex-col border-l border-border bg-muted/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            The subgraph will render inline when authors expand this instance.
          </p>
          <div className="mt-3 flex-1 overflow-hidden rounded-lg border border-violet-500/30 bg-canvas/50 p-3">
            {selectedNodes.length === 0 ? (
              <p className="text-center text-[11px] text-muted-foreground">
                No nodes selected.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="rounded border border-dashed border-violet-500/40 bg-violet-500/[0.06] px-2 py-1 text-center text-[10px] text-violet-200">
                  ▲ Input: {inputPortLabel}
                </div>
                {selectedNodes.map((n) => {
                  const label = (n.data as { label?: string })?.label ?? n.id
                  return (
                    <div
                      key={n.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-[11px]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span className="truncate text-foreground">{label}</span>
                    </div>
                  )
                })}
                <div className="space-y-1">
                  {outputPorts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded border border-dashed border-violet-500/40 bg-violet-500/[0.06] px-2 py-1 text-center text-[10px] text-violet-200"
                    >
                      ▼ Output: {p.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
