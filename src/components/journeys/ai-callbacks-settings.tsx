"use client"

import * as React from "react"
import { PhoneIncoming, Building2, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Part 2 — Journey Settings "AI Callbacks" section.
 *
 * Sits inside the Journey Settings sheet, beneath Exit Triggers.
 *
 * Five controls (compliance comes from lender config, not journey):
 *   1. DND hours       (read-only, "Configured at lender level")
 *   2. Contact window  (read-only, "Configured at lender level")
 *   3. DNC list        (read-only, "Configured at lender level") — hard cancel, not hold
 *   4. 7-in-7 cap behavior (radio: Hold-until-clears / Exit-and-log)
 *   5. Max hold duration before exit (number + unit, default 48 hours)
 */

export interface CallbackSettings {
  sevenInSevenBehavior: "hold" | "exit"
  maxHoldDuration: number
  maxHoldUnit: "hours" | "days"
}

export const DEFAULT_CALLBACK_SETTINGS: CallbackSettings = {
  sevenInSevenBehavior: "hold",
  maxHoldDuration: 48,
  maxHoldUnit: "hours",
}

interface Props {
  hasAiCallNode: boolean
  settings: CallbackSettings
  onChange: (next: CallbackSettings) => void
}

export const AICallbacksSettings = React.forwardRef<HTMLDivElement, Props>(function AICallbacksSettings(
  { hasAiCallNode, settings, onChange },
  ref,
) {
  return (
    <div
      ref={ref}
      className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4 scroll-mt-4"
      id="journey-settings-ai-callbacks"
    >
      <div>
        <div className="flex items-center gap-2">
          <PhoneIncoming className="h-3.5 w-3.5 text-primary-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            AI Callbacks
          </h4>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Compliance and behavior settings for callbacks scheduled by AI Call nodes in this journey.
        </p>
      </div>

      {!hasAiCallNode && (
        <div className="flex items-start gap-2 rounded-md border border-neutral-700 bg-neutral-800/40 p-2.5 text-[11px] text-neutral-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            This journey has no AI Call nodes. These settings will apply if you add one later.
          </span>
        </div>
      )}

      {/* 1. DND hours — read-only from lender config */}
      <ComplianceField
        label="DND hours"
        value="21:00 – 08:00 borrower-local"
        behavior="holds"
        helper="Compliance settings come from the lender configuration and cannot be overridden at the journey level."
      />

      {/* 2. Contact window — read-only from lender config */}
      <ComplianceField
        label="Contact window"
        value="09:00 – 19:00 borrower-local"
        behavior="holds"
      />

      {/* 3. DNC list — read-only, hard cancel */}
      <ComplianceField
        label="DNC list"
        value="Lender DNC + Regulatory DNC"
        behavior="cancels"
        helper="DNC is a hard cancel — if the borrower is on the DNC list at fire time, the scheduled callback cancels and is logged. Unlike DND or 7-in-7, it never holds."
      />

      {/* 4. 7-in-7 cap behavior */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[11px] font-medium text-foreground">
          If the 7-in-7 cap blocks a scheduled callback
        </p>
        <div className="space-y-1.5">
          <RadioRow
            checked={settings.sevenInSevenBehavior === "hold"}
            label="Hold until the cap clears, then fire"
            onClick={() => onChange({ ...settings, sevenInSevenBehavior: "hold" })}
          />
          <RadioRow
            checked={settings.sevenInSevenBehavior === "exit"}
            label="Exit and log if the cap won't clear within the max hold duration"
            onClick={() => onChange({ ...settings, sevenInSevenBehavior: "exit" })}
          />
        </div>
      </div>

      {/* 5. Max hold duration */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[11px] font-medium text-foreground">Max hold duration before exit</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={settings.maxHoldUnit === "hours" ? 336 : 14}
            value={settings.maxHoldDuration}
            onChange={(e) => {
              const cap = settings.maxHoldUnit === "hours" ? 336 : 14
              const v = Math.min(Math.max(Number(e.target.value) || 1, 1), cap)
              onChange({ ...settings, maxHoldDuration: v })
            }}
            className="h-7 w-24 text-xs"
          />
          <select
            value={settings.maxHoldUnit}
            onChange={(e) =>
              onChange({ ...settings, maxHoldUnit: e.target.value as "hours" | "days" })
            }
            className="h-7 w-24 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          If the compliance guard (DND, contact window, 7-in-7) is still blocking the callback
          after this duration, the callback exits with outcome &quot;Errored&quot; and a logged reason.
          DNC is not subject to this hold — DNC cancels immediately.
        </p>
      </div>
    </div>
  )
})

function ComplianceField({
  label,
  value,
  behavior,
  helper,
}: {
  label: string
  value: string
  behavior: "holds" | "cancels"
  helper?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-foreground">{label}</p>
        <span
          className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-300"
          title="Configured at lender level"
        >
          <Building2 className="h-2.5 w-2.5" />
          Configured at lender level
        </span>
      </div>
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5",
          behavior === "cancels" ? "border-error-500/30 bg-error-500/5" : "border-border bg-card/40",
        )}
      >
        <span className="text-[11px] text-foreground">{value}</span>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider",
            behavior === "holds" && "bg-warning-500/15 text-warning-400",
            behavior === "cancels" && "bg-error-500/15 text-error-400",
          )}
        >
          {behavior === "holds" ? "Holds when blocked" : "Cancels when blocked"}
        </span>
      </div>
      {helper && <p className="text-[10px] leading-relaxed text-muted-foreground">{helper}</p>}
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
      <span className="flex-1">{label}</span>
    </button>
  )
}
