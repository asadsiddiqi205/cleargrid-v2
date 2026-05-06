"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * A small helper that wraps an abbreviation with an explanatory tooltip.
 * Use for collections jargon like DPD, RPC, NRPC, DNC, PTP, 7-in-7, etc.
 *
 * <TermTooltip term="DPD" definition="Days past due — how long the payment is overdue." />
 */
export function TermTooltip({
  term,
  definition,
  className,
  children,
}: {
  term?: string
  definition: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              className={cn(
                "cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm",
                className,
              )}
            />
          }
        >
          {children ?? term}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-0.5">
            {term && <div className="font-semibold">{term}</div>}
            <div className="text-[11px] opacity-90 leading-relaxed">
              {definition}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Common definitions used across the app. */
export const TERM_DEFINITIONS = {
  DPD: "Days past due — how long the payment has been overdue.",
  RPC: "Right-party contact — we reached the actual borrower.",
  NRPC: "Non-right-party contact — we reached someone, but not the borrower.",
  DNC: "Do not contact — the borrower has opted out or is on a block list.",
  PTP: "Promise to pay — the borrower agreed to pay by a specific date.",
  BPD: "Broken promise to pay — the borrower missed an agreed PTP date.",
  "7-in-7": "Regulatory cap: no more than 7 contact attempts per 7-day window.",
  FrequencyCap: "The maximum number of messages we send a borrower in a given time window.",
  FourEye: "Four-eye check — a second person must approve before an action is applied.",
} as const
