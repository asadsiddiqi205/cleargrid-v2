"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Target,
  Plus,
  Search,
  CheckCircle2,
  Building2,
  Pencil,
  Copy,
  Archive,
  AlertTriangle,
  ShieldCheck,
  Wand2,
  ListChecks,
  Languages,
  MoreVertical,
  Sparkles,
  TrendingUp,
  Mail,
  MessageSquare,
  MessageCircle,
  FileText,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  playbooksV3,
  PLAYBOOK_TONE_LABEL,
  PLAYBOOK_TONE_COLOR,
  getPlaybookTemplates,
  type Playbook,
} from "@/data/playbooks-v3"
import { lenders } from "@/data/lenders"
import { richEmailTemplates } from "@/data/rich-email-templates"
import { templates as ALL_TEMPLATES } from "@/data/templates"
import { NewPlaybookSheet, AttachTemplatesSheet } from "@/components/composer/creation-sheets"

export function PlaybooksV3View() {
  const [selected, setSelected] = React.useState<Playbook | null>(playbooksV3[0] ?? null)
  const [search, setSearch] = React.useState("")
  const [lenderId, setLenderId] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [openCreate, setOpenCreate] = React.useState(false)
  const [openAttach, setOpenAttach] = React.useState(false)

  const filtered = playbooksV3.filter((p) => {
    if (search && !`${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())) return false
    if (lenderId !== "all" && p.lenderId !== lenderId) return false
    if (statusFilter !== "all" && p.status !== statusFilter) return false
    return true
  })

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Playbooks
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Voice + ruleset. Steers Composer GPT and lints manual content across SMS, email, and WhatsApp.
            </p>
          </div>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New playbook
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playbooks…"
              className="h-7 w-64 pl-7 text-[11px]"
            />
          </div>
          <select
            value={lenderId}
            onChange={(e) => setLenderId(e.target.value)}
            className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px]"
          >
            <option value="all">All lenders</option>
            <option value="general">General</option>
            {lenders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.shortName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filtered.map((p) => (
              <PlaybookCard key={p.id} p={p} active={selected?.id === p.id} onClick={() => setSelected(p)} />
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <PlaybookDetail
          p={selected}
          onClose={() => setSelected(null)}
          onAttachTemplates={() => setOpenAttach(true)}
        />
      )}

      <NewPlaybookSheet open={openCreate} onClose={() => setOpenCreate(false)} />
      <AttachTemplatesSheet open={openAttach} onClose={() => setOpenAttach(false)} playbook={selected} />
    </div>
  )
}

function PlaybookCard({ p, active, onClick }: { p: Playbook; active: boolean; onClick: () => void }) {
  const lender = lenders.find((l) => l.id === p.lenderId)
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-zinc-900/40 p-4 text-left transition-all hover:bg-zinc-900/70",
        active ? "border-emerald-500/40 bg-emerald-500/5" : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
            <Target className="h-3.5 w-3.5" />
          </div>
          <h3 className="truncate text-[13px] font-semibold text-foreground">{p.name}</h3>
        </div>
        <Badge
          className={cn(
            "h-4 shrink-0 text-[9px]",
            p.status === "active"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : p.status === "draft"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-zinc-700 bg-zinc-800 text-zinc-400",
          )}
        >
          {p.status}
        </Badge>
      </div>
      <p className="line-clamp-2 text-[11px] text-muted-foreground">{p.description}</p>
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <Badge className={cn("text-[9px] h-4", PLAYBOOK_TONE_COLOR[p.tone])}>
          {PLAYBOOK_TONE_LABEL[p.tone]}
        </Badge>
        <Badge className="h-4 border-zinc-700 bg-zinc-800 text-[9px] text-zinc-300">
          {lender?.shortName ?? "General"}
        </Badge>
        <Badge className="h-4 border-zinc-700 bg-zinc-800 text-[9px] text-zinc-300">
          {p.language === "en" ? "EN" : p.language === "ar" ? "AR" : "EN/AR"}
        </Badge>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {p.rules.length} rule{p.rules.length === 1 ? "" : "s"}
        </span>
      </div>
    </button>
  )
}

function PlaybookDetail({
  p,
  onClose,
  onAttachTemplates,
}: {
  p: Playbook
  onClose: () => void
  onAttachTemplates: () => void
}) {
  const [tab, setTab] = React.useState<"overview" | "templates" | "rules" | "ai" | "escalation">("overview")
  const lender = lenders.find((l) => l.id === p.lenderId)
  return (
    <div className="flex w-[440px] shrink-0 flex-col border-l border-border bg-zinc-950/60">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5">
            <Badge className={PLAYBOOK_TONE_COLOR[p.tone]}>{PLAYBOOK_TONE_LABEL[p.tone]} tone</Badge>
            <Badge className="border-zinc-700 bg-zinc-800 text-zinc-300">
              {lender?.shortName ?? "General"}
            </Badge>
            <Badge
              className={
                p.status === "active"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }
            >
              {p.status}
            </Badge>
          </div>
          <h2 className="truncate text-sm font-bold text-foreground">{p.name}</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Updated {new Date(p.updatedAt).toLocaleDateString()} · by {p.updatedBy}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        {[
          { id: "overview", label: "Overview", icon: Target },
          { id: "templates", label: "Templates", icon: Mail },
          { id: "rules", label: "Rules", icon: ListChecks },
          { id: "ai", label: "AI steering", icon: Sparkles },
          { id: "escalation", label: "DPD escalation", icon: TrendingUp },
        ].map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as never)}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium",
                tab === t.id ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-[12px]">
        {tab === "overview" && <Overview p={p} />}
        {tab === "templates" && <Templates p={p} onAttachTemplates={onAttachTemplates} />}
        {tab === "rules" && <Rules p={p} />}
        {tab === "ai" && <AiSteering p={p} />}
        {tab === "escalation" && <Escalation p={p} />}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px]">
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-7 px-2" />}>
              <MoreVertical className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.success("Duplicated playbook")}>
                <Copy className="h-3 w-3" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Archived playbook")}>
                <Archive className="h-3 w-3" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

function Overview({ p }: { p: Playbook }) {
  return (
    <>
      <p className="leading-relaxed text-muted-foreground">{p.description}</p>
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
          This playbook does two jobs
        </p>
        <ul className="space-y-1 text-[11px] text-foreground">
          <li className="flex items-start gap-2">
            <Wand2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
            <span>Steers Composer GPT — drives every AI draft into this voice.</span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
            <span>
              Lints manual content — {p.rules.length} rule{p.rules.length === 1 ? "" : "s"}, flagged
              alongside the existing safety checks.
            </span>
          </li>
        </ul>
      </div>
      {p.disclaimers.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mandatory disclaimers
          </p>
          <div className="space-y-1.5">
            {p.disclaimers.map((d) => (
              <div key={d.id} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
                <p className="text-[11px] font-medium text-foreground">{d.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Rules({ p }: { p: Playbook }) {
  if (p.rules.length === 0) {
    return <p className="text-muted-foreground">No rules defined yet.</p>
  }
  return (
    <div className="space-y-2">
      {p.rules.map((r) => (
        <div
          key={r.id}
          className={cn(
            "rounded-md border p-2.5",
            r.severity === "error"
              ? "border-red-500/30 bg-red-500/5"
              : r.severity === "warning"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-zinc-800 bg-zinc-900/60",
          )}
        >
          <div className="flex items-start gap-2">
            {r.severity === "error" ? (
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
            ) : r.severity === "warning" ? (
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-foreground">{r.statement}</p>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                Detector: {r.detector.kind}
                {r.detector.kind === "max_length" && ` · ≤ ${r.detector.max} chars (${r.detector.channel})`}
                {r.detector.kind === "reading_level" && ` · grade ≤ ${r.detector.maxGradeLevel}`}
                {r.detector.kind === "forbidden_phrase" && ` · ${r.detector.phrases.length} phrase(s)`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AiSteering({ p }: { p: Playbook }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Objective" value={p.aiSteering.objective.replace("_", " ")} />
        <Stat label="Firmness" value={p.aiSteering.firmness} />
        <Stat label="Reading level" value={`≤ grade ${p.aiSteering.maxReadingGrade}`} />
        <Stat
          label="Language"
          value={p.language === "en" ? "English" : p.language === "ar" ? `Arabic (${p.arabicDialect ?? "MSA"})` : "Bilingual"}
        />
      </div>
      <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Steering notes (prefix to every AI draft)
        </p>
        <p className="text-[11px] leading-relaxed text-foreground">{p.aiSteering.notes}</p>
      </div>
    </div>
  )
}

function Escalation({ p }: { p: Playbook }) {
  if (p.escalation.length === 0) {
    return <p className="text-muted-foreground">No escalation rules. Tone stays constant across DPD.</p>
  }
  return (
    <div className="space-y-2">
      {p.escalation.map((e) => (
        <div key={e.bucket} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-foreground">DPD {e.bucket}</p>
            <Badge className={PLAYBOOK_TONE_COLOR[e.toneShift]}>{PLAYBOOK_TONE_LABEL[e.toneShift]}</Badge>
          </div>
          {e.addedRules && e.addedRules.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 pl-3 text-[10px] text-foreground">
              {e.addedRules.map((r, i) => (
                <li key={i} className="list-disc">{r}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[12px] capitalize text-foreground">{value}</p>
    </div>
  )
}

function Templates({ p, onAttachTemplates }: { p: Playbook; onAttachTemplates: () => void }) {
  const bundle = getPlaybookTemplates(p.id)
  const html = bundle.htmlEmailTemplateId
    ? richEmailTemplates.find((t) => t.id === bundle.htmlEmailTemplateId)
    : undefined
  const inlineEmail = bundle.inlineEmailTemplateId
    ? ALL_TEMPLATES.find((t) => t.id === bundle.inlineEmailTemplateId)
    : undefined
  const sms = bundle.smsTemplateId
    ? ALL_TEMPLATES.find((t) => t.id === bundle.smsTemplateId)
    : undefined
  const whatsapp = bundle.whatsappTemplateId
    ? ALL_TEMPLATES.find((t) => t.id === bundle.whatsappTemplateId)
    : undefined

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
        <p className="text-[11px] font-semibold text-emerald-300">
          A playbook can bundle one template per channel
        </p>
        <p className="mt-1 text-[10px] text-emerald-300/80">
          When the journey&apos;s send node references this playbook, the matching channel template is
          used automatically. The email slot supports rich HTML built in the v3 builder.
        </p>
      </div>

      <TemplateSlot
        icon={Mail}
        label="HTML email"
        accent="emerald"
        templateName={html?.name}
        templateMeta={html ? "Rich · v3 builder" : undefined}
        playbookId={p.id}
        lenderId={p.lenderId}
        kind="html"
        onChange={onAttachTemplates}
      />
      <TemplateSlot
        icon={FileText}
        label="Inline email (plain)"
        accent="zinc"
        templateName={inlineEmail?.name}
        templateMeta={inlineEmail?.subject?.slice(0, 60)}
        playbookId={p.id}
        lenderId={p.lenderId}
        kind="inline_email"
        onChange={onAttachTemplates}
      />
      <TemplateSlot
        icon={MessageSquare}
        label="SMS"
        accent="zinc"
        templateName={sms?.name}
        templateMeta={sms?.body.slice(0, 70)}
        playbookId={p.id}
        lenderId={p.lenderId}
        kind="sms"
        onChange={onAttachTemplates}
      />
      <TemplateSlot
        icon={MessageCircle}
        label="WhatsApp"
        accent="zinc"
        templateName={whatsapp?.name}
        templateMeta={whatsapp?.body.slice(0, 70)}
        playbookId={p.id}
        lenderId={p.lenderId}
        kind="whatsapp"
        onChange={onAttachTemplates}
      />
    </div>
  )
}

function TemplateSlot({
  icon: Icon,
  label,
  accent,
  templateName,
  templateMeta,
  playbookId,
  lenderId,
  kind,
  onChange,
}: {
  icon: typeof Mail
  label: string
  accent: "emerald" | "zinc"
  templateName?: string
  templateMeta?: string
  playbookId: string
  lenderId: string
  kind: "html" | "inline_email" | "sms" | "whatsapp"
  onChange: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-zinc-900/40 p-3",
        accent === "emerald" && templateName
          ? "border-emerald-500/30"
          : "border-zinc-800",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", accent === "emerald" ? "text-emerald-400" : "text-zinc-400")} />
          <span className="text-[11px] font-semibold text-foreground">{label}</span>
        </div>
        {templateName ? (
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
            Attached
          </span>
        ) : (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
            Empty
          </span>
        )}
      </div>
      {templateName ? (
        <>
          <p className="text-[12px] font-medium text-foreground">{templateName}</p>
          {templateMeta && (
            <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{templateMeta}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {kind === "html" && (
              <Link
                href={`/email-generator/builder/${richEmailTemplates.find((t) => t.name === templateName)?.id ?? "new"}?playbook=${playbookId}`}
                className="inline-flex h-6 items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20"
              >
                <Wand2 className="h-2.5 w-2.5" />
                Open in v3 builder
              </Link>
            )}
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onChange}>
              Replace
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onChange}>
            <Plus className="h-3 w-3" />
            Attach existing
          </Button>
          {kind === "html" && (
            <Link
              href={`/email-generator/builder/new?playbook=${playbookId}&lender=${lenderId}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"
            >
              <Wand2 className="h-3 w-3" />
              Author new in v3 builder
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
