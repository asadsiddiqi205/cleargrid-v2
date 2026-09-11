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
  Braces,
  Sparkles,
  Send as SendIcon,
  Filter,
  BarChart3,
  Info,
  ShieldAlert,
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
import { NodeAnalyticsTab } from "@/components/journeys/node-analytics-tab"

type ComposeMode = "template" | "manual"

interface TemplateOption {
  name: string
  purpose: string
  subject?: string
  snippet: string
  status: "active" | "draft"
  lender: string
  /** For email only — designer-built rich HTML vs plain text-first. */
  type?: "html" | "text"
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
    type: "html",
  },
  {
    name: "Overdue Notice",
    purpose: "Reminder",
    subject: "Your payment is overdue — action required",
    snippet:
      "Hi {{borrower.first_name}}, your payment is now {{days}} days overdue. Please settle at your earliest…",
    status: "active",
    lender: "General",
    type: "html",
  },
  {
    name: "Final Notice",
    purpose: "Escalation",
    subject: "Final notice before escalation",
    snippet:
      "This is a final reminder. Failure to respond may lead to formal collections escalation…",
    status: "active",
    lender: "FAB",
    type: "html",
  },
  {
    name: "PTP Follow-up · Plain",
    purpose: "Follow-up",
    subject: "Your promise to pay {{amount}} is due tomorrow",
    snippet:
      "Hi {{borrower.first_name}}, this is a reminder of your scheduled payment for tomorrow…",
    status: "active",
    lender: "Tamara",
    type: "text",
  },
  {
    name: "Broken PTP · Plain",
    purpose: "Follow-up",
    subject: "We noticed your promised payment wasn't received",
    snippet:
      "Hi {{borrower.first_name}}, our records show your promised payment wasn't received. Please call us to resolve…",
    status: "active",
    lender: "Mashreq",
    type: "text",
  },
  {
    name: "Settlement Offer",
    purpose: "Settlement",
    subject: "A settlement option for your outstanding balance",
    snippet:
      "We'd like to offer a one-time settlement of {{amount}} to clear your balance in full…",
    status: "draft",
    lender: "CashNow",
    type: "html",
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
  /** Journey id — required to render the Analytics tab. */
  journeyId?: string
  /** Currently-selected run id from the canvas Analytics chip. */
  selectedRunId?: string | null
}

type EditorTab = "compose" | "delivery" | "logic" | "analytics"

const EDITOR_TABS: Array<{ id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "compose", label: "Compose", icon: Sparkles },
  { id: "delivery", label: "Delivery", icon: SendIcon },
  { id: "logic", label: "Logic", icon: Filter },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
]

export function MessageNodeFullEditor({
  node,
  onUpdate,
  onDeleteNode,
  onClose,
  journeyId,
  selectedRunId,
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

  const [tab, setTab] = React.useState<EditorTab>("compose")
  const [templateEditorOpen, setTemplateEditorOpen] = React.useState(false)
  const [htmlBuilderOpen, setHtmlBuilderOpen] = React.useState(false)
  const [previewBorrowerId, setPreviewBorrowerId] = React.useState<string>(
    borrowers[0].id,
  )
  const subjectRef = React.useRef<HTMLInputElement>(null!)
  const htmlBodyRef = React.useRef<HTMLTextAreaElement>(null!)
  const plainBodyRef = React.useRef<HTMLTextAreaElement>(null!)
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

      {/* Tab bar */}
      <div className="border-b border-border bg-card px-6">
        <div className="flex">
          {EDITOR_TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            const disabled = t.id === "analytics" && !journeyId
            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setTab(t.id)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  disabled && "opacity-40 cursor-not-allowed",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {tab !== "compose" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "delivery" && (
            <DeliveryPanel d={d} set={set} channel={channel} />
          )}
          {tab === "logic" && (
            <LogicPanel d={d} set={set} channel={channel} />
          )}
          {tab === "analytics" && journeyId && (
            <NodeAnalyticsTab
              journeyId={journeyId}
              runId={selectedRunId ?? null}
              nodeId={node.id}
              nodeLabel={(d.label as string) ?? node.id}
              nodeType={node.type ?? "action"}
              blockType={d.blockType as string | undefined}
            />
          )}
        </div>
      )}

      {/* Body */}
      {tab === "compose" && (
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
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Subject
                        </Label>
                        <AddVariableButton
                          targetRef={subjectRef}
                          onInsert={(v) => set("manualSubject", v)}
                          size="xs"
                        />
                      </div>
                      <Input
                        ref={subjectRef}
                        value={manualSubject}
                        onChange={(e) => set("manualSubject", e.target.value)}
                        placeholder="Use {{borrower.first_name}} for personalization"
                        className="mt-1.5 h-9 text-[13px]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          HTML body
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setHtmlBuilderOpen(true)}
                            className="h-7 gap-1 text-[11px]"
                          >
                            <Sparkles className="h-3 w-3" />
                            Design in HTML builder
                          </Button>
                          <AddVariableButton
                            targetRef={htmlBodyRef}
                            onInsert={(v) => set("manualBodyHtml", v)}
                            size="xs"
                          />
                        </div>
                      </div>
                      <textarea
                        ref={htmlBodyRef}
                        value={manualBodyHtml}
                        onChange={(e) => set("manualBodyHtml", e.target.value)}
                        placeholder="<p>Hi {{borrower.first_name}},</p>"
                        className="mt-1.5 min-h-[160px] w-full rounded-md border border-input bg-background p-3 font-mono text-[12px] outline-none focus-visible:border-ring"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Paste HTML directly, or use the visual builder — no
                        redirect out.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Plain-text fallback
                        </Label>
                        <AddVariableButton
                          targetRef={plainBodyRef}
                          onInsert={(v) => set("manualBodyText", v)}
                          size="xs"
                        />
                      </div>
                      <textarea
                        ref={plainBodyRef}
                        value={manualBodyText}
                        onChange={(e) => set("manualBodyText", e.target.value)}
                        placeholder="Hi {{borrower.first_name}}, ..."
                        className="mt-1.5 min-h-[100px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
                      />
                    </div>
                  </>
                )}
                {channel !== "email" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {channel === "sms" ? "SMS body" : "WhatsApp body"}
                      </Label>
                      <AddVariableButton
                        targetRef={plainBodyRef}
                        onInsert={(v) => set("manualBodyText", v)}
                        size="xs"
                      />
                    </div>
                    <textarea
                      ref={plainBodyRef}
                      value={manualBodyText}
                      onChange={(e) => set("manualBodyText", e.target.value)}
                      placeholder="Hi {{borrower.first_name}}, your payment of {{borrower.outstanding}} is due..."
                      className="mt-1.5 min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
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
                  </div>
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
      )}

      {/* Template editor modal — the standalone TemplateEditor lives inside
          the Dialog so authors edit the template without leaving the node.
          Channel is pinned to this node's channel so opening from an SMS
          node lands directly on the SMS editor. */}
      <Dialog open={templateEditorOpen} onOpenChange={setTemplateEditorOpen}>
        <DialogContent className="!max-w-[min(1400px,96vw)] h-[92vh] p-0 overflow-hidden gap-0">
          <div className="flex h-full flex-col">
            <TemplateEditor
              initialChannel={channel}
              initialTemplateName={template || undefined}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* HTML builder modal — opens the same TemplateEditor pinned to email
          for building HTML inline. Author saves a new template inside the
          modal; it becomes available in the picker on next open. */}
      <Dialog open={htmlBuilderOpen} onOpenChange={setHtmlBuilderOpen}>
        <DialogContent className="!max-w-[min(1400px,96vw)] h-[92vh] p-0 overflow-hidden gap-0">
          <div className="flex h-full flex-col">
            <TemplateEditor
              initialChannel="email"
              initialTemplateName={
                (d.label as string) ? `${d.label} · Manual` : "New HTML template"
              }
            />
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
                {channel === "email" && selected.type && (
                  <TemplateTypePill type={selected.type} />
                )}
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
            <div className="max-h-[420px] overflow-y-auto p-1">
              {filtered.length === 0 && (
                <div className="p-6 text-center text-[11px] text-muted-foreground">
                  No templates match &quot;{query}&quot;.
                </div>
              )}
              {channel === "email" ? (
                <>
                  <TemplateGroup
                    title="Rich HTML templates"
                    subtitle="Designer-built layouts — images, buttons, branded footer"
                    items={filtered.filter((t) => t.type === "html")}
                    selectedName={value}
                    ChannelIcon={ChannelIcon}
                    onSelect={(n) => {
                      onChange(n)
                      setOpen(false)
                      setQuery("")
                    }}
                  />
                  <TemplateGroup
                    title="Plain-text templates"
                    subtitle="Body-only — no HTML wrapper, best deliverability"
                    items={filtered.filter((t) => t.type === "text")}
                    selectedName={value}
                    ChannelIcon={ChannelIcon}
                    onSelect={(n) => {
                      onChange(n)
                      setOpen(false)
                      setQuery("")
                    }}
                  />
                </>
              ) : (
                filtered.map((t) => {
                  const isActive = t.name === value
                  return (
                    <TemplateRow
                      key={t.name}
                      t={t}
                      isActive={isActive}
                      ChannelIcon={ChannelIcon}
                      channel={channel}
                      onSelect={() => {
                        onChange(t.name)
                        setOpen(false)
                        setQuery("")
                      }}
                    />
                  )
                })
              )}
            </div>
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

/* ─────────── Delivery / Logic panels ─────────── */

function DeliveryPanel({
  d,
  set,
  channel,
}: {
  d: Record<string, unknown>
  set: (field: string, value: unknown) => void
  channel: MessageChannel
}) {
  const sendWindow = (d.sendWindow as string) ?? "anytime"
  const maxAttempts = (d.maxAttempts as number) ?? 3
  const retryIntervalMin = (d.retryIntervalMin as number) ?? 30
  const bypassFrequencyCap = (d.bypassFrequencyCap as boolean) ?? false
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-6">
      <PanelHeader
        title="Delivery"
        subtitle={`How this ${channel} step actually gets to the borrower — when it can send, how it retries, and whether it respects the journey's frequency cap.`}
      />

      <SectionCard title="Send window">
        <select
          value={sendWindow}
          onChange={(e) => set("sendWindow", e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring"
        >
          <option value="anytime">Anytime (default)</option>
          <option value="business">Business hours (09:00–18:00)</option>
          <option value="morning">Morning (09:00–12:00)</option>
          <option value="afternoon">Afternoon (12:00–17:00)</option>
          <option value="evening">Evening (17:00–20:00)</option>
        </select>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Messages outside this window queue until the next allowed slot.
        </p>
      </SectionCard>

      <SectionCard title="Retry policy">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldBlock label="Max attempts">
            <Input
              type="number"
              value={maxAttempts}
              onChange={(e) => set("maxAttempts", Number(e.target.value))}
              min={1}
              max={10}
              className="h-9 text-[13px]"
            />
          </FieldBlock>
          <FieldBlock label="Retry interval (min)">
            <Input
              type="number"
              value={retryIntervalMin}
              onChange={(e) => set("retryIntervalMin", Number(e.target.value))}
              min={1}
              className="h-9 text-[13px]"
            />
          </FieldBlock>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          After a soft failure (rate-limit, transient error) the send retries
          every {retryIntervalMin} min up to {maxAttempts} total attempts.
        </p>
      </SectionCard>

      <SectionCard
        title="Frequency cap override"
        titleIcon={<ShieldAlert className="h-3 w-3 text-warning-300" />}
      >
        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
          <span className="text-[12px] text-foreground">
            Bypass journey-level frequency cap
          </span>
          <input
            type="checkbox"
            checked={bypassFrequencyCap}
            onChange={(e) => set("bypassFrequencyCap", e.target.checked)}
            className="h-4 w-8"
          />
        </label>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Use only for critical compliance messages (e.g. final notices).
        </p>
      </SectionCard>
    </div>
  )
}

function LogicPanel({
  d,
  set,
  channel,
}: {
  d: Record<string, unknown>
  set: (field: string, value: unknown) => void
  channel: MessageChannel
}) {
  const language = (d.language as string) ?? "auto"
  const sendCondition = (d.sendCondition as string) ?? ""
  const suppressIf = (d.suppressIf as string) ?? ""
  const branchOnDelivery = (d.branchOnDelivery as boolean) ?? true
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-6">
      <PanelHeader
        title="Logic"
        subtitle="Guardrails and routing that apply before and after the borrower actually receives this message."
      />

      <SectionCard title="Language">
        <select
          value={language}
          onChange={(e) => set("language", e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring"
        >
          <option value="auto">Auto — from borrower.language</option>
          <option value="en">English</option>
          <option value="ar">Arabic</option>
          <option value="ur">Urdu</option>
          <option value="hi">Hindi</option>
        </select>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Templates rendered in the borrower&apos;s preferred language when
          available.
        </p>
      </SectionCard>

      <SectionCard title="Send only if">
        <Input
          value={sendCondition}
          onChange={(e) => set("sendCondition", e.target.value)}
          placeholder="e.g. borrower.consent_status = Granted AND borrower.dpd > 30"
          className="h-9 text-[12px] font-mono"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Optional pre-send guard. If the expression evaluates to false the
          send is skipped and the borrower moves to the next node.
        </p>
      </SectionCard>

      <SectionCard title="Suppress if">
        <Input
          value={suppressIf}
          onChange={(e) => set("suppressIf", e.target.value)}
          placeholder="e.g. borrower.do_not_contact = true"
          className="h-9 text-[12px] font-mono"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Hard-suppress rule. Overrides everything else — no send, no retry,
          no attempt logged as delivery.
        </p>
      </SectionCard>

      <SectionCard title="Route on delivery outcome">
        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
          <div>
            <div className="text-[12px] font-medium text-foreground">
              Branch by delivery event
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Expose outgoing edges for{" "}
              {channel === "sms"
                ? "delivered / bounced"
                : "delivered / opened / clicked / bounced"}{" "}
              so downstream steps can react.
            </div>
          </div>
          <input
            type="checkbox"
            checked={branchOnDelivery}
            onChange={(e) => set("branchOnDelivery", e.target.checked)}
            className="h-4 w-8"
          />
        </label>
      </SectionCard>
    </div>
  )
}

function PanelHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div>
      <div className="text-[16px] font-semibold text-foreground">{title}</div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </div>
  )
}

function SectionCard({
  title,
  titleIcon,
  children,
}: {
  title: string
  titleIcon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        {titleIcon}
        <div className="text-[12px] font-semibold text-foreground">{title}</div>
      </div>
      {children}
    </div>
  )
}

function FieldBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1">{children}</div>
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

/* ─────────── Picker helpers ─────────── */

function TemplateTypePill({ type }: { type: "html" | "text" }) {
  return type === "html" ? (
    <span className="inline-flex items-center gap-0.5 rounded bg-info-500/15 px-1 py-px text-[9px] font-medium uppercase tracking-wider text-info-300">
      HTML
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
      Text
    </span>
  )
}

function TemplateGroup({
  title,
  subtitle,
  items,
  selectedName,
  ChannelIcon,
  onSelect,
}: {
  title: string
  subtitle: string
  items: TemplateOption[]
  selectedName: string
  ChannelIcon: React.ComponentType<{ className?: string }>
  onSelect: (name: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-1 last:mb-0">
      <div className="px-2 pt-2 pb-1">
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title} · {items.length}
        </div>
        <div className="text-[9px] text-muted-foreground/70">{subtitle}</div>
      </div>
      <ul>
        {items.map((t) => (
          <TemplateRow
            key={t.name}
            t={t}
            isActive={t.name === selectedName}
            ChannelIcon={ChannelIcon}
            channel="email"
            onSelect={() => onSelect(t.name)}
          />
        ))}
      </ul>
    </div>
  )
}

function TemplateRow({
  t,
  isActive,
  ChannelIcon,
  channel,
  onSelect,
}: {
  t: TemplateOption
  isActive: boolean
  ChannelIcon: React.ComponentType<{ className?: string }>
  channel: MessageChannel
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
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
          {isActive ? <Check className="h-3 w-3" /> : <ChannelIcon className="h-3 w-3" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12px] font-semibold text-foreground">
              {t.name}
            </span>
            {channel === "email" && t.type && <TemplateTypePill type={t.type} />}
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
}

/* ─────────── Add-variable popover ─────────── */

const VARIABLES: Array<{ token: string; label: string; group: string }> = [
  { token: "{{borrower.first_name}}", label: "First name", group: "Borrower" },
  { token: "{{borrower.name}}", label: "Full name", group: "Borrower" },
  { token: "{{borrower.phone}}", label: "Phone", group: "Borrower" },
  { token: "{{borrower.email}}", label: "Email", group: "Borrower" },
  { token: "{{borrower.product}}", label: "Product", group: "Borrower" },
  { token: "{{borrower.dpd}}", label: "DPD", group: "Borrower" },
  { token: "{{borrower.outstanding}}", label: "Outstanding balance", group: "Financial" },
  { token: "{{amount}}", label: "Amount due", group: "Financial" },
  { token: "{{payment_link}}", label: "Payment link", group: "Financial" },
  { token: "{{ptp_date}}", label: "PTP date", group: "Follow-up" },
  { token: "{{last_agent}}", label: "Last agent", group: "Follow-up" },
  { token: "{{lender.name}}", label: "Lender name", group: "Lender" },
]

export function AddVariableButton({
  targetRef,
  onInsert,
  size = "sm",
}: {
  targetRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>
  onInsert: (nextValue: string) => void
  size?: "sm" | "xs"
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return VARIABLES
    return VARIABLES.filter(
      (v) =>
        v.token.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        v.group.toLowerCase().includes(q),
    )
  }, [query])

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof VARIABLES>()
    for (const v of filtered) {
      const arr = map.get(v.group) ?? []
      arr.push(v)
      map.set(v.group, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const insert = (token: string) => {
    const el = targetRef.current
    if (!el) {
      onInsert(token)
      setOpen(false)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + token + el.value.slice(end)
    onInsert(next)
    // Restore cursor after the inserted token in the next tick.
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-input bg-background text-foreground hover:bg-muted transition-colors",
          size === "sm" ? "h-7 px-2 text-[11px]" : "h-6 px-1.5 text-[10px]",
        )}
      >
        <Braces className="h-3 w-3" />
        Add variable
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-[280px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search variables…"
                  className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-[11px] outline-none focus-visible:border-ring"
                />
              </div>
            </div>
            <div className="max-h-[280px] overflow-y-auto p-1">
              {grouped.length === 0 && (
                <div className="p-4 text-center text-[10px] text-muted-foreground">
                  No matches
                </div>
              )}
              {grouped.map(([group, items]) => (
                <div key={group} className="mb-1 last:mb-0">
                  <div className="px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </div>
                  {items.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insert(v.token)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/60"
                    >
                      <span className="flex-1 truncate text-[11px] text-foreground">
                        {v.label}
                      </span>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {v.token.replace(/[{}]/g, "")}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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
