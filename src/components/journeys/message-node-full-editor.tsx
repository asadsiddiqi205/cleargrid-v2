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

type ComposeMode = "template" | "manual"

const EMAIL_TEMPLATES = [
  "Payment Reminder",
  "Overdue Notice",
  "Final Notice",
  "PTP Follow-up",
  "Settlement Offer",
]

const SMS_TEMPLATES = [
  "Payment Reminder SMS",
  "Overdue SMS",
  "Final Notice SMS",
  "PTP Broken SMS",
]

const WHATSAPP_TEMPLATES = [
  "PTP Follow-up WA",
  "Payment Reminder WA",
  "Overdue Notice WA",
  "Settlement Offer WA",
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
                <div className="flex items-center gap-2">
                  <select
                    value={template}
                    onChange={(e) => set("template", e.target.value)}
                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring"
                  >
                    <option value="">Select template…</option>
                    {templateOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateEditorOpen(true)}
                    className="gap-1.5"
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

      {/* Template editor modal — hosts the composer builder route inline so
          authors get the exact same editing UI without leaving the journey. */}
      <Dialog open={templateEditorOpen} onOpenChange={setTemplateEditorOpen}>
        <DialogContent className="!max-w-[min(1720px,98vw)] h-[94vh] p-0 overflow-hidden gap-0">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Edit template · {channel} · {template || "Untitled"}
              </div>
              <button
                type="button"
                onClick={() => setTemplateEditorOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close template editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              title="Template editor"
              src={`/email-generator/builder/${encodeURIComponent(
                template ? templateSlug(template) : "new",
              )}?channel=${channel}&name=${encodeURIComponent(template || "")}&embedded=1`}
              className="min-h-0 flex-1 w-full border-0 bg-background"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function templateSlug(name: string): string {
  return "rich-" + name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
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
