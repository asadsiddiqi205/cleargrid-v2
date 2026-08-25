"use client"

/**
 * Borrower profile — a lightweight detail page that surfaces the borrower's
 * journey enrollments so they can be traced. This is one of the two entry
 * points into the journey trace (the other is the journey page itself).
 *
 * Kept intentionally minimal — the profile shape is stubbed to the fields
 * borrowers.ts already ships, plus the seeded journey membership list from
 * borrower-traces. A "real" profile page has calls / notes / documents / etc,
 * out of scope for this feature.
 */

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Phone,
  IdCard,
  BadgeCheck,
  ChevronRight,
  Milestone,
} from "lucide-react"
import { borrowers } from "@/data/borrowers"
import {
  listJourneysForBorrower,
  type BorrowerTrace,
} from "@/data/borrower-traces"
import { formatAED } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { BorrowerTraceDrawer } from "@/components/journeys/borrower-trace-drawer"

const STATUS_TONE: Record<BorrowerTrace["status"], string> = {
  active: "border-info-500/40 bg-info-500/10 text-info-300",
  converted: "border-primary/40 bg-primary/10 text-primary",
  exited: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  errored: "border-error-500/40 bg-error-500/10 text-error-300",
}

const RISK_TONE: Record<"Low" | "Medium" | "High", string> = {
  Low: "border-primary/40 bg-primary/10 text-primary",
  Medium: "border-warning-500/40 bg-warning-500/10 text-warning-300",
  High: "border-error-500/40 bg-error-500/10 text-error-300",
}

export default function BorrowerProfilePage() {
  const params = useParams<{ id: string }>()
  const borrower = borrowers.find((b) => b.id === params.id) ?? null
  const [traceOpen, setTraceOpen] = React.useState<{ journeyId: string } | null>(null)

  // Populate on the client only — the trace list is derived from a seeded
  // PRNG that could otherwise trip SSR hydration if Date locales differ.
  const [journeys, setJourneys] = React.useState<ReturnType<typeof listJourneysForBorrower>>([])
  React.useEffect(() => {
    if (borrower) setJourneys(listJourneysForBorrower(borrower.id))
  }, [borrower])

  if (!borrower) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Borrower not found.</p>
        <Link href="/borrowers" className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary hover:underline">
          <ArrowLeft className="h-3 w-3" />
          Back to borrowers
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <Link
        href="/borrowers"
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All borrowers
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[16px] font-semibold text-foreground">
          {borrower.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {borrower.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <IdCard className="h-3 w-3" /> {borrower.emiratesId}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {borrower.phone}
            </span>
            <span>·</span>
            <span>{borrower.product}</span>
            <span>·</span>
            <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", RISK_TONE[borrower.riskScore])}>
              {borrower.riskScore} risk
            </span>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card/40 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {formatAED(borrower.outstanding)}
          </div>
          <div className="text-[10px] tabular-nums text-muted-foreground">
            {borrower.dpdBucket} DPD · {borrower.status}
          </div>
        </div>
      </header>

      {/* Journeys section — the primary borrower-side entry into trace. */}
      <section className="rounded-lg border border-border bg-card/40">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Milestone className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
            Journeys · {journeys.length}
          </h2>
          <span className="text-[10px] text-muted-foreground">
            Every journey this borrower is (or was) enrolled in. Click Trace to see the exact
            path they took.
          </span>
        </div>
        {journeys.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-muted-foreground">
            Not enrolled in any journeys.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {journeys.map((j) => (
              <li
                key={j.journeyId}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">
                    {j.journeyName}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                    Enrolled {new Date(j.enrolledAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                {j.recoveredAED > 0 && (
                  <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                    <BadgeCheck className="mr-0.5 inline h-2.5 w-2.5" />
                    {formatAED(j.recoveredAED)} recovered
                  </span>
                )}
                <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", STATUS_TONE[j.status])}>
                  {j.status}
                </span>
                <button
                  type="button"
                  onClick={() => setTraceOpen({ journeyId: j.journeyId })}
                  className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Trace
                  <ChevronRight className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BorrowerTraceDrawer
        open={traceOpen !== null}
        onOpenChange={(o) => { if (!o) setTraceOpen(null) }}
        borrowerId={traceOpen ? borrower.id : null}
        journeyId={traceOpen?.journeyId ?? ""}
      />
    </div>
  )
}
