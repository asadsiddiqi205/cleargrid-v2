"use client"

/**
 * Component Master editor.
 *
 * Route: /components/[id]/edit
 * Distinct from the journey editor — violet-accented chrome, no simulate/
 * analytics/publish-nudge features. Publishing is inline (no draft/publish
 * separation in v1; see Part 5.4 in the spec + Open Questions).
 */

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  History,
  Lock,
  Rocket,
  Trash2,
  Wand2,
} from "lucide-react"
import type { Edge, Node } from "@xyflow/react"
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type OnConnect,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { TriggerNode } from "@/components/journeys/nodes/trigger-node"
import { ConditionNode } from "@/components/journeys/nodes/condition-node"
import { ActionNode } from "@/components/journeys/nodes/action-node"
import { WaitNode } from "@/components/journeys/nodes/wait-node"
import { SplitNode } from "@/components/journeys/nodes/split-node"
import { EndNode } from "@/components/journeys/nodes/end-node"
import { GenericNode } from "@/components/journeys/nodes/generic-node"
import { NodeConfigPanel } from "@/components/journeys/node-config-panel"
import {
  COMPONENT_CATEGORIES,
  deleteMaster,
  getMasterById,
  publishMaster,
  saveMaster,
  type ComponentCategory,
  type ComponentMaster,
  type LockedProperty,
} from "@/data/components"
import { journeyFlows, journeysList } from "@/data/journeys"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  wait: WaitNode,
  split: SplitNode,
  end: EndNode,
  generic: GenericNode,
}

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: false,
  style: { stroke: "#8B5CF6", strokeWidth: 2 },
}

/** Count instances across the seeded journey library. Real production would
 *  hit an index; the prototype scans journey flows on demand. */
function countInstancesOf(componentId: string): {
  count: number
  journeys: Array<{ id: string; name: string }>
} {
  const journeys: Array<{ id: string; name: string }> = []
  let count = 0
  for (const j of journeysList) {
    const flow = journeyFlows[j.id]
    if (!flow) continue
    const hits = flow.nodes.filter(
      (n) => (n.data as { componentId?: string })?.componentId === componentId,
    ).length
    if (hits > 0) {
      count += hits
      journeys.push({ id: j.id, name: j.name })
    }
  }
  return { count, journeys }
}

export default function ComponentMasterEditor() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const componentId = params.id ?? ""
  const [master, setMaster] = React.useState<ComponentMaster | null>(null)

  React.useEffect(() => {
    const m = getMasterById(componentId)
    if (!m) {
      toast.error("Component not found")
      router.push("/journeys")
      return
    }
    setMaster(m)
  }, [componentId, router])

  if (!master) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <MasterEditorInner master={master} onMasterChange={setMaster} />
    </ReactFlowProvider>
  )
}

function MasterEditorInner({
  master,
  onMasterChange,
}: {
  master: ComponentMaster
  onMasterChange: (m: ComponentMaster) => void
}) {
  const router = useRouter()
  const [name, setName] = React.useState(master.name)
  const [description, setDescription] = React.useState(master.description)
  const [category, setCategory] = React.useState<ComponentCategory>(master.category)
  const [nodes, setNodes, onNodesChange] = useNodesState(master.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(master.edges)
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)
  const [historyOpen, setHistoryOpen] = React.useState(false)

  const usage = React.useMemo(() => countInstancesOf(master.id), [master.id])

  const onConnect: OnConnect = React.useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, type: "smoothstep", animated: false, style: { stroke: "#8B5CF6", strokeWidth: 2 } }, eds),
      ),
    [setEdges],
  )

  const handleSave = () => {
    const updated: ComponentMaster = {
      ...master,
      name: name.trim() || master.name,
      description: description.trim() || master.description,
      category,
      nodes,
      edges,
    }
    saveMaster(updated)
    onMasterChange(updated)
    toast.success("Draft saved")
  }

  const handlePublish = () => {
    // First save the draft, then bump the version.
    const updated: ComponentMaster = {
      ...master,
      name: name.trim() || master.name,
      description: description.trim() || master.description,
      category,
      nodes,
      edges,
    }
    saveMaster(updated)
    const nextVersion = publishMaster(master.id, `Published from editor at ${new Date().toLocaleString()}`)
    if (nextVersion === undefined) return
    const fresh = getMasterById(master.id)
    if (fresh) onMasterChange(fresh)
    toast.success(`Published v${nextVersion}`, {
      description: usage.count > 0
        ? `Applied to ${usage.count} instance${usage.count === 1 ? "" : "s"} across ${usage.journeys.length} journey${usage.journeys.length === 1 ? "" : "s"}.`
        : "No instances placed yet.",
    })
  }

  const handleDelete = () => {
    if (usage.count > 0) {
      toast.error("Can't delete", {
        description: `${usage.count} instance${usage.count === 1 ? "" : "s"} still exist across ${usage.journeys.length} journey${usage.journeys.length === 1 ? "" : "s"}. Remove them first.`,
      })
      return
    }
    if (!window.confirm(`Delete component "${master.name}"? This can't be undone.`)) return
    deleteMaster(master.id)
    toast.success(`Deleted "${master.name}"`)
    router.push("/journeys")
  }

  const setLockedForField = (
    nodeId: string,
    propertyPath: string,
    locked: boolean,
    reason?: string,
  ) => {
    const next: ComponentMaster = {
      ...master,
      lockedProperties: locked
        ? [
            ...master.lockedProperties.filter(
              (l) => !(l.nodeId === nodeId && l.propertyPath === propertyPath),
            ),
            { nodeId, propertyPath, reason },
          ]
        : master.lockedProperties.filter(
            (l) => !(l.nodeId === nodeId && l.propertyPath === propertyPath),
          ),
      nodes,
      edges,
      name: name.trim() || master.name,
      description: description.trim() || master.description,
      category,
    }
    saveMaster(next)
    onMasterChange(next)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-violet-500/30 bg-gradient-to-r from-violet-500/[0.08] via-violet-500/[0.03] to-transparent px-4">
        <button
          type="button"
          onClick={() => router.push("/journeys")}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to journeys
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/20 ring-1 ring-violet-500/40">
            <Boxes className="h-4 w-4 text-violet-200" />
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 max-w-[280px] border-transparent bg-transparent text-sm font-semibold text-foreground hover:border-border focus-visible:border-violet-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ComponentCategory)}
            className="h-7 rounded-md border border-transparent bg-transparent px-2 text-[11px] font-medium text-violet-200 outline-none hover:border-border focus-visible:border-violet-500"
          >
            {COMPONENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
            v{master.version} · {usage.count} instance{usage.count === 1 ? "" : "s"} across {usage.journeys.length} journey{usage.journeys.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleSave}>
            Save draft
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 items-center gap-1 rounded-md border border-border bg-transparent px-2.5 text-[12px] font-medium text-foreground hover:bg-muted">
              <History className="h-3.5 w-3.5" />
              Version history
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {master.publishHistory.slice(0, 20).map((h) => (
                <DropdownMenuItem key={h.version} className="flex-col items-start gap-0.5">
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium text-foreground">v{h.version}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(h.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {h.note ?? `Published by ${h.authorId}`}
                  </p>
                </DropdownMenuItem>
              ))}
              {master.publishHistory.length === 0 && (
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">No history yet.</p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            onClick={handlePublish}
            className="bg-violet-500 text-white hover:bg-violet-400"
          >
            <Rocket className="h-3.5 w-3.5" />
            Publish
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md p-1.5 text-error-300 hover:bg-error-500/15"
            title="Delete component"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-transparent" />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedNode(n)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            snapToGrid
            snapGrid={[16, 16]}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1.5} color="var(--border)" />
            <Controls className="!border-border !bg-card [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted [&>button:hover]:!text-foreground" />
          </ReactFlow>
        </div>

        {/* Right: config panel + master sidebar */}
        {selectedNode ? (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={(id, newData) => {
              setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: newData } : n)))
            }}
            nodes={nodes}
            edges={edges}
            masterContext={{
              lockedProperties: master.lockedProperties,
              onToggleLock: (propertyPath, locked, reason) =>
                setLockedForField(selectedNode.id, propertyPath, locked, reason),
            }}
          />
        ) : (
          <MasterSidebar
            master={master}
            description={description}
            onDescriptionChange={setDescription}
            usage={usage}
          />
        )}
      </div>
    </div>
  )
}

function MasterSidebar({
  master,
  description,
  onDescriptionChange,
  usage,
}: {
  master: ComponentMaster
  description: string
  onDescriptionChange: (v: string) => void
  usage: { count: number; journeys: Array<{ id: string; name: string }> }
}) {
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-violet-500/25 bg-card/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-violet-300">Component master</p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">{master.name}</h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Description
          </Label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="mt-1 min-h-[60px] text-[11px]"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Shown in the palette tooltip. Click Save draft to persist.
          </p>
        </div>

        <div className="rounded-md border border-border bg-muted/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ports</p>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Input</span>
              <span className="text-foreground">{master.inputPort.label}</span>
            </div>
            {master.outputPorts.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-muted-foreground">Output · {p.id}</span>
                <span className="text-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/10 p-3">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-warning-400" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Locked properties
            </p>
          </div>
          <div className="mt-2 space-y-1.5 text-[11px]">
            {master.lockedProperties.length === 0 && (
              <p className="text-muted-foreground">
                No properties locked. Click a node → toggle 🔒 on any field to prevent instance
                overrides.
              </p>
            )}
            {master.lockedProperties.map((lp) => (
              <div
                key={`${lp.nodeId}::${lp.propertyPath}`}
                className="rounded-md border border-border/60 bg-card/40 p-2"
              >
                <p className="font-mono text-[10px] text-foreground">
                  {lp.nodeId}.{lp.propertyPath}
                </p>
                {lp.reason && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{lp.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Used across {usage.journeys.length} journey{usage.journeys.length === 1 ? "" : "s"}
          </p>
          {usage.journeys.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              No instances placed yet. Drag this component onto any journey canvas.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-[11px]">
              {usage.journeys.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/journeys/${j.id}`}
                    className="text-primary hover:underline"
                  >
                    {j.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-violet-500/25 bg-violet-500/[0.06] p-3">
          <div className="flex items-center gap-1.5">
            <Wand2 className="h-3 w-3 text-violet-300" />
            <p className="text-[10px] uppercase tracking-wider text-violet-200">
              Auto-propagate
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Publishing this master immediately updates every instance across every journey. Author
            overrides on instances are always preserved.
          </p>
        </div>
      </div>
    </aside>
  )
}
