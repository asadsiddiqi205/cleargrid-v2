"use client"

/**
 * SMS-node Analytics tab — mirrors the Email tab's shape, swapping the
 * SMS-specific delivery breakdowns (Awaiting receipt, Undelivered codes,
 * Segments, GSM-7 vs UCS-2, cost, by-number-position, by-country,
 * by-sender-id) and dropping open-based metrics that don't exist for SMS.
 */

import * as React from "react"
import {
  Search,
  Download,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  Info,
  Calendar,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { EMPTY_FILTERS } from "./analytics-filter-bar"
import {
  synthesizeSmsAnalytics,
  listSmsBorrowerStatuses,
  SMS_STATUS_LABEL,
  type SmsStatus,
  type BorrowerStatusRow,
} from "@/data/message-analytics"
import {
  fmt,
  METRIC_DEFINITIONS,
  NOT_SENT_REASON_LABEL,
  CTA_LABEL,
  type MessageMetricId,
} from "@/data/journey-metrics"
import { loadJourneySettings } from "@/data/journey-settings"
import { formatRunAge, type JourneyRun } from "@/data/journey-runs"
import {
  ModeToggle,
  CompareRunsView,
  OverTimeView,
  type AnalyticsMode,
} from "./message-analytics-modes"

interface NodeSmsAnalyticsProps {
  journeyId: string
  runId: string
  run: JourneyRun
  nodeId: string
  nodeLabel: string
}

const STATUS_TONE: Record<SmsStatus, string> = {
  not_sent: "border-muted/60 bg-muted text-neutral-300",
  queued: "border-info-500/40 bg-info-500/10 text-info-300",
  sent: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  delivered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  awaiting_receipt: "border-info-500/40 bg-info-500/10 text-info-300",
  undelivered: "border-error-500/40 bg-error-500/10 text-error-300",
  clicked: "border-primary/60 bg-primary/20 text-primary",
}

export function NodeSmsAnalytics({
  journeyId,
  runId,
  run,
  nodeId,
  nodeLabel,
}: NodeSmsAnalyticsProps) {
  // Run scope drives everything; no slicing filters on this view.
  const filters = EMPTY_FILTERS
  const [mode, setMode] = React.useState<AnalyticsMode>("this_run")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<SmsStatus | "all">(
    "all",
  )
  const [openTimeline, setOpenTimeline] = React.useState<string | null>(null)

  const settings = React.useMemo(() => loadJourneySettings(journeyId), [journeyId])
  const data = React.useMemo(
    () =>
      synthesizeSmsAnalytics(
        journeyId,
        nodeId,
        filters,
        settings.costs.smsPerSegmentAED,
        runId,
      ),
    [journeyId, nodeId, filters, settings.costs.smsPerSegmentAED, runId],
  )
  const rows = React.useMemo(
    () => listSmsBorrowerStatuses(journeyId, nodeId, filters, runId),
    [journeyId, nodeId, filters, runId],
  )

  const statusCounts = React.useMemo(() => {
    const c: Record<SmsStatus, number> = {
      not_sent: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      awaiting_receipt: 0,
      undelivered: 0,
      clicked: 0,
    }
    for (const r of rows) c[r.status as SmsStatus]++
    return c
  }, [rows])

  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (!q) return true
      return (
        r.borrowerName.toLowerCase().includes(q) ||
        r.borrowerId.toLowerCase().includes(q) ||
        r.phone.includes(q)
      )
    })
  }, [rows, query, statusFilter])

  const exportCsv = () => {
    const headers = [
      "borrower_id",
      "name",
      "status",
      "reason",
      "attributed_ptp_aed",
      "attributed_payment_aed",
    ]
    const csv = [
      headers.join(","),
      ...filteredRows.map((r) =>
        [
          r.borrowerId,
          `"${r.borrowerName.replace(/"/g, '""')}"`,
          r.status,
          r.reason ?? "",
          r.attributedPTP ?? "",
          r.attributedPayment ?? "",
        ].join(","),
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${nodeLabel.replace(/\s+/g, "_")}-sms.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border bg-muted/[0.04] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-medium text-foreground">
            {run.label}
          </span>
          <span
            className={cn(
              "rounded px-1 py-px text-[9px] font-medium uppercase tracking-wider",
              run.status === "completed" && "bg-primary/15 text-primary",
              run.status === "running" && "bg-info-500/15 text-info-300",
              run.status === "failed" && "bg-error-500/15 text-error-300",
              run.status === "queued" && "bg-muted text-neutral-300",
            )}
          >
            {run.status}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          <Clock className="mr-0.5 inline h-2.5 w-2.5" />
          {formatRunAge(run)} · {run.enrolled.toLocaleString()} enrolled /{" "}
          {run.resolved.toLocaleString()} resolved
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <ModeToggle value={mode} onChange={setMode} />
        <p className="truncate text-[9.5px] text-muted-foreground">
          {mode === "this_run"
            ? `Scoped to this run · attribution ${settings.defaultAttributionDays}d`
            : mode === "compare"
              ? "Side-by-side across picked runs"
              : "Runs rolled up by period"}
        </p>
      </div>

      {mode === "compare" && (
        <div className="flex-1 overflow-y-auto">
          <CompareRunsView
            journeyId={journeyId}
            nodeId={nodeId}
            channel="sms"
          />
        </div>
      )}

      {mode === "over_time" && (
        <div className="flex-1 overflow-y-auto">
          <OverTimeView
            journeyId={journeyId}
            nodeId={nodeId}
            channel="sms"
          />
        </div>
      )}

      {mode === "this_run" && (
      <div className="flex-1 overflow-y-auto">
        <FunnelStrip
          items={[
            { id: "reached", value: data.funnel.reached },
            { id: "sent", value: data.funnel.sent },
            { id: "delivered", value: data.funnel.delivered, rateOf: data.funnel.sent },
            {
              id: "unique_clicks",
              value: data.funnel.uniqueClicks,
              rateOf: data.funnel.delivered,
            },
            {
              id: "converted",
              value: data.funnel.converted,
              rateOf: data.funnel.delivered,
              rateLabel: "CR%",
            },
          ]}
        />

        {/* Section: Delivery */}
        <Section title="Delivery">
          <TileGrid>
            <Tile id="sent" value={data.delivery.sent} />
            <Tile id="delivered" value={data.delivery.delivered} />
            <Tile id="delivery_rate" value={data.delivery.deliveryRate} />
            <Tile id="queued" value={data.delivery.queued} />
            <Tile id="awaiting_receipt" value={data.delivery.awaitingReceipt} />
            <Tile id="opt_out_rate" value={data.delivery.optOutRate} />
          </TileGrid>

          <SubBlock title="Not sent — by reason">
            {data.delivery.notSent.length === 0 ? (
              <EmptyRow>Every eligible borrower was sent.</EmptyRow>
            ) : (
              <table className="w-full text-[11px]">
                <tbody>
                  {data.delivery.notSent.map((r) => (
                    <tr key={r.reason} className="border-b border-border/40">
                      <td className="py-1 pr-2 text-foreground">
                        {NOT_SENT_REASON_LABEL[r.reason]}
                      </td>
                      <td className="py-1 pr-2 text-muted-foreground">
                        {r.detail ?? ""}
                      </td>
                      <td className="py-1 text-right font-medium tabular-nums">
                        {r.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SubBlock>

          <SubBlock title="Undelivered — by operator code">
            {data.delivery.undelivered.length === 0 ? (
              <EmptyRow>No undelivered reports.</EmptyRow>
            ) : (
              <table className="w-full text-[11px]">
                <tbody>
                  {data.delivery.undelivered.map((u) => (
                    <tr key={u.code} className="border-b border-border/40">
                      <td className="py-1 pr-2 font-mono text-[10.5px] text-foreground">
                        {u.code}
                      </td>
                      <td className="py-1 pr-2 text-muted-foreground">
                        {u.label}
                      </td>
                      <td className="py-1 text-right font-medium tabular-nums">
                        {u.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-2 text-[10px] text-muted-foreground">
              Expired: {data.delivery.expired.toLocaleString()}
            </div>
          </SubBlock>

          <SubBlock title="Segments & cost">
            <div className="grid grid-cols-2 gap-1.5">
              <MiniTile
                label="Segments sent"
                value={data.delivery.segmentsSent.toLocaleString()}
              />
              <MiniTile
                label="GSM-7 / UCS-2"
                value={`${data.delivery.gsm7} / ${data.delivery.ucs2}`}
              />
              <MiniTile
                label="Estimated cost"
                value={fmt("estimated_cost", data.delivery.estimatedCost)}
                hint="Segments × per-segment rate. TODO: per-segment rate comes from Lender Configurations."
              />
            </div>
          </SubBlock>

          <SubBlock title="By number position (cascade)">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1">#</th>
                  <th className="py-1 text-right">Sent</th>
                  <th className="py-1 text-right">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {data.delivery.byNumberPosition.map((n) => (
                  <tr key={n.position} className="border-b border-border/40">
                    <td className="py-1">
                      {n.position === 1 ? "First" : `Fallback ${n.position - 1}`}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {n.sent.toLocaleString()}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {n.delivered.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SubBlock>

          <SubBlock title="By country">
            <table className="w-full text-[11px]">
              <tbody>
                {data.delivery.byCountry.map((c) => (
                  <tr key={c.country} className="border-b border-border/40">
                    <td className="py-1 text-foreground">{c.country}</td>
                    <td className="py-1 text-right tabular-nums">
                      {c.sent.toLocaleString()} sent
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {c.delivered.toLocaleString()} delivered
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SubBlock>

          <SubBlock title="By sender ID">
            <table className="w-full text-[11px]">
              <tbody>
                {data.delivery.bySenderId.map((s) => (
                  <tr key={s.senderId} className="border-b border-border/40">
                    <td className="py-1 font-mono text-[10.5px]">{s.senderId}</td>
                    <td className="py-1 text-right tabular-nums">
                      {s.sent.toLocaleString()} sent
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {s.delivered.toLocaleString()} delivered
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SubBlock>
        </Section>

        {/* Section: Engagement */}
        <Section title="Engagement">
          <TileGrid>
            <Tile id="unique_clicks" value={data.engagement.uniqueClicks} />
            <Tile id="ctr" value={data.engagement.ctr} />
          </TileGrid>

          <SubBlock title="CTA breakdown">
            {data.engagement.ctaBreakdown.length === 0 ? (
              <EmptyRow>No tracked links yet.</EmptyRow>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1">URL</th>
                    <th className="py-1">CTA</th>
                    <th className="py-1 text-right">Clicks</th>
                    <th className="py-1 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.engagement.ctaBreakdown.map((c) => (
                    <tr key={c.linkId} className="border-b border-border/40">
                      <td className="max-w-[160px] truncate py-1 font-mono text-[10.5px]">
                        {c.url}
                      </td>
                      <td className="py-1">{CTA_LABEL[c.cta]}</td>
                      <td className="py-1 text-right tabular-nums">
                        {c.clicks.toLocaleString()}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {(c.ctr * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SubBlock>

          <div className="grid grid-cols-2 gap-1.5">
            <MiniTile
              label="Replies"
              value={data.replies.toLocaleString()}
              hint="Inbound SMS captured on the sender number."
            />
            <MiniTile
              label="STOP opt-outs"
              value={data.stopOptOuts.toLocaleString()}
              tone="warn"
            />
          </div>
        </Section>

        {/* Section: Outcomes */}
        <Section title="Outcomes">
          <TileGrid>
            <Tile id="ptp_count" value={data.outcomes.ptpCount} />
            <Tile id="ptp_amount" value={data.outcomes.ptpAmount} />
            <Tile id="ptp_kept_rate" value={data.outcomes.ptpKeptRate} />
            <Tile id="ptp_broken" value={data.outcomes.ptpBroken} />
            <Tile id="borrowed_amount" value={data.outcomes.borrowedAmount} />
            <Tile id="collection" value={data.outcomes.collection} />
            <Tile id="recovery_pct" value={data.outcomes.recoveryPct} />
            <Tile id="cr_pct" value={data.outcomes.crPct} />
            <Tile id="sms_per_borrower" value={data.outcomes.smsPerBorrower} />
          </TileGrid>
        </Section>

        {/* Borrower list */}
        <Section title="Borrowers">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search borrower…"
              className="h-7 w-full rounded border border-input bg-transparent pl-7 pr-2 text-[11px] outline-none focus-visible:border-ring dark:bg-input/30"
            />
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <StatusChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              All · {rows.length}
            </StatusChip>
            {(Object.keys(SMS_STATUS_LABEL) as SmsStatus[]).map((s) =>
              statusCounts[s] > 0 ? (
                <StatusChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                  tone={STATUS_TONE[s]}
                >
                  {SMS_STATUS_LABEL[s]} · {statusCounts[s]}
                </StatusChip>
              ) : null,
            )}
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
              className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              <Download className="h-2.5 w-2.5" />
              CSV
            </button>
          </div>

          {filteredRows.length === 0 ? (
            <EmptyRow>
              {rows.length === 0 ? "No borrowers." : "No matches."}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border rounded border border-border">
              {filteredRows.slice(0, 50).map((r) => (
                <li key={r.borrowerId}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenTimeline((v) =>
                        v === r.borrowerId ? null : r.borrowerId,
                      )
                    }
                    className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted/20"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {r.borrowerName}
                        </span>
                        <span
                          className={cn(
                            "rounded border px-1 py-px text-[9px] font-medium uppercase tracking-wider",
                            STATUS_TONE[r.status as SmsStatus],
                          )}
                        >
                          {SMS_STATUS_LABEL[r.status as SmsStatus]}
                        </span>
                      </div>
                      <div className="truncate text-[9.5px] text-muted-foreground">
                        {r.phone} · {r.dpdBucket} DPD · {r.product}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
                        openTimeline === r.borrowerId && "rotate-90",
                      )}
                    />
                  </button>
                  {openTimeline === r.borrowerId && (
                    <BorrowerTimeline row={r} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      )}
    </div>
  )
}

/* ─────────── Visual primitives (same shape as email) ─────────── */

function FunnelStrip({
  items,
}: {
  items: Array<{
    id: MessageMetricId
    value: number
    rateOf?: number
    rateLabel?: string
  }>
}) {
  return (
    <div className="border-b border-border bg-muted/[0.02] px-3 py-2">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {items.map((i) => {
          const d = METRIC_DEFINITIONS[i.id]
          const rate = i.rateOf && i.rateOf > 0 ? i.value / i.rateOf : null
          return (
            <div
              key={i.id}
              title={d.description}
              className="rounded border border-border/60 bg-background/50 px-2 py-1.5"
            >
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {d.short ?? d.label}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground">
                {i.value.toLocaleString()}
              </div>
              {rate != null && (
                <div className="text-[10px] font-medium text-primary">
                  {(rate * 100).toFixed(1)}% {i.rateLabel ?? ""}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/60 px-3 py-2.5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border/60 bg-background/40 px-2.5 py-2">
      <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  )
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{children}</div>
}

function Tile({ id, value }: { id: MessageMetricId; value: number }) {
  const d = METRIC_DEFINITIONS[id]
  const str = fmt(id, value)
  return (
    <div
      title={d.description}
      className="rounded border border-border/60 bg-background/50 px-2 py-1.5"
    >
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {d.label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[13px] font-semibold tabular-nums",
          d.tone === "primary" && "text-primary",
          d.tone === "info" && "text-info-300",
          d.tone === "warn" && "text-warning-300",
          d.tone === "muted" && "text-muted-foreground",
          !d.tone && "text-foreground",
        )}
      >
        {str}
      </div>
    </div>
  )
}

function MiniTile({
  label,
  value,
  tone = "muted",
  hint,
}: {
  label: string
  value: React.ReactNode
  tone?: "primary" | "info" | "warn" | "muted"
  hint?: string
}) {
  return (
    <div
      title={hint}
      className="rounded border border-border/60 bg-background/40 px-2 py-1.5"
    >
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[12px] font-semibold",
          tone === "primary" && "text-primary",
          tone === "info" && "text-info-300",
          tone === "warn" && "text-warning-300",
          tone === "muted" && "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-border bg-muted/10 px-2 py-2 text-center text-[10.5px] text-muted-foreground">
      <Info className="mr-1 inline h-2.5 w-2.5" />
      {children}
    </div>
  )
}

function StatusChip({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean
  onClick: () => void
  tone?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? tone ?? "border-border bg-background text-foreground"
          : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function BorrowerTimeline({ row }: { row: BorrowerStatusRow }) {
  return (
    <div className="border-t border-border/40 bg-muted/[0.03] px-3 py-2">
      {row.timeline.length === 0 ? (
        <div className="text-[10.5px] text-muted-foreground">
          No events recorded yet.
        </div>
      ) : (
        <ol className="space-y-1">
          {row.timeline.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-[10.5px]">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground">
                  <MessageSquare className="mr-1 inline h-2.5 w-2.5" />
                  {e.event}
                  {e.detail ? (
                    <span className="ml-1 text-muted-foreground">
                      · {e.detail}
                    </span>
                  ) : null}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {new Date(e.at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {(row.attributedPTP || row.attributedPayment) && (
        <div className="mt-2 flex gap-1.5">
          {row.attributedPTP && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-medium text-primary">
              PTP: {formatAED(row.attributedPTP)}
            </span>
          )}
          {row.attributedPayment && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-300">
              Paid: {formatAED(row.attributedPayment)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
