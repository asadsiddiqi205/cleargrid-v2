"use client"

import { cn } from "@/lib/utils"
import { Calculator } from "lucide-react"

// ---------------------------------------------------------------------------
// FieldPill — small coloured chip used next to a field name to show its data
// type. Adopted from Khalil's SegmentCreate where every selected filter shows
// a pill:
//   Number  → blue
//   Date    → purple
//   String  → green
//   Boolean → orange
//   Enum    → teal (ours, not in Khalil's)
//   Calc    → primary (ClearGrid green)
// ---------------------------------------------------------------------------

export type FieldPillType =
  | "number"
  | "date"
  | "text"
  | "boolean"
  | "enum"
  | "calculated"

const TYPE_STYLES: Record<FieldPillType, string> = {
  number:
    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  date: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  text: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  boolean:
    "bg-orange-500/10 text-orange-400 border-orange-500/20",
  enum: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  calculated:
    "bg-primary/10 text-primary border-primary/20",
}

const TYPE_LABELS: Record<FieldPillType, string> = {
  number: "Number",
  date: "Date",
  text: "String",
  boolean: "Boolean",
  enum: "List",
  calculated: "Calc",
}

export function FieldPill({
  type,
  className,
}: {
  type: FieldPillType
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none border",
        TYPE_STYLES[type],
        className
      )}
    >
      {type === "calculated" && <Calculator className="size-2.5" />}
      {TYPE_LABELS[type]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// CategoryPill — secondary chip that shows what bucket this field belongs to.
// Smaller / dimmer so it doesn't fight the type pill for attention.
// ---------------------------------------------------------------------------

const CATEGORY_STYLES: Record<string, string> = {
  Calculated: "bg-primary/10 text-primary",
  "Borrower Identity": "bg-teal-500/10 text-teal-400",
  "Risk & Collections": "bg-purple-500/10 text-purple-400",
  Financial: "bg-blue-500/10 text-blue-400",
  "PTP & Activity": "bg-amber-500/10 text-amber-400",
  Communications: "bg-cyan-500/10 text-cyan-400",
  "Dispute & Legal": "bg-rose-500/10 text-rose-400",
  Reachability: "bg-emerald-500/10 text-emerald-400",
  "Sub-account": "bg-indigo-500/10 text-indigo-400",
}

export function CategoryPill({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  if (!category) return null
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
        CATEGORY_STYLES[category] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {category}
    </span>
  )
}
