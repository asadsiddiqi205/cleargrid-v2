"use client"

/**
 * DemoModeToggle — tiny sidebar chip that flips every `lenderFlag()`
 * check for `tamara_b2b_contacts` globally, so a demo can switch between
 * the consumer (single-contact) and Tamara B2B (multi-contact) flows
 * without navigating to a B2B-configured journey.
 *
 * Persists to localStorage under `cg_demo_flag_overrides`; broadcasts
 * `cg-demo-flags-changed` so open editors re-render.
 */

import * as React from "react"
import { Building2, User } from "lucide-react"
import {
  readDemoFlags,
  writeDemoFlags,
  type LenderFlags,
} from "@/data/lenders"
import { cn } from "@/lib/utils"

export function DemoModeToggle() {
  const [flags, setFlags] = React.useState<Partial<LenderFlags>>({})
  React.useEffect(() => {
    setFlags(readDemoFlags())
    const onChange = () => setFlags(readDemoFlags())
    window.addEventListener("cg-demo-flags-changed", onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener("cg-demo-flags-changed", onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const isB2B = flags.tamara_b2b_contacts === true
  const toggle = () => {
    const next: Partial<LenderFlags> = { ...flags, tamara_b2b_contacts: !isB2B }
    writeDemoFlags(next)
    setFlags(next)
  }

  return (
    <div className="mx-1 mb-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 p-2 group-data-[collapsible=icon]:hidden">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Demo mode
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1 rounded-md border border-sidebar-border bg-sidebar p-0.5">
        <button
          type="button"
          onClick={() => isB2B && toggle()}
          className={cn(
            "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
            !isB2B
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="h-3 w-3" />
          Consumer
        </button>
        <button
          type="button"
          onClick={() => !isB2B && toggle()}
          className={cn(
            "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
            isB2B
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Building2 className="h-3 w-3" />
          Tamara B2B
        </button>
      </div>
      <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
        Flips the multi-contact editors on for every journey, campaign
        and message node in this browser.
      </p>
    </div>
  )
}
