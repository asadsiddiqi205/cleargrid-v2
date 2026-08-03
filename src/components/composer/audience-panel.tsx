"use client"

import * as React from "react"
import Link from "next/link"
import {
  Users,
  User,
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  X,
  MinusCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { formatAED } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { borrowers, type Borrower } from "@/data/borrowers"
import { segments, type Segment } from "@/data/segments"
import { resolveAudience } from "@/lib/resolve-audience"

import type { ComposerState, AudienceRule } from "@/components/composer/composer-view"

interface AudiencePanelProps {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
  selectedBorrower: Borrower
  selectedSegment: Segment
}

const REACH = { email: 92, sms: 98, whatsapp: 76 }

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function riskColor(risk: Borrower["riskScore"]) {
  switch (risk) {
    case "High":
      return "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
    case "Medium":
      return "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
    default:
      return "bg-primary/15 text-primary ring-1 ring-primary/30"
  }
}

export function AudiencePanel({
  state,
  update,
  selectedBorrower,
  selectedSegment,
}: AudiencePanelProps) {
  const [search, setSearch] = React.useState("")
  const [sampleIdx, setSampleIdx] = React.useState(0)

  const filteredBorrowers = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return borrowers
    return borrowers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.emiratesId.toLowerCase().includes(q)
    )
  }, [search])

  const sampleBorrower = borrowers[sampleIdx % borrowers.length]

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-5 p-4">
      {/* ---- Header ---- */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Send to
          </h2>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Pick who will receive this message — one borrower, or a whole group.
        </p>

        <ToggleGroup
          value={[state.mode]}
          onValueChange={(vals: string[]) => {
            const v = vals[vals.length - 1]
            if (v === "single" || v === "segment") update("mode", v)
          }}
          variant="outline"
          className="w-full *:flex-1"
        >
          <ToggleGroupItem value="single" className="flex-1 justify-center">
            <User className="h-3.5 w-3.5" />
            One borrower
          </ToggleGroupItem>
          <ToggleGroupItem value="segment" className="flex-1 justify-center">
            <Users className="h-3.5 w-3.5" />
            A group
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ---- Single borrower mode ---- */}
      {state.mode === "single" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search borrower..."
              className="pl-8"
            />
          </div>

          {search && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/20">
              {filteredBorrowers.slice(0, 6).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    update("selectedBorrowerId", b.id)
                    update("previewBorrowerId", b.id)
                    setSearch("")
                  }}
                  className="flex w-full items-center gap-2 border-b border-border/50 px-2.5 py-1.5 text-left text-xs last:border-b-0 hover:bg-muted"
                >
                  <Avatar size="sm">
                    <AvatarFallback>{initials(b.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {b.name}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {b.dpdBucket} DPD · {formatAED(b.outstanding)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <BorrowerCard borrower={selectedBorrower} />
          <p className="text-[11px] text-muted-foreground">
            The message will only go to this one person. Useful for testing or one-off outreach.
          </p>
        </div>
      )}

      {/* ---- Segment mode ---- */}
      {state.mode === "segment" && (
        <div className="space-y-4">
          <AudienceBuilder
            audience={state.audience}
            onChange={(next) => {
              update("audience", next)
              // Keep the legacy single-segment field pointed at the first include
              // so URL hydration + existing consumers still work.
              if (next.includeSegmentIds[0]) {
                update("selectedSegmentId", next.includeSegmentIds[0])
              }
            }}
          />

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              How many we can reach
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/80">
              % of borrowers with valid contact info per channel
            </p>
            <ReachBar icon={<Mail className="h-3 w-3" />} label="Email" pct={REACH.email} />
            <ReachBar
              icon={<MessageSquare className="h-3 w-3" />}
              label="SMS"
              pct={REACH.sms}
            />
            <ReachBar
              icon={<MessageCircle className="h-3 w-3" />}
              label="WhatsApp"
              pct={REACH.whatsapp}
            />

            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="mt-1 flex cursor-help items-center gap-1.5 text-[11px] text-destructive" />
                }
              >
                <Shield className="h-3 w-3" />
                <span>Do Not Contact list is excluded automatically</span>
              </TooltipTrigger>
              <TooltipContent>
                Borrowers who opted out of contact will be skipped automatically.
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Preview personalised for
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/80">
              Browse a few sample borrowers to see how the message will look for each one.
            </p>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSampleIdx((i) => (i - 1 + borrowers.length) % borrowers.length)}
              >
                <ChevronLeft />
              </Button>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-xs font-medium text-foreground">
                  {sampleBorrower.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {sampleBorrower.dpdBucket} DPD · {formatAED(sampleBorrower.outstanding)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSampleIdx((i) => (i + 1) % borrowers.length)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
    </TooltipProvider>
  )
}

function BorrowerCard({ borrower }: { borrower: Borrower }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2.5">
        <Avatar size="lg">
          <AvatarFallback className="bg-primary/20 text-primary">
            {initials(borrower.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-sm font-semibold text-foreground">
            {borrower.name}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {borrower.emiratesId}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{borrower.dpdBucket} DPD</Badge>
        <Badge variant="outline">{borrower.product}</Badge>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Outstanding
        </div>
        <div className="font-heading text-base font-semibold text-foreground">
          {formatAED(borrower.outstanding)}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="ml-auto text-[10px] text-muted-foreground">4 channels</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Risk Score
        </span>
        <Popover>
          <PopoverTrigger>
            <span
              className={cn(
                "cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold",
                riskColor(borrower.riskScore)
              )}
            >
              {borrower.riskScore}
            </span>
          </PopoverTrigger>
          <PopoverContent side="bottom" className="w-[240px] p-3 text-xs space-y-2">
            <p className="font-semibold text-foreground">Risk Score Breakdown</p>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>DPD Bucket</span><span className="text-foreground">{borrower.dpdBucket}</span></div>
              <div className="flex justify-between"><span>Broken Promises</span><span className="text-foreground">2</span></div>
              <div className="flex justify-between"><span>Recent Reachability</span><span className="text-foreground">3/4 channels</span></div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function ReachBar({
  icon,
  label,
  pct,
}: {
  icon: React.ReactNode
  label: string
  pct: number
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="font-medium text-foreground">{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─────────────────── Audience builder — include / exclude ─────────────────── */

function AudienceBuilder({
  audience,
  onChange,
}: {
  audience: AudienceRule
  onChange: (next: AudienceRule) => void
}) {
  const resolved = React.useMemo(() => resolveAudience(audience, segments), [audience])

  const toggleInclude = (id: string) => {
    const has = audience.includeSegmentIds.includes(id)
    onChange({
      ...audience,
      includeSegmentIds: has
        ? audience.includeSegmentIds.filter((s) => s !== id)
        : [...audience.includeSegmentIds, id],
    })
  }
  const toggleExclude = (id: string) => {
    const has = audience.excludeSegmentIds.includes(id)
    onChange({
      ...audience,
      excludeSegmentIds: has
        ? audience.excludeSegmentIds.filter((s) => s !== id)
        : [...audience.excludeSegmentIds, id],
    })
  }

  return (
    <div className="space-y-4">
      {/* Live resolved count — the money shot at the top */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-primary/80">
              Will receive this
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-heading text-2xl font-bold tabular-nums text-primary">
                {resolved.final.toLocaleString()}
              </span>
              <span className="text-[11px] text-primary/80">
                borrower{resolved.final === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <Users className="h-5 w-5 text-primary/60" />
        </div>
        {(resolved.removedByDedupe > 0 || resolved.removedByExclude > 0) && (
          <div className="mt-2 space-y-0.5 border-t border-primary/20 pt-2 text-[10px] text-muted-foreground">
            {resolved.removedByDedupe > 0 && (
              <div className="flex justify-between">
                <span>Deduped</span>
                <span className="tabular-nums">−{resolved.removedByDedupe.toLocaleString()}</span>
              </div>
            )}
            {resolved.removedByExclude > 0 && (
              <div className="flex justify-between">
                <span>Excluded</span>
                <span className="tabular-nums">−{resolved.removedByExclude.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Include */}
      <SegmentList
        label="Include"
        helper={
          audience.includeSegmentIds.length > 1
            ? "Combine multiple segments"
            : "Pick one or more segments"
        }
        selectedIds={audience.includeSegmentIds}
        onToggle={toggleInclude}
        accent="emerald"
        combiner={
          audience.includeSegmentIds.length > 1 ? (
            <Select
              value={audience.includeCombiner}
              onValueChange={(v) =>
                onChange({
                  ...audience,
                  includeCombiner: (v as "any" | "all") ?? "any",
                })
              }
            >
              <SelectTrigger className="h-7 w-auto text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Users in ANY of these segments</SelectItem>
                <SelectItem value="all">Users in ALL of these segments</SelectItem>
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {/* Exclude */}
      <SegmentList
        label="Exclude"
        helper="Users in ANY of these segments will be dropped"
        selectedIds={audience.excludeSegmentIds}
        onToggle={toggleExclude}
        accent="red"
        combiner={null}
      />

      {/* Remove duplicates toggle */}
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-foreground">Remove duplicates</div>
          <div className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
            Send once even if a borrower is in more than one included segment.
          </div>
        </div>
        <input
          type="checkbox"
          checked={audience.removeDuplicates}
          onChange={(e) => onChange({ ...audience, removeDuplicates: e.target.checked })}
          className="h-4 w-4 shrink-0 accent-emerald-500"
        />
      </label>
    </div>
  )
}

function SegmentList({
  label,
  helper,
  selectedIds,
  onToggle,
  accent,
  combiner,
}: {
  label: string
  helper: string
  selectedIds: string[]
  onToggle: (id: string) => void
  accent: "emerald" | "red"
  combiner: React.ReactNode
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const selected = selectedIds
    .map((id) => segments.find((s) => s.id === id))
    .filter(Boolean) as Segment[]
  const remaining = segments.filter((s) => !selectedIds.includes(s.id))

  const chipCls =
    accent === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/40 bg-red-500/10 text-red-300"

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-[10px] text-muted-foreground/80">{helper}</div>
        </div>
        {combiner}
      </div>

      <div className="space-y-1.5">
        {selected.map((seg) => (
          <div
            key={seg.id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5",
              chipCls,
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium">{seg.name}</div>
              <div className="text-[10px] opacity-70">
                {seg.borrowers.toLocaleString()} borrowers · {seg.type}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggle(seg.id)}
              className="rounded p-0.5 hover:bg-black/20"
              aria-label={`Remove ${seg.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="h-7 w-full text-[11px]" />
          }
        >
          {accent === "red" ? (
            <MinusCircle className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Add segment
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-1">
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {remaining.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                No more segments to add.
              </p>
            ) : (
              remaining.map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => {
                    onToggle(seg.id)
                    setPickerOpen(false)
                  }}
                  className="flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="text-[12px] font-medium text-foreground">
                    {seg.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {seg.borrowers.toLocaleString()} borrowers · {seg.description}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="mt-1 border-t border-border pt-1">
            <Link
              href="/segments/create"
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
              Create new segment
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
