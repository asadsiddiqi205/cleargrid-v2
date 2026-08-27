"use client"

/**
 * Per-journey Borrowers page — the borrower list scoped to THIS journey.
 *
 * Replaces the top-down `/reports/borrower-tracker` presentation. Every
 * borrower row deep-links to the trace overlay on the canvas
 * (`/journeys/[id]?trace=<borrowerId>`) so authors see the borrower's
 * exact path highlighted on the graph — same trace overlay the Validator
 * "View real flow" button opens.
 */

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowRight,
  BadgeCheck,
  Download,
  ExternalLink,
  Play,
  Search,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { JourneySubNav } from "@/components/journeys/journey-sub-nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { journeysList } from "@/data/journeys"
import { listBorrowersInJourney } from "@/data/borrower-traces"
import type { BorrowerTrace } from "@/data/borrower-traces"

const STATUS_TONE: Record<BorrowerTrace["status"], string> = {
  active: "border-info-500/40 bg-info-500/10 text-info-300",
  converted: "border-primary/40 bg-primary/10 text-primary",
  exited: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  errored: "border-error-500/40 bg-error-500/10 text-error-300",
}

export default function JourneyBorrowersPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const journeyId = params.id ?? "new"
  const journey = journeysList.find((j) => j.id === journeyId)

  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<BorrowerTrace["status"] | "all">("all")
  const [rows, setRows] = React.useState<ReturnType<typeof listBorrowersInJourney>>([])

  React.useEffect(() => {
    setRows(listBorrowersInJourney(journeyId, 200))
  }, [journeyId])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (!q) return true
      return (
        r.borrower.name.toLowerCase().includes(q) ||
        r.borrower.id.toLowerCase().includes(q) ||
        r.borrower.phone.includes(q) ||
        r.borrower.emiratesId.includes(q) ||
        r.borrower.product.toLowerCase().includes(q)
      )
    })
  }, [rows, query, statusFilter])

  const statusCounts = React.useMemo(() => {
    const c: Record<BorrowerTrace["status"], number> = { active: 0, converted: 0, exited: 0, errored: 0 }
    for (const r of rows) c[r.status]++
    return c
  }, [rows])

  const openTrace = (borrowerId: string) => {
    router.push(`/journeys/${journeyId}?trace=${borrowerId}`)
  }

  const exportCsv = () => {
    const headers = ["borrower_id", "name", "phone", "product", "dpd", "status", "enrolled_at", "recovered_aed", "current_step"]
    const csvRows = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.borrower.id,
          `"${r.borrower.name.replace(/"/g, '""')}"`,
          r.borrower.phone,
          r.borrower.product,
          r.borrower.dpdBucket,
          r.status,
          r.enrolledAt,
          r.recoveredAED,
          r.currentStepLabel ?? "",
        ].join(","),
      ),
    ]
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${journeyId}-borrowers.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  return (
    <div className="flex flex-col">
      <JourneySubNav journeyId={journeyId} />
      <PageShell
        title="Borrowers in this journey"
        description="Every borrower who's been through this journey. Click Trace to see their exact path highlighted on the canvas — same overlay the Validator's 'View real flow' opens."
      >
        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, ID, phone, product…"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/[0.04] p-0.5 text-[10px]">
              <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
                All · {rows.length}
              </FilterChip>
              {(Object.keys(statusCounts) as BorrowerTrace["status"][]).map((s) =>
                statusCounts[s] > 0 ? (
                  <FilterChip
                    key={s}
                    active={statusFilter === s}
                    onClick={() => setStatusFilter(s)}
                    tone={STATUS_TONE[s]}
                  >
                    {s} · {statusCounts[s]}
                  </FilterChip>
                ) : null,
              )}
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv} className="h-8 text-[11px]">
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </div>

          {/* Borrowers table */}
          <div className="rounded-xl border border-border bg-card/40">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                {filtered.length.toLocaleString()} borrowers
              </h2>
              <span className="text-[10px] text-muted-foreground">
                · click Trace to open the per-borrower canvas overlay
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-[12px] text-muted-foreground">
                No borrowers match. Try a different query or filter.
              </div>
            ) : (
              <div className="max-h-[68vh] overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/[0.06] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Borrower</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Product</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Enrolled</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Current step</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Status</th>
                      <th className="px-3 py-1.5 text-right font-semibold">Recovered</th>
                      <th className="w-40" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((r) => (
                      <tr key={r.borrower.id} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5">
                          <div className="text-foreground font-medium">{r.borrower.name}</div>
                          <div className="font-mono text-[9px] text-muted-foreground">
                            {r.borrower.id} · {r.borrower.phone}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {r.borrower.product} · {r.borrower.dpdBucket} DPD
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                          {new Date(r.enrolledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-1.5 truncate max-w-[220px] text-foreground">
                          {r.currentStepLabel ?? "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                              STATUS_TONE[r.status],
                            )}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.recoveredAED > 0 ? (
                            <span className="text-primary">
                              <BadgeCheck className="mr-0.5 inline h-2.5 w-2.5" />
                              {formatAED(r.recoveredAED)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openTrace(r.borrower.id)}
                              className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20"
                            >
                              <Play className="h-2.5 w-2.5" />
                              Trace on canvas
                            </button>
                            <Link
                              href={`/borrowers/${r.borrower.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                            >
                              Profile
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            <span className="text-foreground font-medium">Trace on canvas</span> opens the
            editor with the borrower&apos;s exact path highlighted — same as the Validator&apos;s{" "}
            <Link href={`/journeys/${journeyId}/validator`} className="text-primary hover:underline">
              Real executed flow
            </Link>{" "}
            step.
          </p>
        </div>
      </PageShell>
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
