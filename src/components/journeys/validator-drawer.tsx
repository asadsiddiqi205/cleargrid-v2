"use client"

/**
 * ValidatorDrawer — Eternals-style regression against real executed paths.
 *
 * Four-stage workflow inside a right-side sheet:
 *   0. Account — inherited from the journey's lender scope.
 *   1. Audience snapshot — fetch the first N members of the entry segment
 *      and snapshot their data. Renders the snapshot in a table.
 *   2. Validate borrowers — compare each member's actual path to the
 *      predicted path. Match / mismatch chip per row + a diff summary.
 *   3. Trace one borrower — paste a deal id + View real flow. Opens the
 *      canvas with the exact path highlighted, redial loops coloured per
 *      pass (1st green, 2nd amber, 3rd blue, 4th violet).
 *
 * The tool is READ-ONLY — never runs the journey itself.
 */

import * as React from "react"
import type { Node, Edge } from "@xyflow/react"
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Info,
  ExternalLink,
  Play,
  Search,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { borrowers, type Borrower } from "@/data/borrowers"
import { synthesizeTrace } from "@/data/borrower-traces"

interface ValidatorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  journeyId: string
  nodes: Node[]
  edges: Edge[]
  onOpenTrace: (borrowerId: string) => void
}

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

export function ValidatorDrawer({
  open,
  onOpenChange,
  journeyId,
  nodes,
  edges,
  onOpenTrace,
}: ValidatorDrawerProps) {
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
      dealId: `deal-${b.id.slice(-4)}-${(hash(b.id) % 9000) + 1000 + i}`,
    }))
    setAudience(sampled)
    setAudienceLoading(false)
  }

  const validateAll = async () => {
    setValidating(true)
    const list = audience ?? []
    if (list.length === 0) {
      await fetchAudience()
    }
    await sleep(1200)
    const rows: ValidationRow[] = (audience ?? []).map((a) => {
      const trace = synthesizeTrace(a.borrower.id, journeyId)
      const predicted = trace.hops.map((h) => h.label)
      // Prototype: perturb 15% of borrowers with a divergence at a random
      // hop, so the drawer shows a mix of match + mismatch.
      const seed = hash(a.borrower.id + journeyId)
      const rand = (seed % 100) / 100
      let actual = predicted.slice()
      let match = true
      let divergeIndex: number | undefined
      if (rand < 0.15 && actual.length > 1) {
        divergeIndex = Math.max(1, Math.floor(rand * actual.length))
        actual = [...predicted.slice(0, divergeIndex), "Global Exit · Payment Received"]
        match = false
      }
      return { borrower: a.borrower, dealId: a.dealId, predicted, actual, match, divergeIndex }
    })
    setValidation(rows)
    setValidating(false)
  }

  const canTrace = traceInput.trim().length > 3

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[720px] overflow-y-auto p-0 sm:max-w-[720px]">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">Validator · Fetch &amp; Verify</SheetTitle>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Snapshot the entry-segment audience, then compare each borrower&apos;s executed
                path against the prediction — node by node, branch by branch.{" "}
                <span className="text-warning-300">
                  Read-only — this tool never runs the journey.
                </span>
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
          </div>
        </SheetHeader>

        <div className="space-y-4 p-5">
          {/* Step 1 · Audience */}
          <Step
            num={1}
            title="Audience snapshot"
            hint="Fetch Audience grabs the first N members of the journey's entry segment and snapshots their data."
          >
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Count (first N members)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="mt-0.5 h-8 w-24 text-center tabular-nums"
                />
              </div>
              <Button
                size="sm"
                onClick={fetchAudience}
                disabled={audienceLoading}
                className="h-8"
              >
                {audienceLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Fetching
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" /> Fetch audience
                  </>
                )}
              </Button>
              {audience && (
                <span className="text-[11px] text-muted-foreground">
                  · {audience.length.toLocaleString()} snapshots taken
                </span>
              )}
            </div>
            {audience && (
              <div className="mt-3 max-h-52 overflow-y-auto rounded-md border border-border/60">
                <table className="w-full text-[10px]">
                  <thead className="bg-muted/[0.06] text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold">Borrower</th>
                      <th className="px-2 py-1 text-left font-semibold">Deal id</th>
                      <th className="px-2 py-1 text-left font-semibold">DPD</th>
                      <th className="px-2 py-1 text-left font-semibold">Product</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {audience.slice(0, 20).map((a) => (
                      <tr key={a.borrower.id}>
                        <td className="px-2 py-1 text-foreground">{a.borrower.name}</td>
                        <td className="px-2 py-1 font-mono text-muted-foreground">{a.dealId}</td>
                        <td className="px-2 py-1 text-muted-foreground">{a.borrower.dpdBucket}</td>
                        <td className="px-2 py-1 text-muted-foreground">{a.borrower.product}</td>
                      </tr>
                    ))}
                    {audience.length > 20 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-1 text-center text-muted-foreground">
                          +{(audience.length - 20).toLocaleString()} more…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Step>

          {/* Step 2 · Validate */}
          <Step
            num={2}
            title="Validate borrowers"
            hint="Fetches each borrower's real executed path and compares to the prediction. If you haven't fetched the audience yet, this does it first."
          >
            <Button
              size="sm"
              onClick={validateAll}
              disabled={validating}
              className="h-8"
            >
              {validating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Validating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Validate borrowers
                </>
              )}
            </Button>
            {validation && <ValidationTable rows={validation} onOpenTrace={onOpenTrace} />}
          </Step>

          {/* Step 3 · Trace one borrower */}
          <Step
            num={3}
            title="Real executed flow"
            hint="Highlights one borrower's EXACT path on the canvas — including redial loops, colored per pass (1st green, 2nd amber, 3rd blue, 4th violet). Failed nodes show red; the node they're parked at shows a dashed blue ring."
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[240px]">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Borrower UUID or deal id
                </Label>
                <div className="relative mt-0.5">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={traceInput}
                    onChange={(e) => setTraceInput(e.target.value)}
                    placeholder="e.g. bor-001 or deal-1234"
                    className="h-8 pl-7 text-[11px]"
                  />
                </div>
              </div>
              <Button
                size="sm"
                disabled={!canTrace}
                onClick={() => {
                  const raw = traceInput.trim()
                  // Resolve to a borrower id — accept either the raw borrower
                  // id, or extract from a deal id "deal-<suffix>-...".
                  let borrowerId = raw
                  if (raw.startsWith("deal-")) {
                    const parts = raw.split("-")
                    const suffix = parts[1]
                    const b = borrowers.find((x) => x.id.endsWith(suffix))
                    if (b) borrowerId = b.id
                  } else if (!borrowers.some((b) => b.id === raw)) {
                    // fuzzy: first borrower whose id includes the query
                    const b = borrowers.find((x) => x.id.includes(raw) || x.name.toLowerCase().includes(raw.toLowerCase()))
                    if (b) borrowerId = b.id
                  }
                  onOpenTrace(borrowerId)
                }}
                className="h-8"
              >
                <Play className="h-3 w-3" /> View real flow
              </Button>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
              The exact path is drawn on the current canvas as an overlay — close this drawer
              to see it.
            </p>
          </Step>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─────────── Reusable step wrapper ─────────── */

function Step({
  num,
  title,
  hint,
  children,
}: {
  num: number
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
          {num}
        </span>
        <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
      </div>
      {hint && <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground">{hint}</p>}
      {children}
    </section>
  )
}

/* ─────────── Validation results table ─────────── */

function ValidationTable({
  rows,
  onOpenTrace,
}: {
  rows: ValidationRow[]
  onOpenTrace: (borrowerId: string) => void
}) {
  const matched = rows.filter((r) => r.match).length
  const failed = rows.length - matched
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
          <CheckCircle2 className="h-2.5 w-2.5" />
          {matched} matched
        </span>
        {failed > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-error-500/40 bg-error-500/10 px-1.5 py-0.5 font-medium text-error-300">
            <XCircle className="h-2.5 w-2.5" />
            {failed} diverged
          </span>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border border-border/60">
        <table className="w-full text-[10px]">
          <thead className="bg-muted/[0.06] text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left font-semibold">Borrower</th>
              <th className="px-2 py-1 text-left font-semibold">Match</th>
              <th className="px-2 py-1 text-left font-semibold">Diverged at</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.borrower.id}>
                <td className="px-2 py-1">
                  <div className="font-medium text-foreground">{r.borrower.name}</div>
                  <div className="font-mono text-[9px] text-muted-foreground">{r.dealId}</div>
                </td>
                <td className="px-2 py-1">
                  {r.match ? (
                    <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1 py-0.5 text-[9px] font-medium text-primary">
                      <CheckCircle2 className="h-2 w-2" /> matched
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-error-500/15 px-1 py-0.5 text-[9px] font-medium text-error-300">
                      <XCircle className="h-2 w-2" /> diverged
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 text-muted-foreground">
                  {r.match
                    ? "—"
                    : `hop ${(r.divergeIndex ?? 0) + 1} · predicted "${r.predicted[r.divergeIndex ?? 0] ?? "?"}", actual "${r.actual[r.divergeIndex ?? 0] ?? "?"}"`}
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenTrace(r.borrower.id)}
                    className="inline-flex items-center gap-0.5 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary hover:bg-primary/20"
                  >
                    Trace
                    <ExternalLink className="h-2 w-2" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────── Utils ─────────── */

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
