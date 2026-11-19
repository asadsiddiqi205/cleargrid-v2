"use client"

/**
 * Shared filter bar for Journey analytics surfaces. Every section on the
 * node Analytics tab, the Report tab's email/SMS tables, and the
 * borrower list reads from the same `AnalyticsFilters` shape so switching
 * tabs doesn't lose context.
 *
 * TODO (backend contract): when the API lands, pass these verbatim as a
 * filter object; see the field names in `AnalyticsFilters`.
 */

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { lenders as LENDERS } from "@/data/lenders"

export interface AnalyticsFilters {
  /** ISO date strings; empty means unbounded on that side. */
  dateStart?: string
  dateEnd?: string
  /** Submission date = when the campaign/send was first triggered. */
  submissionStart?: string
  submissionEnd?: string
  dpdBuckets: string[]
  nationalities: string[]
  lenderIds: string[]
  reachableBuckets: Array<"email" | "phone" | "both" | "neither">
}

export const EMPTY_FILTERS: AnalyticsFilters = {
  dpdBuckets: [],
  nationalities: [],
  lenderIds: [],
  reachableBuckets: [],
}

export const DPD_BUCKETS = ["0-30", "31-60", "61-90", "91-120", "120+"]

/** Nationalities used by the demo mock borrower synthesizer. */
export const NATIONALITIES = ["AE", "IN", "PK", "EG", "PH", "JO"]

export const REACHABLE_BUCKETS: Array<{
  id: AnalyticsFilters["reachableBuckets"][number]
  label: string
}> = [
  { id: "email", label: "Email only" },
  { id: "phone", label: "Phone only" },
  { id: "both", label: "Email + Phone" },
  { id: "neither", label: "Unreachable" },
]

function countActive(f: AnalyticsFilters): number {
  return (
    (f.dateStart ? 1 : 0) +
    (f.dateEnd ? 1 : 0) +
    (f.submissionStart ? 1 : 0) +
    (f.submissionEnd ? 1 : 0) +
    f.dpdBuckets.length +
    f.nationalities.length +
    f.lenderIds.length +
    f.reachableBuckets.length
  )
}

export function AnalyticsFilterBar({
  value,
  onChange,
  compact = false,
  hideDates = false,
}: {
  value: AnalyticsFilters
  onChange: (next: AnalyticsFilters) => void
  compact?: boolean
  /** When true, hide the Sent/Submitted date-range pickers. Used on the
   *  node Analytics tab where scope is driven by the selected run. */
  hideDates?: boolean
}) {
  const active = countActive(value)
  const patch = (p: Partial<AnalyticsFilters>) => onChange({ ...value, ...p })
  const toggle = <K extends keyof AnalyticsFilters>(
    key: K,
    item: AnalyticsFilters[K] extends Array<infer U> ? U : never,
  ) => {
    const arr = value[key] as unknown as unknown[]
    const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
    patch({ [key]: next } as Partial<AnalyticsFilters>)
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background/60",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {!hideDates && (
          <>
            <DateRange
              label="Sent between"
              start={value.dateStart}
              end={value.dateEnd}
              onChange={(start, end) => patch({ dateStart: start, dateEnd: end })}
            />
            <DateRange
              label="Submitted"
              start={value.submissionStart}
              end={value.submissionEnd}
              onChange={(start, end) =>
                patch({ submissionStart: start, submissionEnd: end })
              }
            />
          </>
        )}
        <MultiChip
          label="DPD"
          options={DPD_BUCKETS}
          selected={value.dpdBuckets}
          onToggle={(v) => toggle("dpdBuckets", v)}
        />
        <MultiChip
          label="Nationality"
          options={NATIONALITIES}
          selected={value.nationalities}
          onToggle={(v) => toggle("nationalities", v)}
        />
        <MultiChip
          label="Lender"
          options={LENDERS.map((l) => ({ id: l.id, label: l.shortName }))}
          selected={value.lenderIds}
          onToggle={(v) => toggle("lenderIds", v)}
        />
        <MultiChip
          label="Reachable"
          options={REACHABLE_BUCKETS.map((r) => ({ id: r.id, label: r.label }))}
          selected={value.reachableBuckets}
          onToggle={(v) =>
            toggle(
              "reachableBuckets",
              v as AnalyticsFilters["reachableBuckets"][number],
            )
          }
        />
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
          >
            <X className="h-2.5 w-2.5" /> Clear ({active})
          </button>
        )}
      </div>
    </div>
  )
}

function DateRange({
  label,
  start,
  end,
  onChange,
}: {
  label: string
  start?: string
  end?: string
  onChange: (start: string | undefined, end: string | undefined) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10.5px]">
      <span className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="date"
        value={start ?? ""}
        onChange={(e) => onChange(e.target.value || undefined, end)}
        className="h-5 rounded border border-input bg-transparent px-1 text-[10px]"
      />
      <span className="text-muted-foreground">to</span>
      <input
        type="date"
        value={end ?? ""}
        onChange={(e) => onChange(start, e.target.value || undefined)}
        className="h-5 rounded border border-input bg-transparent px-1 text-[10px]"
      />
    </div>
  )
}

function MultiChip({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: Array<string | { id: string; label: string }>
  selected: string[]
  onToggle: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const normalized: Array<{ id: string; label: string }> = options.map((o) =>
    typeof o === "string" ? { id: o, label: o } : o,
  )
  const count = selected.length
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] font-medium",
          count > 0
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground hover:bg-muted/40",
        )}
      >
        {label}
        {count > 0 && <span className="text-[9px]">· {count}</span>}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-md border border-border bg-popover p-1.5 shadow-lg">
            {normalized.map((o) => {
              const active = selected.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onToggle(o.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px]",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span>{o.label}</span>
                  {active && <span className="text-[10px]">✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
