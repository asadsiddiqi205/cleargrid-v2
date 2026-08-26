"use client"

/**
 * NodeDrilldownModal — opens when a row in the report's Per-node breakdown
 * is clicked. Shows the actual borrowers at that node with their state
 * (passed / waiting / failed / skipped / in_progress) + timestamps, plus a
 * node-type-aware metric strip and search / filter / export controls.
 *
 * Each borrower row links into the single-borrower trace drawer so authors
 * can go node → borrower → whole journey seamlessly.
 */

import * as React from "react"
import {
  X,
  Search,
  Download,
  ChevronRight,
  Users,
  ArrowRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import {
  buildNodeBorrowerList,
  buildNodeBreakdown,
  classifyNode,
  type NodeBorrowerRow,
  type NodeBorrowerState,
  type NodeKind,
} from "@/data/journey-analytics"
import { BorrowerTraceDrawer } from "@/components/journeys/borrower-trace-drawer"

interface NodeDrilldownModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  journeyId: string
  nodeId: string
  nodeLabel: string
  nodeType: string
  blockType?: string
}

const STATE_TONE: Record<NodeBorrowerState, string> = {
  passed: "border-primary/40 bg-primary/10 text-primary",
  waiting: "border-info-500/40 bg-info-500/10 text-info-300",
  failed: "border-error-500/40 bg-error-500/10 text-error-300",
  skipped: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  in_progress: "border-warning-500/40 bg-warning-500/10 text-warning-300",
}

const STATE_LABEL: Record<NodeBorrowerState, string> = {
  passed: "Passed",
  waiting: "Waiting",
  failed: "Failed",
  skipped: "Skipped",
  in_progress: "In progress",
}

export function NodeDrilldownModal({
  open,
  onOpenChange,
  journeyId,
  nodeId,
  nodeLabel,
  nodeType,
  blockType,
}: NodeDrilldownModalProps) {
  const kind = classifyNode(nodeType, blockType, nodeLabel)
  const rows = React.useMemo(
    () => (open ? buildNodeBorrowerList(journeyId, nodeId, nodeLabel, kind) : []),
    [open, journeyId, nodeId, nodeLabel, kind],
  )
  const breakdown = React.useMemo(
    () => (open ? buildNodeBreakdown(journeyId, nodeId, kind, nodeLabel) : null),
    [open, journeyId, nodeId, kind, nodeLabel],
  )

  const [query, setQuery] = React.useState("")
  const [stateFilter, setStateFilter] = React.useState<NodeBorrowerState | "all">("all")
  const [traceBorrower, setTraceBorrower] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (stateFilter !== "all" && r.state !== stateFilter) return false
      if (!q) return true
      const b = r.borrower
      return (
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        b.emiratesId.includes(q) ||
        b.product.toLowerCase().includes(q)
      )
    })
  }, [rows, query, stateFilter])

  const stateCounts = React.useMemo(() => {
    const c: Record<NodeBorrowerState, number> = {
      passed: 0,
      waiting: 0,
      failed: 0,
      skipped: 0,
      in_progress: 0,
    }
    for (const r of rows) c[r.state]++
    return c
  }, [rows])

  const exportCsv = () => {
    const headers = ["borrower_id", "name", "phone", "state", "at", "message_events", "call_result", "branch", "waited_hours", "recovered_aed"]
    const csvRows = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.borrower.id,
          `"${r.borrower.name.replace(/"/g, '""')}"`,
          r.borrower.phone,
          r.state,
          r.at,
          r.messageEvents?.join("|") ?? "",
          r.callResult ?? "",
          r.branchLabel?.replace(/"/g, '""') ?? "",
          r.waitedHours ?? "",
          r.recoveredAED,
        ].join(","),
      ),
    ]
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${nodeId}-borrowers-${journeyId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="border-b border-border px-5 py-3">
            <DialogTitle className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{nodeLabel}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-300">
                    {kind.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Borrowers at this node · {rows.length.toLocaleString()} total
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {/* Node-type-aware metric strip */}
          {breakdown && breakdown.metrics.length > 0 && (
            <div className="border-b border-border bg-muted/[0.04] px-5 py-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {breakdown.metrics.map((m) => (
                  <div key={m.label} className="rounded-md border border-border/60 bg-background/50 px-2.5 py-2">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {m.label}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 font-heading text-lg font-semibold tabular-nums",
                        m.tone === "primary" && "text-primary",
                        m.tone === "info" && "text-info-300",
                        m.tone === "warn" && "text-warning-300",
                        m.tone === "muted" && "text-muted-foreground",
                        !m.tone && "text-foreground",
                      )}
                    >
                      {m.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              {/* Branch distribution — only for split/condition */}
              {breakdown.branches && breakdown.branches.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Branch distribution
                  </p>
                  {breakdown.branches.map((b) => (
                    <div key={b.label} className="flex items-center gap-2 text-[11px]">
                      <span className="min-w-[8rem] truncate text-foreground">{b.label}</span>
                      <div className="flex-1 rounded bg-muted/40 overflow-hidden h-2">
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${(b.pct * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right tabular-nums text-muted-foreground">
                        {b.count.toLocaleString()} · {(b.pct * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filter + search + export */}
          <div className="border-b border-border px-5 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, ID, phone, product…"
                  className="h-8 pl-8 text-[12px]"
                />
              </div>
              <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/[0.04] p-0.5 text-[10px]">
                <FilterChip
                  active={stateFilter === "all"}
                  onClick={() => setStateFilter("all")}
                >
                  All · {rows.length}
                </FilterChip>
                {(Object.keys(STATE_LABEL) as NodeBorrowerState[]).map((s) =>
                  stateCounts[s] > 0 ? (
                    <FilterChip
                      key={s}
                      active={stateFilter === s}
                      onClick={() => setStateFilter(s)}
                      tone={STATE_TONE[s]}
                    >
                      {STATE_LABEL[s]} · {stateCounts[s]}
                    </FilterChip>
                  ) : null,
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={exportCsv}
                className="h-8 text-[11px]"
                disabled={filtered.length === 0}
              >
                <Download className="h-3 w-3" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Borrower list */}
          <div className="max-h-[52vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-[12px] text-muted-foreground">
                {rows.length === 0
                  ? "No borrowers have reached this node yet."
                  : "No matches. Broaden the search or filter."}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((r) => (
                  <li key={r.borrower.id + r.at} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-5 py-2.5 hover:bg-muted/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[12px] font-medium text-foreground">
                          {r.borrower.name}
                        </span>
                        <NodeStateChip state={r.state} />
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {r.borrower.dpdBucket} DPD · {r.borrower.product} · reached{" "}
                        {new Date(r.at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {(r.messageEvents || r.callResult || r.branchLabel || r.waitedHours != null || r.endTag) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {r.messageEvents?.map((e) => (
                            <span
                              key={e}
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                                e === "clicked" || e === "opened"
                                  ? "bg-primary/15 text-primary"
                                  : e === "bounced"
                                    ? "bg-error-500/15 text-error-300"
                                    : "bg-muted text-neutral-300",
                              )}
                            >
                              {e}
                            </span>
                          ))}
                          {r.callResult && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-neutral-300">
                              Call: {r.callResult.replace("_", " ")}
                            </span>
                          )}
                          {r.branchLabel && (
                            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                              Branch → {r.branchLabel}
                            </span>
                          )}
                          {r.waitedHours != null && (
                            <span className="rounded bg-info-500/15 px-1.5 py-0.5 text-[9px] font-medium text-info-300">
                              Waited {r.waitedHours}h
                            </span>
                          )}
                          {r.endTag && (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                                r.endTag === "Converted"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-neutral-300",
                              )}
                            >
                              End: {r.endTag}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {r.recoveredAED > 0 && (
                      <span className="tabular-nums text-primary text-[11px]">
                        {formatAED(r.recoveredAED)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setTraceBorrower(r.borrower.id)}
                      className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      Trace
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <a
                      href={`/borrowers/${r.borrower.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Profile
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BorrowerTraceDrawer
        open={traceBorrower !== null}
        onOpenChange={(o) => { if (!o) setTraceBorrower(null) }}
        borrowerId={traceBorrower}
        journeyId={journeyId}
      />
    </>
  )
}

function FilterChip({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean
  onClick: () => void
  tone?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-[10px] font-medium transition-colors",
        active
          ? tone
            ? `border ${tone}`
            : "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function NodeStateChip({ state }: { state: NodeBorrowerState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
        STATE_TONE[state],
      )}
    >
      {STATE_LABEL[state]}
    </span>
  )
}
