"use client"

/**
 * Validator page — dedicated Eternals-parity regression tool inside the
 * journey. Three steps stacked as full cards so each is legible.
 *
 * Steps mirror eternals.cleargrid.ai/validator verbatim:
 *   0. Account (tenant scoping — inherited from the journey's lender).
 *   1. Audience: pick count → Fetch Audience → snapshot table.
 *   2. Validate borrowers: run comparison → match / diverge table + Trace.
 *   3. Real executed flow: paste UUID / deal id → View real flow →
 *      navigates to the editor canvas with ?trace=<borrowerId> so the
 *      trace overlay renders per-pass loop colouring on the graph.
 *
 * Read-only — this page never triggers a real run. Reuses the borrower-
 * traces synthesizer to produce audiences, predictions, and executed
 * paths.
 */

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Play,
  Search,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { JourneySubNav } from "@/components/journeys/journey-sub-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { borrowers, type Borrower } from "@/data/borrowers"
import { synthesizeTrace } from "@/data/borrower-traces"

interface AudienceRow {
  borrower: Borrower
  dealId: string
}

interface ValidationRow {
  borrower: Borrower
  dealId: string
  predicted: string[]
  actual: string[]
  match: boolean
  divergeIndex?: number
}

export default function JourneyValidatorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const journeyId = params.id ?? "new"

  const [count, setCount] = React.useState(100)
  const [audience, setAudience] = React.useState<AudienceRow[] | null>(null)
  const [audienceLoading, setAudienceLoading] = React.useState(false)
  const [validation, setValidation] = React.useState<ValidationRow[] | null>(null)
  const [validating, setValidating] = React.useState(false)
  const [traceInput, setTraceInput] = React.useState("")

  const fetchAudience = async () => {
    setAudienceLoading(true)
    setAudience(null)
    setValidation(null)
    await sleep(650)
    const sampled = borrowers.slice(0, Math.min(count, borrowers.length)).map((b, i) => ({
      borrower: b,
      dealId: dealIdFor(b, i),
    }))
    setAudience(sampled)
    setAudienceLoading(false)
  }

  const validateAll = async () => {
    setValidating(true)
    if (!audience || audience.length === 0) {
      await fetchAudience()
    }
    await sleep(1200)
    const rows: ValidationRow[] = (audience ?? []).map((a) => {
      const trace = synthesizeTrace(a.borrower.id, journeyId)
      const predicted = trace.hops.map((h) => h.label)
      const seed = hash(a.borrower.id + journeyId)
      const roll = (seed % 100) / 100
      let actual = predicted.slice()
      let match = true
      let divergeIndex: number | undefined
      if (roll < 0.15 && actual.length > 1) {
        divergeIndex = Math.max(1, Math.floor(roll * actual.length * 6.66))
        actual = [
          ...predicted.slice(0, divergeIndex),
          "Global Exit · Payment Received",
        ]
        match = false
      }
      return { borrower: a.borrower, dealId: a.dealId, predicted, actual, match, divergeIndex }
    })
    setValidation(rows)
    setValidating(false)
  }

  const openTrace = (borrowerIdOrDealId: string) => {
    const raw = borrowerIdOrDealId.trim()
    if (!raw) return
    let borrowerId = raw
    if (raw.startsWith("deal-")) {
      const parts = raw.split("-")
      const suffix = parts[1]
      const b = borrowers.find((x) => x.id.endsWith(suffix))
      if (b) borrowerId = b.id
    } else if (!borrowers.some((b) => b.id === raw)) {
      const b = borrowers.find(
        (x) => x.id.includes(raw) || x.name.toLowerCase().includes(raw.toLowerCase()),
      )
      if (b) borrowerId = b.id
    }
    // Navigate back to editor with ?trace= — the canvas mounts the trace
    // overlay when it sees the query param.
    router.push(`/journeys/${journeyId}?trace=${borrowerId}`)
  }

  return (
    <div className="flex flex-col">
      <JourneySubNav journeyId={journeyId} />
      <PageShell
        title="Validator · Fetch & Verify"
        description="Snapshot the entry-segment audience, then compare each borrower's executed path against the prediction — node by node, branch by branch. Read-only: this tool never runs the journey."
      >
        <div className="space-y-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="rounded bg-primary/10 px-1 py-px font-medium text-primary">
              Fetch Audience
            </span>{" "}
            grabs the first N members of this journey&apos;s entry segment and snapshots their data.{" "}
            <span className="rounded bg-primary/10 px-1 py-px font-medium text-primary">
              Validate
            </span>{" "}
            compares each member&apos;s executed path to our prediction.{" "}
            <span className="text-warning-300">
              The dev triggers the journey itself — this tool never runs it.
            </span>
          </p>

          {/* Steps 1 + 2 side-by-side (matches Eternals layout) */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Step 1 — Audience */}
            <StepCard num={1} title="Audience">
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Count (first N members)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={count}
                    onChange={(e) =>
                      setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
                    }
                    className="mt-0.5 h-9 text-center tabular-nums"
                  />
                </div>
                <Button
                  onClick={fetchAudience}
                  disabled={audienceLoading}
                  className="w-full"
                >
                  {audienceLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching…
                    </>
                  ) : (
                    <>
                      <Users className="h-3.5 w-3.5" /> Fetch Audience
                    </>
                  )}
                </Button>
                {audience && (
                  <p className="text-[10px] text-muted-foreground">
                    <CheckCircle2 className="mr-1 inline h-2.5 w-2.5 text-primary" />
                    {audience.length.toLocaleString()} snapshots taken · scroll below
                    for the table.
                  </p>
                )}
              </div>
            </StepCard>

            {/* Step 2 — Validate borrowers */}
            <StepCard num={2} title="Validate Borrowers">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Fetches the debug-borrower path for each member and validates it
                against the prediction. If you haven&apos;t fetched the audience
                yet, this does it first.
              </p>
              <Button
                onClick={validateAll}
                disabled={validating}
                className="mt-3 w-full"
              >
                {validating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Validating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Validate Borrowers
                  </>
                )}
              </Button>
              {validation && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {validation.filter((v) => v.match).length} matched
                  </span>
                  {validation.some((v) => !v.match) && (
                    <span className="inline-flex items-center gap-1 rounded border border-error-500/40 bg-error-500/10 px-1.5 py-0.5 font-medium text-error-300">
                      <XCircle className="h-2.5 w-2.5" />
                      {validation.filter((v) => !v.match).length} diverged
                    </span>
                  )}
                </div>
              )}
            </StepCard>
          </div>

          {/* Audience snapshot table */}
          {audience && (
            <div className="rounded-xl border border-border bg-card/40">
              <div className="border-b border-border/60 px-4 py-2 text-[11px]">
                <span className="font-semibold text-foreground">Audience snapshot</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {audience.length.toLocaleString()} members
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/[0.06] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">#</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Borrower</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Deal id</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Phone</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Product</th>
                      <th className="px-3 py-1.5 text-left font-semibold">DPD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {audience.map((a, i) => (
                      <tr key={a.borrower.id}>
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-3 py-1.5 text-foreground">{a.borrower.name}</td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                          {a.dealId}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                          {a.borrower.phone}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {a.borrower.product}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {a.borrower.dpdBucket}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation results table */}
          {validation && (
            <div className="rounded-xl border border-border bg-card/40">
              <div className="border-b border-border/60 px-4 py-2 text-[11px]">
                <span className="font-semibold text-foreground">Validation results</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {validation.length.toLocaleString()} comparisons
                </span>
              </div>
              <div className="max-h-[52vh] overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/[0.06] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold">Borrower</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Deal id</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Match</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Diverged at</th>
                      <th className="px-3 py-1.5 text-left font-semibold">
                        Predicted / Actual
                      </th>
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {validation.map((r) => (
                      <tr key={r.borrower.id} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5 text-foreground">{r.borrower.name}</td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                          {r.dealId}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.match ? (
                            <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary">
                              <CheckCircle2 className="h-2 w-2" /> matched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-error-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-error-300">
                              <XCircle className="h-2 w-2" /> diverged
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {r.match ? "—" : `hop ${(r.divergeIndex ?? 0) + 1}`}
                        </td>
                        <td className="px-3 py-1.5 text-[10px]">
                          {r.match ? (
                            <span className="text-muted-foreground">
                              same path — {r.predicted.length} hops
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <div>
                                <span className="rounded bg-muted px-1 py-px text-[9px] uppercase tracking-wider text-neutral-300">
                                  predicted
                                </span>{" "}
                                <span className="text-foreground">
                                  {r.predicted[r.divergeIndex ?? 0]}
                                </span>
                              </div>
                              <div>
                                <span className="rounded bg-error-500/15 px-1 py-px text-[9px] uppercase tracking-wider text-error-300">
                                  actual
                                </span>{" "}
                                <span className="text-foreground">
                                  {r.actual[r.divergeIndex ?? 0]}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => openTrace(r.borrower.id)}
                            className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                          >
                            Trace
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3 — Real executed flow */}
          <StepCard num={3} title="Real executed flow">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              One borrower&apos;s <span className="text-foreground font-medium">EXACT path</span> on the
              journey graph — loops coloured per pass. Opens the editor canvas with the
              highlighted trace overlay:{" "}
              <span className="rounded bg-success-500/15 px-1 text-success-300">1st green</span>{" "}
              <span className="rounded bg-warning-500/15 px-1 text-warning-300">2nd amber</span>{" "}
              <span className="rounded bg-info-500/15 px-1 text-info-300">3rd blue</span>{" "}
              <span className="rounded bg-violet-500/15 px-1 text-violet-300">4th violet</span>.
              Failed nodes show red; the node they&apos;re parked at shows a dashed blue ring.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Borrower UUID or deal id
                </Label>
                <div className="relative mt-0.5">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={traceInput}
                    onChange={(e) => setTraceInput(e.target.value)}
                    placeholder="e.g. bor-001 or deal-1234-9876"
                    className="h-9 pl-8 font-mono text-[11px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && traceInput.trim()) openTrace(traceInput)
                    }}
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => openTrace(traceInput)}
                  disabled={!traceInput.trim()}
                  className="h-9"
                >
                  <Play className="h-3.5 w-3.5" /> View real flow
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
              Clicking View real flow navigates to the editor canvas with{" "}
              <span className="font-mono">?trace=&lt;borrowerId&gt;</span> — the trace overlay renders
              the borrower&apos;s exact path.
            </p>
          </StepCard>

          {/* Utility bar — quick-open any borrower */}
          <div className="rounded-xl border border-border bg-card/40 p-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-warning-300" />
              <span className="text-muted-foreground">Read-only tool.</span>
              <Link
                href={`/journeys/${journeyId}/borrowers`}
                className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
              >
                Open Borrowers view <ArrowRight className="h-2.5 w-2.5" />
              </Link>
              <Link
                href={`/journeys/${journeyId}`}
                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
              >
                Back to canvas <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  )
}

function StepCard({
  num,
  title,
  children,
}: {
  num: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[10px] font-semibold tabular-nums text-primary">{num}</span>
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms))
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function dealIdFor(b: Borrower, i: number): string {
  return `deal-${b.id.slice(-4)}-${(hash(b.id) % 9000) + 1000 + i}`
}
