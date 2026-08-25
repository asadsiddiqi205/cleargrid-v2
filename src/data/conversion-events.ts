/**
 * Conversion events — defined ONCE, apply to every send (email campaigns,
 * SMS campaigns, journeys). Attribution reuses the existing message-analytics
 * attribution model (window + last-message-touch) — this data layer just adds
 * the events themselves and per-event overrides.
 *
 * Real values live in localStorage under `cleargrid:conversion-events` so
 * admin edits stick across reloads. The seeded default set covers the six
 * events from the PRD.
 */

export type ConversionAttributionModel = "last_touch" | "first_touch" | "even"

export interface ConversionEventDefinition {
  id: string
  label: string
  /** One-line explanation shown next to the event in the setup screen. */
  description: string
  /** Which real-world signal fires this event. Prototype-only — the runtime
   *  contract with the collections platform would be a webhook / event
   *  stream name. */
  sourceSignal:
    | "payment_success"
    | "ptp_created"
    | "ptp_kept"
    | "partial_payment"
    | "settlement_accepted"
    | "rpc_captured"
  /** Attribution window in days. Defaults to 7. */
  windowDays: number
  /** Attribution model — reuse the existing message-analytics contract. */
  model: ConversionAttributionModel
  /** Whether the event is currently enabled. Disabled events still exist in
   *  the config but are excluded from reports. */
  enabled: boolean
  /** Monetary events include amountAED in their firing payload; non-monetary
   *  events (RPC) don't. Drives whether the "AED recovered" column shows. */
  monetary: boolean
}

/** Seed set — the six events called out in the PRD. */
export const DEFAULT_CONVERSION_EVENTS: ConversionEventDefinition[] = [
  {
    id: "paid",
    label: "Paid",
    description: "Any successful payment received against an outstanding balance.",
    sourceSignal: "payment_success",
    windowDays: 7,
    model: "last_touch",
    enabled: true,
    monetary: true,
  },
  {
    id: "ptp_created",
    label: "PTP created",
    description: "A borrower committed to pay by a specific date.",
    sourceSignal: "ptp_created",
    windowDays: 7,
    model: "last_touch",
    enabled: true,
    monetary: true,
  },
  {
    id: "ptp_kept",
    label: "PTP kept",
    description:
      "A previously created PTP was honored — payment landed within the promised window.",
    sourceSignal: "ptp_kept",
    windowDays: 14,
    model: "last_touch",
    enabled: true,
    monetary: true,
  },
  {
    id: "partial_payment",
    label: "Partial payment",
    description:
      "Payment received for less than the outstanding balance. Counts as engagement, not a full recovery.",
    sourceSignal: "partial_payment",
    windowDays: 7,
    model: "last_touch",
    enabled: true,
    monetary: true,
  },
  {
    id: "settlement_accepted",
    label: "Settlement accepted",
    description: "Borrower accepted a discounted settlement offer.",
    sourceSignal: "settlement_accepted",
    windowDays: 14,
    model: "last_touch",
    enabled: true,
    monetary: true,
  },
  {
    id: "rpc",
    label: "RPC (Right-Party Contact)",
    description:
      "Live borrower voice contact confirmed — non-monetary. Drives escalation strategy.",
    sourceSignal: "rpc_captured",
    windowDays: 3,
    model: "last_touch",
    enabled: true,
    monetary: false,
  },
]

/* ─────────── localStorage-backed store ─────────── */

const STORAGE_KEY = "cleargrid:conversion-events"

export function loadConversionEvents(): ConversionEventDefinition[] {
  if (typeof window === "undefined") return DEFAULT_CONVERSION_EVENTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONVERSION_EVENTS
    const parsed = JSON.parse(raw) as ConversionEventDefinition[]
    // Backfill any missing seed events (allows the app to add new defaults
    // without wiping user edits on the existing ones).
    const byId = new Map(parsed.map((e) => [e.id, e]))
    for (const seed of DEFAULT_CONVERSION_EVENTS) {
      if (!byId.has(seed.id)) parsed.push(seed)
    }
    return parsed
  } catch {
    return DEFAULT_CONVERSION_EVENTS
  }
}

export function saveConversionEvents(events: ConversionEventDefinition[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // ignore
  }
}

export function upsertConversionEvent(patch: ConversionEventDefinition): ConversionEventDefinition[] {
  const current = loadConversionEvents()
  const next = current.map((e) => (e.id === patch.id ? patch : e))
  if (!next.some((e) => e.id === patch.id)) next.push(patch)
  saveConversionEvents(next)
  return next
}
