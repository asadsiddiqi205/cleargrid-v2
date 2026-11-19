"use client"

/**
 * Message-campaign tables for the Journey Report tab.
 *
 * Growth's DRD treats each Send Email / Send SMS node as one "campaign"
 * row: id = nodeId, name = node label. This module renders four tables:
 *   Email performance, Email reachability, SMS performance, SMS reachability.
 * Each table shares the AnalyticsFilterBar; every row clicks through to
 * the node's Analytics tab with the same filters applied via query params.
 *
 * TODO (backend contract): on CSV export the active filters are embedded
 * in the file name. When the API lands, the query params below map to
 * an endpoint filter object so the server can produce the same slice.
 */

import * as React from "react"
import Link from "next/link"
import type { Node } from "@xyflow/react"
import { Download, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AnalyticsFilterBar,
  EMPTY_FILTERS,
  type AnalyticsFilters,
} from "./analytics-filter-bar"
import {
  synthesizeEmailAnalytics,
  synthesizeSmsAnalytics,
  DEMO_SENDERS,
} from "@/data/message-analytics"
import { fmt, CTA_LABEL } from "@/data/journey-metrics"
import { classifyNode } from "@/data/journey-analytics"
import { loadJourneySettings } from "@/data/journey-settings"

/* ─────────── Collectors ─────────── */

function messageNodes(nodes: Node[], kind: "email" | "sms") {
  return nodes.filter((n) => {
    const data = (n.data ?? {}) as { blockType?: string }
    const k = classifyNode(n.type ?? "", data.blockType, n.data?.label as string)
    return k === (kind === "email" ? "message_email" : "message_sms")
  })
}

interface EmailPerfRow {
  campaignId: string
  campaignName: string
  openRate: number
  uniqueClicks: number
  ctr: number
  clickToOpenRate: number
  calls: number
  offers: number
  ptp: number
  borrowed: number
  collection: number
  recoveryPct: number
  crPct: number
  deliveryRate: number
  uniqueOpens: number
  timeToFirstOpen: number
  ctaCtrByType: Record<string, number>
  ptpKeptRate: number
  ptpBroken: number
  ptpAmount: number
  extension: number
  deferral: number
  emailsPerBorrower: number
}

interface EmailReachRow {
  campaignId: string
  campaignName: string
  sent: number
  delivered: number
  hardBounces: number
  softBounces: number
  domainUsed: string
  domainReputation: number | null
  spamRate: number
  optOutRate: number
  invalidRate: number
}

interface SmsPerfRow {
  campaignId: string
  campaignName: string
  uniqueClicks: number
  ctr: number
  calls: number
  offers: number
  ptp: number
  borrowed: number
  collection: number
  recoveryPct: number
  crPct: number
  deliveryRate: number
  ctaCtrByType: Record<string, number>
  ptpKeptRate: number
  ptpBroken: number
  ptpAmount: number
  extension: number
  deferral: number
  smsPerBorrower: number
}

interface SmsReachRow {
  campaignId: string
  campaignName: string
  sent: number
  delivered: number
  undelivered: number
  awaitingReceipt: number
  segments: number
  cost: number
  senderId: string
  optOutRate: number
}

/* ─────────── Table component ─────────── */

export function MessageCampaignTables({
  journeyId,
  nodes,
}: {
  journeyId: string
  nodes: Node[]
}) {
  const [filters, setFilters] = React.useState<AnalyticsFilters>(EMPTY_FILTERS)
  const settings = React.useMemo(() => loadJourneySettings(journeyId), [journeyId])

  const emailNodes = React.useMemo(() => messageNodes(nodes, "email"), [nodes])
  const smsNodesList = React.useMemo(() => messageNodes(nodes, "sms"), [nodes])

  const emailPerf: EmailPerfRow[] = React.useMemo(
    () =>
      emailNodes.map((n) => {
        const a = synthesizeEmailAnalytics(journeyId, n.id, filters)
        const ctaCtrByType = a.engagement.ctaBreakdown.reduce<Record<string, number>>(
          (acc, c) => {
            acc[c.cta] = (acc[c.cta] ?? 0) + c.ctr
            return acc
          },
          {},
        )
        return {
          campaignId: n.id,
          campaignName: (n.data?.label as string) ?? n.id,
          openRate: a.engagement.openRate,
          uniqueClicks: a.engagement.uniqueClicks,
          ctr: a.engagement.ctr,
          clickToOpenRate: a.engagement.clickToOpenRate,
          calls: a.outcomes.callsInitiated,
          offers: a.outcomes.offersAccepted,
          ptp: a.outcomes.ptpCount,
          borrowed: a.outcomes.borrowedAmount,
          collection: a.outcomes.collection,
          recoveryPct: a.outcomes.recoveryPct,
          crPct: a.outcomes.crPct,
          deliveryRate: a.delivery.deliveryRate,
          uniqueOpens: a.engagement.uniqueOpens,
          timeToFirstOpen: a.engagement.timeToFirstOpenHours,
          ctaCtrByType,
          ptpKeptRate: a.outcomes.ptpKeptRate,
          ptpBroken: a.outcomes.ptpBroken,
          ptpAmount: a.outcomes.ptpAmount,
          extension: a.outcomes.extension,
          deferral: a.outcomes.deferral,
          emailsPerBorrower: a.outcomes.emailsPerBorrower,
        }
      }),
    [emailNodes, journeyId, filters],
  )

  const emailReach: EmailReachRow[] = React.useMemo(
    () =>
      emailNodes.map((n) => {
        const a = synthesizeEmailAnalytics(journeyId, n.id, filters)
        const top = a.delivery.senderBreakdown[0] ?? {
          domain: DEMO_SENDERS[0].domain,
          domainReputation: 85 as number | null,
        }
        return {
          campaignId: n.id,
          campaignName: (n.data?.label as string) ?? n.id,
          sent: a.delivery.sent,
          delivered: a.delivery.delivered,
          hardBounces: a.delivery.hardBounces,
          softBounces:
            a.delivery.softBouncesRetrying + a.delivery.softBouncesFinal,
          domainUsed: top.domain,
          domainReputation: top.domainReputation,
          spamRate: a.delivery.spamRate,
          optOutRate: a.delivery.optOutRate,
          invalidRate: a.delivery.invalidEmailsRate,
        }
      }),
    [emailNodes, journeyId, filters],
  )

  const smsPerf: SmsPerfRow[] = React.useMemo(
    () =>
      smsNodesList.map((n) => {
        const a = synthesizeSmsAnalytics(
          journeyId,
          n.id,
          filters,
          settings.costs.smsPerSegmentAED,
        )
        const ctaCtrByType = a.engagement.ctaBreakdown.reduce<Record<string, number>>(
          (acc, c) => {
            acc[c.cta] = (acc[c.cta] ?? 0) + c.ctr
            return acc
          },
          {},
        )
        return {
          campaignId: n.id,
          campaignName: (n.data?.label as string) ?? n.id,
          uniqueClicks: a.engagement.uniqueClicks,
          ctr: a.engagement.ctr,
          calls: a.outcomes.callsInitiated,
          offers: a.outcomes.offersAccepted,
          ptp: a.outcomes.ptpCount,
          borrowed: a.outcomes.borrowedAmount,
          collection: a.outcomes.collection,
          recoveryPct: a.outcomes.recoveryPct,
          crPct: a.outcomes.crPct,
          deliveryRate: a.delivery.deliveryRate,
          ctaCtrByType,
          ptpKeptRate: a.outcomes.ptpKeptRate,
          ptpBroken: a.outcomes.ptpBroken,
          ptpAmount: a.outcomes.ptpAmount,
          extension: a.outcomes.extension,
          deferral: a.outcomes.deferral,
          smsPerBorrower: a.outcomes.smsPerBorrower,
        }
      }),
    [smsNodesList, journeyId, filters, settings.costs.smsPerSegmentAED],
  )

  const smsReach: SmsReachRow[] = React.useMemo(
    () =>
      smsNodesList.map((n) => {
        const a = synthesizeSmsAnalytics(
          journeyId,
          n.id,
          filters,
          settings.costs.smsPerSegmentAED,
        )
        const topSender = a.delivery.bySenderId[0]?.senderId ?? "MASHREQ"
        return {
          campaignId: n.id,
          campaignName: (n.data?.label as string) ?? n.id,
          sent: a.delivery.sent,
          delivered: a.delivery.delivered,
          undelivered: a.delivery.undelivered.reduce((s, u) => s + u.count, 0),
          awaitingReceipt: a.delivery.awaitingReceipt,
          segments: a.delivery.segmentsSent,
          cost: a.delivery.estimatedCost,
          senderId: topSender,
          optOutRate: a.delivery.optOutRate,
        }
      }),
    [smsNodesList, journeyId, filters, settings.costs.smsPerSegmentAED],
  )

  const filterTag = React.useMemo(() => {
    const parts: string[] = []
    if (filters.dateStart || filters.dateEnd)
      parts.push(`${filters.dateStart ?? "..."}_${filters.dateEnd ?? "..."}`)
    if (filters.dpdBuckets.length) parts.push(`dpd-${filters.dpdBuckets.join("-")}`)
    if (filters.lenderIds.length) parts.push(`lender-${filters.lenderIds.join("-")}`)
    return parts.length > 0 ? `__${parts.join("__")}` : ""
  }, [filters])

  const exportCsv = (
    rows: Array<Record<string, string | number | null>>,
    name: string,
  ) => {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const body = rows
      .map((r) =>
        headers
          .map((h) => {
            const v = r[h]
            if (v == null) return ""
            if (typeof v === "string") return `"${v.replace(/"/g, '""')}"`
            return String(v)
          })
          .join(","),
      )
      .join("\n")
    const csv = [headers.join(","), body].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}${filterTag}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  const rowHref = (nodeId: string) =>
    `/journeys/${journeyId}?node=${encodeURIComponent(nodeId)}&tab=analytics`

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-foreground">
            Message campaigns
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Each Send Email / Send SMS node in the journey as one campaign row.
            Outcomes attributed within {settings.defaultAttributionDays} days.
          </p>
        </div>
      </div>

      <AnalyticsFilterBar value={filters} onChange={setFilters} />

      {emailNodes.length === 0 && smsNodesList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 p-10 text-center">
          <p className="text-[14px] text-muted-foreground">
            No Send Email or Send SMS nodes in this journey yet.
          </p>
        </div>
      ) : (
        <>
          {emailNodes.length > 0 && (
            <>
              <TableCard
                title="Email performance"
                onExport={() =>
                  exportCsv(
                    emailPerf.map((r) => ({
                      campaign_id: r.campaignId,
                      campaign_name: r.campaignName,
                      open_rate: r.openRate,
                      unique_clicks: r.uniqueClicks,
                      ctr_pct: r.ctr,
                      click_to_open_rate: r.clickToOpenRate,
                      replies: "", // TODO: no inbound email source yet
                      ptp: r.ptp,
                      borrowed_amount: r.borrowed,
                      collection: r.collection,
                      recovery_pct: r.recoveryPct,
                      cr_pct: r.crPct,
                      delivery_rate: r.deliveryRate,
                      unique_opens: r.uniqueOpens,
                      time_to_first_open_hours: r.timeToFirstOpen,
                      ptp_kept_rate: r.ptpKeptRate,
                      ptp_broken: r.ptpBroken,
                      ptp_amount: r.ptpAmount,
                      emails_per_borrower: r.emailsPerBorrower,
                    })),
                    "email-performance",
                  )
                }
              >
                <PerfTable
                  rows={emailPerf}
                  rowHref={rowHref}
                  columns={EMAIL_PERF_COLUMNS}
                />
              </TableCard>

              <TableCard
                title="Email reachability"
                onExport={() =>
                  exportCsv(
                    emailReach.map((r) => ({
                      campaign_id: r.campaignId,
                      campaign_name: r.campaignName,
                      emails_sent: r.sent,
                      emails_delivered: r.delivered,
                      hard_bounces: r.hardBounces,
                      soft_bounces: r.softBounces,
                      domain_used: r.domainUsed,
                      domain_reputation: r.domainReputation ?? "",
                      spam_rate: r.spamRate,
                      opt_out_rate: r.optOutRate,
                      inbox_rate: "", // TODO: needs placement source
                      invalid_emails_rate: r.invalidRate,
                    })),
                    "email-reachability",
                  )
                }
              >
                <ReachTable
                  rows={emailReach}
                  rowHref={rowHref}
                  columns={EMAIL_REACH_COLUMNS}
                />
              </TableCard>
            </>
          )}

          {smsNodesList.length > 0 && (
            <>
              <TableCard
                title="SMS performance"
                onExport={() =>
                  exportCsv(
                    smsPerf.map((r) => ({
                      campaign_id: r.campaignId,
                      campaign_name: r.campaignName,
                      unique_clicks: r.uniqueClicks,
                      ctr_pct: r.ctr,
                      replies: "", // TODO: no inbound capture source yet
                      ptp: r.ptp,
                      borrowed_amount: r.borrowed,
                      collection: r.collection,
                      recovery_pct: r.recoveryPct,
                      cr_pct: r.crPct,
                      delivery_rate: r.deliveryRate,
                      ptp_kept_rate: r.ptpKeptRate,
                      ptp_broken: r.ptpBroken,
                      ptp_amount: r.ptpAmount,
                      sms_per_borrower: r.smsPerBorrower,
                    })),
                    "sms-performance",
                  )
                }
              >
                <PerfTable
                  rows={smsPerf.map((r) => ({ ...r, isSms: true }))}
                  rowHref={rowHref}
                  columns={SMS_PERF_COLUMNS}
                />
              </TableCard>

              <TableCard
                title="SMS reachability"
                onExport={() =>
                  exportCsv(
                    smsReach.map((r) => ({
                      campaign_id: r.campaignId,
                      campaign_name: r.campaignName,
                      sent: r.sent,
                      delivered: r.delivered,
                      undelivered: r.undelivered,
                      awaiting_receipt: r.awaitingReceipt,
                      segments_sent: r.segments,
                      estimated_cost_aed: r.cost,
                      sender_id: r.senderId,
                      opt_out_rate: r.optOutRate,
                    })),
                    "sms-reachability",
                  )
                }
              >
                <ReachTable
                  rows={smsReach}
                  rowHref={rowHref}
                  columns={SMS_REACH_COLUMNS}
                />
              </TableCard>
            </>
          )}

          <p className="text-[10px] text-muted-foreground">
            Note: &quot;Emails Reached&quot; is intentionally omitted — the DRD flagged
            it as undefined. TODO (Growth): agree on a definition before adding.
          </p>
        </>
      )}
    </section>
  )
}

/* ─────────── Column specs ─────────── */

type Column<R> = {
  key: keyof R | string
  label: string
  render?: (row: R) => React.ReactNode
  title?: string
  right?: boolean
}

const EMAIL_PERF_COLUMNS: Array<Column<EmailPerfRow>> = [
  { key: "campaignId", label: "ID", render: (r) => <span className="font-mono text-[10px]">{r.campaignId}</span> },
  { key: "campaignName", label: "Campaign" },
  { key: "openRate", label: "Open rate", right: true, render: (r) => fmt("open_rate", r.openRate) },
  { key: "uniqueClicks", label: "Clicks", right: true, render: (r) => r.uniqueClicks.toLocaleString() },
  { key: "ctr", label: "CTR", right: true, render: (r) => fmt("ctr", r.ctr) },
  { key: "clickToOpenRate", label: "CTOR", right: true, render: (r) => fmt("click_to_open_rate", r.clickToOpenRate) },
  { key: "replies", label: "Replies", right: true, render: () => <span className="italic text-muted-foreground">N/A</span>, title: "Needs inbound email capture." },
  { key: "ptp", label: "PTP", right: true, render: (r) => r.ptp.toLocaleString() },
  { key: "borrowed", label: "Borrowed", right: true, render: (r) => fmt("borrowed_amount", r.borrowed) },
  { key: "collection", label: "Collection", right: true, render: (r) => fmt("collection", r.collection) },
  { key: "recoveryPct", label: "Rec%", right: true, render: (r) => fmt("recovery_pct", r.recoveryPct) },
  { key: "crPct", label: "CR%", right: true, render: (r) => fmt("cr_pct", r.crPct) },
  { key: "deliveryRate", label: "Delivery", right: true, render: (r) => fmt("delivery_rate", r.deliveryRate) },
  { key: "uniqueOpens", label: "Opens", right: true, render: (r) => r.uniqueOpens.toLocaleString() },
  { key: "timeToFirstOpen", label: "Time-to-open", right: true, render: (r) => fmt("time_to_first_open", r.timeToFirstOpen) },
  {
    key: "ctaCtrByType",
    label: "CTA CTR",
    render: (r) => (
      <span className="font-mono text-[10px]">
        {Object.entries(r.ctaCtrByType)
          .map(([k, v]) => `${CTA_LABEL[k as keyof typeof CTA_LABEL] ?? k} ${(v * 100).toFixed(1)}%`)
          .join(" · ")}
      </span>
    ),
  },
  { key: "ptpKeptRate", label: "PTP kept", right: true, render: (r) => fmt("ptp_kept_rate", r.ptpKeptRate) },
  { key: "ptpBroken", label: "PTP broken", right: true, render: (r) => r.ptpBroken.toLocaleString() },
  { key: "ptpAmount", label: "PTP AED", right: true, render: (r) => fmt("ptp_amount", r.ptpAmount) },
  { key: "emailsPerBorrower", label: "Em/borrower", right: true, render: (r) => r.emailsPerBorrower.toFixed(2) },
]

const EMAIL_REACH_COLUMNS: Array<Column<EmailReachRow>> = [
  { key: "campaignId", label: "ID", render: (r) => <span className="font-mono text-[10px]">{r.campaignId}</span> },
  { key: "campaignName", label: "Campaign" },
  { key: "sent", label: "Sent", right: true, render: (r) => r.sent.toLocaleString() },
  { key: "delivered", label: "Delivered", right: true, render: (r) => r.delivered.toLocaleString() },
  { key: "hardBounces", label: "Hard b.", right: true, render: (r) => r.hardBounces.toLocaleString() },
  { key: "softBounces", label: "Soft b.", right: true, render: (r) => r.softBounces.toLocaleString() },
  { key: "domainUsed", label: "Domain" },
  {
    key: "domainReputation",
    label: "Reputation",
    right: true,
    render: (r) =>
      r.domainReputation == null ? (
        <span className="italic text-muted-foreground">N/A</span>
      ) : (
        r.domainReputation
      ),
    title: "Needs a provider or Google Postmaster feed.",
  },
  { key: "spamRate", label: "Spam", right: true, render: (r) => fmt("spam_rate", r.spamRate) },
  { key: "optOutRate", label: "Opt-out", right: true, render: (r) => fmt("opt_out_rate", r.optOutRate) },
  {
    key: "inboxRate",
    label: "Inbox",
    right: true,
    render: () => <span className="italic text-muted-foreground">N/A</span>,
    title: "Needs inbox-placement source (Postmaster, Litmus).",
  },
  {
    key: "invalidRate",
    label: "Invalid",
    right: true,
    render: (r) => fmt("invalid_emails_rate", r.invalidRate),
  },
]

const SMS_PERF_COLUMNS: Array<Column<SmsPerfRow & { isSms: boolean }>> = [
  { key: "campaignId", label: "ID", render: (r) => <span className="font-mono text-[10px]">{r.campaignId}</span> },
  { key: "campaignName", label: "Campaign" },
  { key: "uniqueClicks", label: "Clicks", right: true, render: (r) => r.uniqueClicks.toLocaleString() },
  { key: "ctr", label: "CTR", right: true, render: (r) => fmt("ctr", r.ctr) },
  { key: "ptp", label: "PTP", right: true, render: (r) => r.ptp.toLocaleString() },
  { key: "borrowed", label: "Borrowed", right: true, render: (r) => fmt("borrowed_amount", r.borrowed) },
  { key: "collection", label: "Collection", right: true, render: (r) => fmt("collection", r.collection) },
  { key: "recoveryPct", label: "Rec%", right: true, render: (r) => fmt("recovery_pct", r.recoveryPct) },
  { key: "crPct", label: "CR%", right: true, render: (r) => fmt("cr_pct", r.crPct) },
  { key: "deliveryRate", label: "Delivery", right: true, render: (r) => fmt("delivery_rate", r.deliveryRate) },
  {
    key: "ctaCtrByType",
    label: "CTA CTR",
    render: (r) => (
      <span className="font-mono text-[10px]">
        {Object.entries(r.ctaCtrByType)
          .map(([k, v]) => `${CTA_LABEL[k as keyof typeof CTA_LABEL] ?? k} ${(v * 100).toFixed(1)}%`)
          .join(" · ")}
      </span>
    ),
  },
  { key: "ptpKeptRate", label: "PTP kept", right: true, render: (r) => fmt("ptp_kept_rate", r.ptpKeptRate) },
  { key: "ptpBroken", label: "PTP broken", right: true, render: (r) => r.ptpBroken.toLocaleString() },
  { key: "ptpAmount", label: "PTP AED", right: true, render: (r) => fmt("ptp_amount", r.ptpAmount) },
  { key: "smsPerBorrower", label: "SMS/borrower", right: true, render: (r) => r.smsPerBorrower.toFixed(2) },
]

const SMS_REACH_COLUMNS: Array<Column<SmsReachRow>> = [
  { key: "campaignId", label: "ID", render: (r) => <span className="font-mono text-[10px]">{r.campaignId}</span> },
  { key: "campaignName", label: "Campaign" },
  { key: "sent", label: "Sent", right: true, render: (r) => r.sent.toLocaleString() },
  { key: "delivered", label: "Delivered", right: true, render: (r) => r.delivered.toLocaleString() },
  { key: "undelivered", label: "Undelivered", right: true, render: (r) => r.undelivered.toLocaleString() },
  { key: "awaitingReceipt", label: "Awaiting", right: true, render: (r) => r.awaitingReceipt.toLocaleString() },
  { key: "segments", label: "Segments", right: true, render: (r) => r.segments.toLocaleString() },
  { key: "cost", label: "Cost", right: true, render: (r) => fmt("estimated_cost", r.cost) },
  { key: "senderId", label: "Sender" },
  { key: "optOutRate", label: "Opt-out", right: true, render: (r) => fmt("opt_out_rate", r.optOutRate) },
]

/* ─────────── Primitives ─────────── */

function TableCard({
  title,
  onExport,
  children,
}: {
  title: string
  onExport: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-muted"
        >
          <Download className="h-2.5 w-2.5" /> CSV
        </button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function PerfTable<R extends { campaignId: string }>({
  rows,
  columns,
  rowHref,
}: {
  rows: R[]
  columns: Array<Column<R>>
  rowHref: (id: string) => string
}) {
  return (
    <table className="w-full min-w-[800px] text-[11px]">
      <thead>
        <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
          {columns.map((c) => (
            <th
              key={String(c.key)}
              title={c.title}
              className={cn("whitespace-nowrap py-1.5 pr-2", c.right && "text-right")}
            >
              {c.label}
            </th>
          ))}
          <th className="py-1.5 pr-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.campaignId}
            className="border-t border-border/40 hover:bg-muted/20"
          >
            {columns.map((c) => (
              <td
                key={String(c.key)}
                title={c.title}
                className={cn(
                  "whitespace-nowrap py-1.5 pr-2 tabular-nums",
                  c.right && "text-right",
                )}
              >
                {c.render ? c.render(r) : (r as Record<string, unknown>)[c.key as string] as React.ReactNode}
              </td>
            ))}
            <td className="py-1.5 pr-2 text-right">
              <Link
                href={rowHref(r.campaignId)}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline"
              >
                Open <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ReachTable<R extends { campaignId: string }>({
  rows,
  columns,
  rowHref,
}: {
  rows: R[]
  columns: Array<Column<R>>
  rowHref: (id: string) => string
}) {
  return <PerfTable rows={rows} columns={columns} rowHref={rowHref} />
}
