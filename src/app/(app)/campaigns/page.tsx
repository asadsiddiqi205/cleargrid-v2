"use client"

/**
 * Campaigns list page — matches the reference ClearGrid design shared as
 * screenshots. Columns:
 *   Name (+ short timestamp) · Status pill · Source (Journey / Manual) ·
 *   Total contacts · Queued · Completed · Successful · Failed · Created by ·
 *   Scheduled · Action.
 *
 * Journey-sourced campaigns render a Source pill that links back to the
 * journey editor at the exact human-campaign node; manual ones show the
 * creator's name.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  RefreshCw,
  Filter,
  Plus,
  MoreHorizontal,
  Flag,
  Info,
  Users,
  Route,
  User as UserIcon,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  humanCampaigns,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_DOT,
  describeSource,
  type HumanCampaign,
} from "@/data/campaigns-seed"

const TABS = ["Campaigns", "Live agent activity"] as const

export default function CampaignsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<(typeof TABS)[number]>("Campaigns")
  const [query, setQuery] = React.useState("")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return humanCampaigns
    return humanCampaigns.filter((c) => {
      const src = describeSource(c.source)
      return (
        c.name.toLowerCase().includes(q) ||
        c.agentGroup.toLowerCase().includes(q) ||
        src.primary.toLowerCase().includes(q)
      )
    })
  }, [query])

  return (
    <PageShell
      title="Campaigns"
      description="Human-agent campaigns — including those enrolled by Journey Builder"
      action={{
        label: "Create Campaign",
        icon: Plus,
        onClick: () => router.push("/campaigns/new"),
      }}
    >
      <div className="space-y-3">
        {/* Tab strip */}
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-[12px]">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={cn(
                  "rounded px-3 py-1 font-medium transition-colors",
                  activeTab === t
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search campaigns…"
                className="h-8 w-56 pl-8 text-[12px]"
              />
            </div>
            <IconAction title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </IconAction>
            <IconAction title="Filter">
              <Filter className="h-3.5 w-3.5" />
            </IconAction>
          </div>
        </div>

        {activeTab === "Live agent activity" ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
            <p className="text-[12px] font-medium text-foreground">Live agent activity</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Real-time dialer roster — not part of this prototype pass.
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card/40">
              <div className="max-h-[68vh] overflow-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-muted/[0.06] text-muted-foreground">
                    <tr>
                      <Th>Campaign name</Th>
                      <Th>Status</Th>
                      <Th>Source</Th>
                      <Th right>Total contacts</Th>
                      <Th right>Queued</Th>
                      <Th right>Completed</Th>
                      <Th right>Successful</Th>
                      <Th right>Failed</Th>
                      <Th>Created by</Th>
                      <Th>Scheduled</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((c) => (
                      <CampaignRow key={c.id} campaign={c} />
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-[11px] text-muted-foreground">
                          No campaigns match &quot;{query}&quot;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                <Info className="mr-1 -mt-0.5 inline h-3 w-3" />
                <span className="text-foreground font-medium">Source: Journey</span>{" "}
                campaigns are created by the Human Campaign node inside a journey — the
                audience is the borrowers reaching that node.
              </span>
              <span>Page 1 · {rows.length} of {humanCampaigns.length}</span>
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}

function CampaignRow({ campaign: c }: { campaign: HumanCampaign }) {
  const src = describeSource(c.source)
  const isJourney = c.source.kind === "journey"
  const created = new Date(c.createdAt)
  return (
    <tr className="hover:bg-muted/25">
      <td className="px-3 py-2">
        <Link
          href={`/campaigns/${c.id}`}
          className="font-medium text-primary hover:underline"
        >
          {c.name}
        </Link>
        <div className="mt-0.5 text-[9px] text-muted-foreground">
          {c.listTimestamp}
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium">
          <span className={cn("h-1.5 w-1.5 rounded-full", CAMPAIGN_STATUS_DOT[c.status])} />
          {CAMPAIGN_STATUS_LABEL[c.status]}
        </span>
      </td>
      <td className="px-3 py-2">
        {isJourney ? (
          <Link
            href={src.href ?? "#"}
            className="inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
            title={`Created by journey · ${src.primary}`}
          >
            <Route className="h-2.5 w-2.5" />
            Journey · {src.primary}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <UserIcon className="h-2.5 w-2.5" />
            Manual · {src.primary}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-foreground">
        {c.totalContacts.toLocaleString()}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-foreground">
        {c.queued.toLocaleString()}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-foreground">
        <Flag className="mr-0.5 -mt-0.5 inline h-2.5 w-2.5 text-primary" />
        {c.completed.toLocaleString()}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-primary">
        {c.successful.toLocaleString()}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-error-300">
        <Flag className="mr-0.5 -mt-0.5 inline h-2.5 w-2.5 text-error-300" />
        {c.failed.toLocaleString()}
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <UserIcon className="h-2.5 w-2.5" />
          {c.source.createdBy}
        </span>
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {c.schedule.mode === "immediate" ? (
          <span>—</span>
        ) : (
          <span className="tabular-nums text-[10px]">
            {created.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          title="Actions"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

function IconAction({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}

function Th({
  children,
  right,
}: {
  children?: React.ReactNode
  right?: boolean
}) {
  return (
    <th
      className={cn(
        "px-3 py-2 font-semibold uppercase tracking-[0.12em]",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  )
}
