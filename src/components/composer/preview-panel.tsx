"use client"

import * as React from "react"
import {
  Eye,
  Mail,
  MessageSquare,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Send,
  Split,
  Calendar,
  Clock,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"
import { formatAED } from "@/lib/formatters"
import { borrowers, type Borrower } from "@/data/borrowers"
import { whatsappTemplates } from "@/data/composer-ai-variants"
import type { Segment } from "@/data/segments"
import type { ComposerState, RecurrenceFreq, SendMode, SendSchedule } from "@/components/composer/composer-view"
import { richEmailTemplates } from "@/data/rich-email-templates"
import { getSenderProfileById } from "@/data/sender-profiles"

interface PreviewPanelProps {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
  selectedBorrower: Borrower
  selectedSegment: Segment
  onSend: () => void
}

const SAMPLE_IDS = [
  "bor-001",
  "bor-002",
  "bor-003",
  "bor-004",
  "bor-005",
]

// Substitute variables for preview
function renderVars(text: string, b: Borrower): string {
  const today = new Date()
  const due = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000)
  const dueStr = due.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const lastPay = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const lastPayStr = lastPay.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const priorPtp = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
  const priorPtpStr = priorPtp.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  // Derived fields from the borrower
  const overdue = Math.round(b.outstanding * 0.35)
  const installment = Math.max(800, Math.round(b.outstanding / 12))
  const ref = `${b.product.split(" ").map((s) => s[0]).join("").toUpperCase()}-2026-${b.emiratesId.slice(-5)}`
  const dpdNumber = b.dpdBucket.split("-")[0]?.replace("+", "") ?? "30"

  return (
    text
      // ── Legacy flat tokens ─────────────────────────────────────────────
      .replace(/\{\{borrower_name\}\}/g, b.name)
      .replace(/\{\{amount_due\}\}/g, formatAED(b.outstanding))
      .replace(/\{\{outstanding_amount\}\}/g, formatAED(b.outstanding))
      .replace(/\{\{due_date\}\}/g, dueStr)
      .replace(/\{\{account_number\}\}/g, b.emiratesId.slice(-8))
      .replace(/\{\{payment_link\}\}/g, "cg.ae/pay/" + b.id)
      .replace(/\{\{contact_number\}\}/g, "800-CLEARGRID")
      .replace(/\{\{days_past_due\}\}/g, b.dpdBucket)
      .replace(/\{\{agent_name\}\}/g, "Layla Al Maktoum")
      .replace(/\{\{company_name\}\}/g, "ClearGrid")
      .replace(/\{\{lender_name\}\}/g, "Emirates NBD")
      .replace(/\{\{settlement_amount\}\}/g, formatAED(Math.round(b.outstanding * 0.6)))
      .replace(/\{\{amount_paid\}\}/g, formatAED(Math.round(b.outstanding * 0.3)))
      .replace(/\{\{remaining_balance\}\}/g, formatAED(Math.round(b.outstanding * 0.7)))
      // ── Borrower (9) ───────────────────────────────────────────────────
      .replace(/\{\{borrower\.name\}\}/g, b.name)
      .replace(
        /\{\{borrower\.email\}\}/g,
        b.name.toLowerCase().replace(/\s+/g, ".") + "@email.ae"
      )
      .replace(/\{\{borrower\.phone\}\}/g, b.phone)
      .replace(/\{\{borrower\.total_outstanding\}\}/g, formatAED(b.outstanding))
      .replace(/\{\{borrower\.total_delinquent\}\}/g, formatAED(overdue))
      .replace(
        /\{\{borrower\.segment\}\}/g,
        b.riskScore === "High" ? "High Risk" : b.riskScore === "Medium" ? "Mid Risk" : "Low Risk"
      )
      .replace(
        /\{\{borrower\.risk_score\}\}/g,
        b.riskScore === "High" ? "82" : b.riskScore === "Medium" ? "55" : "28"
      )
      .replace(/\{\{borrower\.aggregate_dpd\}\}/g, dpdNumber)
      .replace(/\{\{borrower\.ptp_status\}\}/g, "Active")
      // ── Account (12) ───────────────────────────────────────────────────
      .replace(/\{\{account\.id\}\}/g, "ACC-" + b.emiratesId.slice(-5))
      .replace(/\{\{account\.type\}\}/g, b.product)
      .replace(/\{\{account\.lender_name\}\}/g, "Emirates NBD")
      .replace(/\{\{account\.merchant_name\}\}/g, "Jarir Bookstore")
      .replace(/\{\{account\.balance\}\}/g, formatAED(b.outstanding))
      .replace(/\{\{account\.overdue_amount\}\}/g, formatAED(overdue))
      .replace(/\{\{account\.dpd\}\}/g, dpdNumber)
      .replace(/\{\{account\.payment_link\}\}/g, "cg.ae/pay/" + b.id)
      .replace(/\{\{account\.support_contact\}\}/g, "800-CLEARGRID")
      .replace(/\{\{account\.reference\}\}/g, ref)
      .replace(/\{\{account\.last_payment_date\}\}/g, lastPayStr)
      .replace(
        /\{\{account\.settlement_eligible\}\}/g,
        b.outstanding > 50000 ? "Yes" : "No"
      )
      // ── Sub-account (7) ────────────────────────────────────────────────
      .replace(/\{\{sub_account\.installment_number\}\}/g, "#3")
      .replace(/\{\{sub_account\.due_date\}\}/g, dueStr)
      .replace(/\{\{sub_account\.amount\}\}/g, formatAED(installment))
      .replace(/\{\{sub_account\.overdue_amount\}\}/g, formatAED(installment))
      .replace(/\{\{sub_account\.days_overdue\}\}/g, "15")
      .replace(/\{\{sub_account\.status\}\}/g, "Overdue")
      .replace(/\{\{sub_account\.prior_ptp_date\}\}/g, priorPtpStr)
  )
}

export function PreviewPanel({
  state,
  update,
  selectedBorrower,
  selectedSegment,
  onSend,
}: PreviewPanelProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [reviewAllOpen, setReviewAllOpen] = React.useState(false)
  const schedule = state.schedule
  const setSchedulePatch = (patch: Partial<SendSchedule>) =>
    update("schedule", { ...state.schedule, ...patch })
  const isScheduled = schedule.mode !== "now"
  const abTest = state.variations.length > 1

  const samplePool = React.useMemo(
    () => SAMPLE_IDS.map((id) => borrowers.find((b) => b.id === id)).filter(Boolean) as Borrower[],
    []
  )

  const previewBorrower =
    state.mode === "single"
      ? selectedBorrower
      : borrowers.find((b) => b.id === state.previewBorrowerId) ?? samplePool[0]

  const renderedBody = React.useMemo(() => {
    if (state.channel === "email") return renderVars(state.body, previewBorrower)
    if (state.channel === "sms") return renderVars(state.smsBody, previewBorrower)
    const tpl = whatsappTemplates.find((t) => t.id === state.whatsappTemplateId)
    return renderVars(tpl?.body ?? "", previewBorrower)
  }, [
    state.channel,
    state.body,
    state.smsBody,
    state.whatsappTemplateId,
    previewBorrower,
  ])

  const renderedSubject = React.useMemo(
    () => renderVars(state.subject, previewBorrower),
    [state.subject, previewBorrower]
  )

  const sendCount =
    state.mode === "segment" ? selectedSegment.borrowers - 56 : 1
  const sendLabel =
    state.mode === "segment"
      ? `${sendCount.toLocaleString()} borrowers`
      : selectedBorrower.name

  const ChannelIcon =
    state.channel === "email"
      ? Mail
      : state.channel === "sms"
        ? MessageSquare
        : MessageCircle

  const channelLabel =
    state.channel === "email"
      ? "Email"
      : state.channel === "sms"
        ? "SMS"
        : "WhatsApp"

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-5 p-4">
      {/* ---- Preview ---- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              How it will look
            </h2>
          </div>
          {state.variations.length > 1 && state.channel === "email" && (
            <button
              type="button"
              onClick={() => setReviewAllOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Split className="h-2.5 w-2.5" />
              Review all {state.variations.length}
            </button>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          See exactly what one borrower will receive. Variables like name and amount fill in automatically.
        </p>

        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Preview as
          </Label>
          <Select
            value={previewBorrower.id}
            onValueChange={(v) => update("previewBorrowerId", v ?? samplePool[0].id)}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {samplePool.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {state.channel === "email" && (
          <EmailPreviewCard
            subject={renderedSubject}
            previewText={renderVars(state.previewText, previewBorrower)}
            body={renderedBody}
          />
        )}
        {state.channel === "sms" && (
          <SmsPreviewCard body={renderedBody} phone={previewBorrower.phone} />
        )}
        {state.channel === "whatsapp" && (
          <WhatsAppPreviewCard body={renderedBody} name={previewBorrower.name} />
        )}
      </section>

      {/* ---- Compliance checks ---- */}
      <section className="space-y-2 border-t border-border pt-4">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Safety checks
        </h2>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Automatic rules that protect borrowers and keep you compliant.
        </p>
        <div className="space-y-1.5">
          <CheckRow
            kind="info"
            label="Do Not Contact list: 39 borrowers will be skipped"
            tooltip="Borrowers who opted out are automatically excluded."
          />
          <CheckRow
            kind="ok"
            label="Contact hours: Within 9 AM - 7 PM GST"
            tooltip="Messages will only go out during legal contact hours."
          />
          <CheckRow
            kind="warn"
            label="Frequency cap: 12 borrowers already at limit, will be skipped"
            tooltip="A borrower can't be contacted more than the daily limit allows."
          />
          <CheckRow
            kind="warn"
            label="7-in-7 rule: 5 borrowers blocked"
            tooltip="7-in-7 rule: max 7 contact attempts in any 7-day window. Prevents borrower harassment."
          />
          <CheckRow kind="ok" label="Template approved by compliance" />
          <CheckRow kind="ok" label="Required legal disclosures included" />
        </div>
      </section>

      {/* ---- Send section ---- */}
      <section className="space-y-3 border-t border-border pt-4">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Will be sent to
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="font-heading text-xl font-semibold text-foreground">
              {sendLabel}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ChannelIcon className="h-3 w-3" />
            via {channelLabel}
          </div>
        </div>

        {/* Compact send summary — always visible; full options live in the
            Send modal below. */}
        <div className="rounded-lg border border-border bg-muted/5 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatScheduleSummary(schedule)}
              {" · "}
              {abTest ? `${state.variations.length} variations` : "Single version"}
            </span>
          </div>
          <p className="mt-0.5 pl-5 text-[10px] text-muted-foreground/70">
            Click Send to pick the schedule (Now / Schedule once / Recurring).
          </p>
        </div>

        {/* Primary action */}
        <div className="space-y-1 pt-1">
          {(() => {
            const campaignMissing = !state.campaignName.trim()
            // Resolve sender per-variation: variation override wins,
            // otherwise fall back to the campaign default. A variation is
            // "missing" only when both are empty.
            const variationsMissingSender =
              state.channel === "email"
                ? state.variations.filter(
                    (v) => !(v.senderProfileId ?? state.senderProfileId),
                  )
                : []
            const senderMissing = variationsMissingSender.length > 0
            const variationSplitSum = state.variations.reduce((acc, v) => acc + v.splitPct, 0)
            const splitInvalid =
              state.channel === "email" &&
              state.variations.length > 1 &&
              variationSplitSum !== 100

            const blockers: Array<{ label: string; detail: string }> = []
            if (campaignMissing) {
              blockers.push({
                label: "Add a campaign name",
                detail: "Required — this is the primary title in the message listing.",
              })
            }
            if (senderMissing) {
              const multi = state.variations.length > 1
              const which = variationsMissingSender.map((v) => v.label).join(", ")
              blockers.push({
                label: multi
                  ? `Pick a sender profile for variation ${which}`
                  : "Pick a sender profile",
                detail: multi
                  ? "Each variation needs a sender profile — either its own override or the campaign default."
                  : "Sender identity is governed — pick an approved profile.",
              })
            }
            if (splitInvalid) {
              blockers.push({
                label: `Variation splits sum to ${variationSplitSum}%, not 100%`,
                detail: "Adjust the traffic split on each variation.",
              })
            }
            const blocked = blockers.length > 0
            return (
              <>
                <Button
                  size="lg"
                  disabled={blocked}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    if (blocked) {
                      toast.error(blockers[0].label, { description: blockers[0].detail })
                      return
                    }
                    setConfirmOpen(true)
                  }}
                >
                  <Send className="h-4 w-4" />
                  {schedule.mode === "recurring"
                    ? `Start recurring campaign · ${sendLabel}`
                    : schedule.mode === "once"
                      ? `Schedule for ${sendLabel}`
                      : `Send to ${sendLabel}`}
                </Button>
                {blocked && (
                  <ul className="space-y-0.5 pt-1 text-center text-[11px] text-red-400">
                    {blockers.map((b, i) => (
                      <li key={i}>{b.label}</li>
                    ))}
                  </ul>
                )}
              </>
            )
          })()}
          <button
            type="button"
            onClick={() => toast.success("Draft saved")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
          >
            Save as draft
          </button>
        </div>
      </section>

      {/* ---- Review all variations dialog ---- */}
      <ReviewAllVariationsDialog
        open={reviewAllOpen}
        onClose={() => setReviewAllOpen(false)}
        state={state}
        previewBorrower={previewBorrower}
      />

      {/* ---- Confirm dialog with full Send options ---- */}
      <Dialog open={confirmOpen} onOpenChange={(o: boolean) => setConfirmOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Send options
            </DialogTitle>
            <DialogDescription>
              Choose when this{" "}
              {state.channel === "email"
                ? "email"
                : state.channel === "sms"
                  ? "SMS"
                  : "WhatsApp message"}{" "}
              goes out. You can send now, schedule once, or run it on a recurring cadence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Audience summary */}
            <div className="rounded-lg border border-primary/25 bg-primary/[0.05] p-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <ChannelIcon className="h-3 w-3" />
                Will send to
              </div>
              <p className="mt-1 text-[14px] font-semibold text-foreground">
                {state.mode === "segment"
                  ? `${sendCount.toLocaleString()} borrowers`
                  : selectedBorrower.name}
              </p>
              {state.mode === "segment" && (
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Borrowers on the Do Not Contact list and at frequency limits will be skipped
                  automatically.
                </p>
              )}
              {abTest && (
                <p className="mt-1 inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <Split className="h-2.5 w-2.5" />
                  {state.variations.length} variations · A/B test
                </p>
              )}
            </div>

            {/* Schedule options */}
            <SendModePicker schedule={schedule} onChange={setSchedulePatch} />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setConfirmOpen(false)
                onSend()
              }}
            >
              {schedule.mode === "recurring"
                ? "Start recurring campaign"
                : schedule.mode === "once"
                  ? "Schedule"
                  : "Send now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}

// ---------- Subcomponents ----------

function CheckRow({
  kind,
  label,
  tooltip,
}: {
  kind: "ok" | "warn" | "info"
  label: string
  tooltip?: string
}) {
  const Icon =
    kind === "ok" ? CheckCircle2 : kind === "warn" ? AlertTriangle : Info
  const row = (
    <div
      className={cn(
        "flex items-start gap-1.5 rounded-md px-2 py-1 text-[11px]",
        tooltip && "cursor-help",
        kind === "ok" && "bg-primary/5 text-foreground",
        kind === "warn" && "bg-amber-500/10 text-amber-300",
        kind === "info" && "bg-muted/40 text-muted-foreground"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-3 w-3 shrink-0",
          kind === "ok" && "text-primary",
          kind === "warn" && "text-amber-400",
          kind === "info" && "text-muted-foreground"
        )}
      />
      <span>{label}</span>
    </div>
  )
  if (!tooltip) return row
  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

function EmailPreviewCard({
  subject,
  previewText,
  body,
}: {
  subject: string
  previewText: string
  body: string
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
            CG
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-foreground">
              ClearGrid Collections
            </div>
            <div className="truncate text-[10px] text-muted-foreground">
              collections@cleargrid.ae
            </div>
          </div>
          <Clock className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-1 px-3 py-2">
        <div className="text-[13px] font-semibold text-foreground">
          {subject || <span className="text-muted-foreground">(no subject)</span>}
        </div>
        {previewText && (
          <div className="text-[10px] text-muted-foreground line-clamp-1">
            {previewText}
          </div>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-border/60 px-3 py-3 text-[11px] leading-relaxed text-foreground">
        {body || (
          <span className="text-muted-foreground">
            Your message preview will appear here...
          </span>
        )}
      </div>
    </div>
  )
}

function SmsPreviewCard({ body, phone }: { body: string; phone: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-3">
      <div className="mb-2 text-center text-[10px] text-muted-foreground">
        {phone}
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-[11px] leading-relaxed text-foreground">
        {body || (
          <span className="text-muted-foreground">
            Your SMS preview will appear here...
          </span>
        )}
      </div>
      <div className="mt-1 text-right text-[9px] text-muted-foreground">
        ClearGrid · just now
      </div>
    </div>
  )
}

function WhatsAppPreviewCard({ body, name }: { body: string; name: string }) {
  return (
    <div className="rounded-lg bg-[#0b141a] p-3 ring-1 ring-emerald-900/40">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
          CG
        </div>
        <div className="min-w-0 flex-1 text-[11px]">
          <div className="truncate font-medium text-emerald-100">ClearGrid</div>
          <div className="truncate text-[10px] text-emerald-100/60">{name}</div>
        </div>
      </div>
      <div className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-[#005c4b] px-3 py-2 text-[11px] leading-relaxed text-emerald-50">
        {body || (
          <span className="text-emerald-100/50">
            Your WhatsApp preview will appear here...
          </span>
        )}
      </div>
      <div className="mt-1 text-right text-[9px] text-emerald-100/50">
        12:34 ✓✓
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Review all variations dialog                                           */
/* ────────────────────────────────────────────────────────────────────── */

function ReviewAllVariationsDialog({
  open,
  onClose,
  state,
  previewBorrower,
}: {
  open: boolean
  onClose: () => void
  state: ComposerState
  previewBorrower: Borrower
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-4 w-4 text-primary" />
            Review all {state.variations.length} variations
          </DialogTitle>
          <DialogDescription>
            One sample per variation, rendered for{" "}
            <span className="font-medium text-foreground">{previewBorrower.name}</span>. Sender
            identity and traffic split shown per variation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] grid-cols-2 gap-4 overflow-y-auto pr-1">
          {state.variations.map((v) => {
            // Resolve sender for this variation (variation override → campaign default)
            const profileId = v.senderProfileId ?? state.senderProfileId
            const profile = profileId ? getSenderProfileById(profileId) : null
            const fromName = v.senderFromName || state.customFromName || profile?.fromName || "—"
            const fromEmail =
              v.senderFromEmail || state.customFromEmail || profile?.fromEmail || "—"
            const subject = renderVars(v.subject, previewBorrower) || "(no subject)"
            const body = renderVars(v.body, previewBorrower) || "(no body)"
            const richTpl = v.richTemplateId
              ? richEmailTemplates.find((t) => t.id === v.richTemplateId)
              : null
            return (
              <div
                key={v.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card/40"
              >
                <div className="flex items-center gap-2 border-b border-border bg-primary/[0.06] px-3 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                    {v.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-foreground">
                      Variation {v.label}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {richTpl ? `Template: ${richTpl.name}` : v.emailMode ? `Mode: ${v.emailMode}` : "Freeform"}
                      {" · "}
                      {v.splitPct}% of audience
                    </p>
                  </div>
                </div>
                <div className="space-y-2 px-3 py-2.5 text-[11px]">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">From</p>
                    <p className="mt-0.5 truncate text-foreground">
                      {fromName} &lt;{fromEmail}&gt;
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Subject</p>
                    <p className="mt-0.5 truncate text-foreground">{subject}</p>
                  </div>
                  {v.preheader && (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Preheader</p>
                      <p className="mt-0.5 truncate text-muted-foreground">
                        {renderVars(v.preheader, previewBorrower)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Body</p>
                    <div className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-canvas/40 p-2 text-[11px] leading-relaxed text-foreground">
                      {body}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Send scheduling helpers                                                */
/* ────────────────────────────────────────────────────────────────────── */

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function formatScheduleSummary(schedule: SendSchedule): string {
  if (schedule.mode === "now") return "Send now"
  if (schedule.mode === "once") {
    return schedule.date ? `Scheduled · ${schedule.date} ${schedule.time}` : "Scheduled · no date"
  }
  // Recurring
  const r = schedule.recurrence
  if (r.freq === "daily") return `Daily · ${schedule.time}`
  // custom — either specific weekdays or an every-N-days interval
  if (r.daysOfWeek.length > 0) {
    const days = r.daysOfWeek.map((d) => DAY_LABELS[d]).join("")
    return `Custom (${days}) · ${schedule.time}`
  }
  return `Every ${r.everyN} days · ${schedule.time}`
}

function SendModePicker({
  schedule,
  onChange,
}: {
  schedule: SendSchedule
  onChange: (patch: Partial<SendSchedule>) => void
}) {
  const r = schedule.recurrence
  const setR = (patch: Partial<typeof r>) => onChange({ recurrence: { ...r, ...patch } })
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          When
        </Label>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {(["now", "once", "recurring"] as SendMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ mode: m })}
              className={cn(
                "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                schedule.mode === m
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-muted/10 text-foreground hover:border-zinc-700",
              )}
            >
              {m === "now" ? "Send now" : m === "once" ? "Schedule once" : "Recurring"}
            </button>
          ))}
        </div>
      </div>

      {schedule.mode === "once" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input
              type="date"
              value={schedule.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={schedule.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
      )}

      {schedule.mode === "recurring" && (
        <div className="space-y-3 rounded-md border border-border/60 bg-canvas/40 p-3">
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Repeats
            </Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {(["daily", "custom"] as RecurrenceFreq[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setR({ freq: f })}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-[10px] font-medium capitalize transition-colors",
                    r.freq === f
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-muted/10 text-foreground hover:border-zinc-700",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {r.freq === "daily"
                ? "Sends every day at the scheduled time."
                : "Pick specific weekdays or an every-N-days interval."}
            </p>
          </div>

          {r.freq === "custom" && (
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                On these days
              </Label>
              <div className="mt-1.5 flex gap-1">
                {DAY_LABELS.map((label, i) => {
                  const active = r.daysOfWeek.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setR({
                          daysOfWeek: active
                            ? r.daysOfWeek.filter((d) => d !== i)
                            : [...r.daysOfWeek, i].sort(),
                        })
                      }
                      title={DAY_FULL[i]}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                        active
                          ? "border-primary/60 bg-primary text-primary-foreground"
                          : "border-border bg-muted/10 text-muted-foreground hover:border-zinc-700",
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {r.freq === "custom" && (
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Interval (days)
              </Label>
              <Input
                type="number"
                min={1}
                value={r.everyN}
                onChange={(e) => setR({ everyN: Math.max(1, Number(e.target.value) || 1) })}
                className="mt-1 h-8 w-20 text-center text-xs tabular-nums"
              />
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Start date
              </Label>
              <Input
                type="date"
                value={schedule.date}
                onChange={(e) => onChange({ date: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Send time
              </Label>
              <Input
                type="time"
                value={schedule.time}
                onChange={(e) => onChange({ time: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ends
            </Label>
            <div className="mt-1.5 space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                <input
                  type="radio"
                  checked={r.end.kind === "never"}
                  onChange={() => setR({ end: { kind: "never" } })}
                  className="h-3 w-3 accent-primary"
                />
                <span className="text-foreground">Never</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                <input
                  type="radio"
                  checked={r.end.kind === "count"}
                  onChange={() => setR({ end: { kind: "count", count: 10 } })}
                  className="h-3 w-3 accent-primary"
                />
                <span className="text-foreground">After</span>
                <Input
                  type="number"
                  min={1}
                  value={r.end.kind === "count" ? r.end.count : 10}
                  onChange={(e) => setR({ end: { kind: "count", count: Math.max(1, Number(e.target.value) || 1) } })}
                  disabled={r.end.kind !== "count"}
                  className="h-6 w-14 text-center text-[11px] tabular-nums"
                />
                <span className="text-muted-foreground">occurrences</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[11px]">
                <input
                  type="radio"
                  checked={r.end.kind === "date"}
                  onChange={() => setR({ end: { kind: "date", date: "" } })}
                  className="h-3 w-3 accent-primary"
                />
                <span className="text-foreground">On</span>
                <Input
                  type="date"
                  value={r.end.kind === "date" ? r.end.date : ""}
                  onChange={(e) => setR({ end: { kind: "date", date: e.target.value } })}
                  disabled={r.end.kind !== "date"}
                  className="h-6 w-32 text-[11px]"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

