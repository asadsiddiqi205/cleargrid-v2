"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Library, Target } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/templates/modules", label: "Saved modules", icon: Library },
  { href: "/strategies", label: "Playbooks", icon: Target },
]

export function LibraryTabs() {
  const pathname = usePathname()
  return (
    <div className="border-b border-border bg-zinc-950/60">
      <div className="flex items-center gap-1 px-4">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-emerald-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
