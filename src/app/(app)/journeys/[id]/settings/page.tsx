"use client"

/**
 * Journey Settings — the config surface for conversion events + business
 * metrics + cost inputs for one journey. Everything the report renders is
 * driven off this page.
 *
 * Two tabs:
 *   - Conversion events — per-journey overrides on the workspace roster.
 *     Fields: window (days), model (last/first/even), priority (primary/
 *     secondary), amount source. Enabled toggle. New events created in
 *     Reports → Conversion setup show up here automatically.
 *   - Business metrics — the tile band shown on the report. Admin picks
 *     which computed metrics to surface + how they label + format.
 *
 * Both edits persist to localStorage keyed by journey id; the report
 * page loads them on every render.
 */

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  Info,
  Layers,
  Plus,
  Save,
  Sliders,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  loadConversionEvents,
  type ConversionEventDefinition,
} from "@/data/conversion-events"
import {
  loadJourneySettings,
  saveJourneySettings,
  resolveConversionEvents,
  DEFAULT_BUSINESS_METRICS,
  type BusinessMetricConfig,
  type BusinessMetricSource,
  type JourneySettings,
} from "@/data/journey-settings"
import { journeysList } from "@/data/journeys"
import { JourneySubNav } from "@/components/journeys/journey-sub-nav"

type Tab = "conversions" | "metrics"

const METRIC_SOURCES: Array<{ id: BusinessMetricSource; label: string; hint: string; format: BusinessMetricConfig["format"] }> = [
  { id: "conversions.count", label: "Total conversion events", hint: "All enabled events combined", format: "number" },
  { id: "conversions.aed", label: "AED recovered (all events)", hint: "Sum of monetary event amounts", format: "aed" },
  { id: "conversions.event", label: "Single-event fired count", hint: "Choose an event below", format: "number" },
  { id: "conversions.event_aed", label: "Single-event AED", hint: "Choose an event below", format: "aed" },
  { id: "cost.total_aed", label: "Send cost (AED)", hint: "SMS segments + AI-call minutes", format: "aed" },
  { id: "cost.per_conversion_aed", label: "Cost per conversion", hint: "Cost ÷ conversions", format: "aed" },
  { id: "impact.net_aed", label: "Net impact (Recovered − Cost)", hint: "The real business value", format: "aed" },
  { id: "impact.uplift_pct", label: "Uplift vs holdout", hint: "pp difference vs unsent control", format: "percent" },
  { id: "flow.enrolled", label: "Enrolments", hint: "Raw enrollment count", format: "number" },
  { id: "flow.active", label: "Currently active", hint: "Borrowers still traversing", format: "number" },
  { id: "flow.conversion_rate", label: "Conversion rate %", hint: "Converted ÷ Enrolled", format: "percent" },
  { id: "flow.time_to_convert_p50", label: "Median time to convert", hint: "50th percentile hours", format: "duration_hours" },
  { id: "flow.time_to_convert_p90", label: "P90 time to convert", hint: "90th percentile hours", format: "duration_hours" },
]

export default function JourneySettingsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const journeyId = params.id ?? "new"
  const journey = journeysList.find((j) => j.id === journeyId) ?? null

  const [tab, setTab] = React.useState<Tab>("conversions")
  const [workspaceEvents, setWorkspaceEvents] = React.useState<ConversionEventDefinition[]>([])
  const [settings, setSettings] = React.useState<JourneySettings | null>(null)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    setWorkspaceEvents(loadConversionEvents())
    setSettings(loadJourneySettings(journeyId))
  }, [journeyId])

  if (!settings) {
    return (
      <div className="p-10 text-center text-[12px] text-muted-foreground">Loading…</div>
    )
  }

  const resolved = resolveConversionEvents(workspaceEvents, settings.conversionOverrides)

  const patchOverride = (
    eventId: string,
    patch: Partial<JourneySettings["conversionOverrides"][number]>,
  ) => {
    const overrides = settings.conversionOverrides.filter((o) => o.eventId !== eventId)
    const existing = settings.conversionOverrides.find((o) => o.eventId === eventId)
    overrides.push({
      eventId,
      priority: existing?.priority ?? "secondary",
      ...existing,
      ...patch,
    })
    setSettings({ ...settings, conversionOverrides: overrides })
    setDirty(true)
  }

  const patchMetric = (id: string, patch: Partial<BusinessMetricConfig>) => {
    setSettings({
      ...settings,
      businessMetrics: settings.businessMetrics.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })
    setDirty(true)
  }

  const moveMetric = (id: string, dir: -1 | 1) => {
    const arr = [...settings.businessMetrics]
    const idx = arr.findIndex((m) => m.id === id)
    if (idx === -1) return
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    const [m] = arr.splice(idx, 1)
    arr.splice(target, 0, m)
    setSettings({ ...settings, businessMetrics: arr })
    setDirty(true)
  }

  const addMetric = () => {
    const id = `metric-${Date.now().toString(36)}`
    setSettings({
      ...settings,
      businessMetrics: [
        ...settings.businessMetrics,
        {
          id,
          label: "New metric",
          source: "conversions.count",
          accent: "neutral",
          format: "number",
          enabled: true,
        },
      ],
    })
    setDirty(true)
  }

  const removeMetric = (id: string) => {
    setSettings({
      ...settings,
      businessMetrics: settings.businessMetrics.filter((m) => m.id !== id),
    })
    setDirty(true)
  }

  const resetMetrics = () => {
    setSettings({ ...settings, businessMetrics: DEFAULT_BUSINESS_METRICS })
    setDirty(true)
    toast.info("Reset business metrics to the default six-tile band")
  }

  const commit = () => {
    saveJourneySettings(settings)
    setDirty(false)
    toast.success("Journey settings saved", {
      description: "Report reloads with the new config on next visit.",
    })
  }

  return (
    <div className="flex flex-col">
      <JourneySubNav journeyId={journeyId} />
      <div className="mx-auto w-full max-w-5xl space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
        <Link
          href={`/journeys/${journeyId}`}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Editor
        </Link>
        <span className="text-[11px] text-muted-foreground/60">·</span>
        <Link
          href={`/journeys/${journeyId}/report`}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Report
        </Link>
      </div>

      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {journey?.name ?? "Journey"} · Settings
        </h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Configure conversion events + business metrics for this journey. Changes drive what appears on the report.
        </p>
      </header>

      {/* Tab strip */}
      <div className="flex items-center gap-2 border-b border-border">
        <TabButton active={tab === "conversions"} onClick={() => setTab("conversions")}>
          <Sliders className="h-3 w-3" />
          Conversion events
          <span className="text-[9px] text-muted-foreground">
            · {resolved.filter((r) => r.enabled).length} enabled
          </span>
        </TabButton>
        <TabButton active={tab === "metrics"} onClick={() => setTab("metrics")}>
          <Layers className="h-3 w-3" />
          Business metrics
          <span className="text-[9px] text-muted-foreground">
            · {settings.businessMetrics.filter((m) => m.enabled).length} visible
          </span>
        </TabButton>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <Button size="sm" onClick={commit} className="h-7 text-[11px]">
              <Save className="h-3 w-3" />
              Save changes
            </Button>
          )}
        </div>
      </div>

      {tab === "conversions" && (
        <ConversionsTab
          resolved={resolved}
          patchOverride={patchOverride}
        />
      )}

      {tab === "metrics" && (
        <MetricsTab
          settings={settings}
          resolved={resolved}
          patchMetric={patchMetric}
          moveMetric={moveMetric}
          addMetric={addMetric}
          removeMetric={removeMetric}
          resetMetrics={resetMetrics}
        />
      )}

      {/* Cost inputs — always visible below the tab content */}
      <CostInputs
        settings={settings}
        onChange={(costs) => {
          setSettings({ ...settings, costs })
          setDirty(true)
        }}
      />
      </div>
    </div>
  )
}

/* ─────────── Reusable bits ─────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/* ─────────── Conversions tab ─────────── */

function ConversionsTab({
  resolved,
  patchOverride,
}: {
  resolved: Array<ReturnType<typeof resolveConversionEvents>[number]>
  patchOverride: (eventId: string, patch: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-info-500/30 bg-info-500/[0.06] px-4 py-3 text-[11px] leading-relaxed text-info-200/90">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info-300" />
          <div>
            <p className="font-medium text-info-100">
              Events are defined workspace-wide in{" "}
              <Link href="/reports/conversions" className="underline underline-offset-2 hover:text-info-100">
                Reports → Conversion setup
              </Link>
              . Overrides here apply just to this journey.
            </p>
            <p className="mt-1">
              Priority sets which events drive the primary KPIs on the report (Converted / Recovered).
              Amount source picks which numeric field the AED value comes from when the event fires.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/40">
        <ul className="divide-y divide-border">
          {resolved.map((event) => (
            <li key={event.id} className="px-4 py-3.5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto_auto_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{event.label}</span>
                    {event.monetary && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase text-primary">
                        Monetary
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                        event.priority === "primary"
                          ? "border border-primary/40 bg-primary/10 text-primary"
                          : "bg-muted text-neutral-300",
                      )}
                    >
                      {event.priority}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {event.description}
                  </p>
                </div>

                <PriorityToggle
                  value={event.priority}
                  onChange={(v) => patchOverride(event.id, { priority: v })}
                />

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Window
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={event.windowDays}
                      onChange={(e) =>
                        patchOverride(event.id, { windowDays: Math.max(1, Math.min(90, Number(e.target.value) || 1)) })
                      }
                      className="h-8 w-16 text-center tabular-nums"
                    />
                    <span className="text-[11px] text-muted-foreground">days</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Amount source
                  </Label>
                  <Select
                    value={event.amountSource ?? "none"}
                    onValueChange={(v) => patchOverride(event.id, { amountSource: v })}
                  >
                    <SelectTrigger className="h-8 w-[168px] text-[11px]" disabled={!event.monetary}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment.amount">payment.amount</SelectItem>
                      <SelectItem value="ptp.promised_amount">ptp.promised_amount</SelectItem>
                      <SelectItem value="settlement.accepted_amount">settlement.accepted_amount</SelectItem>
                      <SelectItem value="partial.amount">partial.amount</SelectItem>
                      <SelectItem value="none">None (non-monetary)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start justify-end gap-2 lg:pt-4">
                  <span
                    className={cn(
                      "text-[11px]",
                      event.enabled ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {event.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={event.enabled}
                    onCheckedChange={(v) => patchOverride(event.id, { enabled: v })}
                    size="sm"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PriorityToggle({
  value,
  onChange,
}: {
  value: "primary" | "secondary"
  onChange: (v: "primary" | "secondary") => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
      <div className="flex items-center gap-1 rounded border border-border/60 p-0.5">
        <button
          type="button"
          onClick={() => onChange("primary")}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium transition-colors",
            value === "primary"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Primary
        </button>
        <button
          type="button"
          onClick={() => onChange("secondary")}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium transition-colors",
            value === "secondary"
              ? "bg-muted/80 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Secondary
        </button>
      </div>
    </div>
  )
}

/* ─────────── Metrics tab ─────────── */

function MetricsTab({
  settings,
  resolved,
  patchMetric,
  moveMetric,
  addMetric,
  removeMetric,
  resetMetrics,
}: {
  settings: JourneySettings
  resolved: ReturnType<typeof resolveConversionEvents>
  patchMetric: (id: string, patch: Partial<BusinessMetricConfig>) => void
  moveMetric: (id: string, dir: -1 | 1) => void
  addMetric: () => void
  removeMetric: (id: string) => void
  resetMetrics: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] text-muted-foreground">
          Tiles appear on the report&apos;s <span className="text-foreground">Business metrics</span> band in this order.
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={resetMetrics} className="h-7 text-[11px]">
            Reset to default
          </Button>
          <Button size="sm" onClick={addMetric} className="h-7 text-[11px]">
            <Plus className="h-3 w-3" />
            Add metric
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {settings.businessMetrics.map((m, i) => {
          const sourceMeta = METRIC_SOURCES.find((s) => s.id === m.source)
          const requiresEvent = m.source === "conversions.event" || m.source === "conversions.event_aed"
          return (
            <li key={m.id} className="grid gap-2 rounded-lg border border-border bg-card/40 p-3 lg:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto_auto] lg:items-center">
              {/* Reorder + accent swatch */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveMetric(m.id, -1)}
                  disabled={i === 0}
                  className="rounded border border-border p-0.5 text-muted-foreground disabled:opacity-40 hover:text-foreground"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveMetric(m.id, 1)}
                  disabled={i === settings.businessMetrics.length - 1}
                  className="rounded border border-border p-0.5 text-muted-foreground disabled:opacity-40 hover:text-foreground"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {/* Label */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Label</Label>
                <Input
                  value={m.label}
                  onChange={(e) => patchMetric(m.id, { label: e.target.value })}
                  className="mt-0.5 h-8 text-[12px]"
                />
              </div>

              {/* Source */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</Label>
                <Select
                  value={m.source}
                  onValueChange={(v) => {
                    const meta = METRIC_SOURCES.find((s) => s.id === v)
                    patchMetric(m.id, { source: v as BusinessMetricSource, format: meta?.format ?? m.format })
                  }}
                >
                  <SelectTrigger className="mt-0.5 h-8 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_SOURCES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-0.5 text-[9px] text-muted-foreground/70">{sourceMeta?.hint}</p>
              </div>

              {/* Event picker (when needed) */}
              {requiresEvent ? (
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Event</Label>
                  <Select
                    value={m.eventId ?? resolved[0]?.id ?? ""}
                    onValueChange={(v) => patchMetric(m.id, { eventId: v ?? undefined })}
                  >
                    <SelectTrigger className="mt-0.5 h-8 w-[140px] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {resolved.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="hidden lg:block" />
              )}

              {/* Accent */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Accent</Label>
                <Select
                  value={m.accent}
                  onValueChange={(v) => patchMetric(m.id, { accent: v as BusinessMetricConfig["accent"] })}
                >
                  <SelectTrigger className="mt-0.5 h-8 w-[112px] text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-2 justify-self-end">
                <Switch
                  checked={m.enabled}
                  onCheckedChange={(v) => patchMetric(m.id, { enabled: v })}
                  size="sm"
                />
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeMetric(m.id)}
                className="rounded p-1 text-muted-foreground hover:bg-error-500/10 hover:text-error-300"
                title="Remove tile"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ─────────── Cost inputs ─────────── */

function CostInputs({
  settings,
  onChange,
}: {
  settings: JourneySettings
  onChange: (costs: JourneySettings["costs"]) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
          <DollarSign className="h-3 w-3 text-primary" />
          Send cost inputs
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Drives the net-impact and cost-per-conversion tiles. Emails are free in the prototype.
        </p>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        <CostField
          label="SMS · per segment (AED)"
          value={settings.costs.smsPerSegmentAED}
          step={0.01}
          onChange={(v) => onChange({ ...settings.costs, smsPerSegmentAED: v })}
        />
        <CostField
          label="AI call · per minute (AED)"
          value={settings.costs.aiCallPerMinuteAED}
          step={0.05}
          onChange={(v) => onChange({ ...settings.costs, aiCallPerMinuteAED: v })}
        />
        <CostField
          label="AI call · average minutes"
          value={settings.costs.aiCallAvgMinutes}
          step={0.5}
          onChange={(v) => onChange({ ...settings.costs, aiCallAvgMinutes: v })}
        />
      </div>
    </div>
  )
}

function CostField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-0.5 h-8 text-[12px] tabular-nums"
      />
    </div>
  )
}
