"use client";

/**
 * Journey Report — full-page analytics surface.
 *
 * Route:  /journeys/[id]/report
 * Layout: three vertical bands
 *   1. Header + KPI row (Enrolled / Converted / Exited / Errored / Still Active)
 *   2. Two-column: time-series area chart (60%) + business metrics stack (40%)
 *   3. Per-node breakdown table (sortable)
 */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Download,
  LogOut,
  PhoneCall,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getJourneyById, getJourneyFlow } from "@/data/journeys";
import type { Node } from "@xyflow/react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type TimeRange = "24h" | "7d" | "30d" | "90d" | "all" | "custom";

const RANGE_DAYS: Record<TimeRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 180,
  custom: 30,
};

const RANGE_LABEL: Record<TimeRange, string> = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  all: "All time",
  custom: "Custom",
};

/* ------------------------------------------------------------------ */
/* Deterministic mock data derivation                                 */
/* ------------------------------------------------------------------ */

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildMetrics(journeyId: string, enrolled: number, range: TimeRange) {
  const scale =
    range === "24h" ? 0.06 : range === "7d" ? 0.28 : range === "30d" ? 0.9 : range === "90d" ? 2.4 : 4.2;
  const totalEnrolled = Math.round(Math.max(0, enrolled * scale));
  if (totalEnrolled === 0) {
    return {
      totalEnrolled: 0, converted: 0, exited: 0, errored: 0, timedOut: 0, active: 0,
      ptpsCaptured: 0, rpcs: 0, revenueAed: 0, trend: 0,
    };
  }
  const converted = Math.round(totalEnrolled * 0.38);
  const exited = Math.round(totalEnrolled * 0.26);
  const errored = Math.round(totalEnrolled * 0.02);
  const timedOut = Math.round(totalEnrolled * 0.04);
  const active = Math.max(0, totalEnrolled - converted - exited - errored - timedOut);
  const ptpsCaptured = Math.round(converted * 0.26);
  const rpcs = Math.round(totalEnrolled * 0.23);
  const revenueAed = Math.round(converted * 380);
  const trend = ((hashCode(journeyId + range) % 40) - 12);
  return { totalEnrolled, converted, exited, errored, timedOut, active, ptpsCaptured, rpcs, revenueAed, trend };
}

function buildTimeSeries(journeyId: string, enrolled: number, range: TimeRange) {
  const days = RANGE_DAYS[range];
  const now = new Date(2026, 6, 28);
  const arr: Array<{ date: string; day: string; enrolled: number; completed: number; exited: number }> = [];
  const seed = hashCode(journeyId + range);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const factor = enrolled === 0 ? 0 : Math.max(0, 0.6 + Math.sin(i / 2 + seed / 1000) * 0.35);
    const dayEnrolled = Math.round((enrolled / Math.max(1, days)) * factor * 4);
    arr.push({
      date: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      enrolled: dayEnrolled,
      completed: Math.round(dayEnrolled * 0.38),
      exited: Math.round(dayEnrolled * 0.26),
    });
  }
  return arr;
}

/** Small sparkline data derived from the full series, biased per metric. */
function buildSparkline(series: Array<{ enrolled: number; completed: number; exited: number }>, metric: keyof typeof accentMap) {
  const seed = hashCode(metric);
  return series.map((d, i) => {
    let v = d.enrolled;
    if (metric === "converted") v = d.completed;
    if (metric === "exited") v = d.exited;
    if (metric === "errored") v = Math.max(0, Math.round(d.exited * 0.08 + (seed % 3)));
    if (metric === "active") v = Math.max(0, d.enrolled - d.completed - d.exited);
    return { i, v };
  });
}

function buildPerNodeStats(nodes: Node[], totalEnrolled: number) {
  return nodes.map((n, i) => {
    const runs = Math.max(0, Math.round(totalEnrolled * Math.pow(0.88, i)));
    const ok = Math.round(runs * 0.92);
    const failed = Math.round(runs * 0.03);
    const skipped = Math.round(runs * 0.02);
    const waiting = Math.round(runs * 0.03);
    const avgSeconds = 5 + (hashCode(n.id) % 55);
    const conversion = runs === 0 ? 0 : Math.round((ok / Math.max(1, runs)) * 1000) / 10;
    const data = n.data as Record<string, unknown> | undefined;
    return {
      nodeId: n.id,
      label: (data?.label as string) ?? n.id,
      type: (data?.blockType as string) ?? n.type ?? "unknown",
      runs, ok, failed, skipped, waiting, avgSeconds, conversion,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Accent palette                                                     */
/* ------------------------------------------------------------------ */

type KpiKey = "enrolled" | "converted" | "exited" | "errored" | "active";

interface AccentSpec {
  icon: LucideIcon;
  chip: string;           // small icon bg
  chipText: string;
  numberText: string;
  sparkStroke: string;    // recharts stroke
  sparkFill: string;      // gradient top color
  cardTint: string;       // subtle bg gradient
  ring: string;
}

const accentMap: Record<KpiKey, AccentSpec> = {
  enrolled: {
    icon: Users,
    chip: "bg-neutral-800/70",
    chipText: "text-neutral-200",
    numberText: "text-foreground",
    sparkStroke: "#B3B8BE",
    sparkFill: "#8C939D",
    cardTint: "from-neutral-800/25 to-transparent",
    ring: "hover:ring-neutral-700/40",
  },
  converted: {
    icon: CheckCircle2,
    chip: "bg-primary-500/15",
    chipText: "text-primary-300",
    numberText: "text-primary-300",
    sparkStroke: "#1EACAD",
    sparkFill: "#069495",
    cardTint: "from-primary-500/10 to-transparent",
    ring: "hover:ring-primary-500/30",
  },
  exited: {
    icon: LogOut,
    chip: "bg-warning-500/15",
    chipText: "text-warning-300",
    numberText: "text-warning-300",
    sparkStroke: "#E3B53B",
    sparkFill: "#B98A20",
    cardTint: "from-warning-500/10 to-transparent",
    ring: "hover:ring-warning-500/30",
  },
  errored: {
    icon: AlertCircle,
    chip: "bg-error-500/15",
    chipText: "text-error-300",
    numberText: "text-error-300",
    sparkStroke: "#E26261",
    sparkFill: "#C33333",
    cardTint: "from-error-500/10 to-transparent",
    ring: "hover:ring-error-500/30",
  },
  active: {
    icon: Activity,
    chip: "bg-info-500/15",
    chipText: "text-info-300",
    numberText: "text-info-300",
    sparkStroke: "#5E9CF1",
    sparkFill: "#2670DB",
    cardTint: "from-info-500/10 to-transparent",
    ring: "hover:ring-info-500/30",
  },
};

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function JourneyReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const journeyId = params.id ?? "new";
  const journey = getJourneyById(journeyId);
  const flow = getJourneyFlow(journeyId);

  const [range, setRange] = React.useState<TimeRange>("7d");
  const [loading, setLoading] = React.useState(true);
  const [sortKey, setSortKey] = React.useState<
    "runs" | "ok" | "failed" | "skipped" | "waiting" | "avg" | "conversion" | null
  >(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  React.useEffect(() => {
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 400);
    return () => window.clearTimeout(t);
  }, [range]);

  const enrolledBaseline = journey?.enrolled ?? 0;
  const metrics = React.useMemo(
    () => buildMetrics(journeyId, enrolledBaseline, range),
    [journeyId, enrolledBaseline, range],
  );
  const series = React.useMemo(
    () => buildTimeSeries(journeyId, enrolledBaseline, range),
    [journeyId, enrolledBaseline, range],
  );
  const perNode = React.useMemo(
    () => buildPerNodeStats(flow.nodes, metrics.totalEnrolled),
    [flow.nodes, metrics.totalEnrolled],
  );
  const sortedPerNode = React.useMemo(() => {
    if (!sortKey) return perNode;
    const arr = [...perNode];
    arr.sort((a, b) => {
      const av = sortKey === "avg" ? a.avgSeconds : sortKey === "conversion" ? a.conversion : a[sortKey];
      const bv = sortKey === "avg" ? b.avgSeconds : sortKey === "conversion" ? b.conversion : b[sortKey];
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [perNode, sortKey, sortDir]);

  const journeyName = journey?.name ?? "Journey";
  const journeyStatus = journey?.status ?? "draft";
  const lastRun = journey?.lastRun ?? "—";
  const hasEverRun = enrolledBaseline > 0;
  const hasDataInRange = metrics.totalEnrolled > 0;

  const conversionRate = metrics.totalEnrolled > 0
    ? Math.round((metrics.converted / metrics.totalEnrolled) * 1000) / 10
    : 0;

  function toggleSort(k: NonNullable<typeof sortKey>) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  function handleExportCsv() {
    if (perNode.length === 0) {
      toast.info("Nothing to export — the journey has no nodes.");
      return;
    }
    const rows = [
      ["node_id", "label", "type", "runs", "ok", "failed", "skipped", "waiting", "avg_seconds", "conversion_pct"],
      ...perNode.map((n) => [
        n.nodeId, n.label, n.type, n.runs, n.ok, n.failed, n.skipped, n.waiting, n.avgSeconds, n.conversion,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journey-report-${journeyName.replace(/\s+/g, "-").toLowerCase()}-${range}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success("CSV exported");
  }

  return (
    <div className="relative min-h-full w-full bg-background">
      {/* Decorative top gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-gradient-to-b from-primary-500/10 via-primary-500/[0.03] to-transparent"
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-8 py-8">
        {/* Back to editor */}
        <button
          type="button"
          onClick={() => router.push(`/journeys/${journeyId}`)}
          className="mb-6 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to editor
        </button>

        {/* ================== Band 1 · Header + KPIs ================== */}
        <section className="mb-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-400">
                Journey Report
              </p>
              <h1 className="mt-1.5 truncate text-[32px] font-semibold leading-tight text-foreground">
                {journeyName}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <StatusBadge status={journeyStatus} />
                <span>·</span>
                <span>Last updated {lastRun}</span>
                {hasDataInRange && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-primary-400" />
                      <span className="text-foreground">{conversionRate.toFixed(1)}%</span> conversion in this window
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-muted/10 p-0.5">
                {(["24h", "7d", "30d", "90d", "all"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                      range === r
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              <KpiCard
                metric="enrolled"
                label="Enrolled"
                value={metrics.totalEnrolled}
                trend={hasDataInRange ? metrics.trend : null}
                spark={buildSparkline(series, "enrolled")}
                empty={!hasDataInRange}
              />
              <KpiCard
                metric="converted"
                label="Converted"
                value={metrics.converted}
                trend={hasDataInRange ? metrics.trend + 4 : null}
                spark={buildSparkline(series, "converted")}
                empty={!hasDataInRange}
              />
              <KpiCard
                metric="exited"
                label="Exited"
                value={metrics.exited}
                trend={hasDataInRange ? -Math.abs(metrics.trend / 2) : null}
                spark={buildSparkline(series, "exited")}
                empty={!hasDataInRange}
              />
              <KpiCard
                metric="errored"
                label="Errored"
                value={metrics.errored}
                trend={hasDataInRange ? -8 : null}
                spark={buildSparkline(series, "errored")}
                empty={!hasDataInRange}
              />
              <KpiCard
                metric="active"
                label="Still Active"
                value={metrics.active}
                trend={hasDataInRange ? metrics.trend - 2 : null}
                spark={buildSparkline(series, "active")}
                empty={!hasDataInRange}
              />
            </div>
          )}
        </section>

        {/* ================== Band 2 · Chart + Business metrics ================== */}
        <section className="mb-12">
          {!hasDataInRange && hasEverRun && !loading && (
            <p className="mb-3 text-[12px] text-muted-foreground">
              No runs in the selected range. Try a longer time window.
            </p>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
              <Skeleton className="h-[420px] w-full rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-[130px] w-full rounded-xl" />
                <Skeleton className="h-[130px] w-full rounded-xl" />
                <Skeleton className="h-[130px] w-full rounded-xl" />
              </div>
            </div>
          ) : hasEverRun ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
              {/* Time-series chart */}
              <div className="overflow-hidden rounded-xl border border-border bg-card/60">
                <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                  <div>
                    <h2 className="text-[16px] font-semibold text-foreground">Daily activity</h2>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {RANGE_LABEL[range]} · enrollments, completions, and exits per day.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <LegendDot color="#1EACAD" label="Enrolled" />
                    <LegendDot color="#1EAF60" label="Completed" />
                    <LegendDot color="#D7A62D" label="Exited" />
                  </div>
                </div>
                <div className="h-[340px] w-full p-4 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad-enrolled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1EACAD" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#1EACAD" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad-completed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1EAF60" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#1EAF60" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad-exited" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D7A62D" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#D7A62D" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.6} vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        stroke="var(--color-border-subtle)"
                        tickLine={false}
                        axisLine={false}
                        minTickGap={16}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        stroke="var(--color-border-subtle)"
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          fontSize: 12,
                          padding: "8px 12px",
                        }}
                        labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: 4 }}
                        cursor={{ stroke: "#069495", strokeWidth: 1, strokeDasharray: "3 3" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="enrolled"
                        name="Enrolled"
                        stroke="#1EACAD"
                        strokeWidth={2}
                        fill="url(#grad-enrolled)"
                        activeDot={{ r: 4, fill: "#1EACAD", strokeWidth: 0 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        name="Completed"
                        stroke="#1EAF60"
                        strokeWidth={2}
                        fill="url(#grad-completed)"
                        activeDot={{ r: 4, fill: "#1EAF60", strokeWidth: 0 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="exited"
                        name="Exited"
                        stroke="#D7A62D"
                        strokeWidth={2}
                        fill="url(#grad-exited)"
                        activeDot={{ r: 4, fill: "#D7A62D", strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Business metrics stack */}
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">Business metrics</h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Aligned with Campaigns reporting.
                  </p>
                </div>
                <BusinessMetricCard
                  icon={PhoneCall}
                  label="PTPs Captured"
                  value={metrics.ptpsCaptured.toLocaleString()}
                  hint={`${((metrics.ptpsCaptured / Math.max(1, metrics.totalEnrolled)) * 100).toFixed(1)}% of enrolled`}
                  accent="teal"
                />
                <BusinessMetricCard
                  icon={Activity}
                  label="RPCs Made"
                  value={metrics.rpcs.toLocaleString()}
                  hint={`${((metrics.rpcs / Math.max(1, metrics.totalEnrolled)) * 100).toFixed(1)}% of enrolled`}
                  accent="teal"
                />
                <BusinessMetricCard
                  icon={Banknote}
                  label="Revenue Attributed"
                  value={`AED ${metrics.revenueAed.toLocaleString()}`}
                  hint={`Avg AED ${Math.round(metrics.revenueAed / Math.max(1, metrics.converted)).toLocaleString()} / converted`}
                  accent="teal-strong"
                />
                <p className="mt-1 px-1 text-[11px] leading-relaxed text-muted-foreground">
                  Definitions match Campaigns reporting. See{" "}
                  <Link href="/reports" className="text-primary-400 underline decoration-dotted underline-offset-2 hover:text-primary-300">
                    Data Dictionary
                  </Link>{" "}
                  for full metric specs.
                </p>
              </div>
            </div>
          ) : (
            <EmptyHero />
          )}
        </section>

        {/* ================== Band 3 · Per-node breakdown ================== */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-foreground">Per-node breakdown</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Metrics for every node in the journey, in canvas order.
              </p>
            </div>
            {hasEverRun && (
              <p className="text-[11px] text-muted-foreground">
                {perNode.length} nodes · click column headers to sort
              </p>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : perNode.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/40 p-10 text-center">
              <p className="text-[14px] text-muted-foreground">
                This journey has no nodes yet. Add some blocks in the editor.
              </p>
            </div>
          ) : !hasEverRun ? (
            <div className="rounded-xl border border-border bg-card/40 p-10 text-center">
              <p className="text-[14px] font-medium text-foreground">
                This journey hasn&apos;t run yet.
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Publish and enroll borrowers to see per-node metrics.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/journeys/${journeyId}`)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-[12px] font-medium text-primary-300 transition-colors hover:bg-primary-500/20"
              >
                Open editor
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <PerNodeTable
              rows={sortedPerNode}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string; dot: string }> = {
    running: {
      label: "Running",
      tone: "bg-status-active-bg text-status-active-text border-status-active-border",
      dot: "bg-success-400",
    },
    scheduled: {
      label: "Scheduled",
      tone: "bg-status-pending-bg text-status-pending-text border-status-pending-border",
      dot: "bg-warning-400",
    },
    paused: {
      label: "Paused",
      tone: "bg-status-inactive-bg text-status-inactive-text border-status-inactive-border",
      dot: "bg-neutral-500",
    },
    draft: {
      label: "Draft",
      tone: "bg-status-inactive-bg text-status-inactive-text border-status-inactive-border",
      dot: "bg-neutral-500",
    },
    ended: {
      label: "Ended",
      tone: "bg-status-inactive-bg text-status-inactive-text border-status-inactive-border",
      dot: "bg-neutral-500",
    },
  };
  const entry = map[status] ?? map.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        entry.tone,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", entry.dot, status === "running" && "animate-pulse")} />
      {entry.label}
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="inline-block h-1.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function KpiCard({
  metric,
  label,
  value,
  trend,
  spark,
  empty,
}: {
  metric: KpiKey;
  label: string;
  value: number;
  trend: number | null;
  spark: Array<{ i: number; v: number }>;
  empty?: boolean;
}) {
  const spec = accentMap[metric];
  const Icon = spec.icon;
  const gradId = `sp-${metric}`;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card/60 transition-all",
        "hover:-translate-y-px hover:border-border-strong hover:bg-card/80 hover:shadow-lg hover:shadow-black/20",
        "ring-1 ring-inset ring-transparent",
        spec.ring,
      )}
    >
      {/* Subtle gradient tint */}
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br opacity-70", spec.cardTint)}
      />

      <div className="relative flex items-center justify-between px-5 pt-5">
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", spec.chip)}>
          <Icon className={cn("h-3.5 w-3.5", spec.chipText)} />
        </div>
        {trend !== null && !empty && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              trend > 0
                ? "bg-success-500/10 text-success-300"
                : trend < 0
                  ? "bg-error-500/10 text-error-300"
                  : "bg-neutral-500/10 text-neutral-400",
            )}
          >
            {trend > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : trend < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : null}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="relative px-5 pb-1 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className={cn("mt-1.5 text-[32px] font-semibold leading-none tabular-nums", spec.numberText, empty && "text-neutral-600")}>
          {empty ? "—" : value.toLocaleString()}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {trend === null ? "No prior period" : "vs prior period"}
        </p>
      </div>

      {/* Sparkline */}
      <div className="relative h-[46px] w-full">
        {!empty && spark.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={spec.sparkFill} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={spec.sparkFill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={spec.sparkStroke}
                strokeWidth={1.75}
                fill={`url(#${gradId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}

function BusinessMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  accent: "teal" | "teal-strong";
}) {
  const strong = accent === "teal-strong";
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-black/20",
        strong
          ? "border-primary-500/40 bg-gradient-to-br from-primary-500/10 to-card/60"
          : "border-border bg-card/60 hover:border-border-strong",
      )}
    >
      {strong && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-500/10 blur-2xl"
        />
      )}
      <div className="relative flex items-start gap-3 p-5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            strong ? "bg-primary-500/20 text-primary-300" : "bg-primary-500/10 text-primary-400",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 font-semibold leading-none tabular-nums",
              strong ? "text-[26px] text-primary-200" : "text-[24px] text-foreground",
            )}
          >
            {value}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function PerNodeTable({
  rows,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: Array<{
    nodeId: string;
    label: string;
    type: string;
    runs: number;
    ok: number;
    failed: number;
    skipped: number;
    waiting: number;
    avgSeconds: number;
    conversion: number;
  }>;
  sortKey: string | null;
  sortDir: "asc" | "desc";
  onSort: (k: "runs" | "ok" | "failed" | "skipped" | "waiting" | "avg" | "conversion") => void;
}) {
  const H = ({
    label,
    k,
    align,
    tone,
  }: {
    label: string;
    k?: "runs" | "ok" | "failed" | "skipped" | "waiting" | "avg" | "conversion";
    align?: "right";
    tone?: string;
  }) => (
    <th
      className={cn(
        "px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        align === "right" ? "text-right" : "text-left",
        tone ?? "text-muted-foreground",
      )}
    >
      {k ? (
        <button
          type="button"
          onClick={() => onSort(k)}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground",
            sortKey === k && "text-foreground",
          )}
        >
          {label}
          {sortKey === k && <span className="text-[9px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <table className="w-full">
        <thead className="border-b border-border/70 bg-muted/20">
          <tr>
            <H label="Node" />
            <H label="Type" />
            <H label="Runs" k="runs" align="right" />
            <H label="OK" k="ok" align="right" tone="text-success-400" />
            <H label="Fail" k="failed" align="right" tone="text-error-400" />
            <H label="Skip" k="skipped" align="right" tone="text-warning-400" />
            <H label="Wait" k="waiting" align="right" />
            <H label="Avg time" k="avg" align="right" />
            <H label="Conversion" k="conversion" align="right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((n, i) => (
            <tr
              key={n.nodeId}
              className={cn(
                "border-t border-border/50 transition-colors hover:bg-muted/15",
                i % 2 === 1 && "bg-muted/[0.04]",
              )}
            >
              <td className="max-w-[280px] truncate px-4 py-3.5 text-[13px] font-medium text-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500/70" />
                  {n.label}
                </div>
              </td>
              <td className="px-4 py-3.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {n.type.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-foreground">
                {n.runs.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-success-400">
                {n.ok.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-error-400">
                {n.failed.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-warning-400">
                {n.skipped.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-muted-foreground">
                {n.waiting.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-right text-[13px] tabular-nums text-muted-foreground">
                {n.avgSeconds}s
              </td>
              <td className="px-4 py-3.5 text-right">
                <ConversionBar pct={n.conversion} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConversionBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const tone = clamped >= 80 ? "bg-success-500" : clamped >= 50 ? "bg-primary-500" : clamped >= 25 ? "bg-warning-500" : "bg-error-500";
  return (
    <div className="ml-auto flex items-center justify-end gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all", tone)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-11 text-right text-[13px] tabular-nums text-foreground">{pct.toFixed(1)}%</span>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/40 p-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-primary-500/10 to-transparent"
      />
      <div className="relative">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 ring-1 ring-primary-500/30">
          <Sparkles className="h-6 w-6 text-primary-400" />
        </div>
        <h3 className="mt-5 text-[18px] font-semibold text-foreground">No data yet</h3>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          This journey hasn&apos;t enrolled any borrowers. Publish it from the editor, or hit{" "}
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">Test run</span>{" "}
          with a small audience to see metrics fill in here.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <RefreshCcw className="h-3 w-3" />
          Auto-refreshes every 30 seconds once data starts flowing.
        </div>
      </div>
    </div>
  );
}
