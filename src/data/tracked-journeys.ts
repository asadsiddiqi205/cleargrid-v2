/**
 * Tracked journeys — the per-tenant list of journeys the Health Board
 * watches every day. Ported 1:1 from Eternals' Journeys check.
 *
 * Each row carries: the journey id, a display name, a Due-by time
 * (usually 10:00 UAE for the morning cron), a Slack channel to post to,
 * and whether the tick fired today.
 *
 * localStorage-backed so admins can add/remove journeys without a
 * backend round-trip.
 */

export interface TrackedJourney {
  id: string
  name: string
  /** Human-readable due time, e.g. "10:00 A". */
  dueBy: string
  /** Slack channel (without the leading #). */
  slackChannel: string
  /** ISO timestamp of the last successful run — null if never. */
  lastRunAt: string | null
  /** Did today's tick fire? Used to render the green tick / red cross. */
  ranToday: boolean
  /** Todays PTP count (0 if not ranToday). */
  ptpsToday: number
}

const STORAGE_KEY = "cleargrid:tracked-journeys"

export const DEFAULT_TRACKED_JOURNEYS: TrackedJourney[] = [
  {
    id: "6a7c2a48586bc3028d6b9e30",
    name: "Agency_UAE_Cashnow_Daily_Trigger_DPDBased",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 302,
  },
  {
    id: "6a47a7a060bb9f54fdd18afa",
    name: "AGENCY_UAE_BOTIMSNPL_Daily_Trigger",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 6,
  },
  {
    id: "6a748c7c943c15e0466f92b8",
    name: "AGENCY_UAE_TAMARA_Daily_Trigger_V2",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 8,
  },
  {
    id: "6a2083d5c36c15a455109140",
    name: "AGENCY_UAE_TABBY_Daily_Trigger",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 11,
  },
  {
    id: "6a4230a25155806f20dbd8e5",
    name: "AGENCY_KUW_Tabby_Daily_Trigger_Sun_to_Thur",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 0,
  },
  {
    id: "6a26d0800c657138252b0b49",
    name: "AGENCY_KSA_MIS_Daily_Trigger_Sun_Thu",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 0,
  },
  {
    id: "6a267c529c87438f3ee53de5",
    name: "AGENCY_KSA_SOUM_Daily_Trigger_SUN_THU",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 0,
  },
  {
    id: "6a8c2d5b35ce1558b5ef430c",
    name: "AGENCY_KUW_Tabby_Daily_Trigger_FRI_to_SAT_V2",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 0,
  },
  {
    id: "6a749e83356b8559cc4d8d4d",
    name: "AGENCY_KSA_MIS_Daily_Trigger_FRI_SAT_V2",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 0,
  },
  {
    id: "6a513b50c71af05226a12ac2",
    name: "AGENCY_KSA_SOUM_Daily_Trigger_FRI_SAT",
    dueBy: "10:00 A",
    slackChannel: "allocate-uae-journey-alert",
    lastRunAt: null,
    ranToday: false,
    ptpsToday: 0,
  },
]

export function loadTrackedJourneys(): TrackedJourney[] {
  if (typeof window === "undefined") return DEFAULT_TRACKED_JOURNEYS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_TRACKED_JOURNEYS
    return JSON.parse(raw) as TrackedJourney[]
  } catch {
    return DEFAULT_TRACKED_JOURNEYS
  }
}

export function saveTrackedJourneys(list: TrackedJourney[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

/* ─────────── PTP-date integrity check ─────────── */

export interface PtpDateCheckResult {
  totalScanned: number
  emptyCount: number
  emptyDealIds: string[]
  attributesChecked: string[]
}

const NULL_TOKENS = new Set(["", "-", "null", "n/a", "na", "none", "undefined"])

export function runPtpDateCheck(attributes: string[]): PtpDateCheckResult {
  // Deterministic mock — the prototype doesn't have a live BorrowerDeals
  // store, so we synthesize by hashing borrower ids.
  const { borrowers } = require("./borrowers") as typeof import("./borrowers")
  const emptyDealIds: string[] = []
  const totalScanned = borrowers.length
  for (const b of borrowers) {
    let h = 2166136261
    for (let i = 0; i < b.id.length; i++) {
      h ^= b.id.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const roll = (h >>> 0) % 100
    // ~18% of deals get a null on both attributes.
    if (roll < 18) {
      emptyDealIds.push(`deal-${b.id.slice(-4)}-${(h >>> 0) % 9000 + 1000}`)
    }
  }
  return {
    totalScanned,
    emptyCount: emptyDealIds.length,
    emptyDealIds,
    attributesChecked: attributes,
  }
}

export const NULL_ATTRIBUTE_TOKENS = NULL_TOKENS
