"use client"

/**
 * Simulator drawer — three-mode cohort builder + outcome config + run trigger.
 *
 * Modes:
 *   - full      → runs against the journey's real audience filter
 *   - specific  → paste borrower_deal_ids
 *   - filter    → author builds a cohort inline using the segment-builder's
 *                 FilterBuilder (controlled mode; state lives here)
 *
 * The drawer is rendered as a full-page overlay (fixed inset-0 z-50) matching
 * Command's simulator page. It writes a `SimulationResult` upward via
 * `onResult` when the author clicks Run — the canvas then paints per-node
 * badges from that result.
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  RotateCw,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react"
import type { Edge, Node } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { borrowers, type Borrower } from "@/data/borrowers"
import {
  FilterBuilder,
  createGroup,
  type FilterGroup,
} from "@/components/segments/filter-builder"
import {
  evaluateFilterCohort,
  formatAed,
  loadCohortSpec,
  saveCohortSpec,
  saveSimulation,
  summarizeFilterGroups,
  type CohortMode,
  type OutcomePresetId,
  type SimulationResult,
} from "@/lib/simulation"
import {
  actionNodesForOutcomeConfig,
  runSimulation,
} from "@/lib/simulation-runner"
import { OutcomeConfigSection, type ActionNodeInfo } from "@/components/journeys/simulator-outcome-config"
import { SimulationEditedBanner } from "@/components/journeys/simulation-view-chip"

/** True when nodes have been added/removed since the cached simulation ran. */
function journeyHasChanged(sim: SimulationResult, currentNodes: Node[]): boolean {
  const snapshot = new Set(sim.nodeIdsSnapshot)
  const current = new Set(currentNodes.map((n) => n.id))
  if (snapshot.size !== current.size) return true
  for (const id of snapshot) if (!current.has(id)) return true
  return false
}

/* Legacy shape kept so downstream imports don't break. */
export interface SimulateResult {
  entered: number
  perNodeCount: Record<string, number>
  perNodeSample: Record<string, Array<{ borrowerId: string; borrowerName: string; dealId: string }>>
  branch: Record<string, { yes?: number; no?: number; timeout?: number }>
}

export interface SimulateDrawerProps {
  open: boolean
  onClose: () => void
  journeyId: string
  journeyName?: string
  nodes: Node[]
  edges: Edge[]
  onResult: (result: SimulationResult | null) => void
  onOpenSampleForNode: (nodeId: string) => void
  /** Existing simulation to hydrate the drawer with (for Edit cohort action). */
  initialResult?: SimulationResult | null
}

export function SimulateDrawer({
  open,
  onClose,
  journeyId,
  journeyName,
  nodes,
  edges,
  onResult,
  onOpenSampleForNode,
  initialResult,
}: SimulateDrawerProps) {
  /* ------------------------ Cohort state ------------------------ */

  const [mode, setMode] = React.useState<CohortMode>("full")
  const [dealIds, setDealIds] = React.useState("")
  const [cap, setCap] = React.useState(30000)
  const [filterGroups, setFilterGroups] = React.useState<FilterGroup[]>([createGroup()])
  const [groupJoin, setGroupJoin] = React.useState<"AND" | "OR">("OR")

  /* Outcome config choices — nodeId → preset id */
  const [outcomeChoices, setOutcomeChoices] = React.useState<
    Record<string, OutcomePresetId>
  >(initialResult?.outcomeChoices ?? {})

  /* Runtime */
  const [running, setRunning] = React.useState(false)
  const [editWarningDismissed, setEditWarningDismissed] = React.useState(false)
  const [inputsOpen, setInputsOpen] = React.useState(true)
  const [outcomeOpen, setOutcomeOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [saveSegOpen, setSaveSegOpen] = React.useState(false)
  const [inspectorNodeId, setInspectorNodeId] = React.useState<string | null>(null)
  const [inspectorTab, setInspectorTab] = React.useState<"deals" | "payloads">("deals")
  const [findDealQuery, setFindDealQuery] = React.useState("")

  // Restore persisted cohort spec on open.
  const hydrated = React.useRef(false)
  React.useEffect(() => {
    if (!open || hydrated.current) return
    hydrated.current = true
    const spec = loadCohortSpec(journeyId)
    if (spec) {
      setMode(spec.mode)
      setDealIds(spec.dealIds ?? "")
      setCap(spec.cap)
      if (spec.filterGroups?.length) setFilterGroups(spec.filterGroups)
      if (spec.groupJoin) setGroupJoin(spec.groupJoin)
    }
  }, [open, journeyId])

  // Persist cohort spec on every meaningful change.
  React.useEffect(() => {
    if (!open) return
    saveCohortSpec(journeyId, {
      mode,
      dealIds,
      cap,
      filterGroups,
      groupJoin,
    })
  }, [open, journeyId, mode, dealIds, cap, filterGroups, groupJoin])

  /* ---------------------- Derived cohort ----------------------- */

  const parsedIds = React.useMemo(
    () => dealIds.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
    [dealIds],
  )

  // Live count for filter mode — debounced 500ms.
  const [debouncedGroups, setDebouncedGroups] = React.useState(filterGroups)
  const [debouncedJoin, setDebouncedJoin] = React.useState(groupJoin)
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedGroups(filterGroups)
      setDebouncedJoin(groupJoin)
    }, 500)
    return () => window.clearTimeout(t)
  }, [filterGroups, groupJoin])

  const filterMatched = React.useMemo(
    () => (mode === "filter" ? evaluateFilterCohort(debouncedGroups, debouncedJoin) : []),
    [mode, debouncedGroups, debouncedJoin],
  )

  const cohortCandidates: Borrower[] = React.useMemo(() => {
    if (mode === "full") return borrowers.slice()
    if (mode === "specific") {
      // Match by borrower id suffix hack — the prototype's deal ids look like `deal-XXXX-YYYY`
      // but authors also paste borrower ids. Try both.
      const ids = new Set(parsedIds.map((s) => s.toLowerCase()))
      return borrowers.filter((b) => ids.has(b.id.toLowerCase()) || parsedIds.some((p) => p.includes(b.id.slice(-4))))
    }
    return filterMatched
  }, [mode, parsedIds, filterMatched])

  const cohortSize = cohortCandidates.length
  const overCap = cohortSize > cap
  const empty = mode !== "full" && cohortSize === 0

  const cohortLabel = React.useMemo(() => {
    if (mode === "full") return "Full audience"
    if (mode === "specific") return `${parsedIds.length} deal${parsedIds.length === 1 ? "" : "s"}`
    return summarizeFilterGroups(filterGroups)
  }, [mode, parsedIds.length, filterGroups])

  /* ---------------------- Outcome nodes ----------------------- */

  const actionNodes: ActionNodeInfo[] = React.useMemo(
    () => actionNodesForOutcomeConfig(nodes),
    [nodes],
  )

  /* ---------------------- Run simulation ---------------------- */

  const runNow = React.useCallback(() => {
    if (empty || running) return
    setRunning(true)
    onResult(null)
    // Fake latency so the state feels like a fetch.
    window.setTimeout(() => {
      const result = runSimulation({
        journeyId,
        cohort: cohortCandidates,
        cohortLabel,
        cohortMode: mode,
        cap,
        nodes,
        edges,
        outcomeChoices,
      })
      saveSimulation(journeyId, result)
      onResult(result)
      setRunning(false)
      toast.success("Simulation complete", {
        description: `${result.entered.toLocaleString()} borrowers walked the journey.`,
      })
    }, 700)
  }, [empty, running, journeyId, cohortCandidates, cohortLabel, mode, cap, nodes, edges, outcomeChoices, onResult])

  /* -------------------- Inspector state ----------------------- */

  React.useEffect(() => {
    if (!open) return
    if (!inspectorNodeId && nodes.length > 0) {
      const firstAction = nodes.find((n) => n.type === "action") ?? nodes[0]
      setInspectorNodeId(firstAction?.id ?? null)
    }
  }, [open, nodes, inspectorNodeId])

  const inspectorNode = React.useMemo(
    () => nodes.find((n) => n.id === inspectorNodeId) ?? null,
    [nodes, inspectorNodeId],
  )
  const inspectorSample = React.useMemo(() => {
    if (!initialResult || !inspectorNodeId) return []
    return initialResult.perNode[inspectorNodeId]?.sample ?? []
  }, [initialResult, inspectorNodeId])
  const inspectorFiltered = findDealQuery
    ? inspectorSample.filter(
        (s) =>
          s.dealId.toLowerCase().includes(findDealQuery.toLowerCase()) ||
          s.borrowerId.toLowerCase().includes(findDealQuery.toLowerCase()) ||
          s.borrowerName.toLowerCase().includes(findDealQuery.toLowerCase()),
      )
    : inspectorSample
  const inspectorCount = initialResult?.perNode[inspectorNodeId ?? ""]?.count ?? 0

  if (!open) return null

  /* ------------------------- Render --------------------------- */

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ===== Header ===== */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/60 px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to editor
          </button>
          <div className="flex items-center gap-1.5 text-[13px]">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-muted-foreground">Simulator:</span>
            <span className="font-semibold text-foreground">{journeyName ?? "Journey"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={findDealQuery}
              onChange={(e) => setFindDealQuery(e.target.value)}
              placeholder="Find deal by ID…"
              className="h-8 w-64 pl-7 text-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={runNow}
            disabled={empty || running}
            className="bg-indigo-500 text-white hover:bg-indigo-400"
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : initialResult ? (
              <RotateCw className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {running ? "Running…" : initialResult ? "Rerun" : "Run simulation"}
          </Button>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_440px] overflow-hidden">
        {/* Left column */}
        <div className="min-w-0 space-y-4 overflow-y-auto border-r border-border p-5">
          {/* Edit-since warning (Part 3.2) */}
          {initialResult && journeyHasChanged(initialResult, nodes) && !editWarningDismissed && (
            <SimulationEditedBanner onDismiss={() => setEditWarningDismissed(true)} />
          )}

          {/* Cohort inputs */}
          <div className="rounded-lg border border-border bg-card/40">
            <button
              type="button"
              onClick={() => setInputsOpen((s) => !s)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              {inputsOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-semibold text-foreground">
                {inputsOpen ? "Cohort" : "Cohort — expand to edit"}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {cohortLabel} · {cohortSize.toLocaleString()} borrower{cohortSize === 1 ? "" : "s"}
              </span>
            </button>

            {inputsOpen && (
              <div className="space-y-4 border-t border-border p-4">
                {/* Three-mode segmented control */}
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "full", title: "Full audience", desc: "Runs against the journey's actual audience filter" },
                      { id: "specific", title: "Specific deals", desc: "Paste borrower_deal_ids" },
                      { id: "filter", title: "Filter-built cohort", desc: "Construct a targeted test cohort with filters" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMode(opt.id)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        mode === opt.id
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-muted/10 hover:border-neutral-700",
                      )}
                    >
                      <p className="text-xs font-semibold text-foreground">{opt.title}</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {mode === "specific" && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Deal IDs
                      <span className="ml-1 text-muted-foreground/60">· {parsedIds.length} parsed</span>
                    </Label>
                    <textarea
                      value={dealIds}
                      onChange={(e) => setDealIds(e.target.value)}
                      placeholder="Paste borrower_deal_ids — one per line, comma-separated, or from a spreadsheet…"
                      className="mt-1 min-h-[110px] w-full rounded-md border border-input bg-transparent p-2 font-mono text-[11px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    />
                  </div>
                )}

                {mode === "filter" && (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <FilterBuilder
                      value={filterGroups}
                      onValueChange={setFilterGroups}
                      groupJoin={groupJoin}
                      onGroupJoinChange={setGroupJoin}
                      enableCalculatedFields={false}
                      heading="Cohort filters"
                    />
                  </div>
                )}

                {/* Live count + safeguards */}
                <div className="rounded-md border border-border bg-muted/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            empty ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {cohortSize.toLocaleString()}
                        </span>{" "}
                        borrower{cohortSize === 1 ? "" : "s"} match this cohort.
                      </p>
                      {overCap && (
                        <p className="mt-1 text-[10px] leading-relaxed text-warning-400">
                          Filter matches {cohortSize.toLocaleString()} borrowers. Simulation will run against a
                          random sample of {cap.toLocaleString()} to protect performance.
                        </p>
                      )}
                      {empty && (
                        <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                          No borrowers match this filter. Broaden your conditions or check attribute values.
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewOpen((s) => !s)}
                        disabled={cohortSize === 0}
                      >
                        Preview cohort
                      </Button>
                      {mode === "filter" && cohortSize > 0 && (
                        <Button size="sm" variant="outline" onClick={() => setSaveSegOpen(true)}>
                          Save as segment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cap input */}
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Cap
                    <span className="ml-1 text-muted-foreground/60">max 50,000</span>
                  </Label>
                  <Input
                    type="number"
                    value={cap}
                    onChange={(e) =>
                      setCap(Math.max(1, Math.min(50000, Number(e.target.value) || 1)))
                    }
                    className="mt-1 h-8 w-32 text-center text-xs tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cohort preview panel */}
          {previewOpen && (
            <CohortPreview
              cohort={cohortCandidates.slice(0, 10)}
              total={cohortSize}
              onClose={() => setPreviewOpen(false)}
              onOpenTrace={(borrowerId) => onOpenSampleForNode(`trace:${borrowerId}`)}
            />
          )}

          {/* Outcome config */}
          <OutcomeConfigSection
            open={outcomeOpen}
            onOpen={() => setOutcomeOpen((s) => !s)}
            nodes={actionNodes}
            choices={outcomeChoices}
            onChangeChoice={(id, preset) =>
              setOutcomeChoices((prev) => ({ ...prev, [id]: preset }))
            }
          />

          {/* Footer — total estimated cost */}
          {initialResult && (
            <div className="rounded-md border border-primary-500/30 bg-primary-500/5 p-3 text-[11px] text-primary-300">
              Estimated cost of running this journey against the cohort:{" "}
              <span className="font-semibold">{formatAed(initialResult.totalCostAed)}</span>
            </div>
          )}
        </div>

        {/* Right column: node inspector */}
        <div className="flex min-h-0 flex-col overflow-hidden bg-card/30">
          <div className="border-b border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {inspectorNode
                    ? ((inspectorNode.data as { label?: string })?.label ?? inspectorNode.id)
                    : "No node selected"}
                </p>
                {inspectorNode && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {(inspectorNode.data as { blockType?: string })?.blockType ?? inspectorNode.type}{" "}
                    · node {inspectorNode.id.slice(0, 12)}
                  </p>
                )}
              </div>
              <select
                value={inspectorNodeId ?? ""}
                onChange={(e) => setInspectorNodeId(e.target.value || null)}
                className="h-7 rounded-md border border-input bg-transparent px-2 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {(n.data as { label?: string })?.label ?? n.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInspectorTab("deals")}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  inspectorTab === "deals"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Deals reached
                <span className="ml-1 rounded bg-muted px-1 text-[10px]">
                  {inspectorCount.toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("payloads")}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  inspectorTab === "payloads"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                AI payloads
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {inspectorTab === "deals" && (
              <>
                {!initialResult && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Run the simulation to populate deals here.
                  </p>
                )}
                {initialResult && inspectorFiltered.length === 0 && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    No deals matched here.
                  </p>
                )}
                {initialResult && inspectorFiltered.length > 0 && (
                  <ul className="space-y-1.5">
                    {inspectorFiltered.map((s) => (
                      <li
                        key={s.borrowerId + s.dealId}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{s.borrowerName}</p>
                            <p className="text-[9px] text-muted-foreground">
                              DPD {s.dpd} · {s.product}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenSampleForNode(`trace:${s.borrowerId}`)}
                          className="shrink-0 text-[10px] font-medium text-primary hover:underline"
                        >
                          Trace →
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {inspectorTab === "payloads" && (
              <div className="rounded-md border border-border bg-muted/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sample</p>
                <pre className="mt-2 overflow-x-auto text-[10px] font-mono text-muted-foreground/90">
{`{
  "borrower": {
    "id": "brw_sample",
    "first_name": "Ahmed",
    "outstanding_amount": 3450,
    "dpd": 62,
    "language": "ar-AE"
  },
  "deal": {
    "id": "${(inspectorNode?.id ?? "deal_sample").slice(0, 24)}",
    "ptp_date": null
  },
  "clearvoice": {
    "voice": "ar-female-warm",
    "phone": "+9715xxxxxxxx"
  }
}`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {saveSegOpen && (
        <SaveAsSegmentModal
          onClose={() => setSaveSegOpen(false)}
          filterGroups={filterGroups}
          groupJoin={groupJoin}
        />
      )}
    </div>
  )
}

/* --------------------------------------------------------------------- */
/* CohortPreview — 10 sample borrowers matching the filter               */
/* --------------------------------------------------------------------- */

function CohortPreview({
  cohort,
  total,
  onClose,
  onOpenTrace,
}: {
  cohort: Borrower[]
  total: number
  onClose: () => void
  onOpenTrace: (borrowerId: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-foreground">Cohort preview</p>
          <p className="text-[10px] text-muted-foreground">
            Showing {cohort.length} of {total.toLocaleString()} matches.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close preview"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="divide-y divide-border/50">
        {cohort.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{b.name}</p>
              <p className="text-[10px] text-muted-foreground">
                DPD {b.dpdBucket} · {b.product} · {b.status} · AED {b.outstanding.toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenTrace(b.id)}
              className="shrink-0 text-[10px] font-medium text-primary hover:underline"
            >
              Trace →
            </button>
          </li>
        ))}
        {cohort.length === 0 && (
          <li className="px-3 py-4 text-center text-[11px] text-muted-foreground">
            No matches to preview.
          </li>
        )}
      </ul>
      {total > cohort.length && (
        <div className="border-t border-border/50 px-3 py-2 text-center">
          <Link href="/borrowers" className="text-[11px] text-primary hover:underline">
            View more →
          </Link>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------------- */
/* SaveAsSegmentModal — Part 1.5                                          */
/* --------------------------------------------------------------------- */

function SaveAsSegmentModal({
  onClose,
  filterGroups,
  groupJoin,
}: {
  onClose: () => void
  filterGroups: FilterGroup[]
  groupJoin: "AND" | "OR"
}) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Segment name is required.")
      return
    }
    // Prototype-only: save a draft segment payload to localStorage under a
    // well-known key. The Segments module can hydrate from this later.
    try {
      const key = "cleargrid:draft-segments"
      const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[]
      existing.push({
        id: `seg_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        status: "Draft",
        filterGroups,
        groupJoin,
        source: "simulator",
        createdAt: new Date().toISOString(),
      })
      window.localStorage.setItem(key, JSON.stringify(existing))
    } catch {
      /* ignore */
    }
    toast.success("Segment saved as draft", {
      description: "View in Segments to activate or edit.",
      action: {
        label: "View in Segments",
        onClick: () => (window.location.href = "/segments"),
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[440px] rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Save cohort as segment</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Segment name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tamara DPD 60-90 test cohort"
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what this cohort is for."
              className="mt-1 min-h-[64px] w-full rounded-md border border-input bg-transparent p-2 text-[11px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Saves as a Draft segment. Activate it in Segments to use elsewhere in Command.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save segment</Button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------- */
/* NodeSampleList — kept for existing count-pill click behavior.         */
/* Now consumes SimulationResult instead of the legacy shape.            */
/* --------------------------------------------------------------------- */

export function NodeSampleList({
  open,
  onClose,
  node,
  result,
  onOpenTrace,
}: {
  open: boolean
  onClose: () => void
  node: Node | null
  result: SimulationResult | null
  onOpenTrace?: (borrowerId: string) => void
}) {
  if (!open || !node || !result) return null
  const sim = result.perNode[node.id]
  if (!sim) return null
  const label = (node.data as { label?: string })?.label ?? node.id
  return (
    <div className="absolute right-3 top-3 z-30 flex w-80 flex-col rounded-lg border border-border bg-card/95 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">
            {sim.count.toLocaleString()} reached · {sim.percent.toFixed(1)}% of cohort · showing 10
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close sample list"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="max-h-80 overflow-y-auto p-2">
        {sim.sample.map((s) => (
          <li
            key={s.borrowerId + s.dealId}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{s.borrowerName}</p>
                <p className="text-[9px] text-muted-foreground">
                  DPD {s.dpd} · {s.product}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenTrace?.(s.borrowerId)}
              className="shrink-0 text-[10px] font-medium text-primary hover:underline"
            >
              Trace →
            </button>
          </li>
        ))}
        {sim.sample.length === 0 && (
          <li className="px-2 py-3 text-center text-[10px] text-muted-foreground">
            No borrowers reached this node in the simulation.
          </li>
        )}
      </ul>
    </div>
  )
}
