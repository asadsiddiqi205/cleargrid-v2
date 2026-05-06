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
  Save,
  Split,
  GitBranch,
  Calendar,
  Clock,
  Phone,
  PhoneCall,
  Volume2,
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
import type { ComposerState } from "@/components/composer/composer-view"

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
  const [schedule, setSchedule] = React.useState(false)
  const [scheduleDate, setScheduleDate] = React.useState("")
  const [scheduleTime, setScheduleTime] = React.useState("09:00")
  const [abTest, setAbTest] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

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
    if (state.channel === "voice")
      return renderVars(state.voiceScript, previewBorrower)
    const tpl = whatsappTemplates.find((t) => t.id === state.whatsappTemplateId)
    return renderVars(tpl?.body ?? "", previewBorrower)
  }, [
    state.channel,
    state.body,
    state.smsBody,
    state.voiceScript,
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
        : state.channel === "voice"
          ? Phone
          : MessageCircle

  const channelLabel =
    state.channel === "email"
      ? "Email"
      : state.channel === "sms"
        ? "SMS"
        : state.channel === "voice"
          ? "AI Call (ClearVoice)"
          : "WhatsApp"

  const voiceLangLabel = state.voiceLang === "ar" ? "Arabic" : "English"
  const voiceVoiceLabel =
    state.voiceVoice === "female" ? "Female (Warm)" : "Male (Firm)"

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
        {state.channel === "voice" && (
          <VoiceCallPreviewCard
            script={renderedBody}
            borrowerName={previewBorrower.name}
            phone={previewBorrower.phone}
            voiceLabel={voiceVoiceLabel}
            languageLabel={voiceLangLabel}
            maxAttempts={state.voiceMaxAttempts}
          />
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
            {state.channel === "voice" ? "Will be called" : "Will be sent to"}
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

        {/* Schedule toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">Schedule for later</span>
            </div>
            <Switch
              checked={schedule}
              onCheckedChange={(val) => setSchedule(val)}
            />
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
            Pick a date and time instead of sending right away.
          </p>
        </div>
        {schedule && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Date
              </Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Time
              </Label>
              <Input
                type="time"
                className="h-8 text-xs"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-3">
            <div className="flex items-center gap-2">
              <Split className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">Try two versions (A/B test)</span>
            </div>
            <Switch checked={abTest} onCheckedChange={(val) => setAbTest(val)} />
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
            Splits the audience in half and sends two versions to find the better one.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setConfirmOpen(true)}
          >
            {state.channel === "voice" ? (
              <PhoneCall className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {state.channel === "voice"
              ? state.mode === "segment"
                ? `Start AI Calls to ${sendLabel}`
                : `Start AI Call to ${sendLabel}`
              : schedule
                ? `Schedule for ${sendLabel}`
                : `Send to ${sendLabel}`}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() =>
              toast.success("Draft saved", {
                description: "You can come back and finish this anytime.",
              })
            }
          >
            <Save className="h-4 w-4" />
            Save as draft
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() =>
              toast.info("Opening journey builder...", {
                description:
                  "Your message will become the first step of a new journey.",
              })
            }
          >
            <GitBranch className="h-4 w-4" />
            Turn into multi-step flow
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Add follow-ups, branches, and waits to build an automated journey.
          </p>
        </div>
      </section>

      {/* ---- Confirm dialog ---- */}
      <Dialog open={confirmOpen} onOpenChange={(o: boolean) => setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {state.channel === "voice" ? (
                <PhoneCall className="h-4 w-4 text-primary" />
              ) : (
                <Send className="h-4 w-4 text-primary" />
              )}
              {state.channel === "voice" ? "Trigger AI calls?" : "Ready to send?"}
            </DialogTitle>
            <DialogDescription>
              {state.channel === "voice" ? (
                state.mode === "segment" ? (
                  <>
                    Trigger AI calls to{" "}
                    <span className="font-medium text-foreground">
                      {sendCount.toLocaleString()} borrowers
                    </span>{" "}
                    via ClearVoice? Calls will be made between 09:00–19:00 GST.
                    Voice: {voiceVoiceLabel} · Language: {voiceLangLabel} · Max attempts:{" "}
                    {state.voiceMaxAttempts}.
                  </>
                ) : (
                  <>
                    Trigger an AI call to{" "}
                    <span className="font-medium text-foreground">
                      {selectedBorrower.name}
                    </span>{" "}
                    via ClearVoice? The call will be made within contact hours
                    (09:00–19:00 GST).
                  </>
                )
              ) : state.mode === "segment" ? (
                <>
                  We&apos;ll send this {state.channel === "email" ? "email" : state.channel === "sms" ? "SMS" : "WhatsApp message"} to{" "}
                  <span className="font-medium text-foreground">
                    {sendCount.toLocaleString()} borrowers
                  </span>
                  . Borrowers on the Do Not Contact list and at frequency limits will be skipped automatically.
                </>
              ) : (
                <>
                  We&apos;ll send this {state.channel === "email" ? "email" : state.channel === "sms" ? "SMS" : "WhatsApp message"} to{" "}
                  <span className="font-medium text-foreground">
                    {selectedBorrower.name}
                  </span>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                onSend()
              }}
            >
              {state.channel === "voice" ? "Yes, start calls" : "Yes, send now"}
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

function VoiceCallPreviewCard({
  script,
  borrowerName,
  phone,
  voiceLabel,
  languageLabel,
  maxAttempts,
}: {
  script: string
  borrowerName: string
  phone: string
  voiceLabel: string
  languageLabel: string
  maxAttempts: number
}) {
  // Build a simple "transcript" by splitting the script into sentences and
  // assigning rough timestamps based on character count.
  const sentences = React.useMemo(() => {
    const trimmed = script.trim()
    if (!trimmed) return [] as { ts: string; text: string }[]
    const parts = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    let cursor = 0
    return parts.map((text) => {
      const seconds = cursor
      cursor += Math.max(2, Math.ceil(text.length / 14))
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
      const ss = String(seconds % 60).padStart(2, "0")
      return { ts: `${mm}:${ss}`, text }
    })
  }, [script])

  const totalSeconds =
    sentences.length > 0
      ? Math.max(5, Math.ceil(script.length / 14))
      : 0
  const durationLabel =
    totalSeconds >= 60
      ? `~${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
      : `~${totalSeconds}s`

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border/60 bg-primary/5 px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Phone className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold text-foreground">
            AI Call Preview
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            ClearVoice · ClearGrid
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Live
        </div>
      </div>

      <div className="space-y-1 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-foreground">
          <PhoneCall className="h-3 w-3 text-primary" />
          Calling: <span className="font-medium">{borrowerName}</span>
        </div>
        <div className="text-[10px] text-muted-foreground">{phone}</div>
      </div>

      <div className="max-h-64 overflow-y-auto px-3 py-3">
        {sentences.length === 0 ? (
          <div className="text-[11px] text-muted-foreground">
            Your AI call script will appear here as a transcript...
          </div>
        ) : (
          <div className="space-y-1.5">
            {sentences.map((line, i) => (
              <div key={i} className="flex gap-2 text-[11px] leading-relaxed">
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  [{line.ts}]
                </span>
                <span className="text-muted-foreground">AI:</span>
                <TranscriptLine text={line.text} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5 border-t border-border/60 bg-muted/10 px-3 py-2">
        <div className="text-[10px] text-muted-foreground">
          Voice: <span className="text-foreground">{voiceLabel}</span> · Language:{" "}
          <span className="text-foreground">{languageLabel}</span> · Max attempts:{" "}
          <span className="text-foreground">{maxAttempts}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Estimated call duration: {durationLabel}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => toast.info("Voice preview not available in prototype")}
        >
          <Volume2 className="h-3 w-3" />
          Listen to preview
        </Button>
      </div>
    </div>
  )
}

function TranscriptLine({ text }: { text: string }) {
  // Highlight {{tokens}} inline
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <span className="text-foreground">
      {parts.map((part, i) => {
        if (/^\{\{[^}]+\}\}$/.test(part)) {
          return (
            <span
              key={i}
              className="mx-0.5 inline-block rounded bg-primary/15 px-1 py-0.5 font-mono text-[9px] font-medium text-primary ring-1 ring-primary/30"
            >
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
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
