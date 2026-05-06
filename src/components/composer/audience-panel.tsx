"use client"

import * as React from "react"
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
  AlertTriangle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

import { formatAED } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { borrowers, type Borrower } from "@/data/borrowers"
import { segments, type Segment } from "@/data/segments"
import { strategies, type Strategy } from "@/data/strategies"

import type { ComposerState } from "@/components/composer/composer-view"

interface AudiencePanelProps {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
  selectedBorrower: Borrower
  selectedSegment: Segment
  strategy: Strategy | undefined
}

const REACH = { email: 92, sms: 98, whatsapp: 76, voice: 84 }

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
  strategy,
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

  const overlap = selectedSegment.id === "seg-001" // mock overlap warning on first segment

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
        <div className="space-y-3">
          <Select
            value={state.selectedSegmentId}
            onValueChange={(v) => update("selectedSegmentId", v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select segment" />
            </SelectTrigger>
            <SelectContent>
              {segments.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-heading text-sm font-semibold text-foreground">
                  {selectedSegment.name}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {selectedSegment.description}
                </div>
              </div>
              <Badge
                variant={selectedSegment.type === "Dynamic" ? "default" : "secondary"}
                className="shrink-0"
              >
                {selectedSegment.type}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              {selectedSegment.borrowers.toLocaleString()} borrowers
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                How many we can reach
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                % of borrowers in this group with valid contact info per channel
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
              <ReachBar icon={<Phone className="h-3 w-3" />} label="Voice" pct={REACH.voice} />
            </div>

            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex cursor-help items-center gap-1.5 text-[11px] text-destructive" />
                }
              >
                <Shield className="h-3 w-3" />
                <span>39 excluded (Do Not Contact list)</span>
              </TooltipTrigger>
              <TooltipContent>
                Borrowers who opted out of contact will be skipped automatically.
              </TooltipContent>
            </Tooltip>

            {overlap && (
              <div className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Overlaps with <span className="font-medium">PTP Broken Promise</span>{" "}
                  campaign (17 borrowers)
                </span>
              </div>
            )}
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

      {/* ---- Context section ---- */}
      <div className="space-y-3 border-t border-border pt-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tone &amp; rules
        </h2>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Optional. Tell the AI how to write and how strictly to follow compliance rules.
        </p>

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Writing style
          </Label>
          <Select
            value={state.strategyId || "__none__"}
            onValueChange={(v) =>
              update("strategyId", v === "__none__" ? "" : v ?? "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {strategy && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {strategy.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            How strict on compliance
          </Label>
          <Select
            value={state.compliance}
            onValueChange={(v) =>
              update("compliance", ((v ?? "standard") as ComposerState["compliance"]))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard — recommended</SelectItem>
              <SelectItem value="strict">Strict — extra cautious</SelectItem>
              <SelectItem value="lenient">Lenient — fewer guardrails</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] leading-relaxed text-muted-foreground/80">
            Controls how cautiously the message follows your contact rules.
          </p>
        </div>
      </div>
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
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            riskColor(borrower.riskScore)
          )}
        >
          {borrower.riskScore}
        </span>
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
