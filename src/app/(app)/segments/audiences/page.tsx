"use client"

/**
 * Audiences resolver — Eternals' Audiences tool folded into Segments.
 *
 * Pick a segment (audience) on the left → hit Run audience → the right
 * pane shows each borrower who matches, with columns for every filter
 * attribute the segment uses. Each row deep-links into the Borrower
 * profile (Command).
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  RefreshCcw,
  Search,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { borrowers, type Borrower } from "@/data/borrowers"
import { segments, type Segment } from "@/data/segments"

const LIMIT_OPTIONS = [100, 200, 500, 1000]

interface AudienceRow {
  borrower: Borrower
  matchedAttributes: Record<string, string>
}

/**
 * Which attributes does a given segment score against? Prototype:
 * pick a deterministic set based on the segment id.
 */
function attributesForSegment(seg: Segment): string[] {
  const base = ["dpd_bucket", "product", "outstanding", "risk_score"]
  if (seg.name.toLowerCase().includes("ptp")) return [...base, "ptp_broken_count"]
  if (seg.name.toLowerCase().includes("hardship")) return [...base, "consent_status"]
  return base
}

function resolveAudience(seg: Segment, limit: number): AudienceRow[] {
  const attrs = attributesForSegment(seg)
  const rows: AudienceRow[] = []
  for (const b of borrowers) {
    const matched: Record<string, string> = {}
    for (const a of attrs) {
      switch (a) {
        case "dpd_bucket":
          matched[a] = b.dpdBucket
          break
        case "product":
          matched[a] = b.product
          break
        case "outstanding":
          matched[a] = formatAED(b.outstanding)
          break
        case "risk_score":
          matched[a] = b.riskScore
          break
        case "ptp_broken_count":
          matched[a] = String((b.id.charCodeAt(4) ?? 0) % 5)
          break
        case "consent_status":
          matched[a] = ["full", "partial", "restricted"][(b.id.charCodeAt(2) ?? 0) % 3]
          break
      }
    }
    rows.push({ borrower: b, matchedAttributes: matched })
    if (rows.length >= limit) break
  }
  return rows
}

export default function AudiencesResolverPage() {
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Segment | null>(null)
  const [limit, setLimit] = React.useState<number>(200)
  const [rows, setRows] = React.useState<AudienceRow[] | null>(null)

  const filteredSegments = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return segments
    return segments.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    )
  }, [query])

  const run = () => {
    if (!selected) return
    setRows(resolveAudience(selected, limit))
  }

  const attrs = selected ? attributesForSegment(selected) : []

  return (
    <PageShell
      title="Audiences resolver"
      description="Pick an audience, run it against BorrowerDeals, and see every borrower who matches with their own value on every filter attribute the audience uses."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link
            href="/segments"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            Segments
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          {/* Left rail — audience list */}
          <aside className="rounded-xl border border-border bg-card/40">
            <div className="border-b border-border px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search audiences…"
                  className="h-7 pl-7 text-[11px]"
                />
              </div>
            </div>
            <ul className="max-h-[68vh] overflow-y-auto p-1">
              {filteredSegments.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors",
                      selected?.id === s.id ? "bg-primary/[0.10]" : "hover:bg-muted/60",
                    )}
                  >
                    <div className="flex w-full items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                        {s.name}
                      </span>
                      <span className="tabular-nums text-[9px] text-muted-foreground">
                        {s.borrowers.toLocaleString()}
                      </span>
                    </div>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {s.description}
                    </span>
                  </button>
                </li>
              ))}
              {filteredSegments.length === 0 && (
                <li className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                  No audiences match.
                </li>
              )}
            </ul>
          </aside>

          {/* Right — action bar + resolved rows */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-[11px]">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-transparent px-2 tabular-nums dark:bg-input/30"
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    list {n}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                className="h-8 max-w-[144px] text-[11px]"
                placeholder="reference date"
              />
              <Button
                size="sm"
                onClick={run}
                disabled={!selected}
                className="h-8 text-[11px]"
              >
                <RefreshCcw className="h-3 w-3" />
                Run audience
              </Button>
              {selected && (
                <span className="text-muted-foreground">
                  {selected.name} · {selected.borrowers.toLocaleString()} borrowers · {attrs.length} attributes
                </span>
              )}
            </div>

            {rows ? (
              <div className="rounded-xl border border-border bg-card/40">
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-[11px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="tabular-nums font-semibold text-foreground">
                      {rows.length.toLocaleString()}
                    </span>{" "}
                    borrowers resolved
                  </span>
                  <span className="text-muted-foreground">
                    Click a row to open the borrower profile in Command.
                  </span>
                </div>
                <div className="max-h-[62vh] overflow-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/[0.06] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-semibold">Borrower</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Phone</th>
                        {attrs.map((a) => (
                          <th key={a} className="px-3 py-1.5 text-left font-mono text-[10px] font-semibold">
                            {a}
                          </th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r) => (
                        <tr key={r.borrower.id} className="hover:bg-muted/20">
                          <td className="px-3 py-1.5">
                            <div className="text-foreground font-medium">{r.borrower.name}</div>
                            <div className="font-mono text-[9px] text-muted-foreground">
                              {r.borrower.id}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.borrower.phone}</td>
                          {attrs.map((a) => (
                            <td key={a} className="px-3 py-1.5 text-foreground">
                              {r.matchedAttributes[a] ?? "—"}
                            </td>
                          ))}
                          <td className="px-3 py-1.5 text-right">
                            <Link
                              href={`/borrowers/${r.borrower.id}`}
                              className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary hover:bg-primary/20"
                            >
                              Open
                              <ChevronRight className="h-2 w-2" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card/40 p-10 text-center text-[12px] text-muted-foreground">
                Pick an audience on the left, then hit{" "}
                <span className="text-foreground">Run audience</span> to resolve it from BorrowerDeals.
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  )
}
