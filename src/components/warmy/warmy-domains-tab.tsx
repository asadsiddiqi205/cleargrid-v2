"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertCircle, ExternalLink, Pause, Play, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  listWarmyDomains,
  listAlertsForDomain,
  getSentToday,
  getComposerOvershoot,
  takeDomainOutOfRotation,
  putDomainBackInRotation,
  setOpsDailyCap,
  isWarmyAdmin,
  type WarmyDomain,
  type WarmyProvider,
} from "@/data/warmy"
import {
  statusForDomain,
  STATUS_DOT_CLASS,
  STATUS_LABEL,
  STATUS_PILL_CLASS,
  STATUS_RANK,
  type DomainHealthSummary,
} from "@/data/domain-health"
import { lenders } from "@/data/lenders"
import { senderProfiles, type SenderProfile } from "@/data/sender-profiles"
import { DomainStatusDot } from "@/components/warmy/domain-status-dot"

const PROVIDERS: WarmyProvider[] = [
  "gmail",
  "outlook",
  "yahoo",
  "google_workspace",
  "microsoft_365",
]

const PROVIDER_LABEL: Record<WarmyProvider, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo",
  google_workspace: "Google Workspace",
  microsoft_365: "Microsoft 365",
}

/** Every domain Command knows about — the union of every profile's
 *  domain list and every from-email domain. */
export function allCommandDomains(): string[] {
  const set = new Set<string>()
  for (const p of senderProfiles) {
    for (const d of p.domains) set.add(d.domain)
    if (p.fromEmail.includes("@")) set.add(p.fromEmail.split("@")[1]!)
  }
  return [...set].sort()
}

export function profilesUsingDomain(domain: string): SenderProfile[] {
  const lower = domain.toLowerCase()
  return senderProfiles.filter(
    (p) =>
      p.domains.some((d) => d.domain.toLowerCase() === lower) ||
      (p.fromEmail.includes("@") && p.fromEmail.split("@")[1]!.toLowerCase() === lower),
  )
}

export function WarmyDomainsTab({
  search,
  lenderFilter,
}: {
  search: string
  lenderFilter: string
}) {
  const [openDomain, setOpenDomain] = React.useState<string | null>(null)

  const rows = React.useMemo(() => {
    const names = allCommandDomains()
    // Lender filter is applied through the profiles each domain is on.
    const filteredByLender =
      lenderFilter === "all"
        ? names
        : names.filter((d) =>
            profilesUsingDomain(d).some((p) => p.lenderId === lenderFilter),
          )
    const filteredBySearch = search.trim()
      ? filteredByLender.filter((d) => d.toLowerCase().includes(search.trim().toLowerCase()))
      : filteredByLender
    return filteredBySearch
      .map((d) => statusForDomain(d))
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name))
  }, [search, lenderFilter])

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <Th>Domain</Th>
              <Th>Status</Th>
              <Th>Health</Th>
              <Th>Gmail rep (Warmy)</Th>
              <Th>Inbox placement</Th>
              <Th>Gmail spam</Th>
              <Th>DNS</Th>
              <Th>Mailboxes</Th>
              <Th>Today&apos;s volume</Th>
              <Th>Alerts</Th>
              <Th>Used in</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                  No domains match those filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <DomainRow key={r.name} summary={r} onOpen={() => setOpenDomain(r.name)} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <DomainDrawer
        open={openDomain !== null}
        domain={openDomain}
        onClose={() => setOpenDomain(null)}
      />
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2.5 py-2 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function DomainRow({
  summary,
  onOpen,
}: {
  summary: DomainHealthSummary
  onOpen: () => void
}) {
  const w = summary.warmy
  const worst = worstVolume(w)
  const alerts = summary.alerts.filter((a) => a.state !== "resolved")
  const profiles = profilesUsingDomain(summary.name)
  const noVolumeLimit = w?.ops_daily_cap_per_provider == null && !w

  return (
    <tr
      className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/20"
      onClick={onOpen}
    >
      <td className="px-2.5 py-2.5">
        <div className="flex items-center gap-2">
          <DomainStatusDot domain={summary.name} />
          <div className="min-w-0">
            <p className="truncate font-mono text-[12px] text-foreground">{summary.name}</p>
            {summary.paused && (
              <p className="text-[9.5px] text-neutral-400">Paused by ops</p>
            )}
            {noVolumeLimit && (
              <p className="text-[9.5px] text-amber-300">No volume limit</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-2.5 py-2.5">
        <span
          className={cn(
            "inline-flex items-center rounded border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
            STATUS_PILL_CLASS[summary.status],
          )}
        >
          {STATUS_LABEL[summary.status]}
        </span>
      </td>
      <td className="px-2.5 py-2.5 tabular-nums text-[11px] text-foreground">
        {w ? w.health_score.total : "—"}
      </td>
      <td className="px-2.5 py-2.5 text-[11px] capitalize text-foreground">
        {w ? w.adeline_ai_info.domain_reputation : "—"}
      </td>
      <td className="px-2.5 py-2.5">
        {w ? (
          <div className="flex gap-1 text-[9.5px]">
            <PlacementChip label="Gm" pct={w.placement_checker.gmail.inbox_pct} />
            <PlacementChip label="Wk" pct={w.placement_checker.gsuite.inbox_pct} />
            <PlacementChip label="Ot" pct={w.placement_checker.outlook.inbox_pct} />
          </div>
        ) : (
          "—"
        )}
      </td>
      <td className="px-2.5 py-2.5 tabular-nums text-[11px] text-foreground">
        {w ? `${(w.gpm.spam_rate * 100).toFixed(2)} %` : "—"}
      </td>
      <td className="px-2.5 py-2.5">
        {w ? (
          <div className="flex flex-wrap gap-0.5 text-[9px]">
            <DnsChip label="SPF" state={w.dns_records.spf} />
            <DnsChip label="DKIM" state={w.dns_records.dkim} />
            <DnsChip label="DMARC" state={w.dns_records.dmarc} />
            <DnsChip label="MX" state={w.dns_records.mx} />
          </div>
        ) : (
          "—"
        )}
      </td>
      <td className="px-2.5 py-2.5 text-[11px] text-foreground">
        {w ? `${w.mailboxes.active}/${w.mailboxes.paused}/${w.mailboxes.blocked}` : "—"}
      </td>
      <td className="px-2.5 py-2.5">
        {worst ? (
          <VolumeBar
            sent={worst.sent}
            recommended={worst.recommended ?? 0}
            missing={worst.missing}
            label={PROVIDER_LABEL[worst.provider]}
          />
        ) : (
          "—"
        )}
      </td>
      <td className="px-2.5 py-2.5 tabular-nums text-[11px]">
        {alerts.length > 0 ? (
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-300">
            {alerts.length}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </td>
      <td className="px-2.5 py-2.5 text-[11px] tabular-nums text-foreground">
        {profiles.length}
      </td>
    </tr>
  )
}

function PlacementChip({ label, pct }: { label: string; pct: number }) {
  const tone =
    pct >= 90
      ? "bg-emerald-500/15 text-emerald-300"
      : pct >= 70
      ? "bg-amber-500/15 text-amber-300"
      : "bg-red-500/15 text-red-300"
  return (
    <span className={cn("rounded px-1 py-0.5 tabular-nums", tone)}>
      {label} {pct}
    </span>
  )
}

function DnsChip({
  label,
  state,
}: {
  label: string
  state: "valid" | "invalid" | "missing" | "not_received"
}) {
  const tone =
    state === "valid"
      ? "bg-emerald-500/15 text-emerald-300"
      : state === "not_received"
      ? "bg-neutral-500/15 text-neutral-300"
      : "bg-red-500/15 text-red-300"
  return <span className={cn("rounded px-1 py-0.5", tone)}>{label}</span>
}

function worstVolume(w: WarmyDomain | null) {
  if (!w) return null
  let worst: {
    provider: WarmyProvider
    sent: number
    recommended: number | null
    missing: string | undefined
    left: number
  } | null = null
  for (const p of PROVIDERS) {
    const rv = w.recommended_volume_today[p]
    const sent = getSentToday(w.name, p)
    const recommended = rv.volume
    const left = recommended == null ? Infinity : Math.max(0, recommended - sent)
    if (!worst || left < worst.left) {
      worst = { provider: p, sent, recommended, missing: rv.missing_data, left }
    }
  }
  return worst
}

function VolumeBar({
  sent,
  recommended,
  missing,
  label,
}: {
  sent: number
  recommended: number
  missing: string | undefined
  label: string
}) {
  const pct = recommended > 0 ? Math.min(100, Math.round((sent / recommended) * 100)) : 0
  const used = recommended > 0 && sent >= recommended
  const tone = used ? "bg-red-500" : missing ? "bg-neutral-500" : pct > 75 ? "bg-amber-400" : "bg-emerald-500"
  return (
    <div className="w-32">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {sent.toLocaleString()} / {recommended.toLocaleString()}
        </span>
      </div>
      <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-muted/60">
        <div className={cn("h-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      {missing && (
        <p className="mt-0.5 text-[9px] text-muted-foreground">{missingLabel(missing)}</p>
      )}
    </div>
  )
}

function missingLabel(m: string) {
  switch (m) {
    case "connect_gpm":
      return "Connect Google Postmaster in Warmy"
    case "run_placement_test":
      return "Run a placement test in Warmy"
    case "warmup_not_running":
      return "Warm-up not running in Warmy"
    default:
      return m
  }
}

/* ───────────────────────── Domain drawer ───────────────────────── */

function DomainDrawer({
  open,
  domain,
  onClose,
}: {
  open: boolean
  domain: string | null
  onClose: () => void
}) {
  if (!domain) return null
  const summary = statusForDomain(domain)
  const w = summary.warmy
  const alerts = listAlertsForDomain(domain)
  const profiles = profilesUsingDomain(domain)
  const admin = isWarmyAdmin()

  const [reason, setReason] = React.useState("")
  const [cap, setCap] = React.useState<string>(w?.ops_daily_cap_per_provider?.toString() ?? "")

  const handlePause = () => {
    if (summary.paused) {
      putDomainBackInRotation(domain)
      toast.success(`${domain} put back in rotation`, {
        description: `${profiles.length} profile${profiles.length === 1 ? "" : "s"} unlocked.`,
      })
    } else {
      takeDomainOutOfRotation(domain, reason.trim() || "Taken out by ops", "You")
      toast.warning(`${domain} taken out of rotation`, {
        description: `Applies to ${profiles.length} profile${
          profiles.length === 1 ? "" : "s"
        }. Live journeys using them will route around this domain on the next send.`,
      })
    }
    onClose()
  }

  const saveCap = () => {
    const parsed = cap.trim() === "" ? null : Number(cap)
    if (parsed !== null && !Number.isFinite(parsed)) {
      toast.error("Ops cap must be a number or empty.")
      return
    }
    setOpsDailyCap(domain, parsed)
    toast.success("Ops cap saved", {
      description:
        parsed === null
          ? "Warmy's recommended volume applies alone."
          : `When Warmy says more than ${parsed}, Command uses ${parsed} instead.`,
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span
              className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT_CLASS[summary.status])}
              aria-hidden
            />
            <span className="font-mono">{domain}</span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider",
                STATUS_PILL_CLASS[summary.status],
              )}
            >
              {STATUS_LABEL[summary.status]}
            </span>
            {summary.paused && (
              <span className="rounded bg-neutral-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-neutral-200">
                Paused
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            {summary.reasons.length > 0 ? summary.reasons.join(" · ") : "All health signals clean."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto px-4 pb-8 pt-2">
          {!w ? (
            <div className="rounded-md border border-neutral-500/40 bg-neutral-500/10 p-3 text-[11.5px] text-neutral-200">
              Not matched to a Warmy domain. Volume falls back to the ops cap below.
            </div>
          ) : (
            <>
              <HealthScoreBlock w={w} />
              <TodayVolumeBlock w={w} />
              <TrendBlock w={w} />
              <DnsBlock w={w} />
              <MailboxesBlock w={w} />
            </>
          )}

          <AlertsBlock alerts={alerts} />
          <UsedInBlock profiles={profiles} domain={domain} />

          {admin && (
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Admin actions
              </h3>
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Reason (shown in rotation log)
                  </span>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Resolving Gmail reputation drop"
                    className="h-8 text-[11.5px]"
                  />
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <div className="font-medium text-foreground">
                    Applies to {profiles.length} profile{profiles.length === 1 ? "" : "s"}
                  </div>
                  <Button size="sm" variant="outline" onClick={handlePause}>
                    {summary.paused ? (
                      <>
                        <Play className="h-3 w-3" />
                        Put back in rotation
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3" />
                        Take out of rotation
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-end gap-2 pt-2">
                  <label className="flex-1 space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Ops daily cap (optional)
                    </span>
                    <Input
                      value={cap}
                      onChange={(e) => setCap(e.target.value)}
                      placeholder="Leave blank to let Warmy drive"
                      className="h-8 text-[11.5px]"
                    />
                  </label>
                  <Button size="sm" variant="outline" onClick={saveCap}>
                    Save cap
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  When Warmy has no number, the ops cap is used. When both exist, the lower one
                  applies.
                </p>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function HealthScoreBlock({ w }: { w: WarmyDomain }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Health score
      </h3>
      <div className="grid grid-cols-5 gap-2 rounded-md border border-border bg-muted/20 p-3 text-[11px]">
        <StatTile label="Total" value={w.health_score.total} />
        <StatTile label="Deliverability" value={w.health_score.deliverability_score} />
        <StatTile label="Placement" value={w.health_score.placement_checker_score} />
        <StatTile label="Postmaster" value={w.health_score.postmaster_score} />
        <StatTile label="Mailtest" value={w.health_score.mailtest_score} />
      </div>
    </section>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  )
}

function TodayVolumeBlock({ w }: { w: WarmyDomain }) {
  const rows = ([...PROVIDERS, "other" as const]).map((p) => {
    if (p === "other") {
      const gw = w.recommended_volume_today.google_workspace
      const ms = w.recommended_volume_today.microsoft_365
      const minVol =
        gw.volume == null
          ? ms.volume
          : ms.volume == null
          ? gw.volume
          : Math.min(gw.volume, ms.volume)
      return {
        provider: "other" as const,
        label: "Other",
        recommended: minVol,
        sent: 0,
        composerOver: 0,
        missing: gw.missing_data ?? ms.missing_data,
      }
    }
    const rv = w.recommended_volume_today[p]
    return {
      provider: p,
      label: PROVIDER_LABEL[p],
      recommended: rv.volume,
      sent: getSentToday(w.name, p),
      composerOver: getComposerOvershoot(w.name, p),
      missing: rv.missing_data,
    }
  })
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Today&apos;s volume per provider
      </h3>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/30 text-[9.5px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Provider</th>
              <th className="px-2 py-1 text-right font-medium">Sent today</th>
              <th className="px-2 py-1 text-right font-medium">Recommended</th>
              <th className="px-2 py-1 text-right font-medium">Left</th>
              <th className="px-2 py-1 text-left font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              // Journey-side sent never goes past Warmy's recommended. Any
              // excess is attributed to Composer sends and shown on its
              // own amber line.
              const journeySent = r.recommended == null ? r.sent : Math.min(r.sent - r.composerOver, r.recommended)
              const left = r.recommended == null ? null : Math.max(0, r.recommended - journeySent)
              const state =
                r.missing
                  ? "Missing data"
                  : r.recommended === 0
                  ? "Warmy says 0"
                  : left === 0
                  ? "Used up"
                  : "Open"
              return (
                <tr key={r.provider} className="border-t border-border/50">
                  <td className="px-2 py-1 text-foreground">{r.label}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-foreground">
                    {journeySent.toLocaleString()}
                    {r.composerOver > 0 && (
                      <div className="text-[10px] font-medium text-amber-600 dark:text-amber-300">
                        +{r.composerOver} over from Composer sends
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-foreground">
                    {r.recommended == null ? "—" : r.recommended.toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-foreground">
                    {left == null ? "—" : left.toLocaleString()}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {state}
                    {r.missing && (
                      <span className="ml-1 text-amber-600 dark:text-amber-300">· {missingLabel(r.missing)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TrendBlock({ w }: { w: WarmyDomain }) {
  const max = Math.max(...w.thirty_day_report.map((d) => d.inbox + d.spam), 100)
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        30-day trend · inbox vs spam
      </h3>
      <div className="flex h-24 items-end gap-0.5 rounded-md border border-border bg-muted/20 p-2">
        {w.thirty_day_report.map((d) => {
          const inboxPct = (d.inbox / max) * 100
          const spamPct = (d.spam / max) * 100
          return (
            <div key={d.date} className="flex-1" title={new Date(d.date).toLocaleDateString()}>
              <div className="flex h-full flex-col justify-end">
                <div className="bg-red-500/60" style={{ height: `${spamPct}%` }} />
                <div className="bg-emerald-500/60" style={{ height: `${inboxPct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Gmail spam rate today: {(w.gpm.spam_rate * 100).toFixed(2)} %
      </p>
    </section>
  )
}

function DnsBlock({ w }: { w: WarmyDomain }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        DNS records
      </h3>
      <div className="grid grid-cols-4 gap-2 rounded-md border border-border bg-muted/20 p-3 text-[11px]">
        {(["spf", "dkim", "dmarc", "mx"] as const).map((k) => (
          <div key={k}>
            <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div
              className={cn(
                "mt-0.5 text-[12px] font-semibold capitalize",
                w.dns_records[k] === "valid"
                  ? "text-emerald-300"
                  : w.dns_records[k] === "not_received"
                  ? "text-neutral-300"
                  : "text-red-300",
              )}
            >
              {w.dns_records[k].replace("_", " ")}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MailboxesBlock({ w }: { w: WarmyDomain }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Mailboxes
      </h3>
      <div className="grid grid-cols-4 gap-2 rounded-md border border-border bg-muted/20 p-3 text-[11px]">
        <StatTile label="Active" value={w.mailboxes.active} />
        <StatTile label="Paused" value={w.mailboxes.paused} />
        <StatTile label="Blocked" value={w.mailboxes.blocked} />
        <StatTile label="Stopped" value={w.mailboxes.stopped} />
      </div>
    </section>
  )
}

function AlertsBlock({ alerts }: { alerts: ReturnType<typeof listAlertsForDomain> }) {
  if (alerts.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Alerts
        </h3>
        <p className="text-[11px] text-muted-foreground">No open alerts.</p>
      </section>
    )
  }
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Alerts
      </h3>
      {alerts.map((a) => (
        <div
          key={a.id}
          className="space-y-1.5 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-[11px]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-red-400" />
            <span className="font-medium text-foreground">
              {a.alert_key.replace(/_/g, " ")} · {a.target_provider}
            </span>
            <span className="ml-auto text-[9.5px] text-muted-foreground">
              Opened {new Date(a.openedAt).toLocaleString()}
            </span>
          </div>
          <ol className="list-decimal space-y-0.5 pl-5 text-muted-foreground">
            {a.next_steps.map((s, i) => (
              <li
                key={i}
                className={cn(s.done && "text-emerald-300 line-through decoration-emerald-400/50")}
              >
                {s.text}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  )
}

function UsedInBlock({ profiles, domain }: { profiles: SenderProfile[]; domain: string }) {
  if (profiles.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Used in
        </h3>
        <p className="text-[11px] text-muted-foreground">
          {domain} isn&apos;t on any sender profile yet.
        </p>
      </section>
    )
  }
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Used in
      </h3>
      <div className="divide-y divide-border rounded-md border border-border bg-muted/20">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 text-[11px]">
            <div className="min-w-0">
              <p className="truncate text-foreground">{p.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {p.lenderName} · {p.prefix}@{domain}
              </p>
            </div>
            <Link
              href={`/sender-profiles#${p.id}`}
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary hover:underline"
            >
              Open
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Small toolbar helper so the page can give the Domains tab the same
 *  Search + Lender filter chrome it uses for Profiles. */
export function WarmyDomainsToolbar({
  search,
  setSearch,
  lenderFilter,
  setLenderFilter,
}: {
  search: string
  setSearch: (v: string) => void
  lenderFilter: string
  setLenderFilter: (v: string) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search domains…"
          className="pl-8"
        />
      </div>
      <Select value={lenderFilter} onValueChange={(v) => setLenderFilter(v ?? "all")}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All lenders</SelectItem>
          <SelectItem value="general">General (cross-lender)</SelectItem>
          {lenders.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
