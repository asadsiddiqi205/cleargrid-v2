"use client"

/**
 * MessageNodeFullEditor — fullscreen editor for a Send Email / Send SMS /
 * Send WhatsApp action node. Replaces the right-side inspector for these
 * nodes so the author gets a proper form + always-visible preview.
 *
 * Layout: header (title, Save, Close) · left form column (scrollable) ·
 * right preview column (sticky). Template picker's "Edit template"
 * button opens a nested Dialog with the full TemplateEditor — no
 * redirect out to /templates/editor.
 */

import * as React from "react"
import type { Node } from "@xyflow/react"
import {
  X,
  Mail,
  MessageSquare,
  MessageCircle,
  Save,
  Pencil,
  Trash2,
  Search,
  Check,
  ChevronDown,
  BadgeCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  MessagePreview,
  type MessageChannel,
} from "@/components/shared/message-preview"
import { borrowers, type Borrower } from "@/data/borrowers"
import { TemplateEditor } from "@/components/templates/template-editor"

type ComposeMode = "template" | "manual"

interface TemplateOption {
  name: string
  purpose: string
  subject?: string
  snippet: string
  status: "active" | "draft"
  lender: string
}

const EMAIL_TEMPLATES: TemplateOption[] = [
  {
    name: "Payment Reminder",
    purpose: "Reminder",
    subject: "Reminder — {{amount}} due for {{borrower.first_name}}",
    snippet:
      "Hi {{borrower.first_name}}, this is a friendly reminder that your payment of {{amount}} is due today…",
    status: "active",
    lender: "Mashreq",
  },
  {
    name: "Overdue Notice",
    purpose: "Reminder",
    subject: "Your payment is overdue — action required",
    snippet:
      "Hi {{borrower.first_name}}, your payment is now {{days}} days overdue. Please settle at your earliest…",
    status: "active",
    lender: "General",
  },
  {
    name: "Final Notice",
    purpose: "Escalation",
    subject: "Final notice before escalation",
    snippet:
      "This is a final reminder. Failure to respond may lead to formal collections escalation…",
    status: "active",
    lender: "FAB",
  },
  {
    name: "PTP Follow-up",
    purpose: "Follow-up",
    subject: "Your promise to pay {{amount}} is due tomorrow",
    snippet:
      "Hi {{borrower.first_name}}, this is a reminder of your scheduled payment for tomorrow…",
    status: "active",
    lender: "Tamara",
  },
  {
    name: "Settlement Offer",
    purpose: "Settlement",
    subject: "A settlement option for your outstanding balance",
    snippet:
      "We'd like to offer a one-time settlement of {{amount}} to clear your balance in full…",
    status: "draft",
    lender: "CashNow",
  },
]

const SMS_TEMPLATES: TemplateOption[] = [
  {
    name: "Payment Reminder SMS",
    purpose: "Reminder",
    snippet:
      "Hi {{borrower.first_name}}, your payment of {{amount}} is due today. Pay now: cg.co/p/xxxx",
    status: "active",
    lender: "General",
  },
  {
    name: "Overdue SMS",
    purpose: "Reminder",
    snippet:
      "{{borrower.first_name}}, your payment is now overdue. Settle today to avoid escalation.",
    status: "active",
    lender: "Tamara",
  },
  {
    name: "Final Notice SMS",
    purpose: "Escalation",
    snippet:
      "FINAL NOTICE: This is your last reminder before formal collection. Contact us today.",
    status: "active",
    lender: "FAB",
  },
  {
    name: "PTP Broken SMS",
    purpose: "Follow-up",
    snippet:
      "Hi {{borrower.first_name}}, we noticed your promised payment wasn't received. Please call us.",
    status: "active",
    lender: "Mashreq",
  },
]

const WHATSAPP_TEMPLATES: TemplateOption[] = [
  {
    name: "PTP Follow-up WA",
    purpose: "Follow-up",
    snippet:
      "Hi {{borrower.first_name}} 👋 quick nudge — your promised payment of {{amount}} is due tomorrow.",
    status: "active",
    lender: "General",
  },
  {
    name: "Payment Reminder WA",
    purpose: "Reminder",
    snippet:
      "Hi {{borrower.first_name}}, this is a reminder that your payment of {{amount}} is due today.",
    status: "active",
    lender: "Mashreq",
  },
  {
    name: "Overdue Notice WA",
    purpose: "Escalation",
    snippet:
      "Hi {{borrower.first_name}}, your account is currently overdue. Reply RESOLVE to get help.",
    status: "active",
    lender: "Tamara",
  },
  {
    name: "Settlement Offer WA",
    purpose: "Settlement",
    snippet:
      "Hi {{borrower.first_name}}, we're offering a one-time settlement of {{amount}} — reply YES to accept.",
    status: "draft",
    lender: "CashNow",
  },
]

interface MessageNodeFullEditorProps {
  node: Node
  onUpdate: (nodeId: string, field: string, value: unknown) => void
  onDeleteNode: () => void
  onClose: () => void
}

export function MessageNodeFullEditor({
  node,
  onUpdate,
  onDeleteNode,
  onClose,
}: MessageNodeFullEditorProps) {
  const d = (node.data ?? {}) as Record<string, unknown>
  const actionType = (d.actionType as string) ?? "email"
  const channel: MessageChannel = (
    actionType === "email" || actionType === "sms" || actionType === "whatsapp"
      ? actionType
      : "email"
  ) as MessageChannel

  const set = (field: string, value: unknown) => onUpdate(node.id, field, value)

  const composeMode = ((d.composeMode as ComposeMode) ?? "template") as ComposeMode
  const template = (d.template as string) ?? ""
  const manualSubject = (d.manualSubject as string) ?? ""
  const manualBodyHtml = (d.manualBodyHtml as string) ?? ""
  const manualBodyText = (d.manualBodyText as string) ?? ""
  const smsSenderId = (d.smsSenderId as string) ?? "ClearGrid"
  const fromName = (d.fromName as string) ?? "ClearGrid Collections"
  const fromAddress = (d.fromAddress as string) ?? "collections@cleargrid.ae"
  const replyTo = (d.replyTo as string) ?? "replies@cleargrid.ae"
  const provider = (d.provider as string) ?? "default"

  const [templateEditorOpen, setTemplateEditorOpen] = React.useState(false)
  const [previewBorrowerId, setPreviewBorrowerId] = React.useState<string>(
    borrowers[0].id,
  )
  const previewBorrower =
    borrowers.find((b) => b.id === previewBorrowerId) ?? borrowers[0]

  const bodySource =
    composeMode === "manual"
      ? channel === "email" && manualBodyHtml
        ? manualBodyHtml.replace(/<[^>]+>/g, "")
        : manualBodyText
      : template
        ? `Template · ${template}\n\nHi {{borrower.first_name}},\n\nThis is a sample rendering of the "${template}" template as the borrower will receive it.`
        : `(no template picked yet — use the picker on the left)`

  const subjectSource =
    composeMode === "manual"
      ? manualSubject
      : template
        ? `Reminder — ${template}`
        : ""

  const renderedBody = renderVars(bodySource, previewBorrower)
  const renderedSubject = renderVars(subjectSource, previewBorrower)

  const ChannelIcon =
    channel === "email" ? Mail : channel === "sms" ? MessageSquare : MessageCircle

  const templateOptions =
    channel === "email"
      ? EMAIL_TEMPLATES
      : channel === "sms"
        ? SMS_TEMPLATES
        : WHATSAPP_TEMPLATES

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ChannelIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {channel === "email"
                ? "Send Email"
                : channel === "sms"
                  ? "Send SMS"
                  : "Send WhatsApp"}
            </div>
            <Input
              value={(d.label as string) ?? ""}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Node label"
              className="mt-0.5 h-6 border-none bg-transparent px-0 text-[15px] font-semibold focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteNode}
            className="text-error-300 hover:bg-error-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button onClick={onClose} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save & Close
          </Button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        {/* Left — form */}
        <div className="overflow-y-auto border-r border-border bg-background p-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Mode toggle */}
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Compose mode
              </Label>
              <div className="mt-1.5 inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                {(["template", "manual"] as ComposeMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("composeMode", m)}
                    className={cn(
                      "rounded-md px-3 py-1 text-[12px] font-medium capitalize transition-colors",
                      composeMode === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {composeMode === "template" ? (
              <FormField
                label={
                  channel === "whatsapp" ? "WhatsApp template" : "Template"
                }
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <TemplatePicker
                      channel={channel}
                      value={template}
                      onChange={(v) => set("template", v)}
                      options={templateOptions}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateEditorOpen(true)}
                    disabled={!template}
                    className="h-11 shrink-0 gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit template
                  </Button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Edits open in a modal — you stay on this node.
                </p>
              </FormField>
            ) : (
              <>
                {channel === "email" && (
                  <>
                    <FormField label="Subject">
                      <Input
                        value={manualSubject}
                        onChange={(e) => set("manualSubject", e.target.value)}
                        placeholder="Use {{borrower.first_name}} for personalization"
                        className="h-9 text-[13px]"
                      />
                    </FormField>
                    <FormField label="HTML body">
                      <textarea
                        value={manualBodyHtml}
                        onChange={(e) => set("manualBodyHtml", e.target.value)}
                        placeholder="<p>Hi {{borrower.first_name}},</p>"
                        className="min-h-[160px] w-full rounded-md border border-input bg-background p-3 font-mono text-[12px] outline-none focus-visible:border-ring"
                      />
                    </FormField>
                    <FormField label="Plain-text fallback">
                      <textarea
                        value={manualBodyText}
                        onChange={(e) => set("manualBodyText", e.target.value)}
                        placeholder="Hi {{borrower.first_name}}, ..."
                        className="min-h-[100px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
                      />
                    </FormField>
                  </>
                )}
                {channel !== "email" && (
                  <FormField
                    label={channel === "sms" ? "SMS body" : "WhatsApp body"}
                  >
                    <textarea
                      value={manualBodyText}
                      onChange={(e) => set("manualBodyText", e.target.value)}
                      placeholder="Hi {{borrower.first_name}}, your payment of {{borrower.outstanding}} is due..."
                      className="min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
                    />
                    {channel === "sms" && (
                      <div className="mt-1 flex justify-end">
                        <span
                          className={cn(
                            "text-[10px] tabular-nums",
                            manualBodyText.length > 160
                              ? "text-warning-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {manualBodyText.length}/160
                        </span>
                      </div>
                    )}
                  </FormField>
                )}
              </>
            )}

            {/* Channel-specific extras */}
            <div className="grid gap-4 sm:grid-cols-2">
              {channel === "email" && (
                <>
                  <FormField label="From name">
                    <Input
                      value={fromName}
                      onChange={(e) => set("fromName", e.target.value)}
                      placeholder="ClearGrid Collections"
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                  <FormField label="From address">
                    <Input
                      value={fromAddress}
                      onChange={(e) => set("fromAddress", e.target.value)}
                      placeholder="collections@cleargrid.co"
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                  <FormField label="Reply-to">
                    <Input
                      value={replyTo}
                      onChange={(e) => set("replyTo", e.target.value)}
                      placeholder="replies@cleargrid.co"
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                </>
              )}
              {channel === "sms" && (
                <FormField label="Sender ID">
                  <Input
                    value={smsSenderId}
                    onChange={(e) => set("smsSenderId", e.target.value)}
                    placeholder="ClearGrid"
                    className="h-9 text-[13px]"
                  />
                </FormField>
              )}
              <FormField label="Provider">
                <select
                  value={provider}
                  onChange={(e) => set("provider", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring"
                >
                  <option value="default">Default</option>
                  {channel === "email" && (
                    <>
                      <option value="sendgrid">SendGrid</option>
                      <option value="ses">Amazon SES</option>
                    </>
                  )}
                  {channel === "sms" && (
                    <>
                      <option value="twilio">Twilio</option>
                      <option value="unifonic">Unifonic</option>
                    </>
                  )}
                  {channel === "whatsapp" && (
                    <>
                      <option value="meta">Meta Cloud API</option>
                      <option value="twilio">Twilio</option>
                    </>
                  )}
                </select>
              </FormField>
            </div>

          </div>
        </div>

        {/* Right — preview (sticky) */}
        <div className="min-h-0 overflow-y-auto bg-muted/30 p-6">
          <div className="sticky top-0">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Preview · as the borrower received it
              </div>
              <select
                value={previewBorrowerId}
                onChange={(e) => setPreviewBorrowerId(e.target.value)}
                className="h-7 rounded border border-input bg-background px-2 text-[11px] outline-none focus-visible:border-ring"
              >
                {borrowers.slice(0, 20).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.dpdBucket} DPD
                  </option>
                ))}
              </select>
            </div>
            <MessagePreview
              channel={channel}
              subject={renderedSubject}
              body={renderedBody}
              recipientName={previewBorrower.name}
              recipientPhone={previewBorrower.phone}
              senderId={smsSenderId}
              fromName={fromName}
              fromAddress={fromAddress}
              clickTracking={true}
            />
          </div>
        </div>
      </div>

      {/* Template editor modal — the standalone TemplateEditor lives inside
          the Dialog so authors edit the template without leaving the node. */}
      <Dialog open={templateEditorOpen} onOpenChange={setTemplateEditorOpen}>
        <DialogContent className="!max-w-[min(1400px,96vw)] h-[92vh] p-0 overflow-hidden gap-0">
          <div className="flex h-full flex-col">
            <TemplateEditor />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────── Rich template picker ─────────── */

function TemplatePicker({
  channel,
  value,
  onChange,
  options,
}: {
  channel: MessageChannel
  value: string
  onChange: (name: string) => void
  options: TemplateOption[]
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const selected = options.find((t) => t.name === value) ?? null

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.snippet.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q) ||
        t.lender.toLowerCase().includes(q),
    )
  }, [options, query])

  const ChannelIcon =
    channel === "email" ? Mail : channel === "sms" ? MessageSquare : MessageCircle

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/30",
          open ? "border-primary/50 ring-2 ring-primary/20" : "border-input",
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            selected
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <ChannelIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {selected.name}
                </span>
                {selected.status === "active" && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-primary">
                    <BadgeCheck className="h-2.5 w-2.5" />
                    Active
                  </span>
                )}
                {selected.status === "draft" && (
                  <span className="rounded bg-warning-500/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-warning-300">
                    Draft
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {selected.purpose} · {selected.lender} · {selected.snippet}
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-medium text-muted-foreground">
                Choose a {channel} template
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                {options.length} available · click to browse
              </div>
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${channel} templates by name, purpose, lender…`}
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-[12px] outline-none focus-visible:border-ring"
                />
              </div>
            </div>
            <ul className="max-h-[360px] overflow-y-auto p-1">
              {filtered.length === 0 && (
                <li className="p-6 text-center text-[11px] text-muted-foreground">
                  No templates match &quot;{query}&quot;.
                </li>
              )}
              {filtered.map((t) => {
                const isActive = t.name === value
                return (
                  <li key={t.name}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(t.name)
                        setOpen(false)
                        setQuery("")
                      }}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-md p-2.5 text-left transition-colors hover:bg-muted/60",
                        isActive && "bg-primary/10",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded",
                          isActive
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isActive ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <ChannelIcon className="h-3 w-3" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12px] font-semibold text-foreground">
                            {t.name}
                          </span>
                          <span className="rounded bg-primary/10 px-1 py-px text-[9px] font-medium text-primary">
                            {t.purpose}
                          </span>
                          {t.status === "active" && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-primary">
                              <BadgeCheck className="h-2 w-2" />
                              Active
                            </span>
                          )}
                          {t.status === "draft" && (
                            <span className="rounded bg-warning-500/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-warning-300">
                              Draft
                            </span>
                          )}
                        </div>
                        {t.subject && (
                          <div className="mt-0.5 truncate text-[11px] text-foreground">
                            {t.subject}
                          </div>
                        )}
                        <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                          {t.snippet}
                        </div>
                        <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                          {t.lender}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-border px-2 py-1.5 text-[9px] text-muted-foreground">
              {filtered.length} of {options.length} · templates come from the
              shared Templates library.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function renderVars(text: string, b: Borrower): string {
  if (!text) return ""
  const first = b.name.split(" ")[0] ?? b.name
  return text
    .replace(/\{\{\s*borrower\.first_name\s*\}\}/g, first)
    .replace(/\{\{\s*borrower\.name\s*\}\}/g, b.name)
    .replace(/\{\{\s*borrower\.phone\s*\}\}/g, b.phone)
    .replace(/\{\{\s*borrower\.outstanding\s*\}\}/g, `AED ${b.outstanding.toLocaleString()}`)
    .replace(/\{\{\s*borrower\.product\s*\}\}/g, b.product)
    .replace(/\{\{\s*first_name\s*\}\}/g, first)
    .replace(/\{\{\s*amount\s*\}\}/g, `AED ${b.outstanding.toLocaleString()}`)
}
