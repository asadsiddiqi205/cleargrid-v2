"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Info,
  User,
} from "lucide-react"
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts"
import { PageShell } from "@/components/shared/page-shell"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import {
  buildCampaignReport,
  type BreakdownRow,
  type CampaignReport,
  type ReportChannel,
} from "@/data/campaign-reports"
import { loadConversionEvents } from "@/data/conversion-events"

export default function CampaignReportPage() {
  const params = useParams<{ channel: string; id: string }>()
  const channel = (params.channel === "sms" ? "sms" : "email") as ReportChannel
  const [report, setReport] = React.useState<CampaignReport | null>(null)

  React.useEffect(() => {
    const events = loadConversionEvents()
    setReport(buildCampaignReport(params.id, events))
  }, [params.id])

  if (!report) {
    return (
      <PageShell title="Campaign report" description="">
        <div className="p-10 text-center text-[12px] text-muted-foreground">
          Loading…
        </div>
      </PageShell>
    )
  }

  const Icon = channel === "email" ? Mail : MessageSquare
  const totalConv = report.conversions.reduce((s, c) => s + c.fired, 0)
  const totalRecov = report.conversions.reduce((s, c) => s + c.recoveredAED, 0)

  return (
    <PageShell
      title={report.campaignName}
      description={`${report.audience} · sent ${new Date(report.sentAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })} · ${report.lenderName}`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link
            href={`/reports/campaigns/${channel}`}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            All {channel.toUpperCase()} campaigns
          </Link>
          <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
            <Icon className="h-3 w-3" />
            {channel === "email" ? "Email" : "SMS"} campaign
          </span>
        </div>

        {/* Funnel band */}
        <FunnelBand report={report} />

        {/* Conversion band */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-border bg-card/40">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                Conversions
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {totalConv.toLocaleString()} events · {formatAED(totalRecov)}
              </span>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-1.5 font-semibold">Event</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Fired</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Recovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.conversions.map((c) => (
                  <tr key={c.eventId}>
                    <td className="px-3 py-1.5">
                      <span className="text-foreground">{c.eventLabel}</span>
                      {!c.monetary && (
                        <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[9px] font-medium uppercase text-neutral-300">
                          Non-monetary
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                      {c.fired.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-primary">
                      {c.monetary ? formatAED(c.recoveredAED) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              <Info className="mr-1 inline h-2.5 w-2.5" />
              Windows + models come from{" "}
              <Link href="/reports/conversions" className="text-primary hover:underline">
                Conversion setup
              </Link>
              . Change them there to re-attribute this campaign.
            </p>
          </div>

          {/* Per-link click breakdown (email) OR delivery failure reasons (sms) */}
          {channel === "email" ? (
            <LinkClicksCard report={report} />
          ) : (
            <FailureReasonsCard report={report} />
          )}
        </div>

        {/* SMS carrier cost */}
        {channel === "sms" && report.smsCost && (
          <SmsCostCard report={report} />
        )}

        {/* Time series */}
        <TimeSeriesCard report={report} />

        {/* Breakdowns */}
        <BreakdownCard title="By variation" rows={report.breakdown.variations} channel={channel} />
        <BreakdownCard title="By segment" rows={report.breakdown.segments} channel={channel} />
        <BreakdownCard title="By lender" rows={report.breakdown.lenders} channel={channel} />

        {/* Borrower drill-down */}
        <BorrowerDrilldownCard report={report} />
      </div>
    </PageShell>
  )
}

/* ─────────── Funnel band ─────────── */

function FunnelBand({ report }: { report: CampaignReport }) {
  const f = report.funnel
  const cells: Array<{ label: string; value: number; caveat?: string; tone?: "primary" | "warn" | "muted" }> = [
    { label: "Recipients", value: report.recipients },
    { label: "Sent", value: f.sent },
    { label: "Delivered", value: f.delivered },
    { label: "Bounced/Failed", value: f.bounced, tone: "warn" },
  ]
  if (report.channel === "email") {
    cells.push({
      label: "Opens",
      value: f.opened ?? 0,
      caveat: "Estimated — Apple Mail Privacy Protection pre-fetches images and inflates the number.",
    })
  }
  cells.push({ label: "Clicks", value: f.clicked, tone: "primary" })
  cells.push({ label: "Unsubs / Opt-outs", value: report.optOuts })
  if (report.channel === "email") {
    cells.push({ label: "Spam complaints", value: report.spamComplaints, tone: "warn" })
  }

  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Full funnel
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        {cells.map((c) => (
          <div key={c.label} className="rounded-md border border-border/60 bg-background/50 px-2.5 py-2">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              {c.label}
              {c.caveat && (
                <span title={c.caveat} className="cursor-help">
                  <Info className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
            <div
              className={cn(
                "mt-0.5 text-[16px] font-semibold tabular-nums",
                c.tone === "primary" && "text-primary",
                c.tone === "warn" && "text-warning-300",
                c.tone === "muted" && "text-muted-foreground",
                !c.tone && "text-foreground",
              )}
            >
              {c.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── Link clicks (email) ─────────── */

function LinkClicksCard({ report }: { report: CampaignReport }) {
  if (report.linkClicks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/40 p-4 text-[11px] text-muted-foreground">
        No per-link click data available for this campaign.
      </div>
    )
  }
  const total = report.linkClicks.reduce((s, l) => s + l.clicks, 0)
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
          Clicks by link
        </h3>
        <span className="text-[10px] text-muted-foreground">{total.toLocaleString()} clicks total</span>
      </div>
      <ul className="divide-y divide-border">
        {report.linkClicks
          .slice()
          .sort((a, b) => b.clicks - a.clicks)
          .map((l) => (
            <li key={l.url} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5 text-[11px]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-foreground">{l.label}</span>
                  {l.isPayment && (
                    <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-medium uppercase text-primary">
                      Payment
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">{l.url}</div>
              </div>
              <span className="tabular-nums text-foreground">{l.clicks.toLocaleString()}</span>
              <span className="w-12 text-right tabular-nums text-muted-foreground">
                {Math.round((l.clicks / Math.max(1, total)) * 100)}%
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}

/* ─────────── Failure reasons (sms) ─────────── */

function FailureReasonsCard({ report }: { report: CampaignReport }) {
  const total = report.failureReasons.reduce((s, r) => s + r.count, 0)
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
          Delivery failures
        </h3>
        <span className="text-[10px] text-muted-foreground">{total.toLocaleString()} failures</span>
      </div>
      <ul className="divide-y divide-border">
        {report.failureReasons.map((f) => (
          <li key={f.reason} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5 text-[11px]">
            <span className="text-foreground">{f.reason}</span>
            <span className="tabular-nums text-foreground">{f.count.toLocaleString()}</span>
            <span className="w-12 text-right tabular-nums text-muted-foreground">
              {total > 0 ? Math.round((f.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────── SMS cost ─────────── */

function SmsCostCard({ report }: { report: CampaignReport }) {
  const c = report.smsCost!
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Carrier cost — segments + encoding
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <CostCell
          label="Encoding"
          value={
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                c.encoding === "gsm7" ? "bg-primary/15 text-primary" : "bg-warning-500/15 text-warning-300",
              )}
            >
              {c.encoding}
            </span>
          }
        />
        <CostCell label="Segments / recipient" value={c.segmentsPerRecipient.toLocaleString()} />
        <CostCell label="Total segments" value={c.totalSegments.toLocaleString()} />
        <CostCell label="Estimated cost" value={formatAED(c.estimatedCostAED)} tone="primary" />
      </div>
      {c.encoding === "ucs2" && (
        <div className="mt-2 flex items-start gap-1.5 rounded border border-warning-500/30 bg-warning-500/[0.06] px-2 py-1.5 text-[10px] leading-relaxed text-warning-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <div>
            <p className="font-medium">Non-GSM characters forced UCS-2 encoding.</p>
            <p className="mt-0.5 text-warning-200/80">
              70 characters per segment instead of 160 — this campaign costs roughly{" "}
              {Math.round(c.segmentsPerRecipient * 100) / 100}× the equivalent GSM-7 send.
              Consider rewriting to Latin script or shortening the message to reduce segments.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function CostCell({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "primary" }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-[15px] font-semibold tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  )
}

/* ─────────── Time series ─────────── */

function TimeSeriesCard({ report }: { report: CampaignReport }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        14-day performance
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
              tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--color-text-tertiary)" }}
              width={40}
            />
            <RTooltip
              contentStyle={{
                background: "var(--color-bg-elevated)",
                borderRadius: 6,
                border: "1px solid var(--color-border-default)",
                fontSize: 11,
              }}
            />
            <Bar dataKey="delivered" fill="var(--cg-primary-500)" radius={[3, 3, 0, 0]} name="Delivered" />
            <Bar dataKey="conversions" fill="var(--cg-info-400)" radius={[3, 3, 0, 0]} name="Conversions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ─────────── Breakdown card ─────────── */

function BreakdownCard({
  title,
  rows,
  channel,
}: {
  title: string
  rows: BreakdownRow[]
  channel: ReportChannel
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-1.5 font-semibold">Label</th>
              <th className="px-2 py-1.5 text-right font-semibold">Recipients</th>
              <th className="px-2 py-1.5 text-right font-semibold">Delivered</th>
              <th className="px-2 py-1.5 text-right font-semibold">Clicks</th>
              <th className="px-2 py-1.5 text-right font-semibold">Conversions</th>
              <th className="px-2 py-1.5 text-right font-semibold">Recovered</th>
              <th className="px-2 py-1.5 text-right font-semibold">Conv. rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-1.5 text-foreground">{r.label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                  {r.recipients.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                  {r.delivered.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                  {r.clicked.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                  {r.conversions.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-primary">
                  {formatAED(r.recoveredAED)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">
                  {(r.conversionRate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────── Borrower drilldown ─────────── */

function BorrowerDrilldownCard({ report }: { report: CampaignReport }) {
  const rows = report.sampleBorrowers
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <User className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
          Sample borrower drilldown · {rows.length}
        </h3>
        <span className="text-[10px] text-muted-foreground">
          Click a name to open the profile and trace the borrower's journey.
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-[12px] text-muted-foreground">
          No borrower-level conversions on this campaign yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.borrowerId + r.eventId + r.firedAt} className="grid grid-cols-[1.5fr_1fr_auto_auto] items-center gap-2 px-3 py-1.5 text-[11px]">
              <Link
                href={`/borrowers/${r.borrowerId}`}
                className="truncate text-foreground hover:underline"
              >
                {r.borrowerName}
              </Link>
              <span className="truncate text-muted-foreground">{r.eventLabel}</span>
              <span className="tabular-nums text-muted-foreground">
                {new Date(r.firedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="inline-flex items-center gap-1 justify-end tabular-nums text-primary">
                <DollarSign className="h-3 w-3" />
                {formatAED(r.amountAED)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
