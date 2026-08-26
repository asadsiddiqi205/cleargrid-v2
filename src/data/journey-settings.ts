/**
 * Per-journey settings — conversion event overrides + business metrics
 * configuration that drives the journey report.
 *
 * Design rule: the workspace-level roster in `conversion-events.ts` is the
 * single source of truth for WHICH events exist. This file lets a specific
 * journey OVERRIDE a subset of their per-event fields (windowDays, model,
 * enabled, whether it's primary/secondary for this journey, amount source)
 * without forking the roster. Overrides live at
 * `cleargrid:journey-settings:<journeyId>` in localStorage.
 *
 * Business metrics are the tiles shown on the report's "Business metrics"
 * band. They aren't fixed to a static list — an admin picks which metrics
 * to surface and how they compute (from a small computed-metric catalogue).
 */

import type { ConversionEventDefinition } from "./conversion-events"

/* ─────────── Conversion event overrides ─────────── */

export interface JourneyConversionOverride {
  eventId: string
  /** Override on the workspace `enabled` flag for this journey. */
  enabled?: boolean
  /** Override on the workspace `windowDays`. */
  windowDays?: number
  /** Override on the workspace `model`. */
  model?: "last_touch" | "first_touch" | "even"
  /** Whether this event is a PRIMARY conversion goal for this journey or a
   *  secondary signal. Primary events drive the top KPI cards + hero
   *  conversion rate. Secondary events show in the events table only. */
  priority: "primary" | "secondary"
  /**
   * Where the AED amount comes from when the event fires. Journeys may want
   * to source Paid off `payment.amount`, PTP created off `ptp.promised_amount`,
   * Settlement off `settlement.accepted_amount`, etc.
   */
  amountSource?: "payment.amount" | "ptp.promised_amount" | "settlement.accepted_amount" | "partial.amount" | "none"
}

/* ─────────── Business metric config ─────────── */

/**
 * Every business metric on the report is a computed number derived from a
 * small catalogue of well-known sources. Admins pick which ones to display,
 * relabel them, choose a display accent, and choose a formatter. The report
 * renders `businessMetrics` in the configured order.
 */
export type BusinessMetricSource =
  | "conversions.count"          // total conversion events fired
  | "conversions.aed"            // total AED recovered (monetary events only)
  | "conversions.event"          // fired count of a single event (needs eventId)
  | "conversions.event_aed"      // AED sum of a single event
  | "cost.total_aed"             // total send cost (SMS segments + AI-call minutes + email is free)
  | "cost.per_conversion_aed"    // cost.total_aed / conversions.count
  | "impact.net_aed"             // conversions.aed − cost.total_aed
  | "impact.uplift_pct"          // conversion rate lift vs holdout arm
  | "flow.enrolled"              // enrolments (raw count)
  | "flow.active"                // borrowers currently traversing the journey
  | "flow.conversion_rate"       // primary conversion rate (%)
  | "flow.time_to_convert_p50"   // median hours from enrol → first conversion
  | "flow.time_to_convert_p90"   // p90 hours to convert

export interface BusinessMetricConfig {
  id: string
  /** Display label shown on the tile. */
  label: string
  source: BusinessMetricSource
  /** For "conversions.event" / "conversions.event_aed" — which event to pull. */
  eventId?: string
  /** Accent controls tile color. */
  accent: "primary" | "info" | "warning" | "error" | "neutral"
  /** How to format the raw value. */
  format: "number" | "aed" | "percent" | "duration_hours"
  /** Whether the tile is enabled (visible on the report). */
  enabled: boolean
}

/* ─────────── Settings shape ─────────── */

export interface JourneySettings {
  journeyId: string
  /** Empty array = journey uses the workspace roster as-is. */
  conversionOverrides: JourneyConversionOverride[]
  /** Ordered list of tiles on the "Business metrics" band. Empty = the
   *  hardcoded defaults render (backwards compatibility). */
  businessMetrics: BusinessMetricConfig[]
  /**
   * SMS carrier cost + AI-call cost inputs. Reusable across the campaign
   * reports; captured here so admins can override per journey (some journeys
   * negotiate a lower rate with the operator).
   */
  costs: {
    smsPerSegmentAED: number
    aiCallPerMinuteAED: number
    aiCallAvgMinutes: number
  }
}

const STORAGE_KEY = (journeyId: string) => `cleargrid:journey-settings:${journeyId}`

export const DEFAULT_COSTS = {
  smsPerSegmentAED: 0.03,
  aiCallPerMinuteAED: 0.35,
  aiCallAvgMinutes: 3,
}

/** Default business-metrics band — six tiles that match the pre-config
 *  layout (PTPs / RPCs / Revenue) plus the new net + uplift metrics. */
export const DEFAULT_BUSINESS_METRICS: BusinessMetricConfig[] = [
  { id: "ptps", label: "PTPs Captured", source: "conversions.event", eventId: "ptp_created", accent: "primary", format: "number", enabled: true },
  { id: "rpcs", label: "RPCs Made", source: "conversions.event", eventId: "rpc", accent: "primary", format: "number", enabled: true },
  { id: "revenue", label: "AED Recovered", source: "conversions.aed", accent: "primary", format: "aed", enabled: true },
  { id: "net", label: "Net Impact (Recovered − Cost)", source: "impact.net_aed", accent: "primary", format: "aed", enabled: true },
  { id: "uplift", label: "Uplift vs Holdout", source: "impact.uplift_pct", accent: "info", format: "percent", enabled: true },
  { id: "time_p50", label: "Median time to convert", source: "flow.time_to_convert_p50", accent: "neutral", format: "duration_hours", enabled: true },
]

export function loadJourneySettings(journeyId: string): JourneySettings {
  if (typeof window === "undefined") {
    return {
      journeyId,
      conversionOverrides: [],
      businessMetrics: DEFAULT_BUSINESS_METRICS,
      costs: DEFAULT_COSTS,
    }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(journeyId))
    if (!raw) {
      return {
        journeyId,
        conversionOverrides: [],
        businessMetrics: DEFAULT_BUSINESS_METRICS,
        costs: DEFAULT_COSTS,
      }
    }
    const parsed = JSON.parse(raw) as JourneySettings
    return {
      ...parsed,
      businessMetrics: parsed.businessMetrics.length > 0 ? parsed.businessMetrics : DEFAULT_BUSINESS_METRICS,
      costs: { ...DEFAULT_COSTS, ...parsed.costs },
    }
  } catch {
    return {
      journeyId,
      conversionOverrides: [],
      businessMetrics: DEFAULT_BUSINESS_METRICS,
      costs: DEFAULT_COSTS,
    }
  }
}

export function saveJourneySettings(settings: JourneySettings): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY(settings.journeyId), JSON.stringify(settings))
  } catch {
    // ignore
  }
}

/**
 * Merge the workspace roster with per-journey overrides. Returns the
 * effective event definition list for this journey — the "resolved config"
 * that the report and downstream analytics should read from.
 */
export interface ResolvedConversionEvent extends ConversionEventDefinition {
  priority: "primary" | "secondary"
  amountSource: JourneyConversionOverride["amountSource"] | null
}

export function resolveConversionEvents(
  workspace: ConversionEventDefinition[],
  overrides: JourneyConversionOverride[],
): ResolvedConversionEvent[] {
  const byId = new Map(overrides.map((o) => [o.eventId, o]))
  return workspace.map((w) => {
    const o = byId.get(w.id)
    return {
      ...w,
      enabled: o?.enabled ?? w.enabled,
      windowDays: o?.windowDays ?? w.windowDays,
      model: o?.model ?? w.model,
      priority: o?.priority ?? (["paid", "ptp_created", "settlement_accepted"].includes(w.id) ? "primary" : "secondary"),
      amountSource:
        o?.amountSource ??
        (w.monetary
          ? w.id === "paid"
            ? "payment.amount"
            : w.id === "ptp_created" || w.id === "ptp_kept"
              ? "ptp.promised_amount"
              : w.id === "settlement_accepted"
                ? "settlement.accepted_amount"
                : w.id === "partial_payment"
                  ? "partial.amount"
                  : "none"
          : null),
    }
  })
}
