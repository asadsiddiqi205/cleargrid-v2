"use client"

/**
 * Client-side export-job store.
 *
 * A bulk export runs as an async "job" (in production this is a queued
 * server-side worker; here we simulate progress with setInterval). Each
 * job tracks status, progress, downloadable Blob, expiring link, and the
 * audit-log entry it produced.
 *
 * Governance:
 *   - Every job is stamped with `lenderId` — the composer / caller MUST pass
 *     the campaign's lender, and consumers MUST partition views by it.
 *   - Every terminal state produces an entry in the audit log.
 *   - Download links expire after `EXPIRY_MS`; after that the Blob is dropped.
 */

import type { MessageSnapshot } from "./message-snapshots"
import { getSnapshotsForMessage } from "./message-snapshots"
import {
  renderPrintableHtml,
  renderXml,
  buildExportFilename,
} from "@/lib/export-message"
import { buildZip, downloadBlob } from "@/lib/zip-writer"
import { appendAudit } from "./audit-log"

export type ExportFormat = "pdf" | "xml" | "both"

export type ExportJobStatus =
  | "queued"
  | "running"
  | "ready"
  | "expired"
  | "failed"

export interface ExportJob {
  id: string
  /** The message / campaign we're exporting for. */
  messageId: string
  campaignName: string
  /** Lender partition — enforce before download. */
  lenderId: string
  lenderName: string
  format: ExportFormat
  status: ExportJobStatus
  /** 0..100 */
  progressPct: number
  createdAt: string
  completedAt?: string
  /** Number of borrowers in scope. */
  recipientCount: number
  processed: number
  /** Filename of the produced .zip when status === ready. */
  outputFilename?: string
  /** In-memory Blob backing the download link. Cleared on expiry. */
  blob?: Blob
  /** ISO timestamp when the Blob is dropped. */
  expiresAt?: string
  /** Who kicked it off. */
  requestedBy: string
  /** Error message when status === failed. */
  errorMessage?: string
}

const EXPIRY_MS = 60 * 60 * 1000 // 1h
const STEP_MS = 220 // simulated batch tick

/* ────────────────────── In-memory store + subscribers ────────────────────── */

const STORE: ExportJob[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function subscribeExportJobs(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getExportJobs(): ExportJob[] {
  return [...STORE].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getExportJob(id: string): ExportJob | undefined {
  return STORE.find((j) => j.id === id)
}

/* ────────────────────── Kick off a bulk export job ────────────────────── */

export interface KickoffOptions {
  messageId: string
  campaignName: string
  lenderId: string
  lenderName: string
  format: ExportFormat
  recipientCount: number
  requestedBy: string
}

export function kickoffExportJob(opts: KickoffOptions): ExportJob {
  const id = `exp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
  const job: ExportJob = {
    id,
    messageId: opts.messageId,
    campaignName: opts.campaignName,
    lenderId: opts.lenderId,
    lenderName: opts.lenderName,
    format: opts.format,
    status: "queued",
    progressPct: 0,
    createdAt: new Date().toISOString(),
    recipientCount: opts.recipientCount,
    processed: 0,
    requestedBy: opts.requestedBy,
  }
  STORE.unshift(job)
  emit()

  appendAudit({
    action: "export.start",
    actor: opts.requestedBy,
    campaignId: opts.messageId,
    campaignName: opts.campaignName,
    lenderId: opts.lenderId,
    lenderName: opts.lenderName,
    format: opts.format,
    scope: `${opts.recipientCount} borrowers`,
    details: `Bulk export job ${id} kicked off (${opts.format.toUpperCase()})`,
  })

  // Kick off async processing on next tick.
  setTimeout(() => runJob(id), 0)

  return job
}

function updateJob(id: string, patch: Partial<ExportJob>) {
  const j = STORE.find((x) => x.id === id)
  if (!j) return
  Object.assign(j, patch)
  emit()
}

async function runJob(id: string) {
  const job = STORE.find((x) => x.id === id)
  if (!job) return

  updateJob(id, { status: "running", progressPct: 0 })

  const snapshots = getSnapshotsForMessage(job.messageId, {
    limit: Math.min(job.recipientCount, 200),
  })

  const files: Array<{ name: string; content: string }> = []
  const manifestRows: string[] = []

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i]

    // Governance: only include borrowers of this campaign's lender.
    if (snap.lenderId !== job.lenderId) continue

    if (job.format === "pdf" || job.format === "both") {
      const html = renderPrintableHtml(snap)
      files.push({
        name: `pdf/${buildExportFilename(snap, "html")}`,
        content: html,
      })
    }
    if (job.format === "xml" || job.format === "both") {
      const xml = renderXml(snap)
      files.push({
        name: `xml/${buildExportFilename(snap, "xml")}`,
        content: xml,
      })
    }
    manifestRows.push(
      [
        snap.borrowerCustomerId,
        snap.borrowerId,
        snap.borrowerName,
        snap.deliveryStatus,
        snap.sentAt,
      ].join("\t"),
    )

    updateJob(id, {
      processed: i + 1,
      progressPct: Math.round(((i + 1) / snapshots.length) * 100),
    })
    // Simulated batching tick — yields the event loop so the UI updates.
    await new Promise((r) => setTimeout(r, STEP_MS))
  }

  files.push({
    name: "MANIFEST.tsv",
    content:
      "customer_id\tborrower_id\tborrower_name\tdelivery_status\tsent_at\n" +
      manifestRows.join("\n") +
      "\n",
  })
  files.push({
    name: "README.txt",
    content: buildReadme(job, snapshots.length),
  })

  try {
    const blob = buildZip(files)
    const filename = `${slugify(job.campaignName)}_${job.format}_${dateStamp(new Date())}.zip`
    const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString()

    updateJob(id, {
      status: "ready",
      progressPct: 100,
      completedAt: new Date().toISOString(),
      outputFilename: filename,
      blob,
      expiresAt,
    })

    appendAudit({
      action: "export.complete",
      actor: job.requestedBy,
      campaignId: job.messageId,
      campaignName: job.campaignName,
      lenderId: job.lenderId,
      lenderName: job.lenderName,
      format: job.format,
      scope: `${snapshots.length} borrowers`,
      details: `Bundle ready — ${filename}. Link expires ${new Date(expiresAt).toUTCString()}.`,
    })

    // Auto-expire the Blob (still keep the job record for audit / re-request).
    setTimeout(() => {
      const j = STORE.find((x) => x.id === id)
      if (!j || j.status !== "ready") return
      j.blob = undefined
      j.status = "expired"
      emit()
    }, EXPIRY_MS)
  } catch (e) {
    updateJob(id, {
      status: "failed",
      errorMessage: e instanceof Error ? e.message : String(e),
    })
    appendAudit({
      action: "export.failed",
      actor: job.requestedBy,
      campaignId: job.messageId,
      campaignName: job.campaignName,
      lenderId: job.lenderId,
      lenderName: job.lenderName,
      format: job.format,
      scope: `${snapshots.length} borrowers`,
      details: `Failed: ${e instanceof Error ? e.message : String(e)}`,
    })
  }
}

/* ────────────────────── Downloading the produced bundle ────────────────────── */

/**
 * Download a completed job's bundle. Enforces the "link hasn't expired" check
 * and writes an audit entry every time the download fires.
 */
export function downloadExportJob(job: ExportJob, actor: string): void {
  if (job.status !== "ready" || !job.blob || !job.outputFilename) {
    throw new Error("Export bundle is no longer available")
  }
  downloadBlob(job.blob, job.outputFilename)
  appendAudit({
    action: "export.download",
    actor,
    campaignId: job.messageId,
    campaignName: job.campaignName,
    lenderId: job.lenderId,
    lenderName: job.lenderName,
    format: job.format,
    scope: `${job.recipientCount} borrowers`,
    details: `Downloaded bundle ${job.outputFilename}`,
  })
}

/* ────────────────────── README + filename helpers ────────────────────── */

function buildReadme(job: ExportJob, actualCount: number): string {
  return `Record-of-Communication Export
============================================================

Campaign:      ${job.campaignName}
Message ID:    ${job.messageId}
Lender:        ${job.lenderName} (${job.lenderId})
Format:        ${job.format.toUpperCase()}
Requested by:  ${job.requestedBy}
Generated at:  ${new Date().toUTCString()}
Records:       ${actualCount}

Governance
------------------------------------------------------------
This bundle contains only borrowers of the above lender.
Data-mixing across lenders is disallowed at the export layer.

Contents
------------------------------------------------------------
- MANIFEST.tsv          Tab-separated index: customer_id, borrower_id,
                        borrower_name, delivery_status, sent_at.
${job.format === "pdf" || job.format === "both"
      ? "- pdf/*.html            One file per borrower. Open + print to PDF.\n"
      : ""
}${job.format === "xml" || job.format === "both"
      ? "- xml/*.xml             One file per borrower. Structured data for ingestion.\n"
      : ""
}

Snapshot rule
------------------------------------------------------------
Every file below is generated from the SENT snapshot — variables
resolved at send time, exact variation, exact sender identity, exact
delivery status. Not re-rendered from the live template.

Security
------------------------------------------------------------
This link is single-tenant, expiring, and time-bound. It is not a
public URL. Redistribute securely per your bank's PII policy. For
KSA borrowers, the underlying data was generated in-region — see
your operations tenant configuration.
`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function dateStamp(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "")
}
