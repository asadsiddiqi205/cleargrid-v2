"use client"

/**
 * DirectionToggle — tiny pill toggle for a group of message-editing fields.
 * Lets authors pin the writing direction to LTR (English) or RTL (Arabic /
 * Hebrew) rather than relying on the browser to guess from the first
 * strong character. `auto` (default) still delegates to the browser.
 *
 * The toggle only sets the `dir` attribute on the inputs it controls —
 * it doesn't translate copy or change stored values, so an author can
 * paste Arabic under EN and see it left-aligned, or English under AR
 * and see it right-aligned, whichever they prefer.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export type TextDir = "auto" | "ltr" | "rtl"

const OPTIONS: Array<{ id: TextDir; label: string; hint: string }> = [
  { id: "auto", label: "Auto", hint: "Auto-detect direction per line" },
  { id: "ltr", label: "EN", hint: "Force left-to-right" },
  { id: "rtl", label: "AR", hint: "Force right-to-left" },
]

interface DirectionToggleProps {
  value: TextDir
  onChange: (dir: TextDir) => void
  className?: string
  label?: string
}

export function DirectionToggle({
  value,
  onChange,
  className,
  label,
}: DirectionToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <div
        role="tablist"
        className="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
      >
        {OPTIONS.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={o.hint}
              onClick={() => onChange(o.id)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
