/**
 * Warmy — mock service module for domain warm-up health data.
 *
 * Nothing calls Warmy directly. This module models the synced snapshot
 * ops sees in Command: domains with health score, DNS state, mailbox
 * counts, placement estimates, today's recommended volumes per provider,
 * open alerts and the "sent today" counters.
 *
 * Field names mirror Warmy API v2 so the backend can map 1:1 later.
 *
 * ──────────────────────────────────────────────────────────────────────
 * TODO (data contracts)
 * ──────────────────────────────────────────────────────────────────────
 * [W1] listWarmyDomains() → WarmyDomain[]
 *        Returns every domain the lender has synced from Warmy, with
 *        health score, DNS state, mailboxes, placement estimates.
 *        Backed today by MOCK_DOMAINS below.
 *
 * [W2] getRecommendedVolumeToday(domain, provider) → number | MissingData
 *        Warmy's recommended live volume for today, summed across the
 *        domain's warmed mailboxes. `0` means send none. A string tag
 *        (`connect_gpm`, `run_placement_test`, `warmup_not_running`)
 *        signals a missing-data hint that the UI turns into a nudge.
 *        **Beta on Warmy's side** — add a telemetry counter on first
 *        usage.
 *
 * [W3] listWarmupAlerts() → WarmupAlert[]
 *        Open alerts across every synced domain. One row per
 *        (domain, alert_key, target_provider). Includes next steps and
 *        done flags.
 *
 * [W4] recordCommandSend(domain, provider, delta) → void
 *        Command tells Warmy it just sent `delta` emails against a
 *        domain. The backend owns the real counter; the frontend keeps a
 *        shadow to show "sent today" and to drive the rotation function
 *        before the backend call-back arrives. TODO: confirm the API
 *        shape — Warmy may expect this as a webhook event rather than
 *        an RPC call.
 *
 * [W5] takeDomainOutOfRotation(domain, reason, userId) → void
 *        Ops-only mutation. Not a Warmy call; Command's own
 *        "paused by ops" bit. Backend persists it next to the Warmy
 *        snapshot.
 *
 * [W6] listSyncEvents(after?: ISODate) → WebhookEvent[]
 *        The events Warmy's Notification Hub has posted to Command's
 *        webhook. Used to populate the in-app notification list.
 *
 * [W7] connectWarmy({ apiKey, workspaceId }) → ConnectionState
 * [W8] disconnectWarmy() → ConnectionState
 * [W9] syncNow() → ConnectionState
 *        Admin-only. Writes to the shared connection record.
 */

import { WARMY_THRESHOLDS } from "@/data/warmy-thresholds"

/* ────────────────────────────── Types ────────────────────────────── */

export type DnsState = "valid" | "invalid" | "missing" | "not_received"

export interface DnsRecords {
  spf: DnsState
  dkim: DnsState
  dmarc: DnsState
  mx: DnsState
}

export interface MailboxCounts {
  active: number
  paused: number
  blocked: number
  stopped: number
}

export interface PlacementChecker {
  gmail: { inbox_pct: number; spam_pct: number }
  gsuite: { inbox_pct: number; spam_pct: number }
  outlook: { inbox_pct: number; spam_pct: number }
}

export interface HealthScore {
  total: number
  deliverability_score: number
  placement_checker_score: number
  postmaster_score: number
  mailtest_score: number
}

export type GpmReputation = "high" | "medium" | "bad"

export interface Gpm {
  has_access: boolean
  spam_rate: number // 0-1 decimal, e.g. 0.004 = 0.4 %
}

export interface AdelineAiInfo {
  domain_reputation: GpmReputation
  date: string
}

export type WarmyProvider =
  | "gmail"
  | "outlook"
  | "yahoo"
  | "google_workspace"
  | "microsoft_365"

export type MissingData =
  | "connect_gpm"
  | "run_placement_test"
  | "warmup_not_running"

export interface RecommendedVolume {
  /** Null when Warmy returned missing_data. */
  volume: number | null
  missing_data?: MissingData
}

export interface WarmyDomain {
  id: string
  name: string
  health_score: HealthScore
  dns_records: DnsRecords
  mailboxes: MailboxCounts
  placement_checker: PlacementChecker
  gpm: Gpm
  adeline_ai_info: AdelineAiInfo
  /** Warmy's recommended live volume per provider for today. */
  recommended_volume_today: Record<WarmyProvider, RecommendedVolume>
  /** Report counts from warm-up, placement tests and Postmaster for
   *  the last 30 days, ready for a trend chart. */
  thirty_day_report: Array<{ date: string; inbox: number; spam: number; gmailSpamRate?: number }>
  /** Command-side ops override. null = no cap, use Warmy only. */
  ops_daily_cap_per_provider: number | null
  /** Command-side paused-by-ops flag. Independent of Warmy health. */
  paused_by_ops: { paused: boolean; reason?: string; by?: string; at?: string }
}

export type AlertKey =
  | "reject_domain_by_gmail"
  | "reject_domain_by_gsuit"
  | "reject_domain_by_outlook"
  | "reject_domain_by_outlook_business"
  | "reject_domain_by_yahoo"
  | "domain_not_synced_on_receiver"

export type AlertState =
  | "open"
  | "in_progress"
  | "resolved"
  | "checking"
  | "failed"

export interface AlertStep {
  text: string
  done: boolean
}

export interface WarmupAlert {
  id: string
  domain: string
  alert_key: AlertKey
  target_provider: WarmyProvider
  state: AlertState
  openedAt: string
  next_steps: AlertStep[]
}

export type WebhookEventKind =
  | "sending_block"
  | "warmup_paused"
  | "connection_failed"
  | "bounce_guard_stopped"
  | "bounce_guard_blocked"
  | "alert_issue"

export interface WebhookEvent {
  id: string
  at: string
  kind: WebhookEventKind
  domain: string
  mailbox?: string
  resume_at?: string
  alert_key?: AlertKey
  alert_status?: "not completed" | "processing" | "checking" | "failed" | "success"
  message: string
}

export interface ConnectionState {
  connected: boolean
  workspaceId?: string
  apiKeyLastFour?: string
  lastSyncAt?: string
  lastError?: string
}

/* ─────────────────────────── Mock data ─────────────────────────── */

const now = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()

function thirtyDayReport(seed: number, floorInbox = 70): WarmyDomain["thirty_day_report"] {
  const out: WarmyDomain["thirty_day_report"] = []
  for (let i = 29; i >= 0; i--) {
    const h = ((seed * 31 + i * 7) >>> 0) % 100
    const inbox = floorInbox + (h % 25)
    const spam = Math.max(0, 100 - inbox - (h % 5))
    out.push({
      date: iso(now - i * 24 * 60 * 60 * 1000),
      inbox,
      spam,
      gmailSpamRate: Math.max(0, (0.001 + ((h % 30) / 10000))),
    })
  }
  return out
}

function v(volume: number | null, missing?: MissingData): RecommendedVolume {
  return missing ? { volume, missing_data: missing } : { volume }
}

/** Helper so the extended subdomain roster stays compact. */
function stdDomain(
  name: string,
  overrides: Partial<WarmyDomain> = {},
): WarmyDomain {
  const id = `wd-${name.replace(/\./g, "-")}`
  const seed = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  const health = 72 + (seed % 20) // 72..91
  return {
    id,
    name,
    health_score: {
      total: health,
      deliverability_score: Math.min(100, health + 3),
      placement_checker_score: Math.max(0, health - 2),
      postmaster_score: Math.max(0, health - 5),
      mailtest_score: health + 1,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 4 + (seed % 5), paused: 0, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 88 + (seed % 8), spam_pct: 3 + (seed % 5) },
      gsuite: { inbox_pct: 86 + (seed % 8), spam_pct: 4 + (seed % 5) },
      outlook: { inbox_pct: 82 + (seed % 10), spam_pct: 6 + (seed % 5) },
    },
    gpm: { has_access: true, spam_rate: 0.0015 + (seed % 20) / 10000 },
    adeline_ai_info: {
      domain_reputation: health >= 85 ? "high" : "medium",
      date: iso(now - (6 + (seed % 12)) * 60 * 60 * 1000),
    },
    recommended_volume_today: {
      gmail: v(600 + (seed % 800)),
      outlook: v(400 + (seed % 500)),
      yahoo: v(200 + (seed % 300)),
      google_workspace: v(500 + (seed % 600)),
      microsoft_365: v(400 + (seed % 500)),
    },
    thirty_day_report: thirtyDayReport(seed),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
    ...overrides,
  }
}

/** Seeded domains — one row per sending domain in the sender-profile
 *  seed, in a spread of states. Spec profiles use cleargrid.co,
 *  s.cleargrid.ai, legal.cleararabia.ai, support.cleararabia.ai,
 *  and a cluster of UAE subdomains (c., h., g., e., a., j., f.,
 *  d., i., m., q.). */
export const MOCK_DOMAINS: WarmyDomain[] = [
  // Healthy — cleargrid.co (used by three spec profiles)
  {
    id: "wd-cleargrid-co",
    name: "cleargrid.co",
    health_score: {
      total: 92,
      deliverability_score: 95,
      placement_checker_score: 94,
      postmaster_score: 88,
      mailtest_score: 90,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 18, paused: 0, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 96, spam_pct: 2 },
      gsuite: { inbox_pct: 94, spam_pct: 3 },
      outlook: { inbox_pct: 91, spam_pct: 5 },
    },
    gpm: { has_access: true, spam_rate: 0.0012 },
    adeline_ai_info: { domain_reputation: "high", date: iso(now - 6 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(2000),
      outlook: v(1200),
      yahoo: v(600),
      google_workspace: v(1400),
      microsoft_365: v(1000),
    },
    thirty_day_report: thirtyDayReport(1),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Healthy — s.cleargrid.ai (another ClearGrid-owned domain shared across profiles)
  {
    id: "wd-s-cleargrid-ai",
    name: "s.cleargrid.ai",
    health_score: {
      total: 88,
      deliverability_score: 90,
      placement_checker_score: 89,
      postmaster_score: 86,
      mailtest_score: 87,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 14, paused: 1, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 94, spam_pct: 3 },
      gsuite: { inbox_pct: 92, spam_pct: 4 },
      outlook: { inbox_pct: 88, spam_pct: 7 },
    },
    gpm: { has_access: true, spam_rate: 0.0018 },
    adeline_ai_info: { domain_reputation: "high", date: iso(now - 3 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(1500),
      outlook: v(900),
      yahoo: v(500),
      google_workspace: v(1100),
      microsoft_365: v(800),
    },
    thirty_day_report: thirtyDayReport(2),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Watch — legal.cleararabia.ai, Gmail reputation medium
  {
    id: "wd-legal-cleararabia-ai",
    name: "legal.cleararabia.ai",
    health_score: {
      total: 78,
      deliverability_score: 80,
      placement_checker_score: 76,
      postmaster_score: 74,
      mailtest_score: 80,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 10, paused: 0, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 88, spam_pct: 9 },
      gsuite: { inbox_pct: 86, spam_pct: 10 },
      outlook: { inbox_pct: 85, spam_pct: 12 },
    },
    gpm: { has_access: true, spam_rate: 0.0038 },
    adeline_ai_info: { domain_reputation: "medium", date: iso(now - 12 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(1800),
      outlook: v(1100),
      yahoo: v(550),
      google_workspace: v(1300),
      microsoft_365: v(900),
    },
    thirty_day_report: thirtyDayReport(3, 60),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Watch — c.cleargrid.ae, under the watch health threshold
  {
    id: "wd-c-cleargrid-ae",
    name: "c.cleargrid.ae",
    health_score: {
      total: 70,
      deliverability_score: 72,
      placement_checker_score: 71,
      postmaster_score: 66,
      mailtest_score: 73,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 8, paused: 0, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 84, spam_pct: 11 },
      gsuite: { inbox_pct: 83, spam_pct: 12 },
      outlook: { inbox_pct: 80, spam_pct: 15 },
    },
    gpm: { has_access: true, spam_rate: 0.0028 },
    adeline_ai_info: { domain_reputation: "high", date: iso(now - 8 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(1100),
      outlook: v(700),
      yahoo: v(350),
      google_workspace: v(800),
      microsoft_365: v(600),
    },
    thirty_day_report: thirtyDayReport(4, 55),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // At risk — h.cleargrid.ae, Gmail rep bad + low health
  {
    id: "wd-h-cleargrid-ae",
    name: "h.cleargrid.ae",
    health_score: {
      total: 48,
      deliverability_score: 50,
      placement_checker_score: 46,
      postmaster_score: 44,
      mailtest_score: 52,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "missing", mx: "valid" },
    mailboxes: { active: 6, paused: 2, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 62, spam_pct: 32 },
      gsuite: { inbox_pct: 65, spam_pct: 30 },
      outlook: { inbox_pct: 70, spam_pct: 24 },
    },
    gpm: { has_access: true, spam_rate: 0.014 },
    adeline_ai_info: { domain_reputation: "bad", date: iso(now - 24 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(400),
      outlook: v(500),
      yahoo: v(200),
      google_workspace: v(450),
      microsoft_365: v(400),
    },
    thirty_day_report: thirtyDayReport(5, 40),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Blocked — support.cleararabia.ai, open Gmail reject alert + all mailboxes blocked
  {
    id: "wd-support-cleararabia-ai",
    name: "support.cleararabia.ai",
    health_score: {
      total: 18,
      deliverability_score: 20,
      placement_checker_score: 15,
      postmaster_score: 12,
      mailtest_score: 25,
    },
    dns_records: { spf: "valid", dkim: "invalid", dmarc: "missing", mx: "valid" },
    mailboxes: { active: 0, paused: 0, blocked: 5, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 10, spam_pct: 80 },
      gsuite: { inbox_pct: 12, spam_pct: 76 },
      outlook: { inbox_pct: 25, spam_pct: 62 },
    },
    gpm: { has_access: false, spam_rate: 0 },
    adeline_ai_info: { domain_reputation: "bad", date: iso(now - 48 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(0, "warmup_not_running"),
      outlook: v(0, "warmup_not_running"),
      yahoo: v(0, "warmup_not_running"),
      google_workspace: v(0, "warmup_not_running"),
      microsoft_365: v(0, "warmup_not_running"),
    },
    thirty_day_report: thirtyDayReport(6, 10),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Healthy but runs out of Gmail volume partway through the day
  // (small Gmail cap; the shadow counter below drives it above cap by
  // mid-day for a visible "used up" render).
  {
    id: "wd-d-cleargrid-ae",
    name: "d.cleargrid.ae",
    health_score: {
      total: 85,
      deliverability_score: 87,
      placement_checker_score: 86,
      postmaster_score: 82,
      mailtest_score: 86,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 6, paused: 0, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 90, spam_pct: 6 },
      gsuite: { inbox_pct: 89, spam_pct: 7 },
      outlook: { inbox_pct: 85, spam_pct: 10 },
    },
    gpm: { has_access: true, spam_rate: 0.0022 },
    adeline_ai_info: { domain_reputation: "high", date: iso(now - 4 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(400), // small — easy to burn through
      outlook: v(800),
      yahoo: v(400),
      google_workspace: v(700),
      microsoft_365: v(600),
    },
    thirty_day_report: thirtyDayReport(7),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Watch (missing_data) — i.cleargrid.ae, needs placement test
  {
    id: "wd-i-cleargrid-ae",
    name: "i.cleargrid.ae",
    health_score: {
      total: 74,
      deliverability_score: 78,
      placement_checker_score: 70,
      postmaster_score: 72,
      mailtest_score: 76,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 8, paused: 0, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 85, spam_pct: 8 },
      gsuite: { inbox_pct: 84, spam_pct: 9 },
      outlook: { inbox_pct: 82, spam_pct: 11 },
    },
    gpm: { has_access: true, spam_rate: 0.0026 },
    adeline_ai_info: { domain_reputation: "medium", date: iso(now - 20 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(null, "run_placement_test"),
      outlook: v(900),
      yahoo: v(500),
      google_workspace: v(1000),
      microsoft_365: v(800),
    },
    thirty_day_report: thirtyDayReport(8, 58),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Healthy — m.cleargrid.ae
  {
    id: "wd-m-cleargrid-ae",
    name: "m.cleargrid.ae",
    health_score: {
      total: 90,
      deliverability_score: 92,
      placement_checker_score: 91,
      postmaster_score: 87,
      mailtest_score: 90,
    },
    dns_records: { spf: "valid", dkim: "valid", dmarc: "valid", mx: "valid" },
    mailboxes: { active: 10, paused: 0, blocked: 0, stopped: 0 },
    placement_checker: {
      gmail: { inbox_pct: 95, spam_pct: 3 },
      gsuite: { inbox_pct: 94, spam_pct: 4 },
      outlook: { inbox_pct: 91, spam_pct: 6 },
    },
    gpm: { has_access: true, spam_rate: 0.0015 },
    adeline_ai_info: { domain_reputation: "high", date: iso(now - 5 * 60 * 60 * 1000) },
    recommended_volume_today: {
      gmail: v(1800),
      outlook: v(1000),
      yahoo: v(500),
      google_workspace: v(1200),
      microsoft_365: v(900),
    },
    thirty_day_report: thirtyDayReport(9),
    ops_daily_cap_per_provider: null,
    paused_by_ops: { paused: false },
  },
  // Remaining healthy subdomains used by Mashreq Buckets. The q.cleargrid.ae
  // domain used by the ClearGrid Test profile is intentionally absent, so
  // it exercises the "In Command, not in Warmy" fallback.
  stdDomain("g.cleargrid.ae"),
  stdDomain("e.cleargrid.ae"),
  stdDomain("a.cleargrid.ae"),
  stdDomain("j.cleargrid.ae"),
  stdDomain("f.cleargrid.ae"),
]

/* ─────────────────────────── Alerts ─────────────────────────── */

const MOCK_ALERTS: WarmupAlert[] = [
  {
    id: "wa-support-cleararabia-gmail",
    domain: "support.cleararabia.ai",
    alert_key: "reject_domain_by_gmail",
    target_provider: "gmail",
    state: "open",
    openedAt: iso(now - 22 * 60 * 60 * 1000),
    next_steps: [
      { text: "Confirm DKIM selectors are rotated and re-published", done: false },
      { text: "Open a Gmail Postmaster ticket referencing the domain", done: false },
      { text: "Pause warm-up until Gmail re-admits the domain", done: true },
    ],
  },
  {
    id: "wa-h-cleargrid-mailtest",
    domain: "h.cleargrid.ae",
    alert_key: "domain_not_synced_on_receiver",
    target_provider: "gmail",
    state: "in_progress",
    openedAt: iso(now - 4 * 60 * 60 * 1000),
    next_steps: [
      { text: "Re-run placement tests after DNS propagation", done: true },
      { text: "Publish the missing DMARC record", done: false },
    ],
  },
]

/* ─────────────────────── Sync shadow + mutations ─────────────────── */

const DEFAULT_CONNECTION: ConnectionState = {
  connected: true,
  workspaceId: "ws_cleargrid_01",
  apiKeyLastFour: "a93c",
  lastSyncAt: iso(now - 4 * 60 * 1000),
}

let connectionState: ConnectionState = { ...DEFAULT_CONNECTION }

/** Shadow "sent today" counters, keyed by `${domain}|${provider}`. The
 *  rotation function reads these to know how much volume is left.
 *  TODO: backend owns the real counter; this shadow is frontend-only. */
const sentToday: Map<string, number> = new Map()

/** A small deterministic burn so one domain (cleargrid.ae × Gmail) is
 *  already near its cap when the prototype loads around 11:00 local. */
function seedShadowCounters() {
  const h = new Date().getHours()
  const burn = Math.max(0, Math.min(1, (h - 6) / (WARMY_THRESHOLDS.simulatedGmailBurnoutHour - 6)))
  // d.cleargrid.ae has the small Gmail cap and burns through mid-day.
  sentToday.set("d.cleargrid.ae|gmail", Math.round(400 * (0.9 + 0.2 * burn)))
  sentToday.set("legal.cleararabia.ai|gmail", Math.round(1800 * 0.4 * burn))
  sentToday.set("cleargrid.co|gmail", Math.round(2000 * 0.25 * burn))
  sentToday.set("h.cleargrid.ae|gmail", Math.round(400 * 0.6 * burn))
  sentToday.set("s.cleargrid.ai|gmail", Math.round(1500 * 0.2 * burn))
}
seedShadowCounters()

/* ─────────────────────────── Accessors ─────────────────────────── */

export function listWarmyDomains(): WarmyDomain[] {
  return MOCK_DOMAINS
}

export function getWarmyDomainByName(name: string): WarmyDomain | undefined {
  const lower = name.toLowerCase()
  return MOCK_DOMAINS.find((d) => d.name.toLowerCase() === lower)
}

export function listWarmupAlerts(): WarmupAlert[] {
  return MOCK_ALERTS
}

export function listAlertsForDomain(name: string): WarmupAlert[] {
  const lower = name.toLowerCase()
  return MOCK_ALERTS.filter((a) => a.domain.toLowerCase() === lower)
}

export function getRecommendedVolumeToday(
  domain: string,
  provider: WarmyProvider,
): RecommendedVolume {
  const d = getWarmyDomainByName(domain)
  if (!d) return { volume: null }
  return d.recommended_volume_today[provider]
}

export function getSentToday(domain: string, provider: WarmyProvider): number {
  return sentToday.get(`${domain}|${provider}`) ?? 0
}

export function recordCommandSend(
  domain: string,
  provider: WarmyProvider,
  delta = 1,
): void {
  const key = `${domain}|${provider}`
  sentToday.set(key, (sentToday.get(key) ?? 0) + delta)
}

export function takeDomainOutOfRotation(
  domain: string,
  reason: string,
  user: string,
): void {
  const d = getWarmyDomainByName(domain)
  if (!d) return
  d.paused_by_ops = { paused: true, reason, by: user, at: new Date().toISOString() }
}

export function putDomainBackInRotation(domain: string): void {
  const d = getWarmyDomainByName(domain)
  if (!d) return
  d.paused_by_ops = { paused: false }
}

export function setOpsDailyCap(domain: string, cap: number | null): void {
  const d = getWarmyDomainByName(domain)
  if (!d) return
  d.ops_daily_cap_per_provider = cap
}

/* ─────────────────────── Connection admin ─────────────────────── */

export function getConnectionState(): ConnectionState {
  return connectionState
}

export function connectWarmy(input: { apiKey: string; workspaceId: string }): ConnectionState {
  connectionState = {
    connected: true,
    workspaceId: input.workspaceId,
    apiKeyLastFour: input.apiKey.slice(-4),
    lastSyncAt: new Date().toISOString(),
  }
  return connectionState
}

export function disconnectWarmy(): ConnectionState {
  connectionState = { connected: false }
  return connectionState
}

export function syncNow(): ConnectionState {
  connectionState = {
    ...connectionState,
    lastSyncAt: new Date().toISOString(),
    lastError: undefined,
  }
  return connectionState
}

/* ───────────────────── Role stub (TODO: real auth) ───────────────── */

/** TODO: wire to the real role/permission service. */
export function isWarmyAdmin(_userId?: string): boolean {
  return true
}

/* ──────────────────── Webhook / notification feed ───────────────── */

const webhookEvents: WebhookEvent[] = [
  {
    id: "wh-1",
    at: iso(now - 90 * 60 * 1000),
    kind: "alert_issue",
    domain: "support.cleararabia.ai",
    alert_key: "reject_domain_by_gmail",
    alert_status: "not completed",
    message: "Gmail rejected the domain. Next step: rotate DKIM.",
  },
  {
    id: "wh-2",
    at: iso(now - 45 * 60 * 1000),
    kind: "sending_block",
    domain: "support.cleararabia.ai",
    mailbox: "collections@support.cleararabia.ai",
    message: "Mailbox blocked after 5 consecutive 550 rejects from Gmail.",
  },
  {
    id: "wh-3",
    at: iso(now - 20 * 60 * 1000),
    kind: "bounce_guard_stopped",
    domain: "h.cleargrid.ae",
    mailbox: "collections@h.cleargrid.ae",
    resume_at: iso(now + 6 * 60 * 60 * 1000),
    message: "Bounce guard paused warm-up for 6 h after the bounce rate crossed 4 %.",
  },
]

export function listSyncEvents(afterIso?: string): WebhookEvent[] {
  if (!afterIso) return webhookEvents
  const after = Date.parse(afterIso)
  return webhookEvents.filter((e) => Date.parse(e.at) > after)
}

/** Dev-only: push a synthetic webhook event into the feed so authors
 *  can preview the in-app notification UI without waiting for Warmy. */
export function devPushSampleEvent(e: Omit<WebhookEvent, "id" | "at"> & { at?: string }): WebhookEvent {
  const event: WebhookEvent = {
    ...e,
    id: `wh-dev-${Date.now().toString(36)}`,
    at: e.at ?? new Date().toISOString(),
  }
  webhookEvents.unshift(event)
  return event
}
