"use client"

/**
 * Email-node Analytics tab — the rebuilt view Growth asked for.
 *
 * Shape: run picker header + shared filter bar + Funnel strip + four sections
 * (Delivery & reachability, Engagement, Outcomes) + borrower list with
 * per-status chips and per-borrower timeline. Everything reads from
 * `message-analytics.ts` + `journey-metrics.ts`, so labels and tooltips are
 * in sync with the Report tab and CSV exports.
 */

import * as React from "react"
import {
  Search,
  Download,
  Mail,
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
  synthesizeEmailAnalytics,
  listEmailBorrowerStatuses,
  EMAIL_STATUS_LABEL,
  type EmailStatus,
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
import { getSenderProfileById } from "@/data/sender-profiles"
import { getWarmyDomainByName, getSentToday } from "@/data/warmy"
import { statusForDomain, STATUS_LABEL, STATUS_PILL_CLASS } from "@/data/domain-health"

interface NodeEmailAnalyticsProps {
  journeyId: string
  runId: string
  run: JourneyRun
  nodeId: string
  nodeLabel: string
  senderProfileId?: string
}

const STATUS_TONE: Record<EmailStatus, string> = {
  not_sent: "border-muted/60 bg-muted text-neutral-300",
  queued: "border-info-500/40 bg-info-500/10 text-info-300",
  sent: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300",
  delivered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  opened: "border-primary/40 bg-primary/10 text-primary",
  clicked: "border-primary/60 bg-primary/20 text-primary",
  bounced: "border-error-500/40 bg-error-500/10 text-error-300",
}

export function NodeEmailAnalytics({
  journeyId,
  runId,
  run,
  nodeId,
  nodeLabel,
  senderProfileId,
}: NodeEmailAnalyticsProps) {
  // Run scope drives everything; no slicing filters on this view.
  const filters = EMPTY_FILTERS
  const [mode, setMode] = React.useState<AnalyticsMode>("this_run")
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<EmailStatus | "all">(
    "all",
  )
  const [openTimeline, setOpenTimeline] = React.useState<string | null>(null)

  const settings = React.useMemo(() => loadJourneySettings(journeyId), [journeyId])
  const data = React.useMemo(
    () => synthesizeEmailAnalytics(journeyId, nodeId, filters, runId),
    [journeyId, nodeId, filters, runId],
  )

  // Warmy overlay: everything Warmy-sourced on the Analytics tab is
  // computed here so the shape of `data` stays untouched.
  const warmy = React.useMemo(
    () => buildWarmyOverlay(senderProfileId ?? null, data.delivery.sent, runId),
    [senderProfileId, data.delivery.sent, runId],
  )
  const rows = React.useMemo(
    () => listEmailBorrowerStatuses(journeyId, nodeId, filters, runId),
    [journeyId, nodeId, filters, runId],
  )

  const statusCounts = React.useMemo(() => {
    const c: Record<EmailStatus, number> = {
      not_sent: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    }
    for (const r of rows) c[r.status as EmailStatus]++
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
    a.download = `${nodeLabel.replace(/\s+/g, "_")}-email.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Run header — matches the legacy analytics view so authors see which
          run drives the numbers. Canvas run-picker chip switches it. */}
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
            channel="email"
            senderProfileId={senderProfileId ?? null}
          />
        </div>
      )}

      {mode === "over_time" && (
        <div className="flex-1 overflow-y-auto">
          <OverTimeView
            journeyId={journeyId}
            nodeId={nodeId}
            channel="email"
            senderProfileId={senderProfileId ?? null}
          />
        </div>
      )}

      {mode === "this_run" && (
      <div className="flex-1 overflow-y-auto">
        {/* Funnel strip */}
        <FunnelStrip
          items={[
            { id: "reached", value: data.funnel.reached },
            { id: "sent", value: data.funnel.sent },
            { id: "delivered", value: data.funnel.delivered, rateOf: data.funnel.sent },
            {
              id: "unique_opens",
              value: data.funnel.uniqueOpens,
              rateOf: data.funnel.delivered,
            },
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

        {/* Section: Delivery & reachability */}
        <Section title="Delivery & reachability">
          <TileGrid>
            <Tile id="sent" value={data.delivery.sent} />
            <Tile id="delivered" value={data.delivery.delivered} />
            <Tile id="delivery_rate" value={data.delivery.deliveryRate} />
            <Tile id="queued" value={Math.max(0, data.delivery.queued - warmy.heldOutOfVolume)} />
            <Tile id="hard_bounces" value={data.delivery.hardBounces} />
            <Tile id="spam_rate" value={data.delivery.spamRate} />
            <Tile id="opt_out_rate" value={data.delivery.optOutRate} />
            <Tile id="invalid_emails_rate" value={data.delivery.invalidEmailsRate} />
          </TileGrid>

          {warmy.hasProfile && (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <MiniTile
                label={<>Held — out of today's volume <WarmyTag hint="Waiting on Warmy's recommended volume to roll over tomorrow." /></>}
                value={warmy.heldOutOfVolume.toLocaleString()}
                tone={warmy.heldOutOfVolume > 0 ? "warn" : "muted"}
              />
              <MiniTile
                label="Held — every domain blocked or paused"
                value={warmy.heldAllBlockedOrPaused.toLocaleString()}
                tone={warmy.heldAllBlockedOrPaused > 0 ? "warn" : "muted"}
                hint="Rotation found no eligible domain. Sent on the next day if any domain clears."
              />
            </div>
          )}

          <SubBlock title="Not sent — by reason">
            {data.delivery.notSent.length === 0 && !warmy.heldOutOfVolume && !warmy.heldAllBlockedOrPaused ? (
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
                  {warmy.heldOutOfVolume > 0 && (
                    <tr className="border-b border-border/40">
                      <td className="py-1 pr-2 text-foreground">Held — out of today&apos;s volume <WarmyTag hint="Warmy recommended volume exhausted." /></td>
                      <td className="py-1 pr-2 text-muted-foreground">Will send tomorrow when volume resets.</td>
                      <td className="py-1 text-right font-medium tabular-nums">{warmy.heldOutOfVolume.toLocaleString()}</td>
                    </tr>
                  )}
                  {warmy.heldAllBlockedOrPaused > 0 && (
                    <tr className="border-b border-border/40">
                      <td className="py-1 pr-2 text-foreground">Held — every domain blocked or paused</td>
                      <td className="py-1 pr-2 text-muted-foreground">Sent on the next day once any domain clears.</td>
                      <td className="py-1 text-right font-medium tabular-nums">{warmy.heldAllBlockedOrPaused.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </SubBlock>

          <SubBlock title="Soft bounces">
            <div className="grid grid-cols-2 gap-1.5">
              <MiniTile
                label="Retrying"
                value={data.delivery.softBouncesRetrying.toLocaleString()}
                tone="info"
                hint="Provider is still retrying; not counted as bounced."
              />
              <MiniTile
                label="Final"
                value={data.delivery.softBouncesFinal.toLocaleString()}
                tone="warn"
              />
            </div>
          </SubBlock>

          <SubBlock title={<>Sender breakdown {warmy.hasProfile && <WarmyTag hint="Status and health at send time, from Warmy." />}</>}>
            {warmy.hasProfile ? (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1">Sender</th>
                    <th className="py-1 text-right">Sent</th>
                    <th className="py-1 text-right">Delivered</th>
                    <th className="py-1 text-right">Hard b.</th>
                    <th className="py-1 text-right">Spam</th>
                    <th className="py-1 text-right">Health</th>
                    <th className="py-1 text-right">Gmail rep</th>
                    <th className="py-1 text-right">Status</th>
                    <th className="py-1 text-right">Skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {warmy.senderRows.map((r) => (
                    <tr key={r.address} className="border-b border-border/40">
                      <td className="py-1 font-mono text-[10.5px] text-foreground">{r.address}</td>
                      <td className="py-1 text-right tabular-nums">{r.sent.toLocaleString()}</td>
                      <td className="py-1 text-right tabular-nums">{r.delivered.toLocaleString()}</td>
                      <td className="py-1 text-right tabular-nums">{r.hardBounces.toLocaleString()}</td>
                      <td className="py-1 text-right tabular-nums">{(r.spamRate * 100).toFixed(2)}%</td>
                      <td className="py-1 text-right tabular-nums">
                        {r.noWarmy ? (
                          <span title="This address has no Warmy match — volume falls back to the ops cap." className="italic text-muted-foreground">No Warmy data</span>
                        ) : (
                          r.healthScore
                        )}
                      </td>
                      <td className="py-1 text-right"><ReputationChip r={r.gmailReputation} /></td>
                      <td className="py-1 text-right">
                        <span className={`inline-block rounded border px-1 py-0.5 text-[9.5px] uppercase tracking-wider ${STATUS_PILL_CLASS[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        {r.paused && <span className="ml-1 rounded bg-neutral-500/20 px-1 py-0.5 text-[9.5px] text-neutral-300">Paused</span>}
                      </td>
                      <td className="py-1 text-right tabular-nums">{r.skipped.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyRow>Pick a sender profile on the Compose tab to see the breakdown.</EmptyRow>
            )}
          </SubBlock>

          <WarmyRotationLogSection
            warmy={warmy}
            runStartIso={run.startedAt}
            profileName={senderProfileLabel(senderProfileId)}
          />

          <SubBlock title={<>Recipient domains {warmy.hasProfile && <WarmyTag hint="Inbox (placement test) and Held for volume come from Warmy." />}</>}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1">Domain</th>
                  <th className="py-1 text-right">Delivered</th>
                  <th className="py-1 text-right">Bounced</th>
                  <th className="py-1 text-right">Open rate</th>
                  <th className="py-1 text-right">Inbox (placement)</th>
                  <th className="py-1 text-right">Held for volume</th>
                </tr>
              </thead>
              <tbody>
                {data.delivery.recipientDomains.map((d) => {
                  const provider = providerLabelForDomain(d.domain)
                  const extras = warmy.providerExtras[provider]
                  return (
                    <tr key={d.domain} className="border-b border-border/40">
                      <td className="py-1 text-foreground">{d.domain}</td>
                      <td className="py-1 text-right tabular-nums">{d.delivered.toLocaleString()}</td>
                      <td className="py-1 text-right tabular-nums">{d.bounced.toLocaleString()}</td>
                      <td className="py-1 text-right tabular-nums">{(d.openRate * 100).toFixed(1)}%</td>
                      <td className="py-1 text-right tabular-nums">
                        {!extras || extras.inboxPct == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          `${extras.inboxPct}%`
                        )}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {extras?.heldForVolume.toLocaleString() ?? "0"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </SubBlock>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <MiniTile
              label={<>Inbox rate <WarmyTag hint="Sent-weighted across the profile's Warmy placement tests." /></>}
              value={
                warmy.inboxRate
                  ? `${warmy.inboxRate.pct}% · placement test, ${new Date(
                      warmy.inboxRate.date,
                    ).toLocaleDateString("en-US", { day: "numeric", month: "short" })}`
                  : "No recent placement test"
              }
              tone={warmy.inboxRate ? "ok" : "muted"}
              hint={
                warmy.inboxRate
                  ? `Placement test, ${new Date(warmy.inboxRate.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. TODO: real per-run inbox placement needs Warmy campaign checkers (phase 2).`
                  : "Run a placement test in Warmy."
              }
            />
            <MiniTile
              label={<>Domain reputation <WarmyTag hint="Warmy's estimate. Google no longer publishes reputation." /></>}
              value={
                warmy.domainReputation ? (
                  <div>
                    <div>
                      {warmy.domainReputation.worst[0].toUpperCase()}
                      {warmy.domainReputation.worst.slice(1)} · {warmy.domainReputation.domain}
                    </div>
                    {warmy.domainReputation.skippedBlockedDomains > 0 && (
                      <div className="text-[9.5px] font-normal text-muted-foreground">
                        {warmy.domainReputation.skippedBlockedDomains} blocked domain
                        {warmy.domainReputation.skippedBlockedDomains === 1 ? "" : "s"} skipped
                      </div>
                    )}
                  </div>
                ) : (
                  "—"
                )
              }
              tone={
                warmy.domainReputation?.worst === "bad"
                  ? "warn"
                  : warmy.domainReputation?.worst === "medium"
                  ? "warn"
                  : "ok"
              }
              hint={
                warmy.domainReputation
                  ? warmy.domainReputation.perDomain
                      .map((d) =>
                        `${d.domain}: ${d.reputation ?? "—"}${d.date ? ` (${new Date(d.date).toLocaleDateString()})` : ""}`,
                      )
                      .join("\n")
                  : "No Warmy match for the profile's domains."
              }
            />
          </div>

          {warmy.gmailSpamRateDomainWide != null && (
            <p
              className="mt-1.5 text-[10px] text-muted-foreground"
              title={
                warmy.spamPerDomain
                  .filter((e) => e.spamRate != null)
                  .map((e) => `${e.domain}: ${(e.spamRate! * 100).toFixed(2)}%`)
                  .join("\n") + "\nGmail, domain-wide, yesterday."
              }
            >
              Gmail spam rate (worst · domain-wide · yesterday):{" "}
              <span className="text-foreground tabular-nums">
                {(warmy.gmailSpamRateDomainWide * 100).toFixed(2)}%
              </span>
              <WarmyTag hint="Google Postmaster via Warmy." />
            </p>
          )}
        </Section>

        {/* Section: Engagement */}
        <Section title="Engagement">
          <TileGrid>
            <Tile id="unique_opens" value={data.engagement.uniqueOpens} />
            <Tile id="open_rate" value={data.engagement.openRate} />
            <Tile
              id="time_to_first_open"
              value={data.engagement.timeToFirstOpenHours}
            />
            <Tile id="unique_clicks" value={data.engagement.uniqueClicks} />
            <Tile id="ctr" value={data.engagement.ctr} />
            <Tile
              id="click_to_open_rate"
              value={data.engagement.clickToOpenRate}
            />
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

          <MiniTile
            label="Replies"
            value={<NotAvailable />}
            tone="muted"
            hint="Needs inbound email capture configured on the sender domain."
          />
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
            <Tile
              id="emails_per_borrower"
              value={data.outcomes.emailsPerBorrower}
            />
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
            {(Object.keys(EMAIL_STATUS_LABEL) as EmailStatus[]).map((s) =>
              statusCounts[s] > 0 ? (
                <StatusChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                  tone={STATUS_TONE[s]}
                >
                  {EMAIL_STATUS_LABEL[s]} · {statusCounts[s]}
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
                            STATUS_TONE[r.status as EmailStatus],
                          )}
                        >
                          {EMAIL_STATUS_LABEL[r.status as EmailStatus]}
                        </span>
                      </div>
                      <div className="truncate text-[9.5px] text-muted-foreground">
                        {r.dpdBucket} DPD · {r.product}
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

/* ─────────── Visual primitives ─────────── */

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
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
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

function SubBlock({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
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
  label: React.ReactNode
  value: React.ReactNode
  tone?: "ok" | "primary" | "info" | "warn" | "muted"
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

function NotAvailable({ short }: { short?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] italic text-muted-foreground">
      <AlertCircle className="h-2.5 w-2.5" />
      {short ? "N/A" : "Not available yet"}
    </span>
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
                  <Mail className="mr-1 inline h-2.5 w-2.5" />
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

/* ────────────────────────── Warmy overlay ──────────────────────────
   Everything Warmy-sourced on this tab is derived from a single
   build step and tagged with a "Warmy" chip in the UI so the reader
   can tell it apart from the run's own numbers.
   TODO (data contract): a real per-run inbox placement comes from
   Warmy campaign checkers (phase 2); today we fall back to the
   latest placement test the profile's domains have. */

interface WarmySenderRow {
  address: string
  domain: string
  sent: number
  delivered: number
  hardBounces: number
  spamRate: number
  skipped: number
  healthScore: number | null
  gmailReputation: "high" | "medium" | "bad" | null
  status: "healthy" | "watch" | "at_risk" | "blocked" | "no_data"
  paused: boolean
  noWarmy: boolean
}

interface WarmyPerProvider {
  provider: string
  inboxPct: number | null
  heldForVolume: number
}

interface WarmyOverlay {
  hasProfile: boolean
  profileId: string | null
  profileDomains: string[]
  senderRows: WarmySenderRow[]
  providerExtras: Record<string, WarmyPerProvider>
  inboxRate: { pct: number; date: string } | null
  domainReputation:
    | {
        worst: "high" | "medium" | "bad"
        domain: string
        perDomain: Array<{ domain: string; reputation: "high" | "medium" | "bad" | null; date: string | null }>
        skippedBlockedDomains: number
      }
    | null
  gmailSpamRateDomainWide: number | null
  spamPerDomain: Array<{ domain: string; spamRate: number | null }>
  heldOutOfVolume: number
  heldAllBlockedOrPaused: number
  queuedEspOnly: number
}

function buildWarmyOverlay(
  senderProfileId: string | null,
  totalSent: number,
  runId: string,
): WarmyOverlay {
  const profile = senderProfileId ? getSenderProfileById(senderProfileId) : null
  if (!profile) {
    return {
      hasProfile: false,
      profileId: null,
      profileDomains: [],
      senderRows: [],
      providerExtras: {},
      inboxRate: null,
      domainReputation: null,
      gmailSpamRateDomainWide: null,
      spamPerDomain: [],
      heldOutOfVolume: 0,
      heldAllBlockedOrPaused: 0,
      queuedEspOnly: 0,
    }
  }
  // Deterministic split across the profile's domains for this run.
  let seed = 0
  for (let i = 0; i < runId.length; i++) seed = (seed * 31 + runId.charCodeAt(i)) >>> 0
  const n = profile.domains.length
  const shares = profile.domains.map((_, i) => 1 + ((seed ^ (i * 13)) % 9))
  const shareSum = shares.reduce((s, v) => s + v, 0)

  // Blocked / paused domains never take any sends this run; move their
  // share onto the eligible domains instead, and count what we skipped
  // for the Skipped column. This fixes the earlier mock where
  // support.cleararabia.ai (Blocked) was credited with the most sends.
  type Alloc = { domain: string; share: number; eligible: boolean }
  const allocs: Alloc[] = profile.domains.map((d, i) => {
    const summary = statusForDomain(d.domain)
    const eligible = summary.status !== "blocked" && !summary.paused
    return { domain: d.domain, share: shares[i] ?? 1, eligible }
  })
  const skippedShare = allocs.filter((a) => !a.eligible).reduce((s, a) => s + a.share, 0)
  const eligibleShareSum = allocs.filter((a) => a.eligible).reduce((s, a) => s + a.share, 0) || 1
  const senderRows: WarmySenderRow[] = allocs.map((a) => {
    const w = getWarmyDomainByName(a.domain)
    const summary = statusForDomain(a.domain)
    const spamRate = w?.gpm.spam_rate ?? 0.004
    let sent = 0
    let skipped = 0
    if (a.eligible) {
      // Redistribute the skipped share proportionally onto the eligible rows.
      const effectiveShare = a.share + (skippedShare * a.share) / eligibleShareSum
      sent = Math.round((totalSent * effectiveShare) / shareSum)
    } else {
      // Blocked / paused — rotation carried these to other domains.
      skipped = Math.round((totalSent * a.share) / shareSum)
    }
    const hard = Math.round(sent * (spamRate * 0.6 + 0.004))
    const delivered = Math.max(0, sent - hard - Math.round(sent * spamRate))
    return {
      address: `${profile.prefix}@${a.domain}`,
      domain: a.domain,
      sent,
      delivered,
      hardBounces: hard,
      spamRate,
      skipped,
      healthScore: w?.health_score.total ?? null,
      gmailReputation: w?.adeline_ai_info.domain_reputation ?? null,
      status: summary.status,
      paused: summary.paused,
      noWarmy: !w,
    }
  })

  // Per-provider placement test: pick the average placement_checker
  // reading across the profile's domains. Only Gmail and Outlook are
  // tested by Warmy today — Yahoo / iCloud / Other stay null so the UI
  // renders "-". Workspace isn't a recipient provider, so it's not
  // rendered as its own row.
  const warmyDomains = profile.domains
    .map((d) => getWarmyDomainByName(d.domain))
    .filter((w): w is NonNullable<typeof w> => Boolean(w))
  const providerExtras: Record<string, WarmyPerProvider> = {}
  // Per-provider placement weighted by this run's sends per domain, so
  // the Gmail and Outlook rows differ even when Warmy has similar
  // averages — a domain that took most of the run's Gmail sends pulls
  // the Gmail number toward its own placement reading.
  const sentByDomain = new Map(
    senderRows.map((r) => [r.domain.toLowerCase(), r.sent] as const),
  )
  const pickPct = (key: "gmail" | "gsuite" | "outlook"): number | null => {
    if (warmyDomains.length === 0) return null
    let sumPctWeighted = 0
    let totalWeight = 0
    let sumPctFallback = 0
    let n = 0
    for (const w of warmyDomains) {
      const pct = w.placement_checker[key].inbox_pct
      const weight = sentByDomain.get(w.name.toLowerCase()) ?? 0
      sumPctWeighted += pct * weight
      totalWeight += weight
      sumPctFallback += pct
      n++
    }
    if (totalWeight > 0) return Math.round(sumPctWeighted / totalWeight)
    return n > 0 ? Math.round(sumPctFallback / n) : null
  }
  const gmailPct = pickPct("gmail")
  const outlookPct = pickPct("outlook")
  // Rows render in this order; Workspace is intentionally absent — the
  // Composer recipient split doesn't surface it as its own row.
  const RECIPIENT_PROVIDERS = ["Gmail", "Outlook", "Yahoo", "iCloud", "Other"] as const

  // Held for volume: deterministic per-provider split that sums to the
  // same tile total. Distribute a small overall `heldOutOfVolume` across
  // the recipient providers proportional to a seeded weight so the row
  // sum equals the tile. Can never be negative or exceed totalSent.
  const heldWeights: Record<string, number> = {
    Gmail: 3 + ((seed >> 1) & 3),
    Outlook: 2 + ((seed >> 3) & 3),
    Yahoo: 1 + ((seed >> 5) & 2),
    iCloud: 1 + ((seed >> 7) & 1),
    Other: 1 + ((seed >> 9) & 2),
  }
  const heldWeightSum = Object.values(heldWeights).reduce((s, v) => s + v, 0)
  const heldTotalTarget = Math.min(totalSent, Math.max(0, Math.floor(totalSent * ((seed % 4) + 1) / 100)))
  const heldPerProvider: Record<string, number> = {}
  let heldSoFar = 0
  for (let i = 0; i < RECIPIENT_PROVIDERS.length; i++) {
    const p = RECIPIENT_PROVIDERS[i]!
    if (i === RECIPIENT_PROVIDERS.length - 1) {
      // Last row absorbs the rounding so the sum is exact.
      heldPerProvider[p] = Math.max(0, heldTotalTarget - heldSoFar)
    } else {
      const v = Math.floor((heldTotalTarget * heldWeights[p]!) / heldWeightSum)
      heldPerProvider[p] = v
      heldSoFar += v
    }
  }
  const heldOutOfVolume = Math.min(
    totalSent,
    Math.max(
      0,
      RECIPIENT_PROVIDERS.reduce((s, p) => s + (heldPerProvider[p] ?? 0), 0),
    ),
  )

  providerExtras["Gmail"] = { provider: "Gmail", inboxPct: gmailPct, heldForVolume: heldPerProvider.Gmail ?? 0 }
  providerExtras["Outlook"] = { provider: "Outlook", inboxPct: outlookPct, heldForVolume: heldPerProvider.Outlook ?? 0 }
  providerExtras["Yahoo"] = { provider: "Yahoo", inboxPct: null, heldForVolume: heldPerProvider.Yahoo ?? 0 }
  providerExtras["iCloud"] = { provider: "iCloud", inboxPct: null, heldForVolume: heldPerProvider.iCloud ?? 0 }
  providerExtras["Other"] = { provider: "Other", inboxPct: null, heldForVolume: heldPerProvider.Other ?? 0 }

  // Inbox rate tile = sent-weighted average across ONLY the providers
  // whose rows show a value (Gmail + Outlook). Reads the same way as
  // the row figures.
  const inboxRows: Array<{ pct: number; share: number }> = []
  const gmailShare = 0.4
  const outlookShare = 0.22
  if (gmailPct != null) inboxRows.push({ pct: gmailPct, share: gmailShare })
  if (outlookPct != null) inboxRows.push({ pct: outlookPct, share: outlookShare })
  const inboxRate =
    inboxRows.length > 0 && warmyDomains.length > 0
      ? {
          pct: Math.round(
            inboxRows.reduce((s, r) => s + r.pct * r.share, 0) /
              inboxRows.reduce((s, r) => s + r.share, 0),
          ),
          date: warmyDomains[0]!.adeline_ai_info.date,
        }
      : null

  // Domain reputation: worst across the domains that actually sent in
  // this run. Blocked / Paused domains were skipped by rotation so
  // they don't count; we surface them under the tile as "N blocked
  // domain skipped" instead.
  const sendingDomains = new Set(
    senderRows.filter((r) => r.sent > 0).map((r) => r.domain.toLowerCase()),
  )
  const perDomain = profile.domains.map((d) => {
    const w = getWarmyDomainByName(d.domain)
    return {
      domain: d.domain,
      reputation: w?.adeline_ai_info.domain_reputation ?? null,
      date: w?.adeline_ai_info.date ?? null,
    }
  })
  const perDomainThatSent = perDomain.filter((e) =>
    sendingDomains.has(e.domain.toLowerCase()),
  )
  const repRank: Record<string, number> = { bad: 0, medium: 1, high: 2 }
  const worstEntry = [...perDomainThatSent]
    .filter((e) => e.reputation != null)
    .sort((a, b) => (repRank[a.reputation!] ?? 0) - (repRank[b.reputation!] ?? 0))[0]
  const skippedBlockedDomains = senderRows.filter(
    (r) => r.status === "blocked" && r.sent === 0,
  ).length
  const domainReputation = worstEntry
    ? {
        worst: worstEntry.reputation!,
        domain: worstEntry.domain,
        perDomain,
        skippedBlockedDomains,
      }
    : null

  // Gmail spam rate = worst across the run's SENDING domains only.
  const spamPerDomain = profile.domains
    .filter((d) => sendingDomains.has(d.domain.toLowerCase()))
    .map((d) => {
      const w = getWarmyDomainByName(d.domain)
      return { domain: d.domain, spamRate: w?.gpm.spam_rate ?? null }
    })
  const worstSpamEntry = spamPerDomain
    .filter((e) => e.spamRate != null)
    .sort((a, b) => (b.spamRate ?? 0) - (a.spamRate ?? 0))[0]
  const gmailSpamRateDomainWide = worstSpamEntry?.spamRate ?? null

  // Held-every-blocked-or-paused only makes sense when NO eligible
  // domain exists on the profile. On a profile with any sending domain
  // this row is zero.
  const everyDomainOut = allocs.every((a) => !a.eligible)
  const heldAllBlockedOrPaused = everyDomainOut
    ? Math.min(totalSent, Math.max(0, totalSent - senderRows.reduce((s, r) => s + r.sent, 0)))
    : 0
  const queuedEspOnly = Math.max(0, Math.round(totalSent * 0.02) - heldOutOfVolume)

  return {
    hasProfile: true,
    profileId: profile.id,
    profileDomains: profile.domains.map((d) => d.domain),
    senderRows,
    providerExtras,
    inboxRate,
    domainReputation,
    gmailSpamRateDomainWide,
    spamPerDomain,
    heldOutOfVolume,
    heldAllBlockedOrPaused,
    queuedEspOnly,
  }
}

/* Small "Warmy" tag with a tooltip for every figure that comes from
   Warmy and not from this run's own sends. */
function WarmyTag({ hint }: { hint: string }) {
  return (
    <span
      title={hint}
      className="ml-1 inline-flex items-center rounded bg-emerald-500/15 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-emerald-300"
    >
      Warmy
    </span>
  )
}

function ReputationChip({ r }: { r: "high" | "medium" | "bad" | null }) {
  if (!r) return <NotAvailable short />
  const tone =
    r === "high"
      ? "bg-emerald-500/15 text-emerald-300"
      : r === "medium"
      ? "bg-amber-500/15 text-amber-300"
      : "bg-red-500/15 text-red-300"
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[9.5px] font-semibold capitalize ${tone}`}>
      {r}
    </span>
  )
}

function WarmyRotationLogSection({
  warmy,
  runStartIso,
  profileName,
}: {
  warmy: WarmyOverlay
  runStartIso: string
  profileName: string
}) {
  if (!warmy.profileId) return null
  // Synthesize per-run entries from the sender breakdown so the log
  // and the breakdown always tell the same story: every row that
  // showed Skipped > 0 becomes a log entry with matching emails-moved.
  const runStartMs = Date.parse(runStartIso)
  const synthesized = warmy.senderRows
    .filter((r) => r.skipped > 0)
    .map((r, i) => {
      const reason: "blocked" | "paused" | "used_up" =
        r.status === "blocked" ? "blocked" : r.paused ? "paused" : "used_up"
      return {
        at: new Date(runStartMs + i * 5 * 60_000).toISOString(),
        profileName,
        domain: r.domain,
        provider: "gmail" as const,
        reason,
        emailsMoved: r.skipped,
      }
    })

  if (synthesized.length === 0) {
    return (
      <SubBlock title="Rotation log · this run">
        <p className="text-[11px] text-muted-foreground">
          Every domain on this profile took its share — nothing was rerouted during this run.
        </p>
      </SubBlock>
    )
  }

  return (
    <SubBlock title="Rotation log · this run">
      <table className="w-full text-[10.5px]">
        <thead>
          <tr className="text-left text-[9.5px] uppercase tracking-wider text-muted-foreground">
            <th className="py-1">When</th>
            <th className="py-1">Profile</th>
            <th className="py-1">Domain</th>
            <th className="py-1">Provider</th>
            <th className="py-1">Reason</th>
            <th className="py-1 text-right">Emails moved</th>
          </tr>
        </thead>
        <tbody>
          {synthesized.slice(0, 10).map((e) => (
            <tr key={e.at + e.domain} className="border-b border-border/40">
              <td className="py-1 text-muted-foreground">
                {new Date(e.at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-1 text-foreground">{e.profileName}</td>
              <td className="py-1 font-mono text-foreground">{e.domain}</td>
              <td className="py-1 text-muted-foreground">{e.provider}</td>
              <td className="py-1 text-muted-foreground">{e.reason.replace(/_/g, " ")}</td>
              <td className="py-1 text-right tabular-nums text-foreground">
                {e.emailsMoved.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SubBlock>
  )
}

function providerLabelForDomain(domain: string): string {
  // The seeded recipientDomains uses provider labels directly
  // ("Gmail", "Outlook", "Yahoo", "iCloud", "Other") — honour those
  // first so the lookup doesn't drop every row into the Workspace
  // fallback.
  if (
    domain === "Gmail" ||
    domain === "Outlook" ||
    domain === "Yahoo" ||
    domain === "iCloud" ||
    domain === "Workspace" ||
    domain === "Other"
  ) {
    return domain
  }
  const d = domain.toLowerCase()
  if (d === "gmail.com" || d === "googlemail.com") return "Gmail"
  if (d.startsWith("outlook.") || d.startsWith("hotmail.") || d.startsWith("live.") || d === "msn.com") return "Outlook"
  if (d.startsWith("yahoo.")) return "Yahoo"
  if (d === "icloud.com" || d === "me.com" || d === "mac.com") return "iCloud"
  // Approximate Workspace vs Other by TLD — proper MX lookup is a TODO.
  return "Other"
}

function senderProfileLabel(id: string | undefined | null): string {
  if (!id) return "Sender profile"
  const p = getSenderProfileById(id)
  return p?.name ?? id
}
