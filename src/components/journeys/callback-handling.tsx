"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronRight,
  PhoneIncoming,
  Play,
  Building2,
  Sun,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { simulateCallbackCommit } from "@/components/journeys/callback-runtime"

/**
 * Part 1 — Callback Handling section on the AI Call action node.
 *
 * Sits beneath the ClearVoice project picker, default collapsed.
 *
 * Controls:
 *   1. Allow callback capture (toggle, default on)
 *   2. Compliance rules (read-only, from journey settings, hard-locked)
 *   3. Max callbacks per borrower per journey (number, default 3)
 *   4. If callback time already passed (radio: fire / skip)
 *
 * When (1) is OFF, controls 2-4 render muted and disabled.
 *
 * Below the controls is a "Simulate callback commit" dev button (Part 3 stub)
 * that pretends the human reviewer just confirmed a callback. It schedules a
 * mock callback into the runtime stub so the monitoring view can show it.
 */
export function CallbackHandlingSection({
  data,
  update,
}: {
  data: Record<string, unknown>
  update: (key: string, value: unknown) => void
}) {
  const [expanded, setExpanded] = React.useState(false)

  const enabled = (data.callbackEnabled as boolean) ?? true
  const maxCallbacks = (data.callbackMaxPerBorrower as number) ?? 3
  const latePolicy = (data.callbackLatePolicy as string) ?? "fire_now"

  return (
    <div className="rounded-lg border border-border bg-card/40">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <PhoneIncoming className="h-3.5 w-3.5 text-primary-400" />
        <span className="flex-1 text-xs font-semibold text-foreground">Callback Handling</span>
        {enabled ? (
          <span className="rounded bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-400">
            On
          </span>
        ) : (
          <span className="rounded bg-neutral-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
            Off
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Body */}
      {expanded && (
        <div className="space-y-4 border-t border-border p-3">
          {/* 1. Allow callback capture */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Allow callback capture</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                When on, the AI attempts to capture borrower-requested callback intent during this call.
                When off, callback capture is disabled for this node — useful for final-warning or
                legal-hold calls where callbacks aren&apos;t appropriate.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(val) => update("callbackEnabled", val)}
              size="sm"
            />
          </div>

          {/* Disabled-controls wrapper */}
          <div className={cn("space-y-4", !enabled && "opacity-50 pointer-events-none")}>
            {/* 2. Compliance rules (read-only, sourced from lender config) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Compliance rules
                </p>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-300"
                  title="Compliance settings come from the lender configuration"
                >
                  <Building2 className="h-2.5 w-2.5" />
                  Configured at lender level
                </span>
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-2.5">
                <ComplianceRow label="DND hours" value="21:00 – 08:00 borrower-local" tag="holds" />
                <ComplianceRow label="Contact window" value="09:00 – 19:00 borrower-local" tag="holds" />
                <ComplianceRow label="DNC list" value="Lender + Regulatory" tag="cancels" last />
                <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                  Hold = re-evaluates until cleared, then fires. Cancel = scheduled callback is
                  terminated immediately.
                </p>
              </div>
            </div>

            {/* 2b. Max hold duration — fixed at end of working day */}
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-2.5 py-2">
              <Sun className="h-3.5 w-3.5 shrink-0 text-warning-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground">
                  Hold until end of current working day
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                  If DND or contact window is still blocking by close of business, the callback exits
                  with outcome &quot;Errored&quot; and is logged. DNC cancels immediately, never holds.
                </p>
              </div>
            </div>

            {/* 3. Max callbacks per borrower */}
            <div>
              <p className="mb-1 text-xs font-medium text-foreground">
                Max callbacks per borrower (this journey)
              </p>
              <Input
                type="number"
                value={maxCallbacks}
                min={1}
                max={10}
                onChange={(e) => {
                  const v = Math.min(Math.max(Number(e.target.value) || 1, 1), 10)
                  update("callbackMaxPerBorrower", v)
                }}
                className="h-7 w-24 text-xs"
              />
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Caps how many times a single borrower can request and receive callbacks within one
                journey instance. Prevents loops where every callback also captures a new callback.
              </p>
            </div>

            {/* 4. Late-commit policy */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground">
                If callback time has already passed when committed
              </p>
              <div className="space-y-1.5">
                <RadioRow
                  checked={latePolicy === "fire_now"}
                  label="Fire immediately at next allowed window"
                  onClick={() => update("callbackLatePolicy", "fire_now")}
                />
                <RadioRow
                  checked={latePolicy === "skip"}
                  label="Skip and log"
                  onClick={() => update("callbackLatePolicy", "skip")}
                />
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                Handles late reviewer confirms — when a reviewer approves a callback after its
                requested time has already passed.
              </p>
            </div>
          </div>

          {/* Dev / simulation button */}
          <div className="border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!enabled}
              onClick={() => {
                const result = simulateCallbackCommit({
                  nodeData: data,
                  fireAtIso: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
                })
                if (result.scheduled) {
                  toast.success("Mock callback scheduled", {
                    description: `Will fire ${new Date(result.fireAtIso).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`,
                  })
                } else {
                  toast.info(`Callback not scheduled — ${result.reason}`)
                }
              }}
            >
              <Play className="h-3 w-3" />
              Simulate callback commit
            </Button>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Dev tool: pretends the human reviewer just confirmed a callback. Schedules a mock
              callback 30 min from now so the monitoring view can show it.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ComplianceRow({
  label,
  value,
  tag,
  last,
}: {
  label: string
  value: string
  tag: "holds" | "cancels"
  last?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-1.5",
        !last && "border-b border-border/40",
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-medium text-foreground">{value}</span>
      </div>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider",
          tag === "holds" && "bg-warning-500/15 text-warning-400",
          tag === "cancels" && "bg-error-500/15 text-error-400",
        )}
      >
        {tag === "holds" ? "Holds when blocked" : "Cancels when blocked"}
      </span>
    </div>
  )
}

function RadioRow({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors",
        checked
          ? "border-primary-500/40 bg-primary-500/10 text-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:border-border/80 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-3 w-3 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary-400 bg-primary-500" : "border-neutral-600",
        )}
      >
        {checked && <span className="h-1 w-1 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  )
}
