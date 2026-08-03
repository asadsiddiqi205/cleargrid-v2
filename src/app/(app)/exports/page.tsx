"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ClipboardList,
  Download,
  Users,
  ShieldCheck,
  FileDown,
  FileCode2,
  Files,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getExportJobs,
  subscribeExportJobs,
  downloadExportJob,
  type ExportJob,
} from "@/data/export-jobs"
import { getAuditEntries, subscribeAudit, type AuditEntry } from "@/data/audit-log"

const CURRENT_ACTOR = "You"

export default function ExportsPage() {
  const [jobs, setJobs] = React.useState<ExportJob[]>(getExportJobs())
  const [audit, setAudit] = React.useState<AuditEntry[]>(getAuditEntries())
  const [tab, setTab] = React.useState<"jobs" | "audit">("jobs")

  React.useEffect(() => {
    const unsubJ = subscribeExportJobs(() => setJobs(getExportJobs()))
    const unsubA = subscribeAudit(() => setAudit(getAuditEntries()))
    return () => {
      unsubJ()
      unsubA()
    }
  }, [])

  return (
    <PageShell
      title="Export history"
      description="Bulk export jobs and the audit trail. Every start, completion, and download is recorded — who, when, what campaign, which lender, which format."
    >
      {/* Governance banner */}
      <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-emerald-300">
          <ShieldCheck className="h-3 w-3" />
          Governance in force
        </div>
        <ul className="mt-1 space-y-0.5 text-emerald-300/80">
          <li>· Strict lender partitioning — an export contains only borrowers of that campaign's lender.</li>
          <li>· Download links expire 1 hour after the bundle is ready.</li>
          <li>· Every action is audit-logged.</li>
          <li>· KSA borrower data is generated and stored in-region (tenant-scoped).</li>
        </ul>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
        <TabBtn active={tab === "jobs"} onClick={() => setTab("jobs")}>
          <Files className="h-3 w-3" />
          Bulk jobs
          <span className="ml-1 rounded bg-zinc-800 px-1 py-px text-[9px] text-zinc-300">
            {jobs.length}
          </span>
        </TabBtn>
        <TabBtn active={tab === "audit"} onClick={() => setTab("audit")}>
          <ClipboardList className="h-3 w-3" />
          Audit trail
          <span className="ml-1 rounded bg-zinc-800 px-1 py-px text-[9px] text-zinc-300">
            {audit.length}
          </span>
        </TabBtn>
      </div>

      {tab === "jobs" ? <JobsTable jobs={jobs} /> : <AuditTable audit={audit} />}
    </PageShell>
  )
}

function TabBtn({
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
        "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
        active ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function JobsTable({ jobs }: { jobs: ExportJob[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Files className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">No bulk export jobs yet</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Kick one off from a campaign's message detail page.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            <Th>Campaign</Th>
            <Th>Lender</Th>
            <Th>Format</Th>
            <Th>Scope</Th>
            <Th>Progress</Th>
            <Th>Requested</Th>
            <Th>By</Th>
            <Th className="text-right">Action</Th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <JobRow key={j.id} job={j} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JobRow({ job }: { job: ExportJob }) {
  function handleDownload() {
    try {
      downloadExportJob(job, CURRENT_ACTOR)
      toast.success("Bundle downloaded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed")
    }
  }

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/10">
      <td className="max-w-[240px] px-3 py-3">
        <Link
          href={`/email-generator/${job.messageId}`}
          className="line-clamp-1 text-[13px] font-medium text-primary hover:underline underline-offset-4"
        >
          {job.campaignName}
        </Link>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Job {job.id}</p>
      </td>
      <td className="px-3 py-3">
        <Badge className="border-zinc-700 bg-zinc-800 text-zinc-200">{job.lenderName}</Badge>
      </td>
      <td className="px-3 py-3">
        <FormatBadge format={job.format} />
      </td>
      <td className="px-3 py-3 text-[12px] tabular-nums">
        {job.recipientCount.toLocaleString()} borrowers
      </td>
      <td className="min-w-[160px] px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all",
                job.status === "failed"
                  ? "bg-red-500"
                  : job.status === "ready" || job.status === "expired"
                    ? "bg-emerald-500"
                    : "bg-emerald-500/50",
              )}
              style={{ width: `${job.progressPct}%` }}
            />
          </div>
          <StatusBadge status={job.status} />
        </div>
      </td>
      <td className="px-3 py-3 text-[11px] text-muted-foreground">
        {new Date(job.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
      </td>
      <td className="px-3 py-3 text-[11px] text-muted-foreground">{job.requestedBy}</td>
      <td className="px-3 py-3 text-right">
        {job.status === "ready" ? (
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-3 w-3" />
            Download
          </Button>
        ) : job.status === "running" || job.status === "queued" ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {job.processed}/{job.recipientCount}
          </span>
        ) : job.status === "expired" ? (
          <span className="text-[11px] text-amber-400">Link expired</span>
        ) : (
          <span className="text-[11px] text-red-400">Failed</span>
        )}
      </td>
    </tr>
  )
}

function AuditTable({ audit }: { audit: AuditEntry[] }) {
  if (audit.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <ClipboardList className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">No audit entries yet</p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            <Th>When</Th>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Campaign</Th>
            <Th>Lender</Th>
            <Th>Scope</Th>
            <Th>Details</Th>
          </tr>
        </thead>
        <tbody>
          {audit.map((e) => (
            <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
              <td className="px-3 py-3 text-[11px] text-muted-foreground">
                {new Date(e.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </td>
              <td className="px-3 py-3 text-[12px] text-foreground">{e.actor}</td>
              <td className="px-3 py-3">
                <ActionBadge action={e.action} />
              </td>
              <td className="max-w-[220px] px-3 py-3">
                <Link
                  href={`/email-generator/${e.campaignId}`}
                  className="line-clamp-1 text-[12px] text-primary hover:underline underline-offset-4"
                >
                  {e.campaignName}
                </Link>
              </td>
              <td className="px-3 py-3">
                <Badge className="border-zinc-700 bg-zinc-800 text-zinc-200">{e.lenderName}</Badge>
              </td>
              <td className="px-3 py-3 text-[11px] text-muted-foreground">{e.scope}</td>
              <td className="max-w-[260px] px-3 py-3 text-[11px] text-muted-foreground">
                {e.details && <span className="line-clamp-2">{e.details}</span>}
                {e.format && (
                  <FormatBadge format={e.format as "pdf" | "xml" | "both"} className="mt-1" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ────────────────────── Small helpers ────────────────────── */

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  )
}

function FormatBadge({
  format,
  className,
}: {
  format: "pdf" | "xml" | "both"
  className?: string
}) {
  const icon =
    format === "pdf" ? (
      <FileDown className="h-2.5 w-2.5" />
    ) : format === "xml" ? (
      <FileCode2 className="h-2.5 w-2.5" />
    ) : (
      <Files className="h-2.5 w-2.5" />
    )
  return (
    <Badge className={cn("border-zinc-700 bg-zinc-800 text-zinc-200", className)}>
      {icon}
      {format === "pdf" ? "PDF" : format === "xml" ? "XML" : "PDF + XML"}
    </Badge>
  )
}

function StatusBadge({ status }: { status: ExportJob["status"] }) {
  const map = {
    queued: { cls: "border-zinc-700 bg-zinc-800 text-zinc-300", icon: null, label: "Queued" },
    running: {
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      icon: <Loader2 className="h-2.5 w-2.5 animate-spin" />,
      label: "Running",
    },
    ready: {
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      label: "Ready",
    },
    expired: {
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      icon: null,
      label: "Expired",
    },
    failed: {
      cls: "border-red-500/30 bg-red-500/10 text-red-300",
      icon: <AlertTriangle className="h-2.5 w-2.5" />,
      label: "Failed",
    },
  } as const
  const m = map[status]
  return (
    <Badge className={cn(m.cls, "shrink-0")}>
      {m.icon}
      {m.label}
    </Badge>
  )
}

function ActionBadge({ action }: { action: AuditEntry["action"] }) {
  const map = {
    "export.start": { cls: "border-zinc-700 bg-zinc-800 text-zinc-200", label: "Started" },
    "export.complete": {
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      label: "Completed",
    },
    "export.failed": {
      cls: "border-red-500/30 bg-red-500/10 text-red-300",
      label: "Failed",
    },
    "export.download": {
      cls: "border-blue-500/30 bg-blue-500/10 text-blue-300",
      label: "Downloaded",
    },
    "export.single": {
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      label: "Single export",
    },
  } as const
  const m = map[action]
  return <Badge className={m.cls}>{m.label}</Badge>
}
