"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { borrowers, type Borrower } from "@/data/borrowers"
import { segments, type Segment } from "@/data/segments"
import { strategies } from "@/data/strategies"
import { templates as allTemplates } from "@/data/templates"
import { whatsappTemplates } from "@/data/composer-ai-variants"

import { AudiencePanel } from "@/components/composer/audience-panel"
import { EditorPanel } from "@/components/composer/editor-panel"
import { PreviewPanel } from "@/components/composer/preview-panel"

export type ComposerMode = "single" | "segment"
export type Channel = "email" | "sms" | "whatsapp"
export type CompliancePosture = "standard" | "strict" | "lenient"

/** Three-mode email editor (Khalil's model). */
export type EmailMode = "template" | "inline" | "ai_generated"

/** Block-based email builder block kinds. */
export type EmailBlockType =
  | "heading"
  | "text"
  | "cta"
  | "divider"
  | "image"
  | "spacer"
  | "bullet_list"
  | "payment_summary"
  | "contact_block"
  | "footer"

export interface EmailBlock {
  id: string
  type: EmailBlockType
  content: string
  settings: Record<string, string>
}

/** Audience builder for segment-mode sends. `selectedSegmentId` (single-segment
 *  path) is preserved for URL hydration + backward-compat; the new fields
 *  below extend the segment mode into a multi-segment include/exclude builder. */
export interface AudienceRule {
  /** Segment ids the recipient must match (per the combiner). */
  includeSegmentIds: string[]
  /** "any" = OR (default), "all" = AND. */
  includeCombiner: "any" | "all"
  /** Segment ids to exclude the recipient from (always OR — any match excludes). */
  excludeSegmentIds: string[]
  /** Dedupe users who appear in multiple included segments. Default on. */
  removeDuplicates: boolean
}

/** Metric used to pick a winner between A/B/n variations. Defaults to
 *  payment-conversion so the split follows the payment funnel goal — same
 *  metric the message analytics funnel uses. */
export type WinnerMetric = "payment_conversion" | "click"

/**
 * Send scheduling. Three modes:
 *   - "now"        → immediate send
 *   - "once"       → single scheduled send at (date, time, tz)
 *   - "recurring"  → Google-Calendar-style repeat pattern
 */
export type SendMode = "now" | "once" | "recurring"

export type RecurrenceFreq = "daily" | "custom"
export type RecurrenceEnd = { kind: "never" } | { kind: "count"; count: number } | { kind: "date"; date: string }

export interface SendSchedule {
  mode: SendMode
  /** Applies to "once" and "recurring". */
  date: string
  time: string
  timezone: string
  /** Only used when mode === "recurring". */
  recurrence: {
    freq: RecurrenceFreq
    /** Days of the week (0=Sun … 6=Sat) — used for "custom". */
    daysOfWeek: number[]
    /** For "custom": send every N days (used when no specific weekdays picked). */
    everyN: number
    /** End condition. */
    end: RecurrenceEnd
  }
}

export interface CampaignVariation {
  /** Stable id for React keys + per-variation analytics tie-in. */
  id: string
  /** Label — usually "A", "B", "C", but editable. */
  label: string
  /** % of the tested audience that gets this variation. All variation splits
   *  sum to 100 (excluding the holdout, which is applied first). */
  splitPct: number
  subject: string
  preheader: string
  body: string
  /** Per-variation email authoring mode — template / inline / ai_generated. */
  emailMode?: EmailMode
  /** Rich template selection (id + slot fills) for this variation. */
  richTemplateId?: string | null
  richSlotValues?: Record<string, unknown>
  /** Block-based builder state for this variation. */
  useBlocks?: boolean
  emailBlocks?: EmailBlock[]
  /** Per-variation sender override. If null/undefined the composer-level
   *  senderProfileId is used. Governed sender profiles first; free-form
   *  "custom" identity below is the escape hatch. */
  senderProfileId?: string | null
  /** Free-form sender identity for this variation. When any of these are set,
   *  they override the resolved governed profile's fields. */
  senderFromName?: string
  senderFromEmail?: string
  senderReplyTo?: string
}

export interface ComposerState {
  mode: ComposerMode
  selectedBorrowerId: string
  selectedSegmentId: string
  /** Multi-segment audience builder (segment mode only). */
  audience: AudienceRule
  strategyId: string
  compliance: CompliancePosture

  channel: Channel

  /** Campaign name — required for send. Not a fallback for anything else. */
  campaignName: string

  /** Governed sender identity — required for send. Admin-managed at
   *  `/lender-config/sender-profiles`. */
  senderProfileId: string | null

  /** Composer-level free-form override on the governed profile's From
   *  identity. Empty string = fall back to profile's fields. */
  customFromName: string
  customFromEmail: string
  customReplyTo: string

  /** A/B/n variations. Always ≥1 (the visible subject/body are variation 0's).
   *  When length > 1, the composer body switches to the tabbed variation
   *  editor. */
  variations: CampaignVariation[]
  /** Which variation is currently being edited in the composer. */
  activeVariationId: string
  /** % of the audience that receives *nothing* — measures lift.
   *  Applied before variation splits. 0 = no holdout. */
  holdoutPct: number
  /** Metric used to declare a winner. Defaults to payment_conversion. */
  winnerMetric: WinnerMetric
  /** When true, after the test window elapses the remaining audience is
   *  sent the winning variation automatically. */
  autoWinner: boolean
  /** Length of the test window (hours). Configurable — deliberately not
   *  hard-coded (needs the same back-testing as the payment-attribution
   *  model). */
  testWindowHours: number

  // Email
  emailMode: EmailMode
  useBlocks: boolean
  emailBlocks: EmailBlock[]
  subject: string
  previewText: string
  body: string

  // Rich template (v1 canvas)
  richTemplateId: string | null
  richSlotValues: Record<string, unknown>

  // SMS
  smsBody: string

  // WhatsApp
  whatsappTemplateId: string

  previewBorrowerId: string

  /** When + how to send. Defaults to "now" for a single one-off; authors
   *  switch to "once" for a scheduled send or "recurring" for repeated
   *  campaigns (Mon/Wed/Fri reminders, daily digests, etc.). */
  schedule: SendSchedule
}

const DEFAULT_VARIATION_ID = "var-a"

const DEFAULT_STATE: ComposerState = {
  mode: "single",
  selectedBorrowerId: borrowers[0].id,
  selectedSegmentId: segments[0].id,
  audience: {
    includeSegmentIds: [segments[0].id],
    includeCombiner: "any",
    excludeSegmentIds: [],
    removeDuplicates: true,
  },
  strategyId: "",
  compliance: "standard",
  channel: "email",
  campaignName: "",
  senderProfileId: null,
  customFromName: "",
  customFromEmail: "",
  customReplyTo: "",
  variations: [
    { id: DEFAULT_VARIATION_ID, label: "A", splitPct: 100, subject: "", preheader: "", body: "" },
  ],
  activeVariationId: DEFAULT_VARIATION_ID,
  holdoutPct: 0,
  winnerMetric: "payment_conversion",
  autoWinner: false,
  testWindowHours: 24,
  // Default to template mode for rich email
  emailMode: "template",
  useBlocks: false,
  emailBlocks: [],
  subject: "",
  previewText: "",
  body: "",
  richTemplateId: null,
  richSlotValues: {},
  smsBody: "",
  whatsappTemplateId: whatsappTemplates[0].id,
  previewBorrowerId: borrowers[0].id,
  schedule: {
    mode: "now",
    date: "",
    time: "09:00",
    timezone: "Asia/Dubai",
    recurrence: {
      freq: "daily",
      daysOfWeek: [1], // Mondays — used only when freq === "custom"
      everyN: 1,
      end: { kind: "never" },
    },
  },
}

export function ComposerView() {
  const [state, setState] = React.useState<ComposerState>(DEFAULT_STATE)
  const searchParams = useSearchParams()

  const selectedBorrower: Borrower =
    borrowers.find((b) => b.id === state.selectedBorrowerId) ?? borrowers[0]
  const selectedSegment: Segment =
    segments.find((s) => s.id === state.selectedSegmentId) ?? segments[0]
  const update = React.useCallback(
    <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const clearEditor = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      subject: "",
      previewText: "",
      body: "",
      smsBody: "",
    }))
  }, [])

  /* ---------- Hydrate state from URL search params on mount ---------- */
  const hydratedRef = React.useRef(false)
  React.useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    const templateId = searchParams.get("template")
    const strategyId = searchParams.get("strategy")
    const channelParam = searchParams.get("channel")
    const segmentId = searchParams.get("segment")
    const borrowerId = searchParams.get("borrower")
    const mode = searchParams.get("mode")
    const context = searchParams.get("context")

    setState((prev) => {
      const next: ComposerState = { ...prev }

      // Mode
      if (mode === "single") next.mode = "single"
      if (mode === "segment") next.mode = "segment"

      // Borrower
      if (borrowerId && borrowers.some((b) => b.id === borrowerId)) {
        next.selectedBorrowerId = borrowerId
        next.previewBorrowerId = borrowerId
        // If a borrower was passed without an explicit mode, assume single
        if (!mode) next.mode = "single"
      }

      // Segment
      if (segmentId && segments.some((s) => s.id === segmentId)) {
        next.selectedSegmentId = segmentId
        next.audience = {
          ...next.audience,
          includeSegmentIds: [segmentId],
        }
        if (!mode) next.mode = "segment"
      }

      // Strategy
      if (strategyId && strategies.some((s) => s.id === strategyId)) {
        next.strategyId = strategyId
      }

      // Channel (explicit param takes priority over template channel)
      let channelFromParam: Channel | null = null
      if (
        channelParam === "email" ||
        channelParam === "sms" ||
        channelParam === "whatsapp"
      ) {
        channelFromParam = channelParam
        next.channel = channelParam
      }

      // Template — load into editor and (if channel not explicit) derive channel
      if (templateId) {
        const tmpl = allTemplates.find((t) => t.id === templateId)
        if (tmpl) {
          const templateChannel: Channel =
            tmpl.channel === "email"
              ? "email"
              : tmpl.channel === "sms"
                ? "sms"
                : "whatsapp"
          if (!channelFromParam) next.channel = templateChannel

          if (templateChannel === "email") {
            next.subject = tmpl.subject ?? tmpl.name
            next.body = tmpl.body
            // Use the first ~120 chars of the body as preview text
            next.previewText = tmpl.body.replace(/\s+/g, " ").trim().slice(0, 120)
          } else if (templateChannel === "sms") {
            next.smsBody = tmpl.body
          } else if (templateChannel === "whatsapp") {
            // Try to match existing whatsapp template option, otherwise drop body in
            const match = whatsappTemplates.find(
              (w) => w.id === tmpl.id || w.id === templateId
            )
            if (match) next.whatsappTemplateId = match.id
          }
        }
      }

      return next
    })

    if (context === "journey") {
      toast.info("Composing for a Journey action. Use Add Logic when you're done to return.")
    }
  }, [searchParams])

  const handleSend = React.useCallback(() => {
    const count =
      state.mode === "segment" ? selectedSegment.borrowers - 56 : 1

    const channelLabel =
      state.channel === "email"
        ? "Email"
        : state.channel === "sms"
          ? "SMS"
          : "WhatsApp"
    const recipientLabel =
      state.mode === "segment"
        ? `${count.toLocaleString()} people`
        : selectedBorrower.name
    toast.success(`Sending ${channelLabel} to ${recipientLabel}...`)
    window.setTimeout(() => {
      toast.success(
        state.mode === "segment"
          ? `Done — ${count.toLocaleString()} ${channelLabel} messages queued`
          : `Done — ${channelLabel} queued for ${selectedBorrower.name}`,
        {
          description:
            state.mode === "segment"
              ? "We'll start delivery within the next few minutes."
              : "It will be delivered shortly.",
        }
      )
      clearEditor()
    }, 1000)
  }, [
    state.mode,
    state.channel,
    selectedSegment.borrowers,
    selectedBorrower.name,
    clearEditor,
  ])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden bg-background">
      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <aside className="w-[300px] shrink-0 border-r border-border overflow-y-auto">
        <AudiencePanel
          state={state}
          update={update}
          selectedBorrower={selectedBorrower}
          selectedSegment={selectedSegment}
        />
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <EditorPanel state={state} update={update} />
      </main>

      <aside className="w-[360px] shrink-0 border-l border-border overflow-y-auto">
        <PreviewPanel
          state={state}
          update={update}
          selectedBorrower={selectedBorrower}
          selectedSegment={selectedSegment}
          onSend={handleSend}
        />
      </aside>
      </div>
    </div>
  )
}
