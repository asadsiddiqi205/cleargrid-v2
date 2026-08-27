"use client"

/**
 * Journey Health board — daily-run monitor + attribute-integrity checks.
 *
 * Folds three Eternals QA tools into one Reports page:
 *   - Journeys check: tracked-journey list with today's PTP counts,
 *     green tick / red cross for whether it ran, Slack alert on miss.
 *   - Check PTP dates: null/blank/dash audit on PTP-date attributes.
 *   - Add / remove journeys from the tracked set inline.
 */

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Copy,
  Info,
  Plus,
  RefreshCcw,
  MessageCircle,
  Trash2,
  XCircle,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  loadTrackedJourneys,
  saveTrackedJourneys,
  runPtpDateCheck,
  type TrackedJourney,
  type PtpDateCheckResult,
} from "@/data/tracked-journeys"

export default function JourneyHealthPage() {
  const [tracked, setTracked] = React.useState<TrackedJourney[]>([])
  const [addId, setAddId] = React.useState("")
  const [addName, setAddName] = React.useState("")
  const [ptpFrom, setPtpFrom] = React.useState<string>(todayIso())
  const [ptpTo, setPtpTo] = React.useState<string>(todayIso())
  const [ptpDatesResult, setPtpDatesResult] = React.useState<PtpDateCheckResult | null>(null)
  const [ptpAttrs, setPtpAttrs] = React.useState("cg_enbd_ptp_date_latest, cg_enbd_ptp_date_earliest")

  React.useEffect(() => {
    setTracked(loadTrackedJourneys())
  }, [])

  const runCheckToday = () => {
    // Randomise ranToday + PTP counts to simulate the daily check firing.
    setTracked((prev) => {
      const next = prev.map((t) => {
        const rand = Math.random()
        const ranToday = rand > 0.15
        return {
          ...t,
          ranToday,
          ptpsToday: ranToday ? Math.floor(t.ptpsToday * (0.7 + Math.random() * 0.6)) : 0,
          lastRunAt: ranToday ? new Date().toISOString() : t.lastRunAt,
        }
      })
      saveTrackedJourneys(next)
      return next
    })
    toast.success("Health check complete", {
      description: `${tracked.length} journeys checked. See the table for today's status.`,
    })
  }

  const runCheckAndAlert = () => {
    runCheckToday()
    const missed = tracked.filter((t) => !t.ranToday)
    if (missed.length > 0) {
      toast.warning(`Slack alerts posted for ${missed.length} journey${missed.length > 1 ? "s" : ""}`, {
        description: `Channels notified: ${new Set(missed.map((m) => `#${m.slackChannel}`)).size}`,
      })
    }
  }

  const addTracked = () => {
    if (!addId.trim() || !addName.trim()) return
    const next: TrackedJourney = {
      id: addId.trim(),
      name: addName.trim(),
      dueBy: "10:00 A",
      slackChannel: "allocate-uae-journey-alert",
      lastRunAt: null,
      ranToday: false,
      ptpsToday: 0,
    }
    const updated = [...tracked, next]
    setTracked(updated)
    saveTrackedJourneys(updated)
    setAddId("")
    setAddName("")
  }

  const removeTracked = (id: string) => {
    const updated = tracked.filter((t) => t.id !== id)
    setTracked(updated)
    saveTrackedJourneys(updated)
  }

  const runPtpDates = () => {
    const attrs = ptpAttrs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    setPtpDatesResult(runPtpDateCheck(attrs))
  }

  const totalPtps = tracked.reduce((s, t) => s + t.ptpsToday, 0)
  const missedCount = tracked.filter((t) => !t.ranToday).length

  return (
    <PageShell
      title="Journey Health"
      description="Daily-run monitor + attribute-integrity checks — folded from Eternals' Journeys check + Check PTP dates + Slack alerts."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            Reports
          </Link>
        </div>

        {missedCount > 0 && (
          <div className="rounded-md border border-error-500/40 bg-error-500/[0.06] px-4 py-3">
            <p className="flex items-center gap-2 text-[12px] font-medium text-error-300">
              <Bell className="h-3.5 w-3.5" />
              {missedCount} journey{missedCount > 1 ? "s" : ""} missed today &mdash; check the tick or the entry segment.
            </p>
          </div>
        )}

        {/* Daily monitor */}
        <section className="rounded-xl border border-border bg-card/40">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">Daily run monitor</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Did each tracked journey run today, and how many PTPs did it produce?
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={runCheckAndAlert} className="h-8 text-[11px]">
                <MessageCircle className="h-3 w-3" />
                Check &amp; send alert
              </Button>
              <Button size="sm" onClick={runCheckToday} className="h-8 text-[11px]">
                <CheckCircle2 className="h-3 w-3" />
                Check today
              </Button>
            </div>
          </header>

          <div className="border-b border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="text-foreground font-semibold">{totalPtps}</span> PTPs today across{" "}
            <span className="text-foreground font-semibold">{tracked.length}</span> tracked journeys.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/[0.06] text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-semibold">#</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Journey</th>
                  <th className="px-3 py-1.5 text-left font-semibold">ID</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Due by</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Slack</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Last run</th>
                  <th className="px-3 py-1.5 text-center font-semibold">Today</th>
                  <th className="px-3 py-1.5 text-right font-semibold">PTP</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tracked.map((t, i) => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <span className="text-foreground font-medium">{t.name}</span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{t.id}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{t.dueBy}</td>
                    <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[120px]">
                      #{t.slackChannel}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">
                      {t.lastRunAt ? new Date(t.lastRunAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {t.ranToday ? (
                        <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-primary" />
                      ) : (
                        <XCircle className="mx-auto h-3.5 w-3.5 text-error-400" />
                      )}
                    </td>
                    <td className={cn("px-3 py-1.5 text-right tabular-nums font-semibold", t.ptpsToday > 0 ? "text-primary" : "text-muted-foreground")}>
                      {t.ptpsToday}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeTracked(t.id)}
                        aria-label="Remove"
                        className="rounded p-1 text-muted-foreground hover:bg-error-500/10 hover:text-error-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 border-t border-border/60 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
            <Input
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              placeholder="Journey id (e.g. 6a3bf78922386ef0cba08b12)"
              className="h-8 text-[11px]"
            />
            <Input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Display name"
              className="h-8 text-[11px]"
            />
            <Button size="sm" onClick={addTracked} disabled={!addId.trim() || !addName.trim()} className="h-8 text-[11px]">
              <Plus className="h-3 w-3" />
              Add journey
            </Button>
          </div>
        </section>

        {/* Attribute integrity — PTP dates */}
        <section className="rounded-xl border border-border bg-card/40">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-foreground">PTP-date integrity check</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Find borrower deals whose PTP-date attributes are empty (null / blank / &quot;-&quot;).
              </p>
            </div>
            <div className="ml-auto">
              <Button size="sm" onClick={runPtpDates} className="h-8 text-[11px]">
                <RefreshCcw className="h-3 w-3" />
                Check PTP dates
              </Button>
            </div>
          </header>

          <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Attributes to null-check
              </Label>
              <Input
                value={ptpAttrs}
                onChange={(e) => setPtpAttrs(e.target.value)}
                className="mt-1 h-8 font-mono text-[11px]"
              />
              <p className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground">
                <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                Comma-separated. Values that match null / blank / dash / n/a count as empty.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={ptpFrom}
                  onChange={(e) => setPtpFrom(e.target.value)}
                  className="mt-1 h-8 text-[11px]"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={ptpTo}
                  onChange={(e) => setPtpTo(e.target.value)}
                  className="mt-1 h-8 text-[11px]"
                />
              </div>
            </div>
          </div>

          {ptpDatesResult && (
            <div className="border-t border-border/60 px-4 py-3">
              <div className="mb-2 flex items-center gap-3 text-[12px]">
                <span className="text-muted-foreground">Scanned</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {ptpDatesResult.totalScanned.toLocaleString()}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className={cn("tabular-nums font-semibold", ptpDatesResult.emptyCount > 0 ? "text-warning-300" : "text-primary")}>
                  {ptpDatesResult.emptyCount} empty
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ptpDatesResult.emptyDealIds.join("\n"))
                    toast.success("Deal ids copied to clipboard")
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                >
                  <Copy className="h-2.5 w-2.5" />
                  Copy all
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-md border border-border/60 bg-background/60 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                {ptpDatesResult.emptyDealIds.length === 0 ? (
                  <span>No deals with empty PTP dates — everything looks clean.</span>
                ) : (
                  ptpDatesResult.emptyDealIds.map((d) => <div key={d}>{d}</div>)
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
