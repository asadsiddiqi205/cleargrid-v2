"use client"

import * as React from "react"
import {
  Sparkles,
  CheckCircle2,
  Scissors,
  Maximize2,
  Smile,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { AIAction } from "@/components/composer/ai-command-menu"

export interface SelectionToolbarProps {
  visible: boolean
  x: number
  y: number
  onAction: (action: AIAction) => void
}

const items: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  action: AIAction
}[] = [
  { icon: Sparkles, label: "Improve", action: { kind: "improve" } },
  { icon: CheckCircle2, label: "Fix grammar", action: { kind: "fixGrammar" } },
  { icon: Scissors, label: "Shorter", action: { kind: "makeShorter" } },
  { icon: Maximize2, label: "Longer", action: { kind: "makeLonger" } },
  { icon: Smile, label: "Tone", action: { kind: "changeTone", tone: "professional" } },
]

export function SelectionToolbar({ visible, x, y, onAction }: SelectionToolbarProps) {
  if (!visible) return null
  return (
    <div
      className={cn(
        "pointer-events-auto fixed z-50 flex items-center gap-0.5 rounded-lg bg-popover p-1 shadow-2xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95"
      )}
      style={{ top: y, left: x, transform: "translate(-50%, -100%)" }}
    >
      {items.map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onAction(action)
          }}
          title={label}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="h-3 w-3 text-primary" />
          {label}
        </button>
      ))}
    </div>
  )
}
