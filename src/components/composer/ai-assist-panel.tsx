"use client"

import * as React from "react"
import {
  Sparkles,
  Check,
  Minimize2,
  Briefcase,
  Smile,
  Shield,
  TrendingUp,
  Type,
  Languages,
  Maximize2,
  User,
  Heart,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { aiAssistVariants } from "@/data/composer-ai-variants"

export interface AiAssistAction {
  id: keyof typeof aiAssistVariants | string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export const AI_ASSIST_ACTIONS: AiAssistAction[] = [
  { id: "improve", label: "Improve Writing", description: "Make it clearer and more polished", icon: Sparkles },
  { id: "grammar", label: "Fix Grammar", description: "Correct spelling and grammar", icon: Check },
  { id: "shorter", label: "Make Shorter", description: "Trim to the essentials", icon: Minimize2 },
  { id: "professional", label: "More Professional", description: "Formal business tone", icon: Briefcase },
  { id: "friendly", label: "More Friendly", description: "Warm and approachable", icon: Smile },
  { id: "firmer", label: "Make Firmer", description: "Direct and assertive", icon: Shield },
  { id: "persuasive", label: "More Persuasive", description: "Highlight benefits", icon: TrendingUp },
  { id: "simplify", label: "Simplify Language", description: "Plain words, short sentences", icon: Type },
  { id: "translate", label: "Translate", description: "Translate to Arabic", icon: Languages },
  { id: "expand", label: "Expand", description: "Add more detail and context", icon: Maximize2 },
  { id: "personalize", label: "Personalize More", description: "Use borrower context", icon: User },
  { id: "empathetic", label: "More Empathetic", description: "Compassionate and supportive", icon: Heart },
]

interface AiAssistPanelProps {
  open: boolean
  onClose: () => void
  onAction: (actionId: string) => void
}

/**
 * Right-side AI assist panel for the inline composer mode.
 *
 * 12 quick actions in a vertical list. Each action calls onAction(id);
 * the parent looks up the variant pool and applies it via the existing
 * Apple-style fade animation in editor-panel.tsx.
 */
export function AiAssistPanel({ open, onClose, onAction }: AiAssistPanelProps) {
  if (!open) return null

  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col overflow-hidden rounded-lg border border-purple-500/30 bg-purple-500/5"
      )}
    >
      <div className="flex items-center justify-between border-b border-purple-500/20 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-[11px] font-semibold text-purple-300">
            AI Writing Assistant
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI assist"
          className="rounded p-0.5 text-muted-foreground hover:bg-accent"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 overflow-y-auto p-1.5">
        {AI_ASSIST_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(action.id)}
              className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-purple-500/10"
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
              <div className="min-w-0">
                <div className="truncate text-[11px] font-medium text-foreground">
                  {action.label}
                </div>
                <div className="truncate text-[9px] text-muted-foreground/80">
                  {action.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-t border-purple-500/20 px-3 py-2 text-[9px] leading-relaxed text-muted-foreground/70">
        Each action rewrites the email body. Use Undo from the editor menu
        to revert.
      </div>
    </aside>
  )
}
