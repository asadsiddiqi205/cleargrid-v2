"use client"

/**
 * NodeAnalyticsTab — the Analytics tab inside the node config panel.
 *
 * Shows, for the currently-selected canvas run, who entered THIS node with
 * their state + per-node context. Reuses the same data shape as the report
 * page's drill-down modal, so the two surfaces stay in sync.
 */

import * as React from "react"
import Link from "next/link"
import {
  Users,
  Search,
  Download,
  ChevronRight,
  Calendar,
  Clock,
  AlertCircle,
  Info,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { classifyNode, buildNodeBreakdown } from "@/data/journey-analytics"
import {
  getRun,
  listRunNodeBorrowers,
  formatRunAge,
  type RunNodeRow,
} from "@/data/journey-runs"
import { BorrowerTraceDrawer } from "@/components/journeys/borrower-trace-drawer"

interface NodeAnalyticsTabProps {
  journeyId: string
  runId: string | null
  nodeId: string
  nodeLabel: string
  nodeType: string
  blockType?: string
}

const STATE_TONE: Record<RunNodeRow["state"], string> = {
  passed: "border-primary/40 bg-primary/10 text-primary",
  waiting: "border-info-500/40 bg-info-500/10 text-info-300",
  failed: "border-error-500/40 bg-error-500/10 text-error-300",
  in_progress: "border-warning-500/40 bg-warning-500/10 text-warning-300",
}

const STATE_LABEL: Record<RunNodeRow["state"], string> = {
  passed: "Passed",
  waiting: "Waiting",
  failed: "Failed",
  in_progress: "In progress",
}

export function NodeAnalyticsTab({
  journeyId,
  runId,
  nodeId,
  nodeLabel,
  nodeType,
  blockType,
}: NodeAnalyticsTabProps) {
  const [query, setQuery] = React.useState("")
  const [stateFilter, setStateFilter] = React.useState<RunNodeRow["state"] | "all">("all")
  const [branchFilter, setBranchFilter] = React.useState<string | "all">("all")
  const [traceBorrower, setTraceBorrower] = React.useState<string | null>(null)

  const run = runId ? getRun(journeyId, runId) : null
  const kind = classifyNode(nodeType, blockType, nodeLabel)

  const rows = React.useMemo(
    () => (run ? listRunNodeBorrowers(run, nodeId, nodeLabel, kind) : []),
    [run, nodeId, nodeLabel, kind],
  )

  const breakdown = React.useMemo(
    () => (rows.length > 0 ? buildNodeBreakdown(journeyId, nodeId, kind, nodeLabel) : null),
    [rows.length, journeyId, nodeId, kind, nodeLabel],
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (stateFilter !== "all" && r.state !== stateFilter) return false
      if (branchFilter !== "all" && r.branchLabel !== branchFilter) return false
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
  }, [rows, query, stateFilter, branchFilter])

  const branchCounts = React.useMemo(() => {
    if (!breakdown?.branches) return null
    const counts = new Map<string, number>()
    for (const b of breakdown.branches) counts.set(b.label, b.count)
    return counts
  }, [breakdown?.branches])

  const stateCounts = React.useMemo(() => {
    const c: Record<RunNodeRow["state"], number> = {
      passed: 0,
      waiting: 0,
      failed: 0,
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
    a.download = `${nodeId}-run-${runId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <AlertCircle className="h-5 w-5 text-warning-300" />
        <p className="text-[12px] font-medium text-foreground">No run selected</p>
        <p className="max-w-[240px] text-[10px] leading-relaxed text-muted-foreground">
          Pick a run from the <span className="text-foreground">Analytics</span> chip at
          the top of the canvas to see who entered this node during that run.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Run header */}
      <div className="border-b border-border bg-muted/[0.04] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-foreground">{run.label}</span>
              <span
                className={cn(
                  "rounded px-1 py-px text-[9px] font-medium uppercase tracking-wider",
                  run.status === "completed" && "bg-primary/15 text-primary",
                  run.status === "running" && "bg-info-500/15 text-info-300",
                  run.status === "failed" && "bg-error-500/15 text-error-300",
                  run.status === "queued" && "bg-muted text-neutral-300",
                )}
              >
                {run.status}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              <Clock className="mr-0.5 inline h-2.5 w-2.5" />
              {formatRunAge(run)} · {run.enrolled.toLocaleString()} enrolled /{" "}
              {run.resolved.toLocaleString()} resolved
            </p>
          </div>
        </div>
      </div>

      {/* Per-node metric strip (node-type-aware) */}
      {breakdown && breakdown.metrics.length > 0 && (
        <div className="border-b border-border bg-muted/[0.02] px-3 py-2">
          <div className="grid grid-cols-2 gap-1.5">
            {breakdown.metrics.slice(0, 4).map((m) => (
              <div key={m.label} className="rounded border border-border/60 bg-background/50 px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div
                  className={cn(
                    "mt-0.5 text-[14px] font-semibold tabular-nums",
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
          {breakdown.branches && breakdown.branches.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {kind === "condition" ? "Yes / No distribution" : "Branch distribution"}
              </p>
              {/* Yes/No two-tile view for conditions; bar-per-branch for splits */}
              {kind === "condition" ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {breakdown.branches.map((b) => {
                    const isYes = b.label === "Yes"
                    return (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() =>
                          setBranchFilter(branchFilter === b.label ? "all" : b.label)
                        }
                        className={cn(
                          "flex items-center justify-between rounded border px-2 py-1.5 text-left transition-colors",
                          branchFilter === b.label && "ring-2 ring-primary/50",
                          isYes
                            ? "border-primary/40 bg-primary/[0.06] hover:bg-primary/10"
                            : "border-warning-500/40 bg-warning-500/[0.06] hover:bg-warning-500/10",
                        )}
                        title={`Filter to ${b.label} · ${b.count} borrowers`}
                      >
                        <div>
                          <div
                            className={cn(
                              "text-[9px] font-semibold uppercase tracking-wider",
                              isYes ? "text-primary" : "text-warning-300",
                            )}
                          >
                            {b.label}
                          </div>
                          <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-foreground">
                            {b.count.toLocaleString()}
                          </div>
                        </div>
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                          {(b.pct * 100).toFixed(0)}%
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                breakdown.branches.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() =>
                      setBranchFilter(branchFilter === b.label ? "all" : b.label)
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-1 py-0.5 text-[10px] transition-colors",
                      branchFilter === b.label
                        ? "bg-primary/10"
                        : "hover:bg-muted/40",
                    )}
                    title={`Filter to ${b.label}`}
                  >
                    <span className="min-w-[6rem] truncate text-left text-foreground">{b.label}</span>
                    <div className="flex-1 rounded bg-muted/40 overflow-hidden h-1.5">
                      <div className="h-full bg-primary/70" style={{ width: `${(b.pct * 100).toFixed(1)}%` }} />
                    </div>
                    <span className="w-20 text-right tabular-nums text-muted-foreground">
                      {b.count.toLocaleString()} · {(b.pct * 100).toFixed(0)}%
                    </span>
                  </button>
                ))
              )}
              {branchFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setBranchFilter("all")}
                  className="text-[9px] font-medium text-primary hover:underline"
                >
                  Clear branch filter
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter + search + export */}
      <div className="border-b border-border px-3 py-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search borrower…"
            className="h-7 w-full rounded border border-input bg-transparent pl-7 pr-2 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <FilterChip active={stateFilter === "all"} onClick={() => setStateFilter("all")}>
            All · {rows.length}
          </FilterChip>
          {(Object.keys(STATE_LABEL) as RunNodeRow["state"][]).map((s) =>
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
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            <Download className="h-2.5 w-2.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Borrower list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[11px] text-muted-foreground">
            {rows.length === 0
              ? "No borrowers hit this node in the selected run."
              : "No matches. Broaden the search or filter."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li key={r.borrower.id + r.at} className="px-3 py-2 hover:bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] font-medium text-foreground">
                        {r.borrower.name}
                      </span>
                      <span
                        className={cn(
                          "rounded border px-1 py-px text-[9px] font-medium uppercase tracking-wider",
                          STATE_TONE[r.state],
                        )}
                      >
                        {STATE_LABEL[r.state]}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[9px] text-muted-foreground">
                      {r.borrower.dpdBucket} DPD · {r.borrower.product} ·{" "}
                      {new Date(r.at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {(r.messageEvents || r.callResult || r.branchLabel || r.waitedHours != null || r.endTag) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.messageEvents?.map((e) => (
                          <span
                            key={e}
                            className={cn(
                              "rounded px-1 py-px text-[8px] font-medium uppercase",
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
                          <span className="rounded bg-muted px-1 py-px text-[8px] font-medium uppercase text-neutral-300">
                            {r.callResult.replace("_", " ")}
                          </span>
                        )}
                        {r.branchLabel && (
                          <span className="rounded bg-primary/15 px-1 py-px text-[8px] font-medium text-primary">
                            → {r.branchLabel}
                          </span>
                        )}
                        {r.waitedHours != null && (
                          <span className="rounded bg-info-500/15 px-1 py-px text-[8px] font-medium text-info-300">
                            {r.waitedHours}h
                          </span>
                        )}
                        {r.endTag && (
                          <span
                            className={cn(
                              "rounded px-1 py-px text-[8px] font-medium uppercase",
                              r.endTag === "Converted" ? "bg-primary/15 text-primary" : "bg-muted text-neutral-300",
                            )}
                          >
                            {r.endTag}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {r.recoveredAED > 0 && (
                      <span className="text-[10px] tabular-nums text-primary">
                        {formatAED(r.recoveredAED)}
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setTraceBorrower(r.borrower.id)}
                        className="inline-flex items-center gap-0.5 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                      >
                        Trace
                        <ChevronRight className="h-2.5 w-2.5" />
                      </button>
                      <Link
                        href={`/borrowers/${r.borrower.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Profile
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border/40 bg-muted/[0.02] px-3 py-1.5 text-[9px] text-muted-foreground">
        <Info className="mr-0.5 inline h-2 w-2" />
        Per-run per-node borrower list. Click Trace to see the whole journey the borrower took.
      </div>

      <BorrowerTraceDrawer
        open={traceBorrower !== null}
        onOpenChange={(o) => { if (!o) setTraceBorrower(null) }}
        borrowerId={traceBorrower}
        journeyId={journeyId}
      />
    </div>
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
        "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? tone
            ? `border ${tone}`
            : "bg-background text-foreground shadow-sm border border-border"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
