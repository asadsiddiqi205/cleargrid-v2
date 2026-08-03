"use client"

/**
 * Simulation view chip (Part 3.1).
 *
 * Persistent top-right chip that appears whenever a simulation is loaded for
 * the current journey. It surfaces the cohort label + timestamp and provides
 * quick actions: View/Hide overlay, Rerun, Edit cohort, New simulation,
 * Clear simulation.
 */

import * as React from "react"
import { Panel } from "@xyflow/react"
import {
  ChevronDown,
  Eye,
  EyeOff,
  Play,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SimulationResult } from "@/lib/simulation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export function SimulationViewChip({
  simulation,
  overlayHidden,
  onToggleOverlay,
  onRerun,
  onEditCohort,
  onNewSimulation,
  onClearSimulation,
}: {
  simulation: SimulationResult
  overlayHidden: boolean
  onToggleOverlay: () => void
  onRerun: () => void
  onEditCohort: () => void
  onNewSimulation: () => void
  onClearSimulation: () => void
}) {
  return (
    <Panel position="top-right" className="!m-3 !mr-3 !mt-14">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-2 rounded-full border-2 border-dashed border-primary-500/60 bg-neutral-900/95 px-3 py-1.5 text-[11px] shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-900",
            overlayHidden && "border-neutral-700",
          )}
        >
          <Sparkles className="h-3 w-3 text-primary-400" />
          <span className="font-semibold text-foreground">Simulation</span>
          <span className="text-muted-foreground">·</span>
          <span className="max-w-[180px] truncate text-muted-foreground">
            {simulation.cohortLabel}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{timeAgo(simulation.createdAt)}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onToggleOverlay}>
            {overlayHidden ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show overlay
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide overlay
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRerun}>
            <RotateCw className="h-3.5 w-3.5" />
            Rerun
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEditCohort}>
            <Play className="h-3.5 w-3.5" />
            Edit cohort
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onNewSimulation}>
            <Sparkles className="h-3.5 w-3.5" />
            New simulation
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={onClearSimulation}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear simulation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Panel>
  )
}

/**
 * Overlay-mode legend (Part 3.3). Shows a small key when either overlay is
 * active so authors can tell "real" from "simulated" at a glance.
 */
export function OverlayLegend({
  hasSimulation,
  hasAnalytics,
}: {
  hasSimulation: boolean
  hasAnalytics: boolean
}) {
  if (!hasSimulation && !hasAnalytics) return null
  return (
    <Panel position="top-left" className="!m-3 !mt-14">
      <div className="flex items-center gap-3 rounded-md border border-border bg-card/80 px-3 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
        {hasAnalytics && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full bg-primary-500/80" />
            Real (last 7d)
          </span>
        )}
        {hasSimulation && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full border-t-2 border-dashed border-primary-500/60" />
            Simulated
          </span>
        )}
      </div>
    </Panel>
  )
}

export function SimulationEditedBanner({
  onDismiss,
}: {
  onDismiss: () => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning-500/40 bg-warning-500/10 px-3 py-2 text-[11px] text-warning-200">
      <div className="flex-1">
        <p className="font-semibold">Journey has changed since this simulation.</p>
        <p className="mt-0.5 text-warning-200/80">
          Rerun to see updated results — nodes may have been added or removed.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-1 text-warning-300 hover:bg-warning-500/20"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
