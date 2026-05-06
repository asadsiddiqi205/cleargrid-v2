"use client"

import * as React from "react"
import {
  Sparkles,
  CheckCircle2,
  Languages,
  Scissors,
  ChevronRight,
  Feather,
  Maximize2,
  Smile,
  Flame,
} from "lucide-react"

import { cn } from "@/lib/utils"

const StretchIcon = Maximize2

export type AIAction =
  | { kind: "improve" }
  | { kind: "fixGrammar" }
  | { kind: "translate"; lang: "arabic" | "english" }
  | { kind: "makeShorter" }
  | { kind: "simplify" }
  | { kind: "changeTone"; tone: "professional" | "friendly" | "firm" | "empathetic" }
  | { kind: "makeLonger" }
  | { kind: "polish" }

interface AICommandMenuProps {
  open: boolean
  onClose: () => void
  onAction: (action: AIAction) => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}

interface MenuSection {
  label: string
  items: MenuItem[]
}

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action?: AIAction
  submenu?: { label: string; action: AIAction }[]
}

const SECTIONS: MenuSection[] = [
  {
    label: "Suggested",
    items: [
      {
        id: "improve",
        label: "Improve writing",
        icon: Sparkles,
        action: { kind: "improve" },
      },
      {
        id: "fix",
        label: "Fix spelling & grammar",
        icon: CheckCircle2,
        action: { kind: "fixGrammar" },
      },
      {
        id: "translate",
        label: "Translate to another language",
        icon: Languages,
        submenu: [
          { label: "Arabic", action: { kind: "translate", lang: "arabic" } },
          { label: "English", action: { kind: "translate", lang: "english" } },
        ],
      },
    ],
  },
  {
    label: "Edit",
    items: [
      {
        id: "shorter",
        label: "Make it shorter",
        icon: Scissors,
        action: { kind: "makeShorter" },
      },
      {
        id: "simplify",
        label: "Use simpler words",
        icon: Feather,
        action: { kind: "simplify" },
      },
      {
        id: "tone",
        label: "Change the tone",
        icon: Smile,
        submenu: [
          { label: "Professional", action: { kind: "changeTone", tone: "professional" } },
          { label: "Friendly", action: { kind: "changeTone", tone: "friendly" } },
          { label: "Firm", action: { kind: "changeTone", tone: "firm" } },
          { label: "Empathetic", action: { kind: "changeTone", tone: "empathetic" } },
        ],
      },
      {
        id: "longer",
        label: "Make it longer",
        icon: StretchIcon,
        action: { kind: "makeLonger" },
      },
      {
        id: "polish",
        label: "Polish writing",
        icon: Flame,
        action: { kind: "polish" },
      },
    ],
  },
]

export function AICommandMenu({ open, onClose, onAction, anchorRef }: AICommandMenuProps) {
  const [query, setQuery] = React.useState("")
  const [openSub, setOpenSub] = React.useState<string | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setOpenSub(null)
      return
    }
    window.setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  // Dismiss on outside click / Escape
  React.useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open, anchorRef, onClose])

  if (!open) return null

  const q = query.trim().toLowerCase()
  const sections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !q || i.label.toLowerCase().includes(q)),
  })).filter((s) => s.items.length > 0)

  const handleAction = (action: AIAction) => {
    onAction(action)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full right-0 z-50 mb-2 w-72 origin-bottom-right animate-in fade-in-0 zoom-in-95 rounded-xl bg-popover p-2 text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-2 pb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI anything..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-1 max-h-80 overflow-y-auto">
        {sections.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            No results
          </div>
        )}
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon
              const isSub = Boolean(item.submenu)
              const subOpen = openSub === item.id
              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSub) {
                        setOpenSub((cur) => (cur === item.id ? null : item.id))
                      } else if (item.action) {
                        handleAction(item.action)
                      }
                    }}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      subOpen && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="flex-1">{item.label}</span>
                    {isSub && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  </button>
                  {isSub && subOpen && item.submenu && (
                    <div className="absolute left-full top-0 ml-1 min-w-[140px] rounded-lg bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/10">
                      {item.submenu.map((sub) => (
                        <button
                          key={sub.label}
                          type="button"
                          onClick={() => handleAction(sub.action)}
                          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
