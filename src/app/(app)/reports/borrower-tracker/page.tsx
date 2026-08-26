"use client"

/**
 * Borrower Journey Tracker · search hub.
 *
 * Reachable from Reports → Borrower Journey Tracker. Author searches by
 * name / borrower id / phone / Emirates ID; picking a borrower deep-links to
 * /reports/borrower-tracker/[id] which renders their journey history + the
 * action-response timeline.
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Milestone,
  Search,
  Users,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { borrowers } from "@/data/borrowers"
import { listJourneysForBorrower } from "@/data/borrower-traces"

const RISK_TONE: Record<"Low" | "Medium" | "High", string> = {
  Low: "text-primary",
  Medium: "text-warning-300",
  High: "text-error-300",
}

export default function BorrowerTrackerSearchPage() {
  const [q, setQ] = React.useState("")
  const [enriched, setEnriched] = React.useState<
    Array<{ borrower: typeof borrowers[number]; journeyCount: number; recoveredAED: number }>
  >([])

  // Journeys per borrower is a deterministic PRNG lookup — do it once on mount.
  React.useEffect(() => {
    setEnriched(
      borrowers.map((b) => {
        const journeys = listJourneysForBorrower(b.id)
        const recovered = journeys.reduce((s, j) => s + j.recoveredAED, 0)
        return { borrower: b, journeyCount: journeys.length, recoveredAED: recovered }
      }),
    )
  }, [])

  const list = React.useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return enriched
    return enriched.filter(({ borrower: b }) =>
      [b.name, b.id, b.phone, b.emiratesId, b.product].some((f) =>
        f.toLowerCase().includes(query),
      ),
    )
  }, [q, enriched])

  return (
    <PageShell
      title="Borrower Journey Tracker"
      description="Search a borrower to see every journey they've been through, and step-by-step what happened at each node — the message they received, the response, and any conversion."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            Reports
          </Link>
          <span className="text-muted-foreground/60">·</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Milestone className="h-3 w-3" />
            {enriched.length.toLocaleString()} borrowers indexed
          </span>
        </div>

        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ID, phone, Emirates ID, or product…"
            className="h-10 pl-9 text-[13px]"
          />
        </div>

        <div className="rounded-lg border border-border bg-card/40">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
              {list.length.toLocaleString()} results
            </h2>
          </div>
          {list.length === 0 ? (
            <div className="p-10 text-center text-[12px] text-muted-foreground">
              No borrowers match. Try a different query.
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {list.slice(0, 100).map(({ borrower: b, journeyCount, recoveredAED }) => (
                <li key={b.id}>
                  <Link
                    href={`/reports/borrower-tracker/${b.id}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-semibold text-foreground">
                      {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-foreground">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {b.emiratesId}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>{b.phone}</span>
                        <span>·</span>
                        <span>{b.product}</span>
                        <span>·</span>
                        <span>{b.dpdBucket} DPD</span>
                        <span>·</span>
                        <span className={cn("font-medium", RISK_TONE[b.riskScore])}>
                          {b.riskScore} risk
                        </span>
                      </div>
                    </div>
                    <div className="hidden text-right text-[11px] tabular-nums md:block">
                      <div className="font-medium text-foreground">
                        {journeyCount} {journeyCount === 1 ? "journey" : "journeys"}
                      </div>
                      {recoveredAED > 0 && (
                        <div className="text-[10px] text-primary">
                          {formatAED(recoveredAED)} recovered
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
              {list.length > 100 && (
                <li className="px-4 py-3 text-center text-[11px] text-muted-foreground">
                  Showing top 100. Narrow the search to see the rest.
                </li>
              )}
            </ul>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          <ChevronRight className="mr-1 inline h-2.5 w-2.5" />
          The tracker links the outreach (email / SMS / WhatsApp / AI call) to
          the borrower&apos;s response and any conversion that followed — so you can see
          exactly which touch drove the outcome.
        </p>
      </div>
    </PageShell>
  )
}
