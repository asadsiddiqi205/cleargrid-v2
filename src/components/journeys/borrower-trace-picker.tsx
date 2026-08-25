"use client"

/**
 * BorrowerTracePicker — the modal that gates entry into the trace drawer
 * from the journey side. Renders a search-and-select list of borrowers
 * enrolled in the given journey with their current step + status.
 *
 * This is intentionally distinct from the drawer itself so it can also be
 * invoked from the report page or a right-side inspector — anywhere in the
 * app that needs to *pick* a borrower before rendering their trace.
 */

import * as React from "react"
import { Search, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { listBorrowersInJourney } from "@/data/borrower-traces"
import type { BorrowerTrace } from "@/data/borrower-traces"

interface BorrowerTracePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  journeyId: string
  onSelect: (borrowerId: string) => void
}

const STATUS_TONE: Record<BorrowerTrace["status"], string> = {
  active: "border-info-500/40 bg-info-500/10 text-info-300",
  converted: "border-primary/40 bg-primary/10 text-primary",
  exited: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  errored: "border-error-500/40 bg-error-500/10 text-error-300",
}

export function BorrowerTracePicker({
  open,
  onOpenChange,
  journeyId,
  onSelect,
}: BorrowerTracePickerProps) {
  const [query, setQuery] = React.useState("")
  const enrolled = React.useMemo(() => listBorrowersInJourney(journeyId, 50), [journeyId])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return enrolled
    const q = query.toLowerCase()
    return enrolled.filter(
      (e) =>
        e.borrower.name.toLowerCase().includes(q) ||
        e.borrower.id.toLowerCase().includes(q) ||
        e.borrower.phone.includes(q) ||
        e.borrower.emiratesId.includes(q),
    )
  }, [query, enrolled])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            Trace a borrower
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Pick a borrower to see the exact path they took through this journey — every hop,
            timestamp, and outcome — with conversion events attached where they fired.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-border px-4 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, phone, or Emirates ID…"
              className="h-8 pl-8 text-[12px]"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              {enrolled.length === 0
                ? "No borrowers are enrolled in this journey yet."
                : "No matches. Broaden the search."}
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map(({ borrower, status, currentStepLabel, enrolledAt, recoveredAED }) => (
                <li key={borrower.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(borrower.id)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-semibold text-foreground">
                      {borrower.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[12px] font-medium text-foreground">
                          {borrower.name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          · {borrower.dpdBucket} DPD · {borrower.product}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>
                          Enrolled{" "}
                          {new Date(enrolledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {currentStepLabel && (
                          <>
                            <span>·</span>
                            <span className="truncate">at {currentStepLabel}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-[10px]">
                      <span
                        className={cn(
                          "inline-flex items-center rounded border px-1.5 py-0.5 font-medium uppercase tracking-wider",
                          STATUS_TONE[status],
                        )}
                      >
                        {status}
                      </span>
                      {recoveredAED > 0 && (
                        <span className="tabular-nums text-primary">{formatAED(recoveredAED)}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
