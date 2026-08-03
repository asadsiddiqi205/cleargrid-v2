"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Target,
  Library,
  Palette,
  Wand2,
  Plus,
  Trash2,
  FileText,
  Mail,
  MessageSquare,
  MessageCircle,
  ChevronRight,
  Sparkles,
  PanelTop,
  PanelBottom,
  CircleDollarSign,
  ShieldCheck,
  Smile,
  Code2,
  Eye,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { lenders } from "@/data/lenders"
import {
  PLAYBOOK_TONE_LABEL,
  PLAYBOOK_TONE_COLOR,
  type Playbook,
  type PlaybookTone,
} from "@/data/playbooks-v3"
import { type SavedModuleKind, MODULE_KIND_LABEL } from "@/data/saved-modules"
import { getModulePresets } from "@/data/module-presets"

// ──────────────────────────── New playbook ────────────────────────────

const TONE_OPTIONS: Array<{ id: PlaybookTone; description: string }> = [
  { id: "professional", description: "Bank-grade formal. Default for regulated lenders." },
  { id: "friendly", description: "BNPL-native, conversational. Light emoji allowed." },
  { id: "firm", description: "Direct, deadline-led. Used after 30 DPD." },
  { id: "empathetic", description: "Support-first. Used for hardship outreach." },
  { id: "urgent", description: "High-pressure. Final notice and pre-legal." },
]

export function NewPlaybookSheet({
  open,
  onClose,
  defaultLenderId,
}: {
  open: boolean
  onClose: () => void
  defaultLenderId?: string
}) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [name, setName] = React.useState("")
  const [lenderId, setLenderId] = React.useState<string>(defaultLenderId ?? "general")
  const [tone, setTone] = React.useState<PlaybookTone>("professional")
  const [language, setLanguage] = React.useState<"en" | "ar">("en")
  const [description, setDescription] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setStep(1)
      setName("")
      setLenderId(defaultLenderId ?? "general")
      setTone("professional")
      setLanguage("en")
      setDescription("")
    }
  }, [open, defaultLenderId])

  function handleCreate(openInBuilder: boolean) {
    if (!name.trim()) {
      toast.error("Give the playbook a name")
      return
    }
    toast.success(`Playbook "${name}" created`, {
      description: openInBuilder
        ? "Opening the v3 builder to attach a first email template…"
        : "You can attach templates and rules anytime.",
    })
    onClose()
    if (openInBuilder) {
      router.push(
        `/email-generator/builder/new?${new URLSearchParams({
          name: `${name} — first template`,
          lender: lenderId,
          channel: "email",
        }).toString()}`,
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            New playbook
          </DialogTitle>
          <DialogDescription>
            Step {step} of 2 — {step === 1 ? "details" : "review"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mashreq Mid-DPD Reminder"
                autoFocus
              />
            </Field>
            <Field label="Description (optional)">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary of when this playbook applies."
                className="min-h-[56px]"
              />
            </Field>
            <Field label="Lender">
              <select
                value={lenderId}
                onChange={(e) => setLenderId(e.target.value)}
                className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm"
              >
                <option value="general">General (cross-lender)</option>
                {lenders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tone">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    title={t.description}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                      tone === t.id
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/60 text-foreground hover:border-zinc-700",
                    )}
                  >
                    {PLAYBOOK_TONE_LABEL[t.id]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Language">
              <div className="grid grid-cols-2 gap-2">
                {(["en", "ar"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-[12px] font-medium transition-colors",
                      language === l
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/60 text-foreground hover:border-zinc-700",
                    )}
                  >
                    {l === "en" ? "English" : "Arabic (RTL)"}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
                  <Target className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{name || "Untitled playbook"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {lenderId === "general" ? "General · all lenders" : lenders.find((l) => l.id === lenderId)?.name ?? lenderId}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                <ReviewRow label="Tone">
                  <Badge className={cn("text-[10px]", PLAYBOOK_TONE_COLOR[tone])}>{PLAYBOOK_TONE_LABEL[tone]}</Badge>
                </ReviewRow>
                <ReviewRow label="Language">
                  <span className="text-foreground">{language === "en" ? "English" : "Arabic (RTL)"}</span>
                </ReviewRow>
                {description && (
                  <ReviewRow label="Description" full>
                    <span className="text-foreground/90 leading-relaxed">{description}</span>
                  </ReviewRow>
                )}
              </dl>
            </div>

            <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">What happens next.</strong> The playbook will be
              created in <span className="text-amber-300">Draft</span> status. You can attach
              email/SMS/WhatsApp templates from its detail page, or jump straight into the v3
              builder to author the first HTML template under this playbook.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button
              onClick={() => {
                if (!name.trim()) {
                  toast.error("Give it a name first")
                  return
                }
                setStep(2)
              }}
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="outline" onClick={() => handleCreate(false)}>
                Create
              </Button>
              <Button onClick={() => handleCreate(true)}>
                <Sparkles className="h-3.5 w-3.5" />
                Create &amp; open builder
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ──────────────────────────── New saved module ────────────────────────

const MODULE_KIND_OPTIONS: Array<{
  id: SavedModuleKind
  description: string
  icon: LucideIcon
}> = [
  { id: "header", icon: PanelTop, description: "Brand header — logo + ribbon at the top of every email." },
  { id: "footer", icon: PanelBottom, description: "Legal footer — regulatory text + opt-out at the bottom." },
  { id: "payment_cta", icon: CircleDollarSign, description: "Trackable payment button. Auto-resolves {{payment_link}}." },
  { id: "compliance", icon: ShieldCheck, description: "Required disclaimer that must appear verbatim." },
  { id: "greeting", icon: Smile, description: "Reusable salutation block for the opening line." },
]

export function NewModuleSheet({
  open,
  onClose,
  defaultLenderId,
  defaultKind,
}: {
  open: boolean
  onClose: () => void
  defaultLenderId?: string
  defaultKind?: SavedModuleKind
}) {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [kind, setKind] = React.useState<SavedModuleKind>(defaultKind ?? "header")
  const [lenderId, setLenderId] = React.useState<string>(defaultLenderId ?? "general")
  const [locked, setLocked] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [bilingual, setBilingual] = React.useState(false)
  const [presetId, setPresetId] = React.useState<string | null>(null)
  const [html, setHtml] = React.useState("")
  const [tab, setTab] = React.useState<"code" | "preview">("preview")

  // Presets recompute when (lenderId × kind) changes.
  const presets = React.useMemo(() => getModulePresets(lenderId, kind), [lenderId, kind])

  // Whenever lender or kind changes, re-seed the active preset + html.
  React.useEffect(() => {
    const first = presets[0]
    if (!first) return
    setPresetId(first.id)
    setHtml(first.html)
  }, [presets])

  React.useEffect(() => {
    if (open) {
      setName("")
      setKind(defaultKind ?? "header")
      setLenderId(defaultLenderId ?? "general")
      setLocked(false)
      setDescription("")
      setBilingual(false)
      setTab("preview")
    }
  }, [open, defaultLenderId, defaultKind])

  function handleCreate(openInBuilder: boolean) {
    if (!name.trim()) {
      toast.error("Give the module a name")
      return
    }
    toast.success(`Module "${name}" created`, {
      description: openInBuilder
        ? "Opening the module builder so you can refine this block."
        : `Now available in the saved-modules library under ${MODULE_KIND_LABEL[kind]}.`,
    })
    onClose()
    if (openInBuilder) {
      // Hand off to the dedicated module builder (single-block canvas), NOT
      // the full template builder.
      const params = new URLSearchParams({
        name,
        lender: lenderId,
        kind,
        preset: presetId ?? "",
        locked: locked ? "1" : "0",
        bilingual: bilingual ? "1" : "0",
      })
      router.push(`/templates/modules/new?${params.toString()}`)
    }
  }

  function pickPreset(p: { id: string; html: string }) {
    setPresetId(p.id)
    setHtml(p.html)
    setTab("preview")
  }

  const activeKind = MODULE_KIND_OPTIONS.find((o) => o.id === kind)
  const ActiveKindIcon = activeKind?.icon ?? PanelTop

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-[860px] flex-col overflow-hidden p-0">
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-zinc-950/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
              <Library className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold leading-tight text-foreground">
                New saved module
              </h2>
              <p className="text-[12px] leading-tight text-muted-foreground">
                Reusable block — embed in many templates, edit once.
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            {/* KIND */}
            <div>
              <label className="mb-2 block text-[12px] font-semibold text-foreground">
                Kind of module
              </label>
              <div className="grid grid-cols-5 gap-2">
                {MODULE_KIND_OPTIONS.map((o) => {
                  const Icon = o.icon
                  const active = kind === o.id
                  return (
                    <button
                      key={o.id}
                      onClick={() => setKind(o.id)}
                      className={cn(
                        "group flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center transition-colors",
                        active
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          active ? "text-emerald-300" : "text-zinc-400 group-hover:text-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          active ? "text-emerald-300" : "text-foreground",
                        )}
                      >
                        {MODULE_KIND_LABEL[o.id]}
                      </span>
                    </button>
                  )
                })}
              </div>
              {activeKind && (
                <div className="mt-2.5 flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2">
                  <ActiveKindIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <p className="text-[11px] leading-relaxed text-emerald-200/90">
                    {activeKind.description}
                  </p>
                </div>
              )}
            </div>

            {/* PRESETS — varies by (lender × kind) */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label className="text-[12px] font-semibold text-foreground">
                  Start from
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {presets.length} option{presets.length === 1 ? "" : "s"} for{" "}
                  <span className="text-foreground">
                    {lenderId === "general" ? "General" : lenders.find((l) => l.id === lenderId)?.shortName ?? lenderId}
                  </span>
                </span>
              </div>
              {presets.length === 0 ? (
                <p className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[11px] text-muted-foreground">
                  No starting point for this combination — pick another lender or write the HTML below.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {presets.map((p) => {
                    const active = presetId === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => pickPreset(p)}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border p-2 text-left transition-colors",
                          active
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900",
                        )}
                      >
                        <div className="overflow-hidden rounded-md border border-zinc-300 bg-white">
                          <div
                            className="origin-top-left scale-[0.8]"
                            style={{ width: "125%", height: 64, overflow: "hidden" }}
                            dangerouslySetInnerHTML={{ __html: p.html }}
                          />
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-foreground">{p.label}</p>
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{p.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* DETAILS */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mashreq · Brand Header"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  Lender scope
                </label>
                <select
                  value={lenderId}
                  onChange={(e) => setLenderId(e.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[13px]"
                >
                  <option value="general">General (cross-lender)</option>
                  {lenders.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="When should authors use this module?"
                />
              </div>
            </div>

            {/* TOGGLES */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">
                    {locked ? "Locked in templates" : "Editable in templates"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {locked
                      ? "Embeds can't change the module's content inline."
                      : "Embeds can override copy without touching this module."}
                  </p>
                </div>
                <Switch checked={locked} onCheckedChange={setLocked} size="sm" />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">Bilingual EN/AR</p>
                  <p className="text-[10px] text-muted-foreground">
                    Renders English and Arabic side-by-side.
                  </p>
                </div>
                <Switch checked={bilingual} onCheckedChange={setBilingual} size="sm" />
              </label>
            </div>

            {/* CONTENT — code + preview tabs */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[12px] font-semibold text-foreground">Content</label>
                <div className="flex items-center gap-0.5 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
                  <button
                    onClick={() => setTab("code")}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                      tab === "code"
                        ? "bg-zinc-800 text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Code2 className="h-3 w-3" />
                    HTML
                  </button>
                  <button
                    onClick={() => setTab("preview")}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                      tab === "preview"
                        ? "bg-zinc-800 text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </button>
                </div>
              </div>
              {tab === "code" ? (
                <Textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  className="min-h-[160px] resize-y font-mono text-[11px] leading-relaxed"
                  spellCheck={false}
                />
              ) : (
                <div className="overflow-hidden rounded-md border border-zinc-300 bg-white">
                  <div
                    className="p-4"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-popover px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleCreate(false)}>
            Create module
          </Button>
          <Button size="sm" onClick={() => handleCreate(true)}>
            <Wand2 className="h-3.5 w-3.5" />
            Create &amp; open builder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


// ──────────────────────────── Common helpers ─────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function ReviewRow({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={cn(full && "col-span-2")}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-[12px]">{children}</dd>
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 cursor-pointer rounded border border-zinc-800 bg-transparent"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-[11px]" />
    </div>
  )
}

// ──────────────────────────── Attach templates to playbook ─────────

import { templates as ALL_TEMPLATES } from "@/data/templates"
import { richEmailTemplates } from "@/data/rich-email-templates"

export function AttachTemplatesSheet({
  open,
  onClose,
  playbook,
}: {
  open: boolean
  onClose: () => void
  playbook: Playbook | null
}) {
  const router = useRouter()
  const [tab, setTab] = React.useState<"email" | "sms" | "whatsapp">("email")
  const [selectedHtmlTemplateId, setSelectedHtmlTemplateId] = React.useState<string | null>(null)

  if (!playbook) return null

  const emailTemplates = ALL_TEMPLATES.filter(
    (t) => t.channel === "email" && (playbook.lenderId === "general" || t.lenderId === playbook.lenderId || t.lenderId === "general"),
  )
  const smsTemplates = ALL_TEMPLATES.filter(
    (t) => t.channel === "sms" && (playbook.lenderId === "general" || t.lenderId === playbook.lenderId || t.lenderId === "general"),
  )
  const whatsappTemplates = ALL_TEMPLATES.filter(
    (t) => t.channel === "whatsapp" && (playbook.lenderId === "general" || t.lenderId === playbook.lenderId || t.lenderId === "general"),
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            Attach templates to {playbook.name}
          </DialogTitle>
          <DialogDescription>
            A playbook can bundle one template per channel. The email slot accepts rich HTML
            templates from the v3 builder.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-1 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
          {[
            { id: "email" as const, label: "Email (HTML)", icon: Mail },
            { id: "sms" as const, label: "SMS", icon: MessageSquare },
            { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
          ].map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  tab === t.id ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === "email" && (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Pick an existing rich HTML template, or open the v3 builder to author a new one for
              this playbook.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {richEmailTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedHtmlTemplateId(t.id)}
                  className={cn(
                    "rounded-md border bg-zinc-900/60 p-3 text-left transition-colors hover:border-emerald-500/40",
                    selectedHtmlTemplateId === t.id ? "border-emerald-500/40 bg-emerald-500/5" : "border-zinc-800",
                  )}
                >
                  <p className="text-[12px] font-semibold text-foreground">{t.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">{t.description ?? "Rich HTML template."}</p>
                </button>
              ))}
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Or, simple inline templates
              </p>
              <div className="space-y-1">
                {emailTemplates.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toast.success(`Attached "${t.name}" to ${playbook.name}`)}
                    className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-[11px] hover:bg-zinc-800"
                  >
                    <span className="text-foreground">{t.name}</span>
                    <span className="text-muted-foreground">{t.subject?.slice(0, 50)}…</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "sms" && <ChannelList templates={smsTemplates} playbookName={playbook.name} channel="sms" />}
        {tab === "whatsapp" && (
          <ChannelList templates={whatsappTemplates} playbookName={playbook.name} channel="whatsapp" />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClose()
              router.push(
                `/email-generator/builder/new?${new URLSearchParams({
                  name: `${playbook.name} — email`,
                  lender: playbook.lenderId,
                  playbook: playbook.id,
                  channel: "email",
                }).toString()}`,
              )
            }}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Author new HTML template
          </Button>
          {selectedHtmlTemplateId && (
            <Button
              onClick={() => {
                toast.success(`Attached HTML template to ${playbook.name}`)
                onClose()
              }}
            >
              Attach selected
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChannelList({
  templates,
  playbookName,
  channel,
}: {
  templates: typeof ALL_TEMPLATES
  playbookName: string
  channel: "sms" | "whatsapp"
}) {
  if (templates.length === 0) {
    return (
      <p className="py-6 text-center text-[12px] text-muted-foreground">
        No {channel} templates available for this lender yet.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => toast.success(`Attached "${t.name}" to ${playbookName}`)}
          className="flex w-full items-start gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5 text-left hover:border-emerald-500/40"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground">{t.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{t.body.slice(0, 140)}…</p>
          </div>
        </button>
      ))}
    </div>
  )
}
