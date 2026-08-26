"use client"

import * as React from "react"
import Link from "next/link"
import {
  BarChart3,
  Mail,
  MessageSquare,
  Sliders,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import {
  buildOverview,
  type ReportsOverview,
} from "@/data/campaign-reports"
import { loadConversionEvents } from "@/data/conversion-events"

export default function ReportsHubPage() {
  const [emailOv, setEmailOv] = React.useState<ReportsOverview | null>(null)
  const [smsOv, setSmsOv] = React.useState<ReportsOverview | null>(null)

  // Load overviews on client (localStorage lookup for user-edited events).
  React.useEffect(() => {
    const events = loadConversionEvents()
    setEmailOv(buildOverview("email", events))
    setSmsOv(buildOverview("sms", events))
  }, [])

  const totalRecovered = (emailOv?.recoveredAED ?? 0) + (smsOv?.recoveredAED ?? 0)
  const totalConversions = (emailOv?.conversions ?? 0) + (smsOv?.conversions ?? 0)

  return (
    <PageShell
      title="Reports"
      description="Conversions, campaigns, and channel-level performance across email, SMS, and journeys."
    >
      <div className="space-y-5">
        {/* Cross-channel KPI band */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Recovered (all channels)" value={formatAED(totalRecovered)} icon={DollarSign} tone="primary" />
          <KpiCard label="Total conversions" value={totalConversions.toLocaleString()} icon={TrendingUp} />
          <KpiCard label="Email campaigns" value={(emailOv?.campaignCount ?? 0).toString()} icon={Mail} />
          <KpiCard label="SMS campaigns" value={(smsOv?.campaignCount ?? 0).toString()} icon={MessageSquare} />
        </div>

        {/* Four navigation cards */}
        <div className="grid gap-3 lg:grid-cols-2">
          <ReportsNavCard
            href="/reports/borrower-tracker"
            title="Borrower Journey Tracker"
            description="Pick a borrower to see every journey they've been through — and, step by step, what the outreach was and how they responded (delivered · opened · clicked · call outcome · conversion)."
            icon={Users}
            accent="primary"
            featured
          />
          <ReportsNavCard
            href="/reports/conversions"
            title="Conversion setup"
            description="Define which real-world outcomes count as a conversion — Paid, PTP, Settlement, RPC — and their attribution windows. Applies to email, SMS, and journeys."
            icon={Sliders}
            accent="warning"
          />
          <ReportsNavCard
            href="/reports/campaigns/email"
            title="Email campaigns"
            description="Full funnel per campaign — sent, delivered, bounced, opened (with mail-privacy caveat), clicked, unsubscribes, spam, conversions, AED recovered."
            icon={Mail}
            accent="primary"
            stats={
              emailOv && [
                { label: "Delivered", value: emailOv.delivered.toLocaleString() },
                { label: "Opens", value: (emailOv.opened ?? 0).toLocaleString() },
                { label: "Clicks", value: emailOv.clicked.toLocaleString() },
              ]
            }
          />
          <ReportsNavCard
            href="/reports/campaigns/sms"
            title="SMS campaigns"
            description="Sent, delivered, failed (with reasons), clicked, opt-outs, conversions, and AED recovered — plus segment + encoding-driven carrier cost."
            icon={MessageSquare}
            accent="info"
            stats={
              smsOv && [
                { label: "Delivered", value: smsOv.delivered.toLocaleString() },
                { label: "Clicks", value: smsOv.clicked.toLocaleString() },
                { label: "Recovered", value: formatAED(smsOv.recoveredAED) },
              ]
            }
          />
        </div>

        {/* Hint */}
        <div className="rounded-md border border-border/60 bg-muted/[0.06] px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
          <p className="text-foreground font-medium">How attribution works</p>
          <p className="mt-1">
            Conversion events reuse the same attribution model as the message analytics funnel —
            <span className="font-medium text-foreground"> last-message-touch</span> within the
            event's window. Change an event's window in Conversion setup and every report on
            this screen refreshes with the new attribution.
          </p>
        </div>
      </div>
    </PageShell>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "primary"
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className={cn("h-3 w-3", tone === "primary" ? "text-primary" : "text-neutral-400")} />
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-heading text-2xl font-semibold tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  )
}

function ReportsNavCard({
  href,
  title,
  description,
  icon: Icon,
  accent,
  stats,
  featured,
}: {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: "primary" | "info" | "warning"
  stats?: Array<{ label: string; value: string }> | null | false
  featured?: boolean
}) {
  const accentClass =
    accent === "primary"
      ? cn(
          "border-primary/40 hover:border-primary/60",
          featured ? "bg-primary/[0.08]" : "bg-primary/[0.04]",
        )
      : accent === "info"
        ? "border-info-500/40 bg-info-500/[0.04] hover:border-info-500/60"
        : "border-warning-500/40 bg-warning-500/[0.04] hover:border-warning-500/60"
  const iconClass =
    accent === "primary" ? "text-primary" : accent === "info" ? "text-info-300" : "text-warning-300"
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border p-4 transition-colors",
        accentClass,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md bg-background/60", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      {stats && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-[10px]">
          {stats.map((s) => (
            <span key={s.label} className="inline-flex items-baseline gap-1">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <span className="font-medium tabular-nums text-foreground">{s.value}</span>
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
