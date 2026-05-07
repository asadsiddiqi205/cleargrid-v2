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

export interface ComposerState {
  mode: ComposerMode
  selectedBorrowerId: string
  selectedSegmentId: string
  strategyId: string
  compliance: CompliancePosture

  channel: Channel

  // Email
  emailMode: EmailMode
  useBlocks: boolean
  emailBlocks: EmailBlock[]
  subject: string
  previewText: string
  body: string

  // SMS
  smsBody: string

  // WhatsApp
  whatsappTemplateId: string

  previewBorrowerId: string
}

const DEFAULT_STATE: ComposerState = {
  mode: "single",
  selectedBorrowerId: borrowers[0].id,
  selectedSegmentId: segments[0].id,
  strategyId: "",
  compliance: "standard",
  channel: "email",
  emailMode: "inline",
  useBlocks: false,
  emailBlocks: [],
  subject: "",
  previewText: "",
  body: "",
  smsBody: "",
  whatsappTemplateId: whatsappTemplates[0].id,
  previewBorrowerId: borrowers[0].id,
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
