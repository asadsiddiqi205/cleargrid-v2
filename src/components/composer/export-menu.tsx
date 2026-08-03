"use client"

import * as React from "react"
import Link from "next/link"
import {
  Download,
  FileDown,
  FileCode2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Users,
  User,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Search,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MessageListItem } from "@/data/messages"
import {
  getSnapshotsForMessage,
  type MessageSnapshot,
} from "@/data/message-snapshots"
import {
  renderPrintableHtml,
  renderXml,
  buildExportFilename,
} from "@/lib/export-message"
import { downloadBlob } from "@/lib/zip-writer"
import { appendAudit } from "@/data/audit-log"
import {
  kickoffExportJob,
  subscribeExportJobs,
  getExportJobs,
  downloadExportJob,
  type ExportFormat,
  type ExportJob,
} from "@/data/export-jobs"

const CURRENT_ACTOR = "You"

/** Combined Download button on the message detail — single-borrower quick
 *  actions (PDF, XML) + a "Export all recipients" that opens the bulk dialog. */
export function ExportMenu({ message }: { message: MessageListItem }) {
  const [open, setOpen] = React.useState(false)
  const [bulkOpen, setBulkOpen] = React.useState(false)

  const snapshots = React.useMemo(
    () => getSnapshotsForMessage(message.id, { limit: 200 }),
    [message.id],
  )

  /** Dedupe by borrowerId — the snapshot pool oversamples borrowers when a
   *  campaign's audience exceeds the borrowers dataset. For the picker we
   *  only want unique borrowers. */
  const uniqueSnapshots = React.useMemo(() => {
    const seen = new Set<string>()
    const out: MessageSnapshot[] = []
    for (const s of snapshots) {
      if (seen.has(s.borrowerId)) continue
      seen.add(s.borrowerId)
      out.push(s)
    }
    return out
  }, [snapshots])

  const isSingle = message.audienceType === "single"
  const [pickedBorrowerId, setPickedBorrowerId] = React.useState<string | null>(null)

  // Reset the picked borrower when the message changes.
  React.useEffect(() => {
    setPickedBorrowerId(null)
  }, [message.id])

  const activeSnap: MessageSnapshot | undefined = React.useMemo(() => {
    if (pickedBorrowerId) {
      return uniqueSnapshots.find((s) => s.borrowerId === pickedBorrowerId)
    }
    return uniqueSnapshots[0]
  }, [pickedBorrowerId, uniqueSnapshots])

  function downloadSinglePdf() {
    if (!activeSnap) {
      toast.error("No sent snapshot found for this message.")
      return
    }
    const url = `/email-generator/${message.id}/export/print?borrower=${activeSnap.borrowerId}`
    window.open(url, "_blank", "noopener,noreferrer")
    appendAudit({
      action: "export.single",
      actor: CURRENT_ACTOR,
      campaignId: message.id,
      campaignName: message.campaignName,
      lenderId: message.lenderId,
      lenderName: activeSnap.lenderName,
      format: "pdf",
      scope: `1 borrower (${activeSnap.borrowerCustomerId})`,
      details: `PDF exported for ${activeSnap.borrowerName}`,
    })
    toast.success(`Print-ready PDF opened for ${activeSnap.borrowerName}`, {
      description: "Choose 'Save as PDF' from the print dialog to download.",
    })
    setOpen(false)
  }

  function downloadSingleXml() {
    if (!activeSnap) {
      toast.error("No sent snapshot found for this message.")
      return
    }
    const xml = renderXml(activeSnap)
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" })
    downloadBlob(blob, buildExportFilename(activeSnap, "xml"))
    appendAudit({
      action: "export.single",
      actor: CURRENT_ACTOR,
      campaignId: message.id,
      campaignName: message.campaignName,
      lenderId: message.lenderId,
      lenderName: activeSnap.lenderName,
      format: "xml",
      scope: `1 borrower (${activeSnap.borrowerCustomerId})`,
      details: `XML exported for ${activeSnap.borrowerName}`,
    })
    toast.success(`XML downloaded for ${activeSnap.borrowerName}`)
    setOpen(false)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button variant="outline" size="sm" className="h-8" />}
        >
          <Download className="h-3.5 w-3.5" />
          Download
          <ChevronDown className="h-3 w-3 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] p-1">
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isSingle ? "This borrower" : "One borrower"}
          </div>

          {/* Borrower picker — only for segment campaigns. For single-audience
              messages the recipient is fixed. */}
          {!isSingle && (
            <BorrowerPicker
              snapshots={uniqueSnapshots}
              activeSnap={activeSnap}
              onPick={setPickedBorrowerId}
            />
          )}

          {isSingle && activeSnap && (
            <div className="mx-1 mb-1 rounded-md border border-border bg-muted/10 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-foreground">
                    {activeSnap.borrowerName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {activeSnap.borrowerCustomerId} · {activeSnap.deliveryStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          <MenuRow
            icon={<FileDown className="h-3.5 w-3.5" />}
            title="PDF (record of communication)"
            subtitle="Opens a print-ready page — save as PDF from the print dialog"
            onClick={downloadSinglePdf}
            disabled={!activeSnap}
          />
          <MenuRow
            icon={<FileCode2 className="h-3.5 w-3.5" />}
            title="XML (structured data)"
            subtitle="Identifiers + metadata + body — for bank ingestion"
            onClick={downloadSingleXml}
            disabled={!activeSnap}
          />

          {!isSingle && (
            <>
              <div className="my-1 border-t border-border" />
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                All recipients ({message.recipients.toLocaleString()})
              </div>
              <MenuRow
                icon={<Users className="h-3.5 w-3.5" />}
                title="Export all — bulk job"
                subtitle="One file per borrower · async · delivered as an expiring ZIP"
                onClick={() => {
                  setOpen(false)
                  setBulkOpen(true)
                }}
              />
            </>
          )}

          <div className="my-1 border-t border-border" />
          <MenuRow
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            title="Export history + audit trail"
            subtitle="Every export is logged (actor, when, what)"
            href="/exports"
            onClick={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>

      <BulkExportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        message={message}
        recipientEstimate={Math.min(message.recipients, 200)}
      />
    </>
  )
}

function MenuRow({
  icon,
  title,
  subtitle,
  onClick,
  href,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick?: () => void
  href?: string
  disabled?: boolean
}) {
  const inner = (
    <>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-emerald-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-foreground">{title}</p>
        <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </>
  )
  const cls = cn(
    "flex w-full items-start gap-2 rounded px-2.5 py-2 text-left transition-colors hover:bg-muted",
    disabled && "pointer-events-none opacity-50",
  )
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls} disabled={disabled}>
      {inner}
    </button>
  )
}

/* ────────────────────── Borrower picker ────────────────────── */

function BorrowerPicker({
  snapshots,
  activeSnap,
  onPick,
}: {
  snapshots: MessageSnapshot[]
  activeSnap: MessageSnapshot | undefined
  onPick: (id: string) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return snapshots
    return snapshots.filter(
      (s) =>
        s.borrowerName.toLowerCase().includes(q) ||
        s.borrowerCustomerId.toLowerCase().includes(q) ||
        s.borrowerAccountNumber.toLowerCase().includes(q),
    )
  }, [snapshots, search])

  if (!activeSnap) {
    return (
      <div className="mx-1 mb-1 rounded-md border border-dashed border-border bg-muted/10 px-2.5 py-2 text-[11px] text-muted-foreground">
        No sent snapshots available for this campaign.
      </div>
    )
  }

  return (
    <div className="mx-1 mb-1 rounded-md border border-border bg-muted/10">
      {/* Header — shows the current selection + toggles the list. */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <User className="h-3 w-3 shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-foreground">
            {activeSnap.borrowerName}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {activeSnap.borrowerCustomerId} · {activeSnap.deliveryStatus}
          </p>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {expanded ? "Hide" : "Change"}
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {/* Expanded search + scrollable list */}
      {expanded && (
        <div className="border-t border-border">
          <div className="relative border-b border-border p-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${snapshots.length} borrowers…`}
              className="h-7 pl-7 text-[11px]"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-[11px] text-muted-foreground">
                No borrowers match.
              </p>
            ) : (
              filtered.map((s) => {
                const active = s.borrowerId === activeSnap.borrowerId
                return (
                  <button
                    key={s.borrowerId}
                    type="button"
                    onClick={() => {
                      onPick(s.borrowerId)
                      setExpanded(false)
                      setSearch("")
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
                      active ? "bg-emerald-500/10" : "hover:bg-muted",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground">
                        {s.borrowerName}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {s.borrowerCustomerId} · Account {s.borrowerAccountNumber}
                      </p>
                    </div>
                    <StatusDot status={s.deliveryStatus} />
                    {active && <Check className="h-3 w-3 shrink-0 text-emerald-400" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusDot({
  status,
}: {
  status: MessageSnapshot["deliveryStatus"]
}) {
  const color =
    status === "delivered"
      ? "bg-emerald-500"
      : status === "bounced" || status === "failed"
        ? "bg-red-500"
        : "bg-amber-500"
  return (
    <span
      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color)}
      title={status}
    />
  )
}

/* ────────────────────── Bulk export dialog ────────────────────── */

function BulkExportDialog({
  open,
  onClose,
  message,
  recipientEstimate,
}: {
  open: boolean
  onClose: () => void
  message: MessageListItem
  recipientEstimate: number
}) {
  const [format, setFormat] = React.useState<ExportFormat>("both")
  const [activeJob, setActiveJob] = React.useState<ExportJob | null>(null)
  const [, forceTick] = React.useReducer((n: number) => n + 1, 0)

  React.useEffect(() => {
    const unsub = subscribeExportJobs(() => {
      // Refresh the currently-tracked job if any.
      if (activeJob) {
        const next = getExportJobs().find((j) => j.id === activeJob.id) ?? null
        setActiveJob(next)
      }
      forceTick()
    })
    return unsub
  }, [activeJob])

  React.useEffect(() => {
    if (!open) {
      setActiveJob(null)
      setFormat("both")
    }
  }, [open])

  const isKsa = /ksa|saudi/i.test(message.audience) || /ksa/i.test(message.subject)

  function start() {
    const job = kickoffExportJob({
      messageId: message.id,
      campaignName: message.campaignName,
      lenderId: message.lenderId,
      lenderName: message.lenderId,
      format,
      recipientCount: recipientEstimate,
      requestedBy: CURRENT_ACTOR,
    })
    setActiveJob(job)
  }

  function download() {
    if (!activeJob) return
    try {
      downloadExportJob(activeJob, CURRENT_ACTOR)
      toast.success("Bundle downloaded", {
        description: "The link expires 1 hour after the bundle was ready.",
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed")
    }
  }

  const status = activeJob?.status ?? "idle"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            Export all recipients — {message.campaignName}
          </DialogTitle>
          <DialogDescription>
            One file per borrower, packaged into a ZIP with a manifest.
            Runs in the background — safe to close this dialog and check{" "}
            <Link href="/exports" className="text-emerald-300 hover:underline">
              Export history
            </Link>{" "}
            later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Governance banner */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-medium text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              Governance
            </div>
            <ul className="mt-1 space-y-0.5 text-emerald-300/80">
              <li>· This export contains only borrowers of <strong>{message.lenderId}</strong> — no data mixing.</li>
              <li>· Delivered via a single-tenant, expiring link — never a public URL.</li>
              <li>
                · {isKsa
                  ? "Detected KSA scope — data is generated and stored in-region."
                  : "UAE scope — bundle generated in the UAE tenant."}
              </li>
              <li>· Kickoff and download are recorded in the audit trail.</li>
            </ul>
          </div>

          {/* Format picker */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Format
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["pdf", "xml", "both"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  disabled={status !== "idle" && status !== "ready"}
                  className={cn(
                    "rounded-md border px-3 py-2 text-[11px] font-medium transition-colors",
                    format === f
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-border bg-muted/10 text-foreground hover:border-zinc-700",
                    (status !== "idle" && status !== "ready") && "cursor-not-allowed opacity-50",
                  )}
                >
                  {f === "pdf" ? "PDF only" : f === "xml" ? "XML only" : "PDF + XML"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              For A/B campaigns, each borrower's file contains the variation they actually received.
            </p>
          </div>

          {/* Scope */}
          <div className="rounded-md border border-border bg-muted/10 p-3 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">In scope</span>
              <span className="tabular-nums text-foreground">
                {recipientEstimate.toLocaleString()} borrowers
              </span>
            </div>
            {message.recipients > recipientEstimate && (
              <p className="mt-1 text-[10px] text-amber-400">
                Prototype demo cap — production runs the full {message.recipients.toLocaleString()}.
              </p>
            )}
          </div>

          {/* Progress */}
          {activeJob && (
            <div className="space-y-2 rounded-md border border-border bg-zinc-900/40 p-3">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-foreground">
                  {activeJob.status === "running" || activeJob.status === "queued" ? (
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                  ) : activeJob.status === "ready" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  ) : null}
                  <span className="font-medium">
                    {activeJob.status === "queued" && "Queued"}
                    {activeJob.status === "running" && `Processing ${activeJob.processed} / ${activeJob.recipientCount}`}
                    {activeJob.status === "ready" && "Bundle ready"}
                    {activeJob.status === "expired" && "Link expired"}
                    {activeJob.status === "failed" && "Failed"}
                  </span>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  {activeJob.progressPct}%
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${activeJob.progressPct}%` }}
                />
              </div>
              {activeJob.status === "ready" && (
                <p className="text-[10px] text-emerald-300/80">
                  Link expires{" "}
                  {activeJob.expiresAt
                    ? new Date(activeJob.expiresAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "in 1h"}
                  .
                </p>
              )}
              {activeJob.status === "expired" && (
                <p className="text-[10px] text-amber-300">
                  Bundle link expired. Kick off a new export to get a fresh one.
                </p>
              )}
              {activeJob.errorMessage && (
                <p className="text-[10px] text-red-400">{activeJob.errorMessage}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {activeJob && activeJob.status === "ready" ? (
            <Button onClick={download}>
              <Download className="h-3 w-3" />
              Download {activeJob.outputFilename}
            </Button>
          ) : activeJob && (activeJob.status === "queued" || activeJob.status === "running") ? (
            <Button disabled>
              <Loader2 className="h-3 w-3 animate-spin" />
              Running…
            </Button>
          ) : (
            <Button onClick={start}>
              <Users className="h-3 w-3" />
              Start export
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
