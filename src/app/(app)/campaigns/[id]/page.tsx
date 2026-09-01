"use client"

/**
 * Campaign detail page — layout mirrors the reference screenshots:
 * header + status pills → KPI tiles → details block → Analytics
 * (at-a-glance / pickup outcomes / connection donut) → Over time
 * → Agent performance → Call messages → collapsible Schedule &
 * redial + Dial order & filters.
 *
 * The details block for journey-sourced campaigns shows a prominent
 * Source card linking back to the journey editor at the exact human-
 * campaign node, and the audience section below lists the borrowers
 * arriving from that node (deterministic sample via listCampaignAudience).
 */

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Pencil,
  Pause,
  Square,
  Signal,
  Flag,
  Route,
  User as UserIcon,
  ExternalLink,
  ChevronDown,
  Download,
  Info,
  Phone,
  Voicemail,
  PhoneOff,
  PhoneCall,
  Play,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  humanCampaigns,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_DOT,
  describeSource,
  listCampaignAudience,
  type HumanCampaign,
} from "@/data/campaigns-seed"

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id ?? ""
  const campaign = humanCampaigns.find((c) => c.id === id)

  if (!campaign) {
    return (
      <PageShell title="Campaign not found">
        <p className="text-[12px] text-muted-foreground">
          The campaign <span className="font-mono">{id}</span> doesn&apos;t exist.
          <Link href="/campaigns" className="ml-2 text-primary hover:underline">
            Back to campaigns →
          </Link>
        </p>
      </PageShell>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <Header campaign={campaign} onBack={() => router.push("/campaigns")} />
      <SourceCard campaign={campaign} />
      <KpiRow campaign={campaign} />
      <DetailsBlock campaign={campaign} />
      <AnalyticsSection campaign={campaign} />
      <AgentPerformance campaign={campaign} />
      <AudienceSection campaign={campaign} />
      <CallMessages campaign={campaign} />
      <ScheduleRedial campaign={campaign} />
    </div>
  )
}

/* ─────────── Header ─────────── */

function Header({
  campaign,
  onBack,
}: {
  campaign: HumanCampaign
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground">{campaign.name}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px]">
            <Signal className="h-3 w-3 text-primary" />
            Online <span className="tabular-nums text-muted-foreground">0</span>
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted">
            <Users className="h-3 w-3" />
            Borrowers
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted">
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            title="Refresh"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted">
            <Pause className="h-3 w-3" />
            Pause
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-error-500/40 bg-error-500/10 px-2 py-1 text-[11px] font-semibold text-error-300 hover:bg-error-500/20">
            <Square className="h-3 w-3" />
            Stop
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusPill status={campaign.status} />
        {campaign.status === "processing_calls" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Initial queueing completed
          </span>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: HumanCampaign["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        status === "processing_calls" &&
          "border-primary/40 bg-primary/10 text-primary",
        status === "initial_queueing" &&
          "border-info-500/40 bg-info-500/10 text-info-300",
        status === "processed" &&
          "border-primary/40 bg-primary/10 text-primary",
        status === "stopped" &&
          "border-neutral-500/40 bg-neutral-500/10 text-neutral-400",
        status === "paused" &&
          "border-warning-500/40 bg-warning-500/10 text-warning-300",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          CAMPAIGN_STATUS_DOT[status],
        )}
      />
      {CAMPAIGN_STATUS_LABEL[status]}
    </span>
  )
}

/* ─────────── Source card (headline for journey-sourced) ─────────── */

function SourceCard({ campaign }: { campaign: HumanCampaign }) {
  const src = describeSource(campaign.source)
  const isJourney = campaign.source.kind === "journey"
  if (!isJourney) {
    return (
      <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px]">
          <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Created</span>
          <span className="font-medium text-foreground">manually</span>
          <span className="text-muted-foreground">by</span>
          <span className="font-medium text-foreground">{src.primary}</span>
        </div>
      </div>
    )
  }
  const s = campaign.source as Extract<HumanCampaign["source"], { kind: "journey" }>
  return (
    <div className="rounded-xl border border-info-500/40 bg-info-500/[0.06] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-info-500/40 bg-info-500/15 p-2">
            <Route className="h-4 w-4 text-info-300" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-info-300">
              Journey-sourced campaign
            </div>
            <div className="mt-0.5 text-[13px] font-semibold text-foreground">
              {s.journeyName}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Enrolled from the{" "}
              <span className="rounded bg-info-500/15 px-1 py-px font-medium text-info-300">
                {s.nodeLabel}
              </span>{" "}
              node · created by {s.createdBy}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/journeys/${s.journeyId}`}
            className="inline-flex items-center gap-1 rounded-md border border-info-500/40 bg-info-500/10 px-2 py-1 text-[11px] font-medium text-info-300 hover:bg-info-500/20"
          >
            Open journey
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
          <Link
            href={`/journeys/${s.journeyId}?trace=${s.nodeId}`}
            className="inline-flex items-center gap-1 rounded-md border border-info-500/40 bg-info-500/10 px-2 py-1 text-[11px] font-medium text-info-300 hover:bg-info-500/20"
          >
            Show node on canvas
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ─────────── KPI tiles ─────────── */

function KpiRow({ campaign }: { campaign: HumanCampaign }) {
  const tiles = [
    { label: "Total", value: campaign.totalContacts, tone: "muted" as const },
    { label: "Initial queued", value: campaign.initialQueued, tone: "muted" as const },
    { label: "Queued", value: campaign.queued, tone: "muted" as const },
    { label: "Completed", value: campaign.completed, tone: "muted" as const },
    { label: "Successful", value: campaign.successful, tone: "primary" as const },
    { label: "Failed", value: campaign.failed, tone: "error" as const },
  ]
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={cn(
            "rounded-xl border bg-card/40 px-4 py-3",
            t.tone === "primary" && "border-primary/40",
            t.tone === "error" && "border-error-500/40",
            t.tone === "muted" && "border-border",
          )}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.label}
          </div>
          <div
            className={cn(
              "mt-1 text-[22px] font-semibold tabular-nums",
              t.tone === "primary" && "text-primary",
              t.tone === "error" && "text-error-300",
              t.tone === "muted" && "text-foreground",
            )}
          >
            {t.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────── Details block ─────────── */

function DetailsBlock({ campaign }: { campaign: HumanCampaign }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Type", campaign.type],
    ["Gateway", campaign.gateway],
    ["Agent group", campaign.agentGroup],
    [
      campaign.mode === "journey_stream" ? "Source" : "Excel",
      campaign.mode === "journey_stream" ? (
        <SourceMini source={campaign.source} />
      ) : (
        <button className="inline-flex items-center gap-1 text-primary hover:underline">
          <Download className="h-3 w-3" /> Download
        </button>
      ),
    ],
    ["Mode", <span className="font-mono">{campaign.mode}</span>],
    ["Dial speed", campaign.dialSpeed],
    ["Created by", campaign.source.createdBy],
  ]
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start gap-3 text-[11px]">
            <div className="min-w-[92px] text-muted-foreground">{k}</div>
            <div className="min-w-0 flex-1 text-foreground">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-muted-foreground">
        Created{" "}
        {new Date(campaign.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        · Updated{" "}
        {new Date(campaign.updatedAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  )
}

function SourceMini({ source }: { source: HumanCampaign["source"] }) {
  if (source.kind !== "journey") {
    return <span className="text-muted-foreground">Manual</span>
  }
  return (
    <Link
      href={`/journeys/${source.journeyId}`}
      className="inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
    >
      <Route className="h-2.5 w-2.5" />
      {source.journeyName} · {source.nodeLabel}
      <ExternalLink className="h-2 w-2" />
    </Link>
  )
}

/* ─────────── Analytics ─────────── */

function AnalyticsSection({ campaign }: { campaign: HumanCampaign }) {
  const connected = Math.round(campaign.successful * 0.9)
  const voicemail = Math.round(campaign.completed * 0.05)
  const notConnected = campaign.failed
  const failedToDial = Math.round(campaign.failed * 0.02)
  const total = campaign.completed || 1
  const pickedUp = campaign.successful + voicemail
  const pickupPct = Math.round((pickedUp / total) * 100)

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Analytics</h2>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        At a glance
      </div>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <AtGlanceTile
          icon={<PhoneCall className="h-3 w-3" />}
          label="Connected calls"
          value={connected}
          hint={`out of ${campaign.completed} dials · ${Math.round((connected / total) * 100)}% of dials`}
          tone="primary"
        />
        <AtGlanceTile
          icon={<Voicemail className="h-3 w-3" />}
          label="Voicemail"
          value={voicemail}
          hint={`${Math.round((voicemail / total) * 100)}% of dials`}
        />
        <AtGlanceTile
          icon={<PhoneOff className="h-3 w-3" />}
          label="Not connected"
          value={notConnected}
          hint={`${Math.round((notConnected / total) * 100)}% of dials`}
        />
        <AtGlanceTile
          icon={<Flag className="h-3 w-3" />}
          label="Failed to dial"
          value={failedToDial}
          hint={`${Math.round((failedToDial / total) * 100)}% of dials`}
        />
        <AtGlanceTile
          icon={<Phone className="h-3 w-3" />}
          label="Total dials"
          value={campaign.completed}
          hint=""
          tone="foreground"
        />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <div className="text-[12px] font-semibold">Pickup outcomes</div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Borrowers who picked up vs not — and what happened inside the pickups.
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span>
              {pickedUp} of {campaign.completed} picked up
            </span>
            <span className="font-semibold text-primary">{pickupPct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted/40">
            <div
              className="h-full bg-primary/80"
              style={{ width: `${pickupPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>Picked up: {pickedUp}</span>
            <span>Not picked up: {campaign.completed - pickedUp}</span>
          </div>
          <div className="mt-3 border-t border-border/60 pt-2 text-[11px]">
            Within those {pickedUp} pickups:
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Reached an agent
              </span>
              <span className="tabular-nums text-muted-foreground">
                {campaign.successful} · 100%
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <div className="text-[12px] font-semibold">Connection outcome</div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Share of dials by what the line returned.
          </p>
          <ConnectionDonut connected={connected} notConnected={notConnected} />
          <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Connected
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" /> Not connected
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AtGlanceTile({
  icon,
  label,
  value,
  hint,
  tone = "muted",
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint: string
  tone?: "primary" | "foreground" | "muted"
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background/60 p-3",
        tone === "primary" ? "border-primary/40" : "border-border",
      )}
    >
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[20px] font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "foreground" && "text-foreground",
          tone === "muted" && "text-foreground",
        )}
      >
        {value.toLocaleString()}
      </div>
      {hint && <div className="mt-0.5 text-[9px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function ConnectionDonut({
  connected,
  notConnected,
}: {
  connected: number
  notConnected: number
}) {
  const total = connected + notConnected || 1
  const connectedPct = connected / total
  const size = 140
  const cx = size / 2
  const cy = size / 2
  const r = 52
  const c = 2 * Math.PI * r
  const connectedLen = c * connectedPct
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto mt-2"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="hsl(var(--muted-foreground) / 0.35)"
        strokeWidth={16}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth={16}
        strokeDasharray={`${connectedLen} ${c - connectedLen}`}
        strokeDashoffset={c / 4}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="fill-current text-[12px] font-semibold text-foreground"
      >
        {Math.round(connectedPct * 100)}%
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="fill-current text-[9px] text-muted-foreground"
      >
        connected
      </text>
    </svg>
  )
}

/* ─────────── Agent performance ─────────── */

function AgentPerformance({ campaign }: { campaign: HumanCampaign }) {
  const dialed = campaign.completed
  const answered = campaign.successful
  const pickupRate = dialed > 0 ? (answered / dialed) * 100 : 0
  const tiles = [
    { label: "Dialed", value: dialed, tone: "muted" as const },
    { label: "Answered", value: answered, tone: "primary" as const },
    { label: "Pickup rate", value: pickupRate.toFixed(1) + "%", tone: "muted" as const },
    { label: "Completed", value: campaign.completed, tone: "muted" as const },
    { label: "Failed", value: campaign.failed, tone: "error" as const },
    { label: "Peak agents", value: 1, tone: "muted" as const },
  ]
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Agent performance</h2>
        <div className="flex items-center gap-1 text-[10px]">
          <button className="rounded bg-info-500/15 px-1.5 py-0.5 font-medium text-info-300">
            Last 1h
          </button>
          <button className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted">
            Last 6h
          </button>
          <button className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted">
            Today
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-background/60 p-3">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {t.label}
            </div>
            <div
              className={cn(
                "mt-1 text-[18px] font-semibold tabular-nums",
                t.tone === "primary" && "text-primary",
                t.tone === "error" && "text-error-300",
                t.tone === "muted" && "text-foreground",
              )}
            >
              {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── Audience section (journey-sourced spotlight) ─────────── */

function AudienceSection({ campaign }: { campaign: HumanCampaign }) {
  const audience = React.useMemo(() => listCampaignAudience(campaign), [campaign])
  const sourceLabel =
    campaign.source.kind === "journey"
      ? `Borrowers arriving from ${campaign.source.nodeLabel}`
      : "Uploaded audience"
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold">Audience</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {sourceLabel} · showing {Math.min(audience.length, 25)} of{" "}
            {audience.length.toLocaleString()}
          </p>
        </div>
        {campaign.source.kind === "journey" && (
          <Link
            href={`/journeys/${campaign.source.journeyId}/borrowers`}
            className="inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
          >
            Open in journey
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        )}
      </div>
      {audience.length === 0 ? (
        <div className="mt-3 rounded border border-dashed border-border p-6 text-center text-[11px] text-muted-foreground">
          No borrowers matched this campaign&apos;s audience yet.
        </div>
      ) : (
        <div className="mt-2 max-h-[300px] overflow-auto rounded border border-border">
          <table className="w-full text-[10.5px]">
            <thead className="bg-muted/[0.06] text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left font-semibold">Borrower</th>
                <th className="px-3 py-1.5 text-left font-semibold">Product</th>
                <th className="px-3 py-1.5 text-left font-semibold">Enrolled</th>
                <th className="px-3 py-1.5 text-left font-semibold">Current step</th>
                <th className="px-3 py-1.5 text-left font-semibold">Status</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audience.slice(0, 25).map((r) => (
                <tr key={r.borrower.id} className="hover:bg-muted/25">
                  <td className="px-3 py-1.5">
                    <div className="text-foreground">{r.borrower.name}</div>
                    <div className="font-mono text-[9px] text-muted-foreground">
                      {r.borrower.id} · {r.borrower.phone}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {r.borrower.product} · {r.borrower.dpdBucket} DPD
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                    {new Date(r.enrolledAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-1.5 text-foreground truncate max-w-[180px]">
                    {r.currentStepLabel ?? "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    <span
                      className={cn(
                        "rounded px-1 py-px text-[9px] font-medium uppercase tracking-wider",
                        r.status === "converted" && "bg-primary/15 text-primary",
                        r.status === "active" && "bg-info-500/15 text-info-300",
                        r.status === "exited" && "bg-muted text-neutral-400",
                        r.status === "errored" && "bg-error-500/15 text-error-300",
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {campaign.source.kind === "journey" && (
                      <Link
                        href={`/journeys/${campaign.source.journeyId}?trace=${r.borrower.id}`}
                        title="Trace on canvas"
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        <Play className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─────────── Call messages ─────────── */

function CallMessages({ campaign }: { campaign: HumanCampaign }) {
  const router = useRouter()
  const cards: Array<{ label: string; body?: string }> = [
    { label: "Welcome", body: campaign.callMessages.welcome },
    { label: "Loop", body: campaign.callMessages.loop },
    { label: "Busy", body: campaign.callMessages.busy },
  ]
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Call messages</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push(`/campaigns/${campaign.id}/edit`)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit messages
        </Button>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-background/60 p-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </div>
            <p className="mt-1 text-[11px] text-foreground">
              {c.body ?? (
                <span className="text-muted-foreground italic">
                  No {c.label.toLowerCase()} message configured.
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── Collapsibles ─────────── */

function ScheduleRedial({ campaign }: { campaign: HumanCampaign }) {
  return (
    <div className="space-y-2">
      <Collapsible label="Schedule & redial">
        <div className="grid gap-2 sm:grid-cols-2">
          <KV
            label="When to run"
            value={
              campaign.schedule.mode === "immediate"
                ? "Start immediately"
                : "Scheduled"
            }
          />
          <KV
            label="Pause by default"
            value={campaign.schedule.pauseByDefault ? "Yes" : "No"}
          />
          <KV
            label="Redial enabled"
            value={campaign.schedule.redialEnabled ? "Yes" : "No"}
          />
          <KV label="Dial speed" value={campaign.dialSpeed} />
        </div>
      </Collapsible>
      <Collapsible label="Dial order & filters" defaultOpen={false}>
        <p className="text-[11px] text-muted-foreground">
          <Info className="mr-1 -mt-0.5 inline h-3 w-3" />
          For journey-sourced campaigns the dial order follows the journey&apos;s node priority.
          Manual campaigns use the calling-priority list configured in the Create Campaign wizard.
        </p>
      </Collapsible>
    </div>
  )
}

function Collapsible({
  label,
  children,
  defaultOpen = true,
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open && <div className="border-t border-border/60 px-4 py-3">{children}</div>}
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
