"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  MessageCircle,
  ExternalLink,
  Repeat,
  PauseCircle,
  PlayCircle,
  StopCircle,
  ChevronDown,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  getMessageById,
  getRecurringParent,
  getSeriesOccurrences,
  type MessageChannel,
  type MessageListItem,
  type MessageVariation,
  type RecurringMeta,
} from "@/data/messages"
import { getRichTemplate, type SlotValues } from "@/data/rich-email-templates"
import { lenders } from "@/data/lenders"
import {
  MessageFunnelChart,
  MessageFunnelPills,
} from "@/components/composer/message-funnel"
import { FunnelSegmentCtas } from "@/components/composer/funnel-segment-cta"
import { ExportMenu } from "@/components/composer/export-menu"
import { toast } from "sonner"

const CHANNEL_LABEL: Record<MessageChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
}
const CHANNEL_ICON: Record<MessageChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
}

function getLenderName(id: string): string {
  if (id === "general") return "General"
  return lenders.find((l) => l.id === id)?.shortName ?? id
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatCadence(r: RecurringMeta): string {
  const c = r.cadence
  if (c.kind === "daily") return `Daily · ${c.time}`
  if (c.daysOfWeek.length > 0) {
    const days = ["S", "M", "T", "W", "T", "F", "S"]
    return `Custom (${c.daysOfWeek.map((d) => days[d]).join("")}) · ${c.time}`
  }
  return `Every ${c.everyN} days · ${c.time}`
}

export default function MessageDetailPage() {
  const params = useParams<{ id: string }>()
  const message = getMessageById(params.id)
  const [activeVarId, setActiveVarId] = React.useState<string>("all")

  // Pause/resume/stop UI state — a prototype-only local override so the
  // author can see the state transition without a real backend.
  const [seriesStatusOverride, setSeriesStatusOverride] = React.useState<
    "active" | "paused" | "ended" | null
  >(null)

  if (!message) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Message not found</p>
          <Link href="/email-generator" className="text-xs text-primary hover:underline">
            ← Back to all messages
          </Link>
        </div>
      </div>
    )
  }

  const Icon = CHANNEL_ICON[message.channel]
  const template = message.templateId ? getRichTemplate(message.templateId) : undefined
  const isSingle = message.audienceType === "single"
  const showFunnel = message.funnel && !isSingle
  const showPills = message.funnel && isSingle

  const variations = message.variations ?? []
  const hasVariations = variations.length > 1
  const activeVariation: MessageVariation | null =
    activeVarId !== "all" ? variations.find((v) => v.id === activeVarId) ?? null : null

  // Resolve the visible fields for the currently-selected scope.
  const scopedSubject = activeVariation ? activeVariation.subject : message.subject
  const scopedFromName = activeVariation?.fromName ?? message.fromName
  const scopedFromAddress = activeVariation?.fromAddress ?? message.fromAddress
  const scopedTemplateId = activeVariation?.templateId ?? message.templateId
  const scopedTemplate = scopedTemplateId ? getRichTemplate(scopedTemplateId) : template
  const scopedFunnel = activeVariation?.funnel ?? message.funnel
  const scopedLinkClicks = activeVariation?.linkClicks ?? message.linkClicks
  const scopedRecipients = activeVariation?.recipients ?? message.recipients

  const recurring = message.recurring
  const effectiveStatus = seriesStatusOverride ?? recurring?.status ?? null
  const parent = message.recurring && !message.recurring.isParent ? getRecurringParent(message.id) : null

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Top: breadcrumb + title */}
      <div className="space-y-3">
        <Link
          href="/email-generator"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          All messages
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {message.campaignName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Subject: <span className="text-foreground">{scopedSubject}</span>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <Badge
                className={cn(
                  message.status === "sent" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
                  message.status === "scheduled" && "bg-amber-500/15 text-amber-400 border-amber-500/20",
                  message.status === "draft" && "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
                  message.status === "failed" && "bg-red-500/15 text-red-400 border-red-500/20",
                )}
              >
                {message.status[0].toUpperCase() + message.status.slice(1)}
              </Badge>
              {recurring && (
                <RecurringBadge meta={recurring} statusOverride={effectiveStatus ?? undefined} />
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
                <Icon className="h-3 w-3" />
                {CHANNEL_LABEL[message.channel]}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {message.audience} ({scopedRecipients.toLocaleString()})
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Sent {formatDateTime(message.sentAt)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {recurring && (
              <SeriesControls
                seriesName={recurring.seriesName}
                currentStatus={effectiveStatus ?? recurring.status}
                onChange={(next) => {
                  setSeriesStatusOverride(next)
                  const verb =
                    next === "paused" ? "paused" : next === "active" ? "resumed" : "stopped"
                  toast.success(`Recurring series ${verb}`, {
                    description:
                      next === "paused"
                        ? "Future occurrences are cancelled. Copies already sent are untouched. Resume any time."
                        : next === "active"
                          ? "Occurrences will resume from the next scheduled slot."
                          : "The series is permanently ended. No further copies will be generated.",
                  })
                }}
              />
            )}
            <ExportMenu message={message} />
          </div>
        </div>

        {/* Recurring context banner — jump to parent if we're on a copy */}
        {recurring && !recurring.isParent && parent && (
          <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/[0.05] px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <Repeat className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">
                Occurrence {recurring.occurrenceIndex} of {recurring.totalOccurrences} in{" "}
                <span className="font-medium">{recurring.seriesName}</span>
              </span>
              <span className="text-muted-foreground">· {formatCadence(recurring)}</span>
            </div>
            <Link
              href={`/email-generator/${parent.id}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open parent series
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Variation switcher — hidden when there are no variations */}
      {hasVariations && (
        <VariationSwitcher
          variations={variations}
          activeId={activeVarId}
          onChange={setActiveVarId}
        />
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: funnel + comparison + render */}
        <div className="space-y-6">
          {/* Funnel */}
          {showFunnel && scopedFunnel && (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              {hasVariations && (
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {activeVariation
                    ? `Variation ${activeVariation.label} funnel`
                    : "Aggregate funnel across variations"}
                </p>
              )}
              <MessageFunnelChart funnel={scopedFunnel} channel={message.channel} />

              {message.channel !== "sms" && scopedLinkClicks && scopedLinkClicks.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Click breakdown
                  </p>
                  <div className="space-y-1">
                    {scopedLinkClicks.map((l) => (
                      <div
                        key={l.label}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs",
                          l.isPayment
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-border bg-card/40",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {l.isPayment && (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                              payment link
                            </span>
                          )}
                          <span className={cn("truncate", l.isPayment ? "text-foreground font-medium" : "text-foreground")}>
                            {l.label}
                          </span>
                          <span className="truncate font-mono text-[10px] text-muted-foreground">
                            {l.url}
                          </span>
                        </div>
                        <span className="shrink-0 tabular-nums text-foreground">
                          {l.clicks.toLocaleString()} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Per-variation comparison — only in "All" view */}
          {hasVariations && activeVarId === "all" && (
            <VariationComparisonTable
              variations={variations}
              holdout={message.holdout ?? null}
              onOpenVariation={(id) => setActiveVarId(id)}
            />
          )}

          {showFunnel && <FunnelSegmentCtas message={message} />}

          {showPills && scopedFunnel && (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Delivery status</p>
              <MessageFunnelPills funnel={scopedFunnel} channel={message.channel} />
            </div>
          )}

          {/* Multi-variation renders — All view, when 2+ variations exist */}
          {message.channel === "email" && hasVariations && activeVarId === "all" && (
            <MultiVariationRenderCard variations={variations} />
          )}

          {/* Single-scope render — All view without variations, OR a specific
              variation is selected. */}
          {message.channel === "email" &&
            scopedTemplate &&
            (!hasVariations || activeVarId !== "all") && (
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    {activeVariation
                      ? `As borrowers on variation ${activeVariation.label} received it`
                      : "As the borrower received it"}
                  </h2>
                  <span className="text-[10px] text-muted-foreground">
                    Variables resolved with sample data
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-zinc-900/50 p-6">
                  <div style={{ maxWidth: 600, margin: "0 auto" }}>
                    {scopedTemplate.render({
                      slots: scopedTemplate.defaultSlots as SlotValues,
                      interactive: false,
                    })}
                  </div>
                </div>
              </div>
            )}

          {(message.channel !== "email" || !scopedTemplate) && (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">As the borrower received it</h2>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground">
                  {scopedSubject}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right: metadata sidebar */}
        <aside className="space-y-4">
          {/* If this is a recurring parent, show a summary of occurrences */}
          {recurring?.isParent && (
            <SeriesOccurrencesCard seriesId={recurring.seriesId} currentId={message.id} />
          )}

          <div className="rounded-xl border border-border bg-card/40 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Metadata {activeVariation && `· Variation ${activeVariation.label}`}
            </p>
            <dl className="space-y-3 text-xs">
              <Row label="Lender" value={getLenderName(message.lenderId)} />
              <Row label="Channel" value={CHANNEL_LABEL[message.channel]} />
              <Row label="Subject" value={scopedSubject} />
              <Row
                label="From"
                value={scopedFromName ? `${scopedFromName} <${scopedFromAddress}>` : "—"}
              />
              <Row
                label="Template"
                value={scopedTemplate ? scopedTemplate.name : message.playbookName ?? "—"}
                extra={
                  scopedTemplate ? (
                    <Link
                      href={`/email-generator/new?template=${scopedTemplate.id}`}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      Reuse
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  ) : undefined
                }
              />
              <Row label="Playbook" value={message.playbookName ?? "—"} />
              <Row
                label="Audience"
                value={`${message.audience} (${scopedRecipients.toLocaleString()})`}
              />
              <Row label="Created by" value={message.createdBy} />
              <Row label="Created" value={formatDateTime(message.createdAt)} />
              <Row label="Sent" value={formatDateTime(message.sentAt)} />
            </dl>
          </div>

          {message.funnel && (
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Goal & attribution
              </p>
              <div className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-emerald-300/70">Goal</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-300">
                  {message.funnel.goal.label}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-300/80">
                  Auto-selected from the message&apos;s purpose. Each purpose has its own goal
                  metric (Paid for reminders, PTPs for broken-promise, RPCs for hardship, etc.).
                </p>
              </div>
              <p className="text-xs text-foreground">
                Outcomes attributed to this message if they happened on the deal within{" "}
                <span className="font-semibold text-emerald-400">
                  {message.funnel.attributionWindowDays} days
                </span>{" "}
                of the send. Last-message-touch.
              </p>
              <Link
                href="#"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Change attribution window
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Multi-variation rendered snapshot                                    */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * "As they received it" for A/B campaigns — a tabbed card showing each
 * variation's rendered template. Each tab shows the variation's own subject
 * line above the render so the differences are legible even before you
 * look at the body.
 */
function MultiVariationRenderCard({ variations }: { variations: MessageVariation[] }) {
  const [activeId, setActiveId] = React.useState(variations[0]?.id)
  const active = variations.find((v) => v.id === activeId) ?? variations[0]
  if (!active) return null
  const tpl = active.templateId ? getRichTemplate(active.templateId) : undefined

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            As they received it — per variation
          </h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Every variation rendered with sample data. Subject + From identity + body all shown side by side.
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Variables resolved with sample data
        </span>
      </div>

      {/* Tab strip — one per variation with split % */}
      <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/20 p-0.5">
        {variations.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActiveId(v.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              v.id === active.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
              {v.label}
            </span>
            <span className="max-w-[220px] truncate">{v.subject}</span>
            <span className="rounded bg-muted/60 px-1 py-px text-[9px] font-medium text-muted-foreground">
              {v.splitPct}%
            </span>
          </button>
        ))}
      </div>

      {/* Sender identity + subject strip for the active tab */}
      <div className="mb-3 space-y-1 rounded-md border border-border bg-muted/10 px-3 py-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
            From
          </span>
          <span className="min-w-0 truncate text-foreground">
            {active.fromName
              ? `${active.fromName} <${active.fromAddress}>`
              : active.fromAddress ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
            Subject
          </span>
          <span className="min-w-0 truncate text-foreground">{active.subject}</span>
        </div>
      </div>

      {/* Body render for the active tab */}
      <div className="rounded-lg border border-border bg-zinc-900/50 p-6">
        {tpl ? (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {tpl.render({
              slots: tpl.defaultSlots as SlotValues,
              interactive: false,
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/20 p-4">
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground">
              {active.subject}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Variation switcher                                                   */
/* ──────────────────────────────────────────────────────────────────── */

function VariationSwitcher({
  variations,
  activeId,
  onChange,
}: {
  variations: MessageVariation[]
  activeId: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-card/40 p-1">
      <VariationTab
        label="All"
        sub="Aggregate"
        active={activeId === "all"}
        onClick={() => onChange("all")}
      />
      {variations.map((v) => (
        <VariationTab
          key={v.id}
          label={v.label}
          sub={`${v.splitPct}% · ${v.recipients.toLocaleString()}`}
          active={activeId === v.id}
          onClick={() => onChange(v.id)}
        />
      ))}
    </div>
  )
}

function VariationTab({
  label,
  sub,
  active,
  onClick,
}: {
  label: string
  sub: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="font-semibold">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          active ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground",
        )}
      >
        {sub}
      </span>
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Per-variation comparison table                                       */
/* ──────────────────────────────────────────────────────────────────── */

function VariationComparisonTable({
  variations,
  holdout,
  onOpenVariation,
}: {
  variations: MessageVariation[]
  holdout: MessageListItem["holdout"] | null
  onOpenVariation: (id: string) => void
}) {
  // Aggregate paid rate across variations, to compute lift vs holdout.
  const aggregateGoal = variations.reduce((acc, v) => acc + v.funnel.goal.count, 0)
  const aggregateRecipients = variations.reduce((acc, v) => acc + v.recipients, 0)
  const aggregatePaidRate = aggregateRecipients > 0 ? (aggregateGoal / aggregateRecipients) * 100 : 0
  const lift = holdout ? aggregatePaidRate - holdout.goalRate : null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Per-variation comparison</p>
          <p className="text-[11px] text-muted-foreground">
            Reader-only comparison. There is no automatic winner or auto-send.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border/70 bg-muted/20">
            <tr>
              <Th align="left">Variation</Th>
              <Th align="right">Split</Th>
              <Th align="right">Recipients</Th>
              <Th align="right">Delivered</Th>
              <Th align="right">Opened</Th>
              <Th align="right">Clicked</Th>
              <Th align="right" tone="text-emerald-400">Paid</Th>
              <Th align="right">Recovered</Th>
              <Th align="right">Paid rate</Th>
            </tr>
          </thead>
          <tbody>
            {variations.map((v) => {
              const paidRate = v.recipients > 0 ? (v.funnel.goal.count / v.recipients) * 100 : 0
              return (
                <tr
                  key={v.id}
                  onClick={() => onOpenVariation(v.id)}
                  className="cursor-pointer border-t border-border/50 transition-colors hover:bg-muted/15"
                >
                  <td className="px-4 py-3 text-[13px] font-medium">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                        {v.label}
                      </span>
                      <span className="truncate text-foreground">
                        {v.subject}
                      </span>
                    </div>
                  </td>
                  <Td>{v.splitPct}%</Td>
                  <Td>{v.recipients.toLocaleString()}</Td>
                  <Td>{v.funnel.delivered.toLocaleString()}</Td>
                  <Td>{v.funnel.opened.toLocaleString()}</Td>
                  <Td>{v.funnel.clicked.toLocaleString()}</Td>
                  <Td tone="text-emerald-400">{v.funnel.goal.count.toLocaleString()}</Td>
                  <Td tone="text-muted-foreground">
                    {v.funnel.goal.valueLabel?.replace(" recovered", "") ?? "—"}
                  </Td>
                  <Td tone="text-foreground">{paidRate.toFixed(1)}%</Td>
                </tr>
              )
            })}
            {holdout && (
              <tr className="border-t border-border/50 bg-warning-500/[0.06]">
                <td className="px-4 py-3 text-[13px] font-medium">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 items-center justify-center rounded-full bg-warning-500/20 px-2 text-[10px] font-semibold text-warning-300">
                      Holdout
                    </span>
                    <span className="text-muted-foreground">
                      Control arm · no message sent
                    </span>
                  </div>
                </td>
                <Td>{holdout.pct}%</Td>
                <Td>{holdout.recipients.toLocaleString()}</Td>
                <Td tone="text-muted-foreground">—</Td>
                <Td tone="text-muted-foreground">—</Td>
                <Td tone="text-muted-foreground">—</Td>
                <Td tone="text-warning-300">
                  {Math.round((holdout.goalRate / 100) * holdout.recipients).toLocaleString()}
                </Td>
                <Td tone="text-muted-foreground">—</Td>
                <Td tone="text-warning-300">{holdout.goalRate.toFixed(1)}%</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {lift !== null && (
        <div className="border-t border-border/60 bg-muted/10 px-5 py-3 text-[12px]">
          <span className="text-muted-foreground">Campaign lift vs holdout:</span>{" "}
          <span className={cn("font-semibold", lift > 0 ? "text-emerald-400" : "text-error-400")}>
            {lift > 0 ? "+" : ""}
            {lift.toFixed(1)} pts
          </span>
          <span className="text-muted-foreground">
            {" "}
            · variations paid at {aggregatePaidRate.toFixed(1)}%, holdout at {holdout!.goalRate.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}

function Th({
  children,
  align,
  tone,
}: {
  children: React.ReactNode
  align?: "left" | "right"
  tone?: string
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        align === "right" ? "text-right" : "text-left",
        tone ?? "text-muted-foreground",
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  tone,
}: {
  children: React.ReactNode
  tone?: string
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-right text-[13px] tabular-nums",
        tone ?? "text-foreground",
      )}
    >
      {children}
    </td>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Recurring badge + controls                                           */
/* ──────────────────────────────────────────────────────────────────── */

function RecurringBadge({
  meta,
  statusOverride,
}: {
  meta: RecurringMeta
  statusOverride?: "active" | "paused" | "ended"
}) {
  const status = statusOverride ?? meta.status
  const tone =
    status === "paused"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : status === "ended"
        ? "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
        : "border-primary/40 bg-primary/10 text-primary"
  const label = meta.isParent
    ? `Recurring · ${status}`
    : `Recurring · Wave ${meta.occurrenceIndex}`
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        tone,
      )}
      title={
        meta.isParent
          ? `Parent series template · ${meta.totalOccurrences} occurrences so far`
          : `Occurrence ${meta.occurrenceIndex} of ${meta.totalOccurrences} in the series`
      }
    >
      <Repeat className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

function SeriesControls({
  seriesName,
  currentStatus,
  onChange,
}: {
  seriesName: string
  currentStatus: "active" | "paused" | "ended"
  onChange: (next: "active" | "paused" | "ended") => void
}) {
  const [confirmOpen, setConfirmOpen] = React.useState<"pause" | "resume" | "stop" | null>(null)

  if (currentStatus === "ended") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-[12px] text-muted-foreground">
        <StopCircle className="h-3.5 w-3.5" />
        Series ended
      </span>
    )
  }

  return (
    <>
      {currentStatus === "paused" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen("resume")}
          className="border-primary/30 text-primary hover:bg-primary/10"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          Resume series
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen("pause")}>
          <PauseCircle className="h-3.5 w-3.5" />
          Pause series
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen("stop")}
        className="border-error-500/30 text-error-300 hover:bg-error-500/10"
      >
        <StopCircle className="h-3.5 w-3.5" />
        Stop series
      </Button>

      <Dialog open={confirmOpen !== null} onOpenChange={(o) => !o && setConfirmOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmOpen === "pause" && <PauseCircle className="h-4 w-4 text-warning-400" />}
              {confirmOpen === "resume" && <PlayCircle className="h-4 w-4 text-primary" />}
              {confirmOpen === "stop" && <StopCircle className="h-4 w-4 text-error-400" />}
              {confirmOpen === "pause" && `Pause "${seriesName}"?`}
              {confirmOpen === "resume" && `Resume "${seriesName}"?`}
              {confirmOpen === "stop" && `Stop "${seriesName}"?`}
            </DialogTitle>
            <DialogDescription>
              {confirmOpen === "pause" && (
                <>
                  This pauses the <strong className="text-foreground">entire recurring campaign</strong>,
                  not just this occurrence. Future copies won&apos;t be generated and the next
                  scheduled occurrence is cancelled. Copies already sent and their analytics are
                  untouched. You can resume any time.
                </>
              )}
              {confirmOpen === "resume" && (
                <>
                  The series will resume from its next scheduled slot. Occurrences that were
                  cancelled while paused are not re-sent.
                </>
              )}
              {confirmOpen === "stop" && (
                <>
                  This <strong className="text-error-300">permanently ends</strong> the series. No
                  further copies will be generated and it cannot be resumed. Copies already sent
                  and their analytics remain accessible.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={() => {
                if (confirmOpen === "pause") onChange("paused")
                if (confirmOpen === "resume") onChange("active")
                if (confirmOpen === "stop") onChange("ended")
                setConfirmOpen(null)
              }}
              className={cn(
                confirmOpen === "stop" && "bg-error-500 text-white hover:bg-error-500/90",
                confirmOpen === "pause" && "bg-warning-500 text-black hover:bg-warning-500/90",
              )}
            >
              {confirmOpen === "pause" && "Yes, pause series"}
              {confirmOpen === "resume" && "Yes, resume"}
              {confirmOpen === "stop" && "Yes, stop permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Series occurrences card (parent view only)                           */
/* ──────────────────────────────────────────────────────────────────── */

function SeriesOccurrencesCard({
  seriesId,
  currentId,
}: {
  seriesId: string
  currentId: string
}) {
  const [expanded, setExpanded] = React.useState(true)
  const occurrences = getSeriesOccurrences(seriesId)

  return (
    <div className="rounded-xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Repeat className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Occurrences · {occurrences.length}
          </p>
        </div>
        <ChevronDown
          className={cn("h-3 w-3 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded && (
        <div className="max-h-80 space-y-1 overflow-y-auto px-2 pb-3">
          {occurrences.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              No occurrences fired yet.
            </p>
          )}
          {occurrences.map((occ) => (
            <Link
              key={occ.id}
              href={`/email-generator/${occ.id}`}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[11px] transition-colors",
                occ.id === currentId ? "bg-primary/15 text-primary" : "hover:bg-muted",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-foreground">
                  Wave {occ.recurring?.occurrenceIndex}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDateTime(occ.sentAt)} · {occ.recipients.toLocaleString()} recipients
                </p>
              </div>
              {occ.funnel && (
                <span className="shrink-0 text-[10px] tabular-nums text-emerald-400">
                  {occ.funnel.goal.count} paid
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────── */

function Row({
  label,
  value,
  extra,
}: {
  label: string
  value: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col items-end gap-0.5 text-right">
        <span className="break-words text-foreground">{value}</span>
        {extra}
      </dd>
    </div>
  )
}
