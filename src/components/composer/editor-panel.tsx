"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Mail,
  MessageSquare,
  MessageCircle,
  MoreHorizontal,
  BadgeCheck,
  Plus,
  Wand2,
  Layout,
  Edit3,
  Blocks,
  X,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"
import {
  availableTokens,
  whatsappTemplates,
  improveVariants,
  fixGrammarVariants,
  makeShorterVariants,
  makeLongerVariants,
  polishVariants,
  changeToneVariants,
  translateVariants,
  smsVariants,
  mergeVariables,
  mergeVarLevelLabels,
  aiAssistVariants,
  type MergeVarLevel,
} from "@/data/composer-ai-variants"

import type {
  ComposerState,
  Channel,
  EmailMode,
} from "@/components/composer/composer-view"
import {
  AICommandMenu,
  type AIAction,
} from "@/components/composer/ai-command-menu"
import { SelectionToolbar } from "@/components/composer/selection-toolbar"
import { EmailTemplateMode } from "@/components/composer/email-template-mode"
import { TemplateCanvas } from "@/components/composer/template-canvas"
import { SlotInspector } from "@/components/composer/slot-inspector"
import { RichTemplatePicker } from "@/components/composer/rich-template-picker"
import {
  getRichTemplate,
  type SlotValues,
  type SlotValue,
} from "@/data/rich-email-templates"
import { EmailAiGenerateMode } from "@/components/composer/email-ai-generate-mode"
import { AiAssistPanel, AI_ASSIST_ACTIONS } from "@/components/composer/ai-assist-panel"
import { SenderProfilePicker } from "@/components/composer/sender-profile-picker"
import { VariationsPanel } from "@/components/composer/variations-panel"
import { richEmailTemplates } from "@/data/rich-email-templates"
import { playbooks, type Playbook } from "@/data/playbooks"

interface EditorPanelProps {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
}

type EditField = "body" | "smsBody"

function activeField(channel: Channel): EditField {
  if (channel === "sms") return "smsBody"
  return "body"
}

function pickRandom<T>(arr: T[], prev?: T): T {
  if (arr.length === 1) return arr[0]
  let choice = arr[Math.floor(Math.random() * arr.length)]
  if (prev && choice === prev) {
    choice = arr[(arr.indexOf(choice) + 1) % arr.length]
  }
  return choice
}

export function EditorPanel({ state, update }: EditorPanelProps) {
  const [aiMenuOpen, setAiMenuOpen] = React.useState(false)
  const [animating, setAnimating] = React.useState(false)
  const [lastBody, setLastBody] = React.useState<string | null>(null)
  const [aiAssistOpen, setAiAssistOpen] = React.useState(false)
  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null)
  const [activePlaybook, setActivePlaybook] = React.useState<Playbook | null>(null)
  const [playbookDropdownOpen, setPlaybookDropdownOpen] = React.useState(false)

  // Update draft timestamp 2s after any content change
  const contentSignature = `${state.body}|${state.smsBody}|${state.subject}`
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date()
      const hh = now.getHours().toString().padStart(2, "0")
      const mm = now.getMinutes().toString().padStart(2, "0")
      setDraftSavedAt(`Saved at ${hh}:${mm}`)
    }, 2000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSignature])

  // Default execution level for the variable picker. The Composer doesn't
  // yet expose execution levels in its UI, so we default to "sub_account"
  // (cumulative) which shows ALL three groups in the picker.
  const executionLevel: MergeVarLevel = "sub_account"

  // Selection toolbar state
  const [selection, setSelection] = React.useState<{
    visible: boolean
    x: number
    y: number
    start: number
    end: number
    field: EditField
  }>({ visible: false, x: 0, y: 0, start: 0, end: 0, field: "body" })

  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null)
  const smsRef = React.useRef<HTMLTextAreaElement | null>(null)
  const aiButtonRef = React.useRef<HTMLDivElement | null>(null)

  // -------- Playbook --------
  const applyPlaybookToChannel = React.useCallback(
    (pb: Playbook, channel: Channel) => {
      if (channel === "email") {
        update("subject", pb.templates.email.subject ?? "")
        update("body", pb.templates.email.body)
        update("previewText", pb.templates.email.body.replace(/\s+/g, " ").trim().slice(0, 120))
      } else if (channel === "sms") {
        update("smsBody", pb.templates.sms.body)
      } else if (channel === "whatsapp") {
        update("smsBody", pb.templates.whatsapp.body)
      }
    },
    [update]
  )

  const handleSelectPlaybook = React.useCallback(
    (pb: Playbook) => {
      setActivePlaybook(pb)
      setPlaybookDropdownOpen(false)
      applyPlaybookToChannel(pb, state.channel)
      update("compliance", pb.compliancePosture)
      update("emailMode", "inline")
      toast.success(`Playbook applied: ${pb.name}`)
    },
    [state.channel, applyPlaybookToChannel, update]
  )

  const clearPlaybook = React.useCallback(() => {
    setActivePlaybook(null)
    update("subject", "")
    update("previewText", "")
    update("body", "")
    update("smsBody", "")
    update("compliance", "standard")
    toast.info("Playbook cleared")
  }, [update])

  // -------- Channel switching --------
  const handleChannelChange = (v: string | null) => {
    if (v === "email" || v === "sms" || v === "whatsapp") {
      update("channel", v as Channel)
      if (activePlaybook) applyPlaybookToChannel(activePlaybook, v as Channel)
    }
  }

  const getFieldValue = (field: EditField): string => {
    if (field === "smsBody") return state.smsBody
    return state.body
  }

  const getFieldRef = (field: EditField): HTMLTextAreaElement | null => {
    if (field === "smsBody") return smsRef.current
    return bodyRef.current
  }

  // -------- Variable insertion --------
  const insertToken = (token: string) => {
    // Variable insertion is not supported on the WhatsApp tab (template-only).
    if (state.channel === "whatsapp") return
    const field = activeField(state.channel)
    const ref = getFieldRef(field)
    const current = getFieldValue(field)
    if (ref) {
      const start = ref.selectionStart ?? current.length
      const end = ref.selectionEnd ?? current.length
      const next = current.slice(0, start) + token + current.slice(end)
      update(field, next)
      window.setTimeout(() => {
        ref.focus()
        const pos = start + token.length
        ref.setSelectionRange(pos, pos)
      }, 0)
    } else {
      update(field, current + token)
    }
  }

  // -------- AI action application (animated) --------
  const applyAIContent = React.useCallback(
    async (newText: string, label: string) => {
      const field = activeField(state.channel)
      const prev = getFieldValue(field)
      setLastBody(prev)
      setAnimating(true)
      // Simulated "thinking"
      await new Promise((r) => setTimeout(r, 650))
      // Fade out pause
      await new Promise((r) => setTimeout(r, 300))
      update(field, newText)
      // Fade in
      await new Promise((r) => setTimeout(r, 300))
      setAnimating(false)

      toast.success(`✨ ${label}`, {
        description: "AI has updated your draft",
        action: {
          label: "Undo",
          onClick: () => update(field, prev),
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.channel, state.body, state.smsBody, update]
  )

  // -------- AI Assist quick action (12 vertical actions) --------
  const applyAiAssist = React.useCallback(
    (actionId: string) => {
      const variants = aiAssistVariants[actionId]
      if (!variants || variants.length === 0) {
        toast.info(`AI: ${actionId} not available`)
        return
      }
      const current = state.body
      let pick = variants[Math.floor(Math.random() * variants.length)]
      if (variants.length > 1 && pick === current) {
        pick = variants[(variants.indexOf(pick) + 1) % variants.length]
      }
      const meta = AI_ASSIST_ACTIONS.find((a) => a.id === actionId)
      applyAIContent(pick, meta?.label ?? "AI applied")
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.body]
  )

  // -------- Load email template (used by Template mode) --------
  const handleSelectEmailTemplate = React.useCallback(
    (template: { name: string; subject?: string; body: string }) => {
      update("subject", template.subject ?? template.name)
      update("body", template.body)
      update(
        "previewText",
        template.body.replace(/\s+/g, " ").trim().slice(0, 120)
      )
      update("emailMode", "inline")
      toast.success(`Loaded template: ${template.name}`)
    },
    [update]
  )

  // -------- AI generated email handler --------
  const handleUseGeneratedEmail = React.useCallback(
    (payload: { subject: string; preheader: string; body: string }) => {
      update("subject", payload.subject)
      update("previewText", payload.preheader)
      update("body", payload.body)
      update("emailMode", "inline")
      toast.success("AI-generated email loaded")
    },
    [update]
  )

  const runAIAction = React.useCallback(
    (action: AIAction) => {
      const field = activeField(state.channel)
      const current = getFieldValue(field)
      const hasContent = current.trim().length > 0

      switch (action.kind) {
        case "improve": {
          const variant = pickRandom(improveVariants, current)
          applyAIContent(hasContent ? variant : improveVariants[0], "Improved by AI")
          break
        }
        case "fixGrammar": {
          const variant = pickRandom(fixGrammarVariants, current)
          applyAIContent(variant, "Grammar fixed")
          break
        }
        case "makeShorter": {
          const variant = pickRandom(
            state.channel === "sms" ? smsVariants : makeShorterVariants,
            current
          )
          applyAIContent(variant, "Made shorter")
          break
        }
        case "makeLonger": {
          const variant = pickRandom(makeLongerVariants, current)
          applyAIContent(variant, "Expanded")
          break
        }
        case "polish": {
          const variant = pickRandom(polishVariants, current)
          applyAIContent(variant, "Polished")
          break
        }
        case "simplify": {
          const variant = pickRandom(makeShorterVariants, current)
          applyAIContent(variant, "Simplified")
          break
        }
        case "changeTone": {
          const variant = pickRandom(changeToneVariants[action.tone], current)
          applyAIContent(
            variant,
            `Tone → ${action.tone.charAt(0).toUpperCase() + action.tone.slice(1)}`
          )
          break
        }
        case "translate": {
          const variant = pickRandom(translateVariants[action.lang], current)
          applyAIContent(
            variant,
            `Translated to ${action.lang === "arabic" ? "Arabic" : "English"}`
          )
          break
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyAIContent, state.body, state.smsBody, state.channel, update]
  )

  // -------- Keyboard shortcut Cmd+J --------
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault()
        setAiMenuOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // -------- Selection-based floating toolbar --------
  const handleSelect = (field: EditField) => (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (end - start > 4) {
      const rect = ta.getBoundingClientRect()
      // Rough cursor position — anchor above the textarea, centered horizontally
      const x = rect.left + rect.width / 2
      const y = rect.top + 6
      setSelection({ visible: true, x, y, start, end, field })
    } else {
      setSelection((s) => ({ ...s, visible: false }))
    }
  }

  const selectionLost = () => setSelection((s) => ({ ...s, visible: false }))

  const runSelectionAction = (action: AIAction) => {
    // For the prototype, selection-based actions just run the same action against
    // the selected text — the variant replaces the whole field.
    runAIAction(action)
    setSelection((s) => ({ ...s, visible: false }))
  }

  // -------- Save as template --------
  const saveAsTemplate = () => {
    toast.success("Template saved to library")
  }

  const clearAll = () => {
    update("subject", "")
    update("previewText", "")
    update("body", "")
    update("smsBody", "")
    toast.info("Editor cleared")
  }

  const undoLastAI = () => {
    if (lastBody == null) return
    const field = activeField(state.channel)
    update(field, lastBody)
    setLastBody(null)
    toast.info("Reverted last AI edit")
  }

  const charCount = state.smsBody.length
  const smsOver = charCount > 160

  return (
    <div className="relative flex h-full flex-col">
      {/* ---- Top bar ---- */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Tabs
          value={state.channel}
          onValueChange={(v) => handleChannelChange(v ?? "email")}
        >
          <TabsList>
            <TabsTrigger value="email">
              <Mail className="h-3.5 w-3.5" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {draftSavedAt && (
          <span className="text-xs text-muted-foreground tabular-nums select-none">
            {draftSavedAt}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Playbook chip */}
          <PlaybookChip
            activePlaybook={activePlaybook}
            open={playbookDropdownOpen}
            setOpen={setPlaybookDropdownOpen}
            onSelect={handleSelectPlaybook}
            onClear={clearPlaybook}
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="More options" />}
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={saveAsTemplate}>
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearAll}>Clear editor</DropdownMenuItem>
              {lastBody !== null && (
                <DropdownMenuItem onClick={undoLastAI}>
                  Undo last AI edit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Editor settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tone indicator (when playbook active) */}
      {activePlaybook && (
        <div className="flex items-center gap-2 border-b border-border px-5 py-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", TONE_COLORS[activePlaybook.tone] ?? "bg-purple-400/15 text-purple-300")}>
            {activePlaybook.tone.charAt(0).toUpperCase() + activePlaybook.tone.slice(1)}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", COMPLIANCE_COLORS[activePlaybook.compliancePosture] ?? "bg-zinc-700 text-zinc-300")}>
            {activePlaybook.compliancePosture.charAt(0).toUpperCase() + activePlaybook.compliancePosture.slice(1)} compliance
          </span>
        </div>
      )}

      {/* ---- Body ---- */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-4">
          {/* Campaign name — required across all channels. Send is blocked until this is filled. */}
          <CampaignNameField
            value={state.campaignName}
            onChange={(v) => update("campaignName", v)}
          />

          {/* ---- EMAIL — the tab strip and all per-variation editor
                 content (sender, mode, template, subject, body) live
                 inside a single VariationsPanel container so the tabs
                 visually own the content below and the accent color
                 flows continuously down the left edge. ---- */}
          {state.channel === "email" && (
            <VariationsPanel state={state} update={update}>
              <ActiveVariationSenderPicker state={state} update={update} />
              <div className="space-y-4">
              {/* Three-mode selector */}
              <EmailModeSelector
                mode={state.emailMode}
                onChange={(m) => update("emailMode", m)}
              />


              {/* ---- Template Mode (rich, locked-template canvas) ---- */}
              {state.emailMode === "template" && (
                <RichTemplateMode state={state} update={update} />
              )}

              {/* ---- AI-Generated Mode ---- */}
              {state.emailMode === "ai_generated" && (
                <EmailAiGenerateMode onUseEmail={handleUseGeneratedEmail} />
              )}

              {/* ---- Inline Composer Mode (default, current behavior) ---- */}
              {state.emailMode === "inline" && (
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <input
                      value={state.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      placeholder="Subject line..."
                      className="w-full bg-transparent font-heading text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <input
                      value={state.previewText}
                      onChange={(e) => update("previewText", e.target.value)}
                      placeholder="Preview text appears in inbox preview"
                      className="w-full border-b border-border/60 bg-transparent pb-2 text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                    />

                    {/* Toolbar: prominent HTML builder CTA + AI Assist + Create journey */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <a
                        href="/email-generator/builder/new"
                        className="group inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30"
                      >
                        <Blocks className="h-4 w-4" />
                        Open HTML builder
                        <span className="hidden text-[10px] font-normal text-primary-foreground/80 sm:inline">
                          · blocks, rich layout, brand kit
                        </span>
                      </a>
                      <CreateJourneyDropdown channel="email" templateName={state.subject || "Composer Draft"} />
                      <Button
                        variant={aiAssistOpen ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAiAssistOpen((o) => !o)}
                        className={cn(
                          aiAssistOpen && "bg-purple-600 hover:bg-purple-700 text-white"
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Assist
                      </Button>
                    </div>

                    {/* Plain textarea — for rows/columns/blocks, use the v3 builder. */}
                    <div className="relative">
                      <Textarea
                        ref={bodyRef}
                        value={state.body}
                        onChange={(e) => update("body", e.target.value)}
                        onSelect={handleSelect("body")}
                        onBlur={() => window.setTimeout(selectionLost, 150)}
                        placeholder="Write your message here..."
                        className={cn(
                          "min-h-[320px] resize-none border-none bg-transparent p-0 text-base leading-relaxed shadow-none transition-opacity duration-300 focus-visible:ring-0",
                          animating && "opacity-30"
                        )}
                      />
                      {animating && (
                        <div className="pointer-events-none absolute inset-0 -m-2 animate-pulse rounded-lg border border-primary/40 bg-primary/5" />
                      )}
                    </div>

                    {state.body && (
                      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/10 p-3">
                        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Tokens in draft
                        </div>
                        <TokenizedPreview text={state.body} />
                      </div>
                    )}

                    <EditorToolbar
                      onInsertToken={insertToken}
                      aiButtonRef={aiButtonRef}
                      aiOpen={aiMenuOpen}
                      setAiOpen={setAiMenuOpen}
                      onAiAction={runAIAction}
                      charCount={state.body.length}
                      executionLevel={executionLevel}
                      channel="email"
                    />
                  </div>

                  {/* AI Assist sidebar */}
                  <AiAssistPanel
                    open={aiAssistOpen}
                    onClose={() => setAiAssistOpen(false)}
                    onAction={applyAiAssist}
                  />
                </div>
              )}
              </div>
            </VariationsPanel>
          )}

          {/* ---- SMS ---- */}
          {state.channel === "sms" && (
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <CreateJourneyDropdown channel="sms" templateName="Composer SMS Draft" />
              </div>
              <div className="relative">
                <Textarea
                  ref={smsRef}
                  value={state.smsBody}
                  onChange={(e) => update("smsBody", e.target.value)}
                  onSelect={handleSelect("smsBody")}
                  onBlur={() => window.setTimeout(selectionLost, 150)}
                  placeholder="Write your SMS... Keep it under 160 characters."
                  className={cn(
                    "min-h-[220px] resize-none text-base leading-relaxed transition-opacity duration-300",
                    animating && "opacity-30"
                  )}
                />
                {animating && (
                  <div className="pointer-events-none absolute inset-0 -m-2 animate-pulse rounded-lg border border-primary/40 bg-primary/5" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs",
                    smsOver ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {charCount}/160 characters{charCount > 160 && " — over limit"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {Math.ceil(charCount / 160) || 1} segment
                  {charCount > 160 ? "s" : ""}
                </span>
              </div>

              <EditorToolbar
                onInsertToken={insertToken}
                aiButtonRef={aiButtonRef}
                aiOpen={aiMenuOpen}
                setAiOpen={setAiMenuOpen}
                onAiAction={runAIAction}
                charCount={charCount}
              />
            </div>
          )}

          {/* ---- WHATSAPP ---- */}
          {state.channel === "whatsapp" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-primary/15 text-primary ring-1 ring-primary/30">
                  <BadgeCheck className="h-3 w-3" />
                  Approved Templates Only
                </Badge>
                <CreateJourneyDropdown channel="whatsapp" templateName="Composer WhatsApp Draft" />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Template
                </label>
                <Select
                  value={state.whatsappTemplateId}
                  onValueChange={(v) =>
                    update("whatsappTemplateId", v ?? whatsappTemplates[0].id)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsappTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Template body
                </div>
                <TokenizedPreview
                  text={
                    whatsappTemplates.find((t) => t.id === state.whatsappTemplateId)
                      ?.body ?? ""
                  }
                />
              </div>

              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-400">
                WhatsApp messages must use pre-approved templates due to Meta&apos;s
                policies. Edits are limited to variable values.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---- Floating selection toolbar ---- */}
      <SelectionToolbar
        visible={selection.visible}
        x={selection.x}
        y={selection.y}
        onAction={runSelectionAction}
      />
    </div>
  )
}

// ---------- Email mode selector ----------

interface EmailModeSelectorProps {
  mode: EmailMode
  onChange: (mode: EmailMode) => void
}

/* ─────────────── Active-variation sender picker ─────────────── */

/**
 * Sender picker that reads/writes the ACTIVE variation's per-variation
 * sender fields (senderProfileId + free-form From identity). Falls back to
 * the campaign-level defaults when the variation hasn't overridden.
 */
function ActiveVariationSenderPicker({
  state,
  update,
}: {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
}) {
  const active = state.variations.find((v) => v.id === state.activeVariationId)
  if (!active) return null

  const effectiveId = active.senderProfileId ?? state.senderProfileId
  const effectiveFromName = active.senderFromName ?? state.customFromName
  const effectiveFromEmail = active.senderFromEmail ?? state.customFromEmail
  const effectiveReplyTo = active.senderReplyTo ?? state.customReplyTo

  const patchActive = (patch: Partial<typeof active>) => {
    update(
      "variations",
      state.variations.map((v) =>
        v.id === state.activeVariationId ? { ...v, ...patch } : v,
      ),
    )
  }

  return (
    <SenderProfilePicker
      lenderId={
        state.richTemplateId
          ? richEmailTemplates.find((t) => t.id === state.richTemplateId)?.lenderId ?? null
          : null
      }
      value={effectiveId}
      onChange={(id) => {
        // First variation with no per-var setting → write to campaign default
        // for backwards compat; otherwise store on the active variation.
        if (state.variations.length === 1 && !active.senderProfileId) {
          update("senderProfileId", id)
        } else {
          patchActive({ senderProfileId: id })
        }
      }}
      customFromName={effectiveFromName}
      customFromEmail={effectiveFromEmail}
      customReplyTo={effectiveReplyTo}
      onCustomChange={(patch) => {
        if (state.variations.length === 1 && !active.senderFromName && !active.senderFromEmail && !active.senderReplyTo) {
          if (patch.customFromName !== undefined) update("customFromName", patch.customFromName)
          if (patch.customFromEmail !== undefined) update("customFromEmail", patch.customFromEmail)
          if (patch.customReplyTo !== undefined) update("customReplyTo", patch.customReplyTo)
        } else {
          patchActive({
            senderFromName: patch.customFromName !== undefined ? patch.customFromName : active.senderFromName,
            senderFromEmail: patch.customFromEmail !== undefined ? patch.customFromEmail : active.senderFromEmail,
            senderReplyTo: patch.customReplyTo !== undefined ? patch.customReplyTo : active.senderReplyTo,
          })
        }
      }}
    />
  )
}

/* ─────────────────── Campaign name (required) ─────────────────── */

function CampaignNameField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [touched, setTouched] = React.useState(false)
  const missing = !value.trim()
  const showError = touched && missing
  return (
    <div className="rounded-lg border bg-muted/10 px-3 py-2.5 transition-colors"
      style={{
        borderColor: showError ? "rgba(239,68,68,0.4)" : undefined,
      }}
    >
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Campaign name <span className="text-red-400">*</span>
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="e.g. Mashreq · June Payment Reminder · Wave 2"
        className={cn(
          "mt-1 w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60",
        )}
      />
      <p
        className={cn(
          "mt-1 text-[10px] leading-relaxed",
          showError ? "text-red-400" : "text-muted-foreground/70",
        )}
      >
        {showError
          ? "Required — this is the label used in the message listing + analytics."
          : "Shown as the primary title in the message listing. The subject line is separate."}
      </p>
    </div>
  )
}

function EmailModeSelector({ mode, onChange }: EmailModeSelectorProps) {
  const modes: { id: EmailMode; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: "template", label: "Template", icon: Layout, desc: "Pick a starting point" },
    { id: "inline", label: "Inline Composer", icon: Edit3, desc: "Write or paste" },
    { id: "ai_generated", label: "AI-Generated", icon: Sparkles, desc: "Describe → generate" },
  ]
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border/50 bg-muted/30 p-1">
      {modes.map((m) => {
        const Icon = m.icon
        const active = mode === m.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md px-2 py-2 text-center transition-all",
              active
                ? "border border-primary/30 bg-background text-primary shadow-sm"
                : "border border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[11px] font-semibold leading-tight">{m.label}</span>
            <span className="text-[9px] opacity-70">{m.desc}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------- Create journey dropdown ----------

function CreateJourneyDropdown({
  channel,
  templateName,
}: {
  channel: "email" | "sms" | "whatsapp"
  templateName: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  // Close when clicking outside.
  React.useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  const blueprints: Array<{
    id: "none" | "reminder_3step" | "ptp_recovery" | "settlement_push"
    label: string
    description: string
  }> = [
    { id: "none", label: "Single Send node", description: "Just the message — wire trigger + exit yourself." },
    { id: "reminder_3step", label: "3-step reminder cadence", description: "Send · wait 3d · SMS · wait 2d · Final" },
    { id: "ptp_recovery", label: "PTP recovery branch", description: "Send · wait · Decision split on PTP status" },
    { id: "settlement_push", label: "Settlement push", description: "Send · wait · Send · wait · AI Call" },
  ]

  function pick(blueprint: typeof blueprints[number]["id"]) {
    const params = new URLSearchParams({
      from: "composer",
      blueprint,
      channel,
      templateName,
      audience: "Composer audience",
    })
    setOpen(false)
    router.push(`/journeys/new?${params.toString()}`)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-zinc-800"
      >
        <Wand2 className="h-3 w-3" />
        Create journey
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pre-populate journey builder
          </p>
          <div className="h-px bg-zinc-800" />
          {blueprints.map((bp) => (
            <button
              key={bp.id}
              type="button"
              onClick={() => pick(bp.id)}
              className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-zinc-800"
            >
              <p className="text-[12px] font-medium text-foreground">{bp.label}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                {bp.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Toolbar (inline, under textarea) ----------

interface EditorToolbarProps {
  onInsertToken: (token: string) => void
  aiButtonRef: React.RefObject<HTMLDivElement | null>
  aiOpen: boolean
  setAiOpen: (o: boolean) => void
  onAiAction: (action: AIAction) => void
  charCount: number
  /** When set + channel is "email", uses the grouped (level-scoped) variable picker. */
  executionLevel?: MergeVarLevel
  channel?: Channel
}

function EditorToolbar({
  onInsertToken,
  aiButtonRef,
  aiOpen,
  setAiOpen,
  onAiAction,
  charCount,
  executionLevel,
  channel,
}: EditorToolbarProps) {
  // For the email channel we show the new execution-level scoped picker.
  // For other channels we keep the legacy flat token list.
  const useScopedPicker = channel === "email" && executionLevel

  return (
    <div className="relative mt-4 flex items-center gap-2 border-t border-border pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          <Plus className="h-3.5 w-3.5" />
          Add variable
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
          {useScopedPicker ? (
            <ScopedVariableMenu
              executionLevel={executionLevel as MergeVarLevel}
              onInsert={onInsertToken}
            />
          ) : (
            availableTokens.map((t) => (
              <DropdownMenuItem key={t.token} onClick={() => onInsertToken(t.token)}>
                <span className="font-mono text-xs text-primary">{t.token}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {t.label}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-[11px] text-muted-foreground">
        {charCount.toLocaleString()} chars
      </span>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-[10px] text-muted-foreground md:inline">
          ⌘J for AI
        </span>
        <div ref={aiButtonRef} className="relative">
          <Button
            variant="default"
            size="sm"
            className="bg-primary text-primary-foreground"
            onClick={() => setAiOpen(!aiOpen)}
          >
            <Wand2 className="h-3.5 w-3.5" />
            AI
          </Button>
          <AICommandMenu
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            onAction={onAiAction}
            anchorRef={aiButtonRef}
          />
        </div>
      </div>
    </div>
  )
}

// ---------- Scoped (Khalil-style) variable picker ----------

function ScopedVariableMenu({
  executionLevel,
  onInsert,
}: {
  executionLevel: MergeVarLevel
  onInsert: (token: string) => void
}) {
  // Always show ALL groups in the Composer (no execution-level UI yet) — but
  // mark which levels are visible for the current selection.
  const allowedLevels: MergeVarLevel[] =
    executionLevel === "borrower"
      ? ["borrower"]
      : executionLevel === "account"
      ? ["borrower", "account"]
      : ["borrower", "account", "sub_account"]

  return (
    <>
      {(["borrower", "account", "sub_account"] as MergeVarLevel[]).map((level) => {
        const items = mergeVariables.filter((v) => v.level === level)
        const visible = allowedLevels.includes(level)
        return (
          <div key={level} className={visible ? "" : "opacity-50"}>
            <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wider">
              <span>{mergeVarLevelLabels[level]}</span>
              <span className="text-muted-foreground">{items.length}</span>
            </DropdownMenuLabel>
            {items.map((v) => (
              <DropdownMenuItem
                key={v.token}
                onClick={() => visible && onInsert(v.token)}
                disabled={!visible}
              >
                <span className="font-mono text-[11px] text-primary">{v.token}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {v.label}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        )
      })}
    </>
  )
}

// ---------- Playbook chip ----------

const TONE_COLORS: Record<string, string> = {
  professional: "bg-purple-400/15 text-purple-300",
  friendly: "bg-emerald-400/15 text-emerald-300",
  firm: "bg-red-400/15 text-red-300",
  empathetic: "bg-violet-400/15 text-violet-300",
  urgent: "bg-amber-400/15 text-amber-300",
}
const COMPLIANCE_COLORS: Record<string, string> = {
  standard: "bg-zinc-700 text-zinc-300",
  strict: "bg-red-400/15 text-red-300",
  lenient: "bg-amber-400/15 text-amber-300",
}

function PlaybookChip({
  activePlaybook,
  open,
  setOpen,
  onSelect,
  onClear,
}: {
  activePlaybook: Playbook | null
  open: boolean
  setOpen: (open: boolean) => void
  onSelect: (pb: Playbook) => void
  onClear: () => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
          activePlaybook
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
      >
        Playbook: {activePlaybook ? activePlaybook.name : "none"}
        {activePlaybook ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="ml-1 cursor-pointer rounded-full p-0.5 hover:bg-emerald-500/30"
          >
            <X className="h-2.5 w-2.5" />
          </span>
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-[280px] rounded-lg border border-border bg-popover p-1 shadow-md">
            <p className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">Select a playbook</p>
            {playbooks.map((pb) => (
              <button
                key={pb.id}
                type="button"
                onClick={() => onSelect(pb)}
                className="flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className="text-sm font-medium text-foreground">{pb.name}</span>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", TONE_COLORS[pb.tone])}>
                    {pb.tone}
                  </span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", COMPLIANCE_COLORS[pb.compliancePosture])}>
                    {pb.compliancePosture}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------- Tokenized preview (pills) ----------

export function TokenizedPreview({ text }: { text: string }) {
  // Split on {{...}} and render pills
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
      {parts.map((part, i) => {
        if (/^\{\{[^}]+\}\}$/.test(part)) {
          return (
            <span
              key={i}
              className="mx-0.5 inline-block rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary ring-1 ring-primary/30"
            >
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Rich Template Mode — locked-template canvas + slot inspector
// ─────────────────────────────────────────────────────────────────────

interface RichTemplateModeProps {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
}

function RichTemplateMode({ state, update }: RichTemplateModeProps) {
  const [showPicker, setShowPicker] = React.useState(state.richTemplateId === null)
  const [activeSlotId, setActiveSlotId] = React.useState<string | null>(null)
  const template = state.richTemplateId ? getRichTemplate(state.richTemplateId) ?? null : null
  const slots = state.richSlotValues as SlotValues

  const handleSelectTemplate = React.useCallback(
    (t: ReturnType<typeof getRichTemplate>) => {
      if (!t) return
      update("richTemplateId", t.id)
      update("richSlotValues", t.defaultSlots as unknown as ComposerState["richSlotValues"])
      update("subject", t.subject)
      setShowPicker(false)
      setActiveSlotId(null)
      toast.success(`Loaded "${t.name}"`)
    },
    [update],
  )

  const handleSlotChange = React.useCallback(
    (slotId: string, value: SlotValue) => {
      const next = { ...slots, [slotId]: value }
      update("richSlotValues", next as unknown as ComposerState["richSlotValues"])
    },
    [slots, update],
  )

  // Picker view
  if (showPicker || !template) {
    return (
      <div className="-mx-6 -my-6">
        <div className="px-6 py-6">
          <RichTemplatePicker onSelect={handleSelectTemplate} />
        </div>
      </div>
    )
  }

  // Canvas + (optional) inspector
  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-3.5rem-58px)] min-h-[600px]">
      {/* Canvas */}
      <div className={cn("min-w-0 flex-1", activeSlotId && "w-[60%] flex-none")}>
        <TemplateCanvas
          template={template}
          slots={slots}
          activeSlotId={activeSlotId}
          onSlotClick={(id) => setActiveSlotId(id)}
          onChooseTemplate={() => setShowPicker(true)}
        />
      </div>

      {/* Slot inspector — shown only when a slot is selected */}
      {activeSlotId && (
        <div className="w-[360px] shrink-0">
          <SlotInspector
            template={template}
            slotId={activeSlotId}
            value={slots[activeSlotId] ?? ""}
            onChange={(v) => handleSlotChange(activeSlotId, v)}
            onClose={() => setActiveSlotId(null)}
          />
        </div>
      )}
    </div>
  )
}
