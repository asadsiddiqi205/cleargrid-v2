"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatNumber } from "@/lib/formatters"
import { AlertTriangle, Users, Zap, Lock, ArrowRight } from "lucide-react"
import { useLender } from "@/contexts/lender-context"
import { cn } from "@/lib/utils"
import { borrowers } from "@/data/borrowers"
import { formatAED } from "@/lib/formatters"

// ---------------------------------------------------------------------------
// Deterministic "random" number generator seeded by filter count + lender id.
// Produces consistent values for the same inputs so the UI doesn't flicker,
// but shifts as lenders change so the preview feels lender-aware.
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function computePreviewNumbers(filterCount: number, seedExtra: number, base: number) {
  const rand = seededRandom(filterCount * 7 + seedExtra + 42)

  let total = base
  for (let i = 0; i < filterCount; i++) {
    const reduction = 0.75 + rand() * 0.1 // 75-85% retained per filter
    total = Math.round(total * reduction)
  }
  total = Math.max(total, 23) // floor

  const withValidPhone = Math.round(total * (0.87 + rand() * 0.04))
  const dncExcluded = Math.round(total * (0.03 + rand() * 0.02))
  const estimatedReachable = withValidPhone - dncExcluded

  const aiCampaignOverlap = Math.round(
    estimatedReachable * (0.1 + rand() * 0.04)
  )
  const humanCampaignOverlap = Math.round(
    estimatedReachable * (0.07 + rand() * 0.03)
  )
  const totalCampaignExcluded = aiCampaignOverlap + humanCampaignOverlap

  const netReachable = estimatedReachable - totalCampaignExcluded

  return {
    total,
    withValidPhone,
    dncExcluded,
    estimatedReachable,
    aiCampaignOverlap,
    humanCampaignOverlap,
    totalCampaignExcluded,
    netReachable,
  }
}

// ---------------------------------------------------------------------------
// Donut / Ring chart
// ---------------------------------------------------------------------------

function DonutChart({
  value,
  max,
  label,
  pulsing,
}: {
  value: number
  max: number
  label: string
  pulsing: boolean
}) {
  const size = 150
  const strokeWidth = 11
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / Math.max(max, 1), 1)
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span
          key={value}
          className={cn(
            "text-3xl font-bold text-foreground tabular-nums",
            pulsing && "animate-in zoom-in-95 duration-300"
          )}
        >
          {formatNumber(value)}
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export interface SegmentPreviewProps {
  filterCount: number
  segmentType: "static" | "dynamic"
}

export function SegmentPreview({ filterCount, segmentType }: SegmentPreviewProps) {
  const { selectedLender, selectedLenderId } = useLender()

  // Seed the preview so numbers shift when the active lender changes.
  const { seedExtra, basePopulation, scopeLabel } = React.useMemo(() => {
    if (selectedLender) {
      return {
        seedExtra: hashString(selectedLender.id),
        basePopulation: Math.max(
          100,
          Math.round(selectedLender.borrowerCount * 0.015)
        ),
        scopeLabel: selectedLender.shortName,
      }
    }
    return {
      seedExtra: 0,
      basePopulation: 981,
      scopeLabel: "All Lenders",
    }
  }, [selectedLender])

  const nums = React.useMemo(
    () => computePreviewNumbers(filterCount, seedExtra, basePopulation),
    [filterCount, seedExtra, basePopulation]
  )

  // Pulse the live count whenever inputs change.
  const [pulseKey, setPulseKey] = React.useState(0)
  React.useEffect(() => {
    setPulseKey((k) => k + 1)
  }, [filterCount, selectedLenderId])

  return (
    <Card className="sticky top-6 overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Live count
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Real-time count of borrowers matching your filters
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {segmentType === "dynamic" ? (
              <Zap className="size-2.5" />
            ) : (
              <Lock className="size-2.5" />
            )}
            {segmentType === "dynamic" ? "Auto-updating" : "Fixed"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Scope strip */}
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scope
          </span>
          <span className="text-xs font-medium text-foreground">
            {scopeLabel}
          </span>
        </div>

        {/* Donut chart */}
        <div className="flex justify-center relative" key={pulseKey}>
          <DonutChart
            value={nums.netReachable}
            max={nums.total}
            label="we can reach"
            pulsing
          />
        </div>

        {/* Stats list */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Borrowers matching filters
            </span>
            <span className="font-semibold tabular-nums">
              {formatNumber(nums.total)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              With a valid phone number
            </span>
            <span className="font-semibold tabular-nums">
              {formatNumber(nums.withValidPhone)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">On Do Not Contact list</span>
            <span className="font-semibold text-red-400 tabular-nums">
              -{formatNumber(nums.dncExcluded)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reachable today</span>
            <span className="font-semibold tabular-nums">
              {formatNumber(nums.estimatedReachable)}
            </span>
          </div>
        </div>

        {/* Channel reachability bars */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Channel reachability
          </p>
          <ReachabilityBar
            label="Phone"
            value={Math.round(nums.estimatedReachable * 0.91)}
            total={nums.total}
            color="bg-emerald-500"
          />
          <ReachabilityBar
            label="SMS"
            value={Math.round(nums.estimatedReachable * 0.88)}
            total={nums.total}
            color="bg-purple-500"
          />
          <ReachabilityBar
            label="Email"
            value={Math.round(nums.estimatedReachable * 0.74)}
            total={nums.total}
            color="bg-blue-500"
          />
          <ReachabilityBar
            label="WhatsApp"
            value={Math.round(nums.estimatedReachable * 0.66)}
            total={nums.total}
            color="bg-green-500"
          />
        </div>

        {/* Campaign overlap warning */}
        <div className="rounded-lg border-l-4 border-l-amber-500 bg-amber-500/5 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-amber-500">
              Already in another campaign
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            These borrowers are already getting messages from other active
            campaigns. They&apos;ll be skipped here so you don&apos;t
            over-contact them.
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                In AI voice campaigns
              </span>
              <span className="font-semibold text-red-400 tabular-nums">
                -{formatNumber(nums.aiCampaignOverlap)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                In agent-led campaigns
              </span>
              <span className="font-semibold text-red-400 tabular-nums">
                -{formatNumber(nums.humanCampaignOverlap)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total skipped</span>
              <span className="font-semibold text-red-400 tabular-nums">
                -{formatNumber(nums.totalCampaignExcluded)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Net Reachable summary */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">
              You can message
            </span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {formatNumber(nums.netReachable)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            After Do Not Contact and other-campaign skips
          </p>
        </div>

        {/* Static segment note */}
        {segmentType === "static" && (
          <p className="text-xs text-amber-400/80 bg-amber-500/5 rounded-md px-2.5 py-1.5">
            Fixed lists are locked in at creation time and won&apos;t update
            later.
          </p>
        )}

        {/* Timestamp */}
        <p className="text-[11px] text-muted-foreground/60">
          Based on live data as of Apr 6, 2026, 5:01 PM
        </p>

        <Separator />

        {/* Sample borrower rows */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sample matching borrowers
          </p>
          <div className="space-y-1">
            {borrowers.slice(0, 8).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="truncate font-medium">{b.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                  <span className="tabular-nums">{b.dpdBucket} DPD</span>
                  <span className="tabular-nums">{formatAED(b.outstanding)}</span>
                </div>
              </div>
            ))}
          </div>
          <a
            href="/borrowers"
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors pt-0.5"
          >
            See all matching borrowers
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Channel reachability bar (kept from our build)
// ---------------------------------------------------------------------------

function ReachabilityBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = Math.round((value / Math.max(total, 1)) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">
          {formatNumber(value)}{" "}
          <span className="text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
