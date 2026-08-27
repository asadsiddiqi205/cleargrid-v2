/**
 * Sync audit — read-only data seed backing /lender-config/sync-audit.
 *
 * Mirrors Eternals' Sync tool: pick lenders + timestamp window +
 * attribute selection, get back rows of deals × attribute values with
 * distinct-value counts in aggregate.
 */

import { borrowers } from "./borrowers"
import { lenders } from "./lenders"

export interface SyncAttribute {
  id: string
  label: string
  /** Kind — drives value formatting. */
  kind: "text" | "number" | "date" | "enum"
  /** For enums, the closed set of possible values. */
  enumValues?: string[]
}

export const SYNC_ATTRIBUTES: SyncAttribute[] = [
  { id: "cg_enbd_dpd_bucket", label: "cg_enbd_dpd_bucket", kind: "enum", enumValues: ["0-30", "31-60", "61-90", "91-180", "180+"] },
  { id: "cg_enbd_ptp_date_latest", label: "cg_enbd_ptp_date_latest", kind: "date" },
  { id: "cg_enbd_ptp_date_earliest", label: "cg_enbd_ptp_date_earliest", kind: "date" },
  { id: "cg_enbd_ptp_amount", label: "cg_enbd_ptp_amount", kind: "number" },
  { id: "cg_enbd_outstanding_amount", label: "cg_enbd_outstanding_amount", kind: "number" },
  { id: "cg_enbd_last_payment_date", label: "cg_enbd_last_payment_date", kind: "date" },
  { id: "cg_enbd_consent_status", label: "cg_enbd_consent_status", kind: "enum", enumValues: ["full", "partial", "restricted", "none"] },
  { id: "cg_enbd_preferred_channel", label: "cg_enbd_preferred_channel", kind: "enum", enumValues: ["email", "sms", "whatsapp", "call"] },
  { id: "cg_enbd_dnc_flag", label: "cg_enbd_dnc_flag", kind: "enum", enumValues: ["true", "false"] },
  { id: "cg_enbd_last_call_outcome", label: "cg_enbd_last_call_outcome", kind: "enum", enumValues: ["ptp", "no_answer", "voicemail", "dispute", "busy", "connected"] },
]

export interface SyncAuditRow {
  dealId: string
  borrowerName: string
  lenderId: string
  lenderName: string
  writtenAt: string
  values: Record<string, string>
}

export interface SyncAuditResult {
  rows: SyncAuditRow[]
  totalMatched: number
  distinctCounts: Record<string, number>
  distinctByAttribute: Record<string, Array<{ value: string; count: number }>>
}

export interface SyncAuditQuery {
  lenderIds: string[]
  attributeIds: string[]
  from: string | null
  to: string | null
  limit: number
}

function hash(str: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const NOW = new Date("2026-08-27T09:00:00Z").getTime()
const ONE_DAY = 86_400_000

function synthValue(attr: SyncAttribute, borrowerId: string): string {
  const h = hash(borrowerId, hash(attr.id))
  const roll = h % 100
  // 12% of writes are empty on any given deal — this is what makes the
  // audit useful.
  if (roll < 12) return ""
  switch (attr.kind) {
    case "enum": {
      const values = attr.enumValues ?? ["a", "b", "c"]
      return values[h % values.length]
    }
    case "number":
      return String(Math.round((h % 40000) + 1000))
    case "date": {
      const days = h % 40
      const d = new Date(NOW - days * ONE_DAY)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    }
    default:
      return `val-${h % 1000}`
  }
}

export function runSyncAudit(query: SyncAuditQuery): SyncAuditResult {
  const from = query.from ? new Date(query.from).getTime() : null
  const to = query.to ? new Date(query.to).getTime() : null

  const rows: SyncAuditRow[] = []
  const attrs = query.attributeIds
    .map((id) => SYNC_ATTRIBUTES.find((a) => a.id === id))
    .filter((a): a is SyncAttribute => !!a)

  for (const b of borrowers) {
    const bh = hash(b.id, 7)
    const lenderIdx = bh % lenders.length
    const lender = lenders[lenderIdx]
    if (query.lenderIds.length > 0 && !query.lenderIds.includes(lender.id)) continue
    const writtenAt = new Date(NOW - (bh % 30) * ONE_DAY - (bh % 24) * 3_600_000)
    if (from !== null && writtenAt.getTime() < from) continue
    if (to !== null && writtenAt.getTime() > to) continue
    const values: Record<string, string> = {}
    for (const a of attrs) values[a.id] = synthValue(a, b.id)
    rows.push({
      dealId: `deal-${b.id.slice(-4)}-${bh % 9000 + 1000}`,
      borrowerName: b.name,
      lenderId: lender.id,
      lenderName: lender.shortName ?? lender.id,
      writtenAt: writtenAt.toISOString(),
      values,
    })
    if (rows.length >= query.limit) break
  }

  const distinctCounts: Record<string, number> = {}
  const distinctByAttribute: Record<string, Array<{ value: string; count: number }>> = {}
  for (const a of attrs) {
    const counts = new Map<string, number>()
    for (const r of rows) {
      const v = r.values[a.id] ?? ""
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    distinctCounts[a.id] = counts.size
    distinctByAttribute[a.id] = Array.from(counts.entries())
      .map(([value, count]) => ({ value: value === "" ? "(empty)" : value, count }))
      .sort((a2, b2) => b2.count - a2.count)
  }
  return { rows, totalMatched: rows.length, distinctCounts, distinctByAttribute }
}
