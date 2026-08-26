"use client"

/**
 * RunPicker — a small popover pinned to the top-right of the canvas next to
 * the Analytics range chip. Lets the author pick a specific journey run;
 * the picked run drives the Analytics tab inside each node config panel.
 */

import * as React from "react"
import { BarChart3, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  listRuns,
  formatRunAge,
  type JourneyRun,
} from "@/data/journey-runs"

interface RunPickerProps {
  journeyId: string
  value: string | null
  onChange: (runId: string | null) => void
}

export function RunPicker({ journeyId, value, onChange }: RunPickerProps) {
  const [open, setOpen] = React.useState(false)
  const runs = React.useMemo(() => listRuns(journeyId), [journeyId])
  const selected = runs.find((r) => r.id === value) ?? null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-md border bg-card/80 px-2 text-[10px] font-medium backdrop-blur-sm transition-colors",
          selected
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border text-foreground hover:bg-muted",
        )}
        title="Pick a run to analyze"
      >
        <BarChart3 className="h-3 w-3" />
        {selected ? (
          <>
            <span className="max-w-[9rem] truncate">{selected.label}</span>
            <span className="text-[9px] opacity-70">· {formatRunAge(selected)}</span>
          </>
        ) : (
          <span>Analytics · pick run</span>
        )}
        <ChevronDown className="h-2.5 w-2.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-[280px] rounded-md border border-border bg-popover shadow-lg">
            <div className="border-b border-border px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent runs · {runs.length}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                Analytics on each node reflects the selected run.
              </p>
            </div>
            <ul className="max-h-72 overflow-y-auto p-1">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
                    value === null && "bg-muted/50",
                  )}
                >
                  <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                    Aggregate (no run selected)
                  </span>
                  {value === null && <Check className="h-3 w-3 text-primary" />}
                </button>
              </li>
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(run.id)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-muted/60",
                      value === run.id && "bg-primary/[0.08]",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {run.label}
                        </span>
                        <RunStatusChip run={run} />
                      </div>
                      <div className="mt-0.5 text-[9px] text-muted-foreground tabular-nums">
                        {formatRunAge(run)} · {run.enrolled.toLocaleString()} enrolled /{" "}
                        {run.resolved.toLocaleString()} resolved
                      </div>
                    </div>
                    {value === run.id && <Check className="h-3 w-3 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function RunStatusChip({ run }: { run: JourneyRun }) {
  return (
    <span
      className={cn(
        "rounded px-1 py-px text-[8px] font-medium uppercase tracking-wider",
        run.status === "completed" && "bg-primary/15 text-primary",
        run.status === "running" && "bg-info-500/15 text-info-300",
        run.status === "failed" && "bg-error-500/15 text-error-300",
        run.status === "queued" && "bg-muted text-neutral-300",
      )}
    >
      {run.status}
    </span>
  )
}
