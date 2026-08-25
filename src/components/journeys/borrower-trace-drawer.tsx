"use client"

/**
 * BorrowerTraceDrawer — the single-borrower journey trace surface.
 *
 * Reachable from two entry points (per the PRD):
 *   1. Borrower profile → "Journeys" section → Trace →
 *   2. Journey detail page → "Trace a borrower" picker
 *
 * Renders two views side-by-side (or stacked on narrow screens):
 *   - Left: a mini journey map with the borrower's route highlighted in
 *     emerald. Nodes they visited get filled swatches; the current node
 *     pulses; the branch taken at each split is drawn as a bold edge.
 *   - Right: a step-by-step timeline. Each step shows node type,
 *     timestamp, and outcome — message events, branch taken, wait
 *     duration, call outcome, conversion events fired within attribution.
 *
 * The map is a purpose-built SVG rather than an embedded ReactFlow instance
 * — this component ships everywhere (journey page, borrower profile, report
 * page) and doesn't need edit affordances. Nodes are laid out linearly with
 * the branch fanning right when a split is taken.
 */

import * as React from "react"
import Link from "next/link"
import {
  X,
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  Timer,
  GitBranch,
  Play,
  CheckCircle2,
  XCircle,
  Users,
  DollarSign,
  ExternalLink,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import {
  synthesizeTrace,
  type BorrowerTrace,
  type TraceHop,
  type TraceHopKind,
} from "@/data/borrower-traces"
import { borrowers, type Borrower } from "@/data/borrowers"
import { journeysList } from "@/data/journeys"

interface BorrowerTraceDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrowerId: string | null
  journeyId: string
}

export function BorrowerTraceDrawer({
  open,
  onOpenChange,
  borrowerId,
  journeyId,
}: BorrowerTraceDrawerProps) {
  const borrower = borrowerId ? borrowers.find((b) => b.id === borrowerId) ?? null : null
  const journey = journeysList.find((j) => j.id === journeyId) ?? null
  const trace = React.useMemo(
    () => (borrower ? synthesizeTrace(borrower.id, journeyId) : null),
    [borrower, journeyId],
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[880px] overflow-y-auto p-0 sm:max-w-[880px]">
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">
                {borrower ? borrower.name : "Pick a borrower to trace"}
              </SheetTitle>
              {borrower && journey && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  Trace on <span className="font-medium text-foreground">{journey.name}</span>
                  {" · "}enrolled {trace ? formatDate(trace.enrolledAt) : "—"}
                  {" · "}
                  <StatusChip status={trace?.status ?? "active"} exitReason={trace?.exitReason} />
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {borrower && trace && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <TopStat label="Steps" value={trace.hops.length.toString()} />
              <TopStat label="Conversions" value={trace.conversions.length.toString()} />
              <TopStat label="Recovered" value={formatAED(trace.recoveredAED)} tone="primary" />
              <TopStat
                label="Outstanding"
                value={formatAED(borrower.outstanding)}
                tone="muted"
              />
              <Link
                href={`/borrowers/${borrower.id}`}
                className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
              >
                Open profile
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          )}
        </SheetHeader>

        {borrower && trace && journey ? (
          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,320px)_1fr]">
            <TraceMap trace={trace} />
            <TraceTimeline trace={trace} borrower={borrower} />
          </div>
        ) : (
          <div className="p-10 text-center text-[12px] text-muted-foreground">
            No trace available. Pick a borrower and journey.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatusChip({
  status,
  exitReason,
}: {
  status: BorrowerTrace["status"]
  exitReason?: BorrowerTrace["exitReason"]
}) {
  const label = status === "active" ? "Active" : exitReason ?? (status.charAt(0).toUpperCase() + status.slice(1))
  const tone =
    status === "converted" || label === "Converted"
      ? "border-primary/40 bg-primary/10 text-primary"
      : status === "active"
        ? "border-info-500/40 bg-info-500/10 text-info-300"
        : status === "errored"
          ? "border-error-500/40 bg-error-500/10 text-error-300"
          : "border-neutral-500/40 bg-neutral-500/10 text-neutral-300"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", tone)}>
      {label}
    </span>
  )
}

function TopStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "muted" }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          tone === "primary" && "text-primary",
          tone === "muted" && "text-muted-foreground",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </span>
    </span>
  )
}

/* ─────────── Left column — mini map ─────────── */

function TraceMap({ trace }: { trace: BorrowerTrace }) {
  const hops = trace.hops
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Journey map</span>
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] text-primary">
          Highlighted path
        </span>
      </div>
      <ol className="relative space-y-1.5">
        {hops.map((hop, i) => {
          const isCurrent = trace.status === "active" && i === hops.length - 1
          return (
            <li
              key={hop.id}
              className={cn(
                "relative flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] transition-colors",
                isCurrent
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_var(--cg-primary-500)]"
                  : "border-primary/25 bg-primary/[0.05]",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  isCurrent ? "bg-primary text-primary-foreground" : "bg-primary/25 text-primary",
                )}
              >
                {i + 1}
              </span>
              <span className="text-neutral-300">
                <HopIcon kind={hop.kind} channel={hop.outcome.kind === "message" ? hop.outcome.channel : undefined} />
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">{hop.label}</span>
              {isCurrent && (
                <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary/25 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                  <Play className="h-2 w-2" /> now
                </span>
              )}
              {hop.conversions && hop.conversions.length > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                  <DollarSign className="h-2 w-2" />
                  {hop.conversions.length}
                </span>
              )}
              {/* Connector line to next hop */}
              {i < hops.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[13px] top-[100%] h-1.5 w-px bg-primary/40"
                />
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Nodes above are the ones this borrower actually visited. Nodes not
        shown were bypassed by branch choices earlier in the flow.
      </p>
    </div>
  )
}

function HopIcon({
  kind,
  channel,
}: {
  kind: TraceHopKind
  channel?: "email" | "sms" | "whatsapp"
}) {
  switch (kind) {
    case "message":
      if (channel === "sms") return <MessageSquare className="h-3 w-3" />
      if (channel === "whatsapp") return <MessageCircle className="h-3 w-3" />
      return <Mail className="h-3 w-3" />
    case "wait":
      return <Timer className="h-3 w-3" />
    case "condition":
    case "action_split":
      return <GitBranch className="h-3 w-3" />
    case "call":
      return <Phone className="h-3 w-3" />
    case "human_campaign":
      return <Users className="h-3 w-3" />
    case "trigger":
      return <Play className="h-3 w-3" />
    case "end":
      return <CheckCircle2 className="h-3 w-3" />
    default:
      return <XCircle className="h-3 w-3" />
  }
}

/* ─────────── Right column — timeline ─────────── */

function TraceTimeline({ trace, borrower }: { trace: BorrowerTrace; borrower: Borrower }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Step timeline</span>
        <span className="text-neutral-500">All times UAE · Asia/Dubai</span>
      </div>
      <ol className="space-y-3">
        {trace.hops.map((hop, i) => (
          <TimelineStep
            key={hop.id}
            hop={hop}
            index={i}
            borrower={borrower}
            isCurrent={trace.status === "active" && i === trace.hops.length - 1}
          />
        ))}
      </ol>
      {trace.status === "active" ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-info-500/40 bg-info-500/10 px-2.5 py-2 text-[11px] text-info-300">
          <Play className="h-3 w-3" />
          Currently at:{" "}
          <span className="font-medium text-foreground">
            {trace.hops[trace.hops.length - 1]?.label ?? "—"}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-md border px-2.5 py-2 text-[11px]",
            trace.exitReason === "Converted"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          Exited with outcome{" "}
          <span className="font-medium text-foreground">{trace.exitReason ?? "Exited"}</span>
        </div>
      )}
    </div>
  )
}

function TimelineStep({
  hop,
  index,
  borrower,
  isCurrent,
}: {
  hop: TraceHop
  index: number
  borrower: Borrower
  isCurrent: boolean
}) {
  return (
    <li className="relative pl-6">
      {/* Vertical connector */}
      <span
        aria-hidden
        className="absolute left-2.5 top-4 h-full w-px bg-border last:hidden"
      />
      <span
        className={cn(
          "absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
          isCurrent
            ? "border-primary bg-primary/20 text-primary shadow-[0_0_0_2px_var(--cg-primary-500)]"
            : "border-border bg-background text-neutral-400",
        )}
      >
        {index + 1}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[12px] font-medium text-foreground">{hop.label}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDate(hop.at)}
          </span>
        </div>
        <HopOutcomeRow hop={hop} borrower={borrower} />
        {hop.conversions && hop.conversions.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {hop.conversions.map((c) => (
              <div
                key={c.eventId + c.at}
                className="inline-flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              >
                <DollarSign className="h-2.5 w-2.5" />
                {c.eventLabel} · {formatAED(c.amountAED)}
                <span className="text-primary/70">· {formatDate(c.at, true)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

function HopOutcomeRow({ hop, borrower }: { hop: TraceHop; borrower: Borrower }) {
  const { outcome } = hop
  switch (outcome.kind) {
    case "trigger":
      return (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Enrolled — {outcome.reason}
        </p>
      )
    case "message":
      return (
        <div className="mt-1 space-y-1">
          <p className="text-[10px] text-muted-foreground">
            {outcome.channel.toUpperCase()} · Template “{outcome.templateName}”
            {outcome.subject && ` · Subject: ${outcome.subject}`}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {outcome.events.map((e) => (
              <span
                key={e}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                  e === "sent" || e === "delivered"
                    ? "bg-muted text-neutral-300"
                    : e === "opened"
                      ? "bg-info-500/15 text-info-300"
                      : e === "clicked"
                        ? "bg-primary/15 text-primary"
                        : e === "bounced" || e === "unsubscribed"
                          ? "bg-error-500/15 text-error-300"
                          : "bg-muted text-neutral-300",
                )}
              >
                {e.replace("_", " ")}
              </span>
            ))}
          </div>
          <Link
            href={`/email-generator/${outcome.messageId.split("-").slice(0, 2).join("-")}`}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
          >
            View the exact message this borrower received
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      )
    case "branch":
      return (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Branch taken —{" "}
          <span className="rounded bg-primary/15 px-1 py-0.5 font-medium text-primary">
            {outcome.label}
          </span>
        </p>
      )
    case "wait":
      return (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Waited{" "}
          <span className="font-medium text-foreground">
            {outcome.hours >= 24 ? `${Math.round(outcome.hours / 24)} day${outcome.hours >= 48 ? "s" : ""}` : `${outcome.hours} hours`}
          </span>{" "}
          before continuing
        </p>
      )
    case "call":
      return (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          AI Call outcome —{" "}
          <span
            className={cn(
              "rounded px-1 py-0.5 font-medium",
              outcome.result === "connected" || outcome.result === "ptp_captured"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-neutral-300",
            )}
          >
            {outcome.result.replace("_", " ")}
          </span>
          {outcome.duration_s !== undefined && (
            <span> · {Math.floor(outcome.duration_s / 60)}m {outcome.duration_s % 60}s</span>
          )}
        </p>
      )
    case "human":
      return (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Enrolled in{" "}
          <span className="font-medium text-foreground">{outcome.queue}</span> · status{" "}
          <span className="rounded bg-muted px-1 py-0.5 font-medium text-neutral-200">
            {outcome.status.replace("_", " ")}
          </span>
        </p>
      )
    case "end":
      return (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Journey ended with outcome{" "}
          <span
            className={cn(
              "rounded px-1 py-0.5 font-medium",
              outcome.tag === "Converted"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-neutral-300",
            )}
          >
            {outcome.tag}
          </span>
        </p>
      )
  }
}

function formatDate(iso: string, timeOnly = false): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  if (timeOnly) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
