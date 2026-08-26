"use client"

/**
 * Borrower Journey Tracker · detail page.
 *
 * Full-page borrower report:
 *  - Header: identity, deal/lender, current status across selected journey
 *  - Journey selector: tabs when >1 journey, plus an "All journeys" cross-view
 *    that renders the borrower's entire collections lifecycle
 *  - Journey map with highlighted path (reuses the same shape as the single-
 *    borrower trace drawer)
 *  - Chronological step timeline with action-response pairing per node:
 *    outreach → response → outcome; conversions inline; links to the exact
 *    message snapshot, call transcript, and per-node aggregate view
 */

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
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
  Milestone,
  ChevronRight,
  Waypoints,
  BadgeCheck,
  History,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { borrowers, type Borrower } from "@/data/borrowers"
import {
  synthesizeTrace,
  listJourneysForBorrower,
  type BorrowerTrace,
  type TraceHop,
  type TraceHopKind,
} from "@/data/borrower-traces"

/* ─────────── Constants ─────────── */

const RISK_TONE: Record<"Low" | "Medium" | "High", string> = {
  Low: "border-primary/40 bg-primary/10 text-primary",
  Medium: "border-warning-500/40 bg-warning-500/10 text-warning-300",
  High: "border-error-500/40 bg-error-500/10 text-error-300",
}

const STATUS_TONE: Record<BorrowerTrace["status"], string> = {
  active: "border-info-500/40 bg-info-500/10 text-info-300",
  converted: "border-primary/40 bg-primary/10 text-primary",
  exited: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  errored: "border-error-500/40 bg-error-500/10 text-error-300",
}

/* ─────────── Page ─────────── */

export default function BorrowerTrackerDetailPage() {
  const params = useParams<{ id: string }>()
  const borrower = borrowers.find((b) => b.id === params.id) ?? null

  // Journey membership + selected journey. "all" = cross-view rendering the
  // borrower's entire collections lifecycle across every journey they've
  // been in.
  const [journeys, setJourneys] = React.useState<ReturnType<typeof listJourneysForBorrower>>([])
  const [selectedJourneyId, setSelectedJourneyId] = React.useState<string | "all">("all")

  React.useEffect(() => {
    if (borrower) {
      const list = listJourneysForBorrower(borrower.id)
      setJourneys(list)
      // Default to the first (most recent) journey when the borrower has any.
      if (list.length === 1) setSelectedJourneyId(list[0].journeyId)
      else if (list.length > 1) setSelectedJourneyId("all")
    }
  }, [borrower])

  if (!borrower) {
    return (
      <PageShell title="Borrower not found" description="">
        <Link
          href="/reports/borrower-tracker"
          className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to search
        </Link>
      </PageShell>
    )
  }

  const selectedJourney =
    selectedJourneyId !== "all"
      ? journeys.find((j) => j.journeyId === selectedJourneyId)
      : null

  const selectedTrace: BorrowerTrace | null =
    selectedJourney ? synthesizeTrace(borrower.id, selectedJourney.journeyId) : null

  const totalRecovered = journeys.reduce((s, j) => s + j.recoveredAED, 0)

  return (
    <PageShell
      title="Borrower Journey Tracker"
      description="Every journey this borrower has been through — and, for each step inside, what the outreach was and how they responded."
    >
      <div className="space-y-5">
        {/* Nav breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link
            href="/reports/borrower-tracker"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            All borrowers
          </Link>
          <Link
            href={`/borrowers/${borrower.id}`}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <Users className="h-3 w-3" />
            Borrower profile
          </Link>
        </div>

        {/* Borrower header */}
        <BorrowerHeader
          borrower={borrower}
          totalJourneys={journeys.length}
          totalRecoveredAED={totalRecovered}
          currentStatus={
            selectedTrace
              ? {
                  status: selectedTrace.status,
                  currentStep: selectedTrace.hops[selectedTrace.hops.length - 1]?.label ?? null,
                  journeyName: selectedJourney?.journeyName ?? "",
                  exitReason: selectedTrace.exitReason,
                }
              : null
          }
        />

        {/* Journey tabs (only when > 1 journey) */}
        {journeys.length > 0 && (
          <JourneyTabs
            journeys={journeys}
            selected={selectedJourneyId}
            onSelect={setSelectedJourneyId}
          />
        )}

        {/* Body */}
        {selectedJourneyId === "all" ? (
          <CrossJourneyHistory borrower={borrower} journeys={journeys} />
        ) : selectedTrace && selectedJourney ? (
          <SingleJourneyView
            borrower={borrower}
            trace={selectedTrace}
            journeyName={selectedJourney.journeyName}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card/40 p-10 text-center text-[12px] text-muted-foreground">
            This borrower isn&apos;t in any journeys.
          </div>
        )}
      </div>
    </PageShell>
  )
}

/* ─────────── Borrower header ─────────── */

function BorrowerHeader({
  borrower,
  totalJourneys,
  totalRecoveredAED,
  currentStatus,
}: {
  borrower: Borrower
  totalJourneys: number
  totalRecoveredAED: number
  currentStatus: {
    status: BorrowerTrace["status"]
    currentStep: string | null
    journeyName: string
    exitReason?: BorrowerTrace["exitReason"]
  } | null
}) {
  const statusLabel = currentStatus
    ? currentStatus.status === "active"
      ? `In journey — ${currentStatus.journeyName} · at ${currentStatus.currentStep ?? "unknown step"}`
      : currentStatus.status === "converted"
        ? `Converted in ${currentStatus.journeyName}`
        : currentStatus.exitReason
          ? `${currentStatus.exitReason} — ${currentStatus.journeyName}`
          : `Exited — ${currentStatus.journeyName}`
    : "Cross-journey lifecycle view"
  return (
    <header className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[16px] font-semibold text-foreground">
          {borrower.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {borrower.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{borrower.emiratesId}</span>
            <span>·</span>
            <span>{borrower.phone}</span>
            <span>·</span>
            <span>Deal: {borrower.product}</span>
            <span>·</span>
            <span>{borrower.dpdBucket} DPD</span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                RISK_TONE[borrower.riskScore],
              )}
            >
              {borrower.riskScore}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            {currentStatus?.status === "converted" ? (
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            ) : currentStatus?.status === "active" ? (
              <Play className="h-3.5 w-3.5 text-info-300" />
            ) : (
              <History className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {statusLabel}
          </p>
        </div>
        <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Outstanding
          </div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {formatAED(borrower.outstanding)}
          </div>
        </div>
        <div className="rounded-md border border-primary/40 bg-primary/[0.06] px-3 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Recovered (lifetime)
          </div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-primary">
            {formatAED(totalRecoveredAED)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            across {totalJourneys} {totalJourneys === 1 ? "journey" : "journeys"}
          </div>
        </div>
      </div>
    </header>
  )
}

/* ─────────── Journey tabs ─────────── */

function JourneyTabs({
  journeys,
  selected,
  onSelect,
}: {
  journeys: ReturnType<typeof listJourneysForBorrower>
  selected: string | "all"
  onSelect: (v: string | "all") => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/[0.04] p-1">
      <TabButton active={selected === "all"} onClick={() => onSelect("all")}>
        <History className="h-3 w-3" />
        All journeys · {journeys.length}
      </TabButton>
      {journeys.map((j) => (
        <TabButton
          key={j.journeyId}
          active={selected === j.journeyId}
          onClick={() => onSelect(j.journeyId)}
        >
          <Milestone className="h-3 w-3" />
          {j.journeyName}
          <span
            className={cn(
              "rounded px-1 py-px text-[8px] font-medium uppercase tracking-wider",
              STATUS_TONE[j.status],
            )}
          >
            {j.status}
          </span>
        </TabButton>
      ))}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/* ─────────── Single journey view ─────────── */

function SingleJourneyView({
  borrower,
  trace,
  journeyName,
}: {
  borrower: Borrower
  trace: BorrowerTrace
  journeyName: string
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
      <TraceMap trace={trace} />
      <TraceTimeline trace={trace} borrower={borrower} journeyId={trace.journeyId} journeyName={journeyName} />
    </div>
  )
}

/* ─────────── Map ─────────── */

function TraceMap({ trace }: { trace: BorrowerTrace }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Journey map</span>
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] text-primary">
          Highlighted path
        </span>
      </div>
      <ol className="relative space-y-1.5">
        {trace.hops.map((hop, i) => {
          const isCurrent = trace.status === "active" && i === trace.hops.length - 1
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
                <HopIcon
                  kind={hop.kind}
                  channel={hop.outcome.kind === "message" ? hop.outcome.channel : undefined}
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">{hop.label}</span>
              {isCurrent && (
                <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary/25 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                  <Play className="h-2 w-2" /> now
                </span>
              )}
              {hop.conversions && hop.conversions.length > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary">
                  <DollarSign className="h-2 w-2" />
                  {hop.conversions.length}
                </span>
              )}
              {i < trace.hops.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[13px] top-[100%] h-1.5 w-px bg-primary/40"
                />
              )}
            </li>
          )
        })}
      </ol>
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

/* ─────────── Timeline ─────────── */

function TraceTimeline({
  trace,
  borrower,
  journeyId,
  journeyName,
}: {
  trace: BorrowerTrace
  borrower: Borrower
  journeyId: string
  journeyName: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Waypoints className="h-3 w-3 text-primary" />
          Step timeline
        </div>
        <span className="text-neutral-500">All times UAE · Asia/Dubai</span>
      </div>
      <ol className="space-y-4">
        {trace.hops.map((hop, i) => (
          <TimelineStep
            key={hop.id}
            hop={hop}
            index={i}
            isCurrent={trace.status === "active" && i === trace.hops.length - 1}
            borrower={borrower}
            journeyId={journeyId}
            journeyName={journeyName}
            previousHop={i > 0 ? trace.hops[i - 1] : null}
          />
        ))}
      </ol>
    </div>
  )
}

function TimelineStep({
  hop,
  index,
  isCurrent,
  borrower,
  journeyId,
  journeyName,
  previousHop,
}: {
  hop: TraceHop
  index: number
  isCurrent: boolean
  borrower: Borrower
  journeyId: string
  journeyName: string
  previousHop: TraceHop | null
}) {
  return (
    <li className="relative pl-7">
      <span
        aria-hidden
        className="absolute left-3 top-6 h-[calc(100%_-_16px)] w-px bg-border last:hidden"
      />
      <span
        className={cn(
          "absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
          isCurrent
            ? "border-primary bg-primary/20 text-primary shadow-[0_0_0_2px_var(--cg-primary-500)]"
            : "border-border bg-background text-neutral-400",
        )}
      >
        {index + 1}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13px] font-medium text-foreground">{hop.label}</span>
          <NodeKindChip kind={hop.kind} channel={hop.outcome.kind === "message" ? hop.outcome.channel : undefined} />
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDate(hop.at)}
          </span>
          <Link
            href={`/journeys/${journeyId}/report`}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground"
            title="Open the per-node aggregate view on the journey report"
          >
            Per-node aggregate
            <ExternalLink className="h-2 w-2" />
          </Link>
        </div>
        <ActionResponseDetail hop={hop} borrower={borrower} previousHop={previousHop} />
        {hop.conversions && hop.conversions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hop.conversions.map((c) => (
              <div
                key={c.eventId + c.at}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/[0.08] px-2 py-1 text-[10px] font-medium text-primary"
              >
                <DollarSign className="h-3 w-3" />
                <span className="uppercase tracking-wider">Conversion:</span>
                <span className="font-semibold">{c.eventLabel}</span>
                <span>· {formatAED(c.amountAED)}</span>
                <span className="text-primary/70">· {formatDate(c.at, true)}</span>
                <span className="text-primary/70">
                  · attributed to <span className="font-medium text-foreground">{hop.label}</span> in {journeyName}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

/* ─────────── Action-response pairing ─────────── */

function ActionResponseDetail({
  hop,
  borrower,
  previousHop,
}: {
  hop: TraceHop
  borrower: Borrower
  previousHop: TraceHop | null
}) {
  const { outcome } = hop
  switch (outcome.kind) {
    case "trigger":
      return (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Enrolled — <span className="text-foreground">{outcome.reason}</span>
        </p>
      )
    case "message": {
      const messageIdForRoute = outcome.messageId.split("-").slice(0, 2).join("-")
      const isEmail = outcome.channel === "email"
      const isSms = outcome.channel === "sms"
      const isWa = outcome.channel === "whatsapp"
      // Ladder — synthesize the borrower "response" signals from the trace's
      // recorded events (sent → delivered → opened → clicked). The trace
      // stores which ones actually fired for this borrower.
      const clicked = outcome.events.includes("clicked")
      const opened = outcome.events.includes("opened")
      const delivered = outcome.events.includes("delivered")
      const bounced = outcome.events.includes("bounced")
      // Deterministic "which link they clicked" — helpful for email/SMS with
      // a payment CTA. Prototype-only; a real backend would store the click.
      const clickedLinkLabel = clicked
        ? isEmail
          ? "Pay now"
          : isSms
            ? "cg.link/pay"
            : "Payment link"
        : null

      return (
        <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
          {/* Outreach */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Outreach
            </span>
            <span className="text-[11px] text-foreground">
              {outcome.channel.toUpperCase()} · Template “{outcome.templateName}”
            </span>
            {outcome.subject && (
              <span className="text-[10px] text-muted-foreground">
                Subject: <span className="text-foreground">{outcome.subject}</span>
              </span>
            )}
          </div>
          {/* Delivery + response ladder */}
          <div className="flex flex-wrap items-center gap-1">
            <ResponseChip label="Sent" tone="muted" />
            {bounced ? (
              <ResponseChip label="Bounced" tone="error" />
            ) : delivered ? (
              <ResponseChip label="Delivered" tone="muted" />
            ) : (
              <ResponseChip label="Pending" tone="muted" />
            )}
            {opened && !isSms && <ResponseChip label={isWa ? "Read" : "Opened"} tone="info" />}
            {clicked && <ResponseChip label={`Clicked${clickedLinkLabel ? ` · ${clickedLinkLabel}` : ""}`} tone="primary" />}
            {clicked && !bounced && (
              <span className="text-[10px] text-muted-foreground">
                → borrower engaged with the {isEmail ? "email CTA" : isSms ? "short link" : "template"}
              </span>
            )}
            {!clicked && !opened && !bounced && delivered && (
              <span className="text-[10px] text-muted-foreground">
                → no response yet
              </span>
            )}
          </div>
          {/* Links out */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-1.5">
            <Link
              href={`/email-generator/${messageIdForRoute}`}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              View the exact {outcome.channel} snapshot
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
            {isSms && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">
                  Segments + encoding recorded on the snapshot
                </span>
              </>
            )}
          </div>
        </div>
      )
    }
    case "branch": {
      // Attribute-value narrative — deterministic per-borrower approximation.
      const attributeSummary = `${borrower.dpdBucket} DPD`
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[11px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Branch taken
          </span>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {outcome.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            · decided on <span className="text-foreground">attribute = {attributeSummary}</span>
          </span>
        </div>
      )
    }
    case "wait": {
      const start = new Date(hop.at)
      const end = new Date(start.getTime() + outcome.hours * 3_600_000)
      const durationLabel =
        outcome.hours >= 24
          ? `${Math.round(outcome.hours / 24)} day${outcome.hours >= 48 ? "s" : ""}`
          : `${outcome.hours} hour${outcome.hours === 1 ? "" : "s"}`
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[11px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Waited
          </span>
          <span className="font-medium text-foreground">{durationLabel}</span>
          <span className="text-[10px] text-muted-foreground">
            · from {formatDate(start.toISOString(), true)} to {formatDate(end.toISOString(), true)}
          </span>
        </div>
      )
    }
    case "call": {
      const connected = outcome.result === "connected" || outcome.result === "ptp_captured"
      const noAnswer = outcome.result === "no_answer" || outcome.result === "busy"
      return (
        <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Outreach
            </span>
            <span className="text-[11px] text-foreground">AI Call · outbound</span>
            {outcome.duration_s !== undefined && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                · {Math.floor(outcome.duration_s / 60)}m {outcome.duration_s % 60}s duration
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <ResponseChip label="Dialed" tone="muted" />
            {noAnswer ? (
              <ResponseChip label={outcome.result === "busy" ? "Busy" : "No answer"} tone="warn" />
            ) : (
              <ResponseChip label="Connected" tone="info" />
            )}
            {connected && <ResponseChip label="RPC" tone="info" />}
            {outcome.result === "ptp_captured" && <ResponseChip label="PTP captured" tone="primary" />}
            {outcome.result === "voicemail" && <ResponseChip label="Voicemail" tone="muted" />}
            {outcome.result === "dropped" && <ResponseChip label="Dropped by AI" tone="warn" />}
            {noAnswer && (
              <span className="text-[10px] text-muted-foreground">
                → no live conversation
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-1.5">
            <Link
              href={`/call-history?borrower=${borrower.id}&at=${encodeURIComponent(hop.at)}`}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              Open call transcript + recording
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">
              Recording indexed in Call History
            </span>
          </div>
        </div>
      )
    }
    case "human":
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[11px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Human enrolment
          </span>
          <span className="font-medium text-foreground">{outcome.queue}</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
              outcome.status === "worked" ? "bg-primary/15 text-primary" : "bg-muted text-neutral-300",
            )}
          >
            {outcome.status.replace("_", " ")}
          </span>
        </div>
      )
    case "end":
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[11px]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Journey ended
          </span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              outcome.tag === "Converted"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-neutral-300",
            )}
          >
            {outcome.tag}
          </span>
          {previousHop && (
            <span className="text-[10px] text-muted-foreground">
              · exited from <span className="text-foreground">{previousHop.label}</span>
            </span>
          )}
        </div>
      )
  }
}

function ResponseChip({
  label,
  tone,
}: {
  label: string
  tone: "muted" | "info" | "primary" | "warn" | "error"
}) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
        tone === "muted" && "bg-muted text-neutral-300",
        tone === "info" && "bg-info-500/15 text-info-300",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "warn" && "bg-warning-500/15 text-warning-300",
        tone === "error" && "bg-error-500/15 text-error-300",
      )}
    >
      {label}
    </span>
  )
}

function NodeKindChip({
  kind,
  channel,
}: {
  kind: TraceHopKind
  channel?: "email" | "sms" | "whatsapp"
}) {
  const label =
    kind === "message"
      ? (channel ?? "message").toUpperCase()
      : kind === "action_split"
        ? "SPLIT"
        : kind === "human_campaign"
          ? "HUMAN"
          : kind.toUpperCase()
  const tone =
    kind === "message" && channel === "email"
      ? "bg-info-500/15 text-info-300"
      : kind === "message" && channel === "sms"
        ? "bg-primary/15 text-primary"
        : kind === "message" && channel === "whatsapp"
          ? "bg-emerald-500/15 text-emerald-300"
          : kind === "call"
            ? "bg-warning-500/15 text-warning-300"
            : kind === "end"
              ? "bg-neutral-500/15 text-neutral-300"
              : "bg-muted text-neutral-300"
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider", tone)}>
      {label}
    </span>
  )
}

/* ─────────── Cross-journey history view ─────────── */

function CrossJourneyHistory({
  borrower,
  journeys,
}: {
  borrower: Borrower
  journeys: ReturnType<typeof listJourneysForBorrower>
}) {
  if (journeys.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/40 p-10 text-center text-[12px] text-muted-foreground">
        This borrower isn&apos;t enrolled in any journeys.
      </div>
    )
  }
  // Sort by enrolledAt asc (chronological across journeys).
  const sorted = [...journeys].sort(
    (a, b) => new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime(),
  )
  const traces = sorted.map((j) => ({
    j,
    trace: synthesizeTrace(borrower.id, j.journeyId),
  }))
  const totalSteps = traces.reduce((s, { trace }) => s + trace.hops.length, 0)
  const totalConversions = traces.reduce((s, { trace }) => s + trace.conversions.length, 0)
  const totalRecovered = traces.reduce((s, { trace }) => s + trace.recoveredAED, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <History className="h-3 w-3 text-primary" />
          Collections lifecycle · {sorted.length} journeys
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCell label="Steps taken" value={totalSteps.toString()} />
          <StatCell label="Conversions fired" value={totalConversions.toString()} />
          <StatCell label="Recovered" value={formatAED(totalRecovered)} tone="primary" />
          <StatCell label="First enrolment" value={new Date(sorted[0].enrolledAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} />
        </div>
      </div>

      <ol className="space-y-3">
        {traces.map(({ j, trace }, idx) => (
          <li
            key={j.journeyId}
            className={cn(
              "rounded-xl border p-4",
              trace.status === "converted"
                ? "border-primary/40 bg-primary/[0.04]"
                : trace.status === "active"
                  ? "border-info-500/40 bg-info-500/[0.04]"
                  : "border-border bg-card/40",
            )}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Journey {idx + 1}
                  </span>
                  <span className="text-[12px] font-semibold text-foreground">{j.journeyName}</span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                      STATUS_TONE[trace.status],
                    )}
                  >
                    {trace.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Enrolled{" "}
                  {new Date(j.enrolledAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {trace.hops.length} steps · {trace.conversions.length} conversions
                  {trace.recoveredAED > 0 && (
                    <>
                      {" · "}
                      <span className="text-primary">{formatAED(trace.recoveredAED)} recovered</span>
                    </>
                  )}
                </p>
              </div>
              <Link
                href={`/journeys/${j.journeyId}/report`}
                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                Open journey report
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
            <TraceTimeline
              trace={trace}
              borrower={borrower}
              journeyId={j.journeyId}
              journeyName={j.journeyName}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "primary"
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 font-heading text-lg font-semibold tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  )
}

/* ─────────── Utils ─────────── */

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
