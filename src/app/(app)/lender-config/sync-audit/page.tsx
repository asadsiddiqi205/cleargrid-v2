"use client"

/**
 * Sync audit — Eternals' Sync tool folded into Lender Config.
 *
 * Filters: lenders + timestamp window + attribute selection. Result:
 * every matching deal × selected-attribute values, with distinct-value
 * counts in the aggregate strip.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Info, RefreshCcw, Search } from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { lenders } from "@/data/lenders"
import {
  SYNC_ATTRIBUTES,
  runSyncAudit,
  type SyncAuditResult,
} from "@/data/sync-audit"

const LIMIT_OPTIONS = [100, 500, 2000]
const TZ_OPTIONS = ["UTC", "Dubai +4"] as const

export default function SyncAuditPage() {
  const [lenderIds, setLenderIds] = React.useState<string[]>([])
  const [attributeIds, setAttributeIds] = React.useState<string[]>([])
  const [from, setFrom] = React.useState<string>("")
  const [to, setTo] = React.useState<string>("")
  const [tz, setTz] = React.useState<(typeof TZ_OPTIONS)[number]>("UTC")
  const [limit, setLimit] = React.useState<number>(500)
  const [query, setQuery] = React.useState<string>("")
  const [result, setResult] = React.useState<SyncAuditResult | null>(null)

  const toggleLender = (id: string) =>
    setLenderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleAttribute = (id: string) =>
    setAttributeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const filteredAttrs = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SYNC_ATTRIBUTES
    return SYNC_ATTRIBUTES.filter((a) => a.id.toLowerCase().includes(q))
  }, [query])

  const runAudit = () => {
    setResult(
      runSyncAudit({
        lenderIds,
        attributeIds,
        from: from || null,
        to: to || null,
        limit,
      }),
    )
  }

  const setQuickWindow = (windowDays: number | null) => {
    if (windowDays === null) {
      setFrom("")
      setTo("")
      return
    }
    const now = new Date()
    const start = new Date(now.getTime() - windowDays * 86_400_000)
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00`
    setFrom(iso(start))
    setTo(iso(now))
  }

  return (
    <PageShell
      title="Sync audit"
      description="What values did a sync run actually write to BorrowerDeals? Filter by lender + timestamp window + attribute selection; the right pane shows every matching deal with distinct-value counts on each column."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link
            href="/lender-config"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            Lender Config
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
          {/* Left rail — filter controls */}
          <aside className="space-y-4">
            <FilterCard title={`Lenders${lenderIds.length > 0 ? ` · ${lenderIds.length}` : " · ALL"}`}>
              <ul className="space-y-1">
                {lenders.map((l) => (
                  <li key={l.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                      <input
                        type="checkbox"
                        checked={lenderIds.includes(l.id)}
                        onChange={() => toggleLender(l.id)}
                      />
                      <span className="text-foreground">{l.shortName ?? l.id}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setLenderIds([])}
                className="mt-2 text-[10px] text-primary hover:underline"
              >
                clear
              </button>
            </FilterCard>

            <FilterCard title="Timestamp window">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label>
              <Input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 h-8 text-[11px]"
              />
              <Label className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">To</Label>
              <Input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 h-8 text-[11px]"
              />
              <div className="mt-2 flex items-center gap-1 rounded-md border border-border/60 p-0.5">
                {TZ_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTz(v)}
                    className={cn(
                      "flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                      tz === v
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[
                  ["last 24h", 1],
                  ["7d", 7],
                  ["30d", 30],
                  ["any", null],
                ].map(([label, days]) => (
                  <button
                    key={label as string}
                    type="button"
                    onClick={() => setQuickWindow(days as number | null)}
                    className="rounded-full border border-primary/40 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/15"
                  >
                    {label as string}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                No window — every deal, whatever its timestamp.
              </p>
            </FilterCard>

            <FilterCard title={`Attributes · ${attributeIds.length}`}>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search attributes…"
                  className="h-7 pl-7 text-[11px]"
                />
              </div>
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {filteredAttrs.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-[10px]">
                      <input
                        type="checkbox"
                        checked={attributeIds.includes(a.id)}
                        onChange={() => toggleAttribute(a.id)}
                      />
                      <span className="font-mono text-foreground">{a.id}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setAttributeIds([])}
                className="mt-2 text-[10px] text-primary hover:underline"
              >
                clear
              </button>
            </FilterCard>
          </aside>

          {/* Right — action bar + results */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-[11px] tabular-nums dark:bg-input/30"
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    list {n}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={runAudit}
                disabled={attributeIds.length === 0}
                className="h-8 text-[11px]"
              >
                <RefreshCcw className="h-3 w-3" />
                Show values
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {attributeIds.length === 0
                  ? "Pick one or more attributes on the left, then hit Show values."
                  : `${attributeIds.length} attribute${attributeIds.length === 1 ? "" : "s"} · ${lenderIds.length === 0 ? "all lenders" : `${lenderIds.length} lender${lenderIds.length === 1 ? "" : "s"}`}`}
              </span>
            </div>

            {result && (
              <>
                {/* Distinct-value strip per attribute */}
                <div className="grid gap-2 md:grid-cols-2">
                  {attributeIds.map((id) => {
                    const attr = SYNC_ATTRIBUTES.find((a) => a.id === id)
                    const rows = result.distinctByAttribute[id] ?? []
                    return (
                      <div key={id} className="rounded-lg border border-border bg-card/40">
                        <div className="border-b border-border/60 px-3 py-2 text-[10px]">
                          <span className="font-mono font-semibold text-foreground">{attr?.id}</span>
                          <span className="text-muted-foreground">
                            {" · "}
                            {result.distinctCounts[id] ?? 0} distinct
                          </span>
                        </div>
                        <ul className="max-h-32 overflow-y-auto p-2 text-[10px]">
                          {rows.slice(0, 8).map((r) => (
                            <li key={r.value} className="flex items-center gap-2 py-0.5">
                              <span className="min-w-0 flex-1 truncate">{r.value}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {r.count.toLocaleString()}
                              </span>
                            </li>
                          ))}
                          {rows.length > 8 && (
                            <li className="text-center text-muted-foreground">
                              +{rows.length - 8} more…
                            </li>
                          )}
                        </ul>
                      </div>
                    )
                  })}
                </div>

                {/* Rows table */}
                <div className="rounded-xl border border-border bg-card/40">
                  <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-[11px]">
                    <span className="text-muted-foreground">Values written</span>
                    <span className="tabular-nums font-semibold text-foreground">
                      {result.totalMatched.toLocaleString()} rows
                    </span>
                  </div>
                  <div className="max-h-[60vh] overflow-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/[0.06] text-muted-foreground">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-semibold">Deal id</th>
                          <th className="px-3 py-1.5 text-left font-semibold">Borrower</th>
                          <th className="px-3 py-1.5 text-left font-semibold">Lender</th>
                          <th className="px-3 py-1.5 text-left font-semibold">Written</th>
                          {attributeIds.map((id) => (
                            <th key={id} className="px-3 py-1.5 text-left font-mono text-[10px] font-semibold">
                              {id}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.rows.map((r) => (
                          <tr key={r.dealId}>
                            <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{r.dealId}</td>
                            <td className="px-3 py-1.5 text-foreground">{r.borrowerName}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.lenderName}</td>
                            <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                              {new Date(r.writtenAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            {attributeIds.map((id) => (
                              <td
                                key={id}
                                className={cn(
                                  "px-3 py-1.5",
                                  r.values[id] ? "text-foreground" : "text-warning-300",
                                )}
                              >
                                {r.values[id] || "(empty)"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {!result && (
              <div className="rounded-xl border border-border bg-card/40 p-10 text-center text-[12px] text-muted-foreground">
                <Info className="mx-auto mb-2 h-5 w-5 text-muted-foreground/70" />
                Pick one or more attributes on the left (plus any lender / timestamp filter),
                then hit <span className="text-foreground">Show values</span> to read them off the
                deals that match.
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  )
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}
