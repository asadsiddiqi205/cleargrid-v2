"use client"

/**
 * Export audit log — every start / complete / download / failure lands here.
 *
 * In production this is a durable append-only store. In this prototype the
 * entries live in memory (cleared on refresh) but the shape and the
 * append/subscribe API mirror what a real audit backend would expose.
 */

export type AuditAction =
  | "export.start"
  | "export.complete"
  | "export.failed"
  | "export.download"
  | "export.single"

export interface AuditEntry {
  id: string
  at: string // ISO
  actor: string
  action: AuditAction
  campaignId: string
  campaignName: string
  lenderId: string
  lenderName: string
  format?: string
  /** Scope of the export — number of borrowers or "1 borrower (customerId)". */
  scope: string
  details?: string
}

const ENTRIES: AuditEntry[] = seedAudit()
const listeners = new Set<() => void>()

function seedAudit(): AuditEntry[] {
  // A couple of seed entries so the audit view isn't empty on first load.
  const now = Date.now()
  const iso = (min: number) => new Date(now - min * 60_000).toISOString()
  return [
    {
      id: "aud-seed-1",
      at: iso(60),
      actor: "Rabab Abbas",
      action: "export.single",
      campaignId: "msg-1",
      campaignName: "Mashreq · High DPD Wave 12",
      lenderId: "lnd-mashreq",
      lenderName: "Mashreq Bank",
      format: "pdf",
      scope: "1 borrower (784-1990-1234567-1)",
      details: "Single-borrower PDF exported from message detail",
    },
    {
      id: "aud-seed-2",
      at: iso(240),
      actor: "Asad Siddiqi",
      action: "export.complete",
      campaignId: "msg-10",
      campaignName: "General · Mid-DPD Multi-Channel · Wave 8",
      lenderId: "general",
      lenderName: "ClearGrid",
      format: "both",
      scope: "200 borrowers",
      details:
        "Bulk export bundle produced — link expires 1h from ready. See mid-dpd_wave8.zip",
    },
  ]
}

export function appendAudit(entry: Omit<AuditEntry, "id" | "at">): AuditEntry {
  const full: AuditEntry = {
    id: `aud-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    at: new Date().toISOString(),
    ...entry,
  }
  ENTRIES.unshift(full)
  for (const fn of listeners) fn()
  return full
}

export function subscribeAudit(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getAuditEntries(lenderId?: string): AuditEntry[] {
  if (!lenderId) return [...ENTRIES]
  return ENTRIES.filter((e) => e.lenderId === lenderId || e.lenderId === "general")
}
