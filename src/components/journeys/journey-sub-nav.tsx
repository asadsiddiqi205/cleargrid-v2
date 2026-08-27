"use client"

/**
 * JourneySubNav — a shared tab strip pinned to the top of every page under
 * `/journeys/[id]/*`. Makes it obvious that Editor / Validator / Borrowers /
 * Settings / Report all belong to the same journey and are one click apart.
 *
 * Rendered inside every journey-scoped page (including the editor toolbar).
 */

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Boxes, Layers, ClipboardCheck, Users, Settings, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { journeysList } from "@/data/journeys"

interface JourneySubNavProps {
  journeyId: string
  compact?: boolean
}

const TABS = [
  { id: "editor", label: "Editor", href: "", icon: Boxes },
  { id: "validator", label: "Validator", href: "/validator", icon: ClipboardCheck },
  { id: "borrowers", label: "Borrowers", href: "/borrowers", icon: Users },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
  { id: "report", label: "Report", href: "/report", icon: BarChart3 },
] as const

export function JourneySubNav({ journeyId, compact = false }: JourneySubNavProps) {
  const pathname = usePathname() ?? ""
  const journey = journeysList.find((j) => j.id === journeyId)

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur",
        compact && "px-3 py-1.5",
      )}
    >
      {!compact && (
        <div className="mr-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Layers className="h-3 w-3 text-primary" />
          <span className="max-w-[220px] truncate font-medium text-foreground">
            {journey?.name ?? journeyId}
          </span>
        </div>
      )}
      <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/[0.04] p-0.5">
        {TABS.map((t) => {
          const href = `/journeys/${journeyId}${t.href}`
          const active =
            t.href === ""
              ? pathname === `/journeys/${journeyId}`
              : pathname.startsWith(`/journeys/${journeyId}${t.href}`)
          const Icon = t.icon
          return (
            <Link
              key={t.id}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
