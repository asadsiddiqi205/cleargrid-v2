"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ChevronRight, Mail, MessageSquare } from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { listCampaignReports, type CampaignReport, type ReportChannel } from "@/data/campaign-reports"
import { loadConversionEvents } from "@/data/conversion-events"

export default function CampaignsListPage() {
  const params = useParams<{ channel: string }>()
  const channel = (params.channel === "sms" ? "sms" : "email") as ReportChannel
  const [reports, setReports] = React.useState<CampaignReport[]>([])

  React.useEffect(() => {
    const events = loadConversionEvents()
    setReports(listCampaignReports(channel, events))
  }, [channel])

  const other = channel === "email" ? "sms" : "email"
  const Icon = channel === "email" ? Mail : MessageSquare

  return (
    <PageShell
      title={`${channel === "email" ? "Email" : "SMS"} campaigns`}
      description={
        channel === "email"
          ? "Full funnel, per-link clicks, opt-outs, spam, conversions and AED recovered — per campaign, with variation, segment, and lender breakdowns."
          : "Sent, delivered, failure reasons, clicks, opt-outs, conversions and AED recovered — plus segment + encoding-driven carrier cost."
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            Reports
          </Link>
          <Link
            href={`/reports/campaigns/${other}`}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            Switch to {other.toUpperCase()}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card/40">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <Icon className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
              {reports.length} campaigns
            </h2>
          </div>
          {reports.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-muted-foreground">
              No {channel} campaigns in the seed. Send one from Compose → Messages.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Campaign</th>
                    <th className="px-2 py-2 font-semibold">Lender</th>
                    <th className="px-2 py-2 text-right font-semibold">Recipients</th>
                    <th className="px-2 py-2 text-right font-semibold">Delivered</th>
                    {channel === "email" && (
                      <th className="px-2 py-2 text-right font-semibold">Opens</th>
                    )}
                    <th className="px-2 py-2 text-right font-semibold">Clicks</th>
                    <th className="px-2 py-2 text-right font-semibold">Conversions</th>
                    <th className="px-2 py-2 text-right font-semibold">Recovered</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <Link href={`/reports/campaigns/${channel}/${r.id}`} className="block">
                          <div className="truncate text-[12px] font-medium text-foreground">
                            {r.campaignName}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {r.audience} · sent {new Date(r.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{r.lenderName}</td>
                      <NumCell value={r.recipients} />
                      <NumCell value={r.funnel.delivered} />
                      {channel === "email" && <NumCell value={r.funnel.opened ?? 0} />}
                      <NumCell value={r.funnel.clicked} />
                      <NumCell
                        value={r.conversions.reduce((s, c) => s + c.fired, 0)}
                        tone="primary"
                      />
                      <NumCell
                        value={r.conversions.reduce((s, c) => s + c.recoveredAED, 0)}
                        tone="primary"
                        format="aed"
                      />
                      <td className="px-2 py-2 text-right">
                        <Link href={`/reports/campaigns/${channel}/${r.id}`} className="text-primary hover:underline">
                          <ChevronRight className="inline h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function NumCell({
  value,
  tone,
  format = "num",
}: {
  value: number
  tone?: "primary"
  format?: "num" | "aed"
}) {
  return (
    <td className={cn("px-2 py-2 text-right tabular-nums", tone === "primary" ? "text-primary" : "text-foreground")}>
      {format === "aed" ? formatAED(value) : value.toLocaleString()}
    </td>
  )
}
