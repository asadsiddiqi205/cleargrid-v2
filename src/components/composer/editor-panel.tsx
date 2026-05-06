"use client"

import * as React from "react"
import {
  Sparkles,
  Mail,
  MessageSquare,
  MessageCircle,
  MoreHorizontal,
  BadgeCheck,
  Plus,
  Wand2,
  Phone,
  Volume2,
  Languages,
  PhoneOutgoing,
  Clock3,
  Layout,
  Edit3,
  Blocks,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  voiceScriptTemplates,
  voiceAiActions,
  mergeVariables,
  mergeVarLevelLabels,
  aiAssistVariants,
  type MergeVarLevel,
} from "@/data/composer-ai-variants"

import type {
  ComposerState,
  Channel,
  VoiceLang,
  VoiceVoice,
  CallWindow,
  EmailMode,
} from "@/components/composer/composer-view"
import { HelpMeWriteDialog } from "@/components/composer/help-me-write-dialog"
import {
  AICommandMenu,
  type AIAction,
} from "@/components/composer/ai-command-menu"
import { SelectionToolbar } from "@/components/composer/selection-toolbar"
import { EmailTemplateMode } from "@/components/composer/email-template-mode"
import { EmailAiGenerateMode } from "@/components/composer/email-ai-generate-mode"
import { EmailBlockBuilder } from "@/components/composer/email-block-builder"
import { AiAssistPanel, AI_ASSIST_ACTIONS } from "@/components/composer/ai-assist-panel"

interface EditorPanelProps {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
}

type EditField = "body" | "smsBody" | "voiceScript"

function activeField(channel: Channel): EditField {
  if (channel === "sms") return "smsBody"
  if (channel === "voice") return "voiceScript"
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
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [aiMenuOpen, setAiMenuOpen] = React.useState(false)
  const [animating, setAnimating] = React.useState(false)
  const [lastBody, setLastBody] = React.useState<string | null>(null)
  const [aiAssistOpen, setAiAssistOpen] = React.useState(false)
  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null)

  // Update draft timestamp 2s after any content change
  const contentSignature = `${state.body}|${state.smsBody}|${state.subject}|${state.voiceScript}`
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
  const voiceRef = React.useRef<HTMLTextAreaElement | null>(null)
  const aiButtonRef = React.useRef<HTMLDivElement | null>(null)

  // -------- Channel switching --------
  const handleChannelChange = (v: string | null) => {
    if (v === "email" || v === "sms" || v === "whatsapp" || v === "voice") {
      update("channel", v as Channel)
    }
  }

  const getFieldValue = (field: EditField): string => {
    if (field === "smsBody") return state.smsBody
    if (field === "voiceScript") return state.voiceScript
    return state.body
  }

  const getFieldRef = (field: EditField): HTMLTextAreaElement | null => {
    if (field === "smsBody") return smsRef.current
    if (field === "voiceScript") return voiceRef.current
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
    [state.channel, state.body, state.smsBody, state.voiceScript, update]
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
      const isVoice = state.channel === "voice"

      switch (action.kind) {
        case "improve": {
          if (isVoice) {
            const variant = pickRandom(voiceAiActions.improve, current)
            applyAIContent(variant, "Script improved")
          } else {
            const variant = pickRandom(improveVariants, current)
            applyAIContent(hasContent ? variant : improveVariants[0], "Improved by AI")
          }
          break
        }
        case "fixGrammar": {
          if (isVoice) {
            const variant = pickRandom(voiceAiActions.improve, current)
            applyAIContent(variant, "Script polished")
          } else {
            const variant = pickRandom(fixGrammarVariants, current)
            applyAIContent(variant, "Grammar fixed")
          }
          break
        }
        case "makeShorter": {
          if (isVoice) {
            const variant = pickRandom(voiceAiActions.shorter, current)
            applyAIContent(variant, "Made shorter")
          } else {
            const variant = pickRandom(
              state.channel === "sms" ? smsVariants : makeShorterVariants,
              current
            )
            applyAIContent(variant, "Made shorter")
          }
          break
        }
        case "makeLonger": {
          if (isVoice) {
            const variant = pickRandom(voiceAiActions.addPtpQuestion, current)
            applyAIContent(variant, "Added PTP question")
          } else {
            const variant = pickRandom(makeLongerVariants, current)
            applyAIContent(variant, "Expanded")
          }
          break
        }
        case "polish": {
          if (isVoice) {
            const variant = pickRandom(voiceAiActions.improve, current)
            applyAIContent(variant, "Polished")
          } else {
            const variant = pickRandom(polishVariants, current)
            applyAIContent(variant, "Polished")
          }
          break
        }
        case "simplify": {
          if (isVoice) {
            const variant = pickRandom(voiceAiActions.shorter, current)
            applyAIContent(variant, "Simplified")
          } else {
            const variant = pickRandom(makeShorterVariants, current)
            applyAIContent(variant, "Simplified")
          }
          break
        }
        case "changeTone": {
          if (isVoice) {
            if (action.tone === "empathetic") {
              const variant = pickRandom(voiceAiActions.moreEmpathetic, current)
              applyAIContent(variant, "More empathetic")
            } else if (action.tone === "firm" || action.tone === "professional") {
              const variant = pickRandom(voiceAiActions.moreUrgent, current)
              applyAIContent(variant, "More urgent")
            } else {
              const variant = pickRandom(voiceAiActions.improve, current)
              applyAIContent(variant, `Tone → ${action.tone}`)
            }
          } else {
            const variant = pickRandom(changeToneVariants[action.tone], current)
            applyAIContent(
              variant,
              `Tone → ${action.tone.charAt(0).toUpperCase() + action.tone.slice(1)}`
            )
          }
          break
        }
        case "translate": {
          if (isVoice) {
            // Voice scripts: switch language too
            update("voiceLang", action.lang === "arabic" ? "ar" : "en")
            const variant = pickRandom(voiceAiActions.improve, current)
            applyAIContent(
              variant,
              `Translated to ${action.lang === "arabic" ? "Arabic" : "English"}`
            )
          } else {
            const variant = pickRandom(translateVariants[action.lang], current)
            applyAIContent(
              variant,
              `Translated to ${action.lang === "arabic" ? "Arabic" : "English"}`
            )
          }
          break
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyAIContent, state.body, state.smsBody, state.voiceScript, state.channel, update]
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

  // -------- Help me write insert --------
  const handleHelpInsert = (result: { subject: string; previewText: string; body: string }) => {
    if (state.channel === "email") {
      update("subject", result.subject)
      update("previewText", result.previewText)
      update("body", result.body)
    } else if (state.channel === "sms") {
      update("smsBody", result.body.slice(0, 300))
    } else if (state.channel === "voice") {
      update("voiceScript", result.body)
      update("voiceScriptName", "custom")
    }
    toast.success("✨ Draft inserted")
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
    update("voiceScript", "")
    update("voiceScriptName", "custom")
    toast.info("Editor cleared")
  }

  const undoLastAI = () => {
    if (lastBody == null) return
    const field = activeField(state.channel)
    update(field, lastBody)
    setLastBody(null)
    toast.info("Reverted last AI edit")
  }

  // -------- Voice script template selection --------
  const handleVoiceScriptSelect = (id: string) => {
    const tpl = voiceScriptTemplates.find((t) => t.id === id)
    if (!tpl) return
    update("voiceScriptName", tpl.id)
    if (tpl.id !== "custom") {
      update("voiceScript", tpl.script)
    }
  }

  const charCount = state.smsBody.length
  const smsOver = charCount > 160
  const voiceCharCount = state.voiceScript.length
  // Rough estimate: ~14 chars per second of speech
  const voiceDurationSec = Math.max(5, Math.ceil(voiceCharCount / 14))

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
            <TabsTrigger value="voice">
              <Phone className="h-3.5 w-3.5" />
              AI Call
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {draftSavedAt && (
          <span className="text-xs text-muted-foreground tabular-nums select-none">
            {draftSavedAt}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="default"
            size="default"
            className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            onClick={() => setHelpOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            Help me write
          </Button>

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

      {/* ---- Body ---- */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {/* ---- EMAIL ---- */}
          {state.channel === "email" && (
            <div className="space-y-4">
              {/* Three-mode selector */}
              <EmailModeSelector
                mode={state.emailMode}
                onChange={(m) => update("emailMode", m)}
              />

              {/* ---- Template Mode ---- */}
              {state.emailMode === "template" && (
                <EmailTemplateMode onSelectTemplate={handleSelectEmailTemplate} />
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

                    {/* Use blocks toggle */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant={state.useBlocks ? "default" : "outline"}
                        size="sm"
                        onClick={() => update("useBlocks", !state.useBlocks)}
                      >
                        <Blocks className="h-3.5 w-3.5" />
                        {state.useBlocks ? "Using blocks" : "Use blocks"}
                      </Button>
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

                    {/* Block builder OR plain textarea */}
                    {state.useBlocks ? (
                      <EmailBlockBuilder
                        blocks={state.emailBlocks}
                        onChange={(blocks) => update("emailBlocks", blocks)}
                      />
                    ) : (
                      <>
                        <div className="relative">
                          <Textarea
                            ref={bodyRef}
                            value={state.body}
                            onChange={(e) => update("body", e.target.value)}
                            onSelect={handleSelect("body")}
                            onBlur={() => window.setTimeout(selectionLost, 150)}
                            placeholder="Write your message here, or click 'Help me write' to generate..."
                            className={cn(
                              "min-h-[320px] resize-none border-none bg-transparent p-0 text-base leading-relaxed shadow-none transition-opacity duration-300 focus-visible:ring-0",
                              animating && "opacity-30"
                            )}
                          />
                          {animating && (
                            <div className="pointer-events-none absolute inset-0 -m-2 animate-pulse rounded-lg border border-primary/40 bg-primary/5" />
                          )}
                        </div>

                        {/* Token highlight preview */}
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
                      </>
                    )}
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
          )}

          {/* ---- SMS ---- */}
          {state.channel === "sms" && (
            <div className="space-y-3">
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
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/15 text-primary ring-1 ring-primary/30">
                  <BadgeCheck className="h-3 w-3" />
                  Approved Templates Only
                </Badge>
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

          {/* ---- VOICE (AI CALL) ---- */}
          {state.channel === "voice" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <h3 className="font-heading text-base font-semibold text-foreground">
                      AI Call Script
                    </h3>
                    <Badge className="bg-primary/15 text-primary ring-1 ring-primary/30">
                      ClearVoice
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    What the AI voice agent will say to the borrower when they pick up.
                  </p>
                </div>

                <div className="w-56">
                  <Select
                    value={state.voiceScriptName}
                    onValueChange={(v) => handleVoiceScriptSelect(v ?? "custom")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Use a pre-built script" />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceScriptTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="relative">
                <Textarea
                  ref={voiceRef}
                  value={state.voiceScript}
                  onChange={(e) => {
                    update("voiceScript", e.target.value)
                    if (state.voiceScriptName !== "custom") {
                      update("voiceScriptName", "custom")
                    }
                  }}
                  onSelect={handleSelect("voiceScript")}
                  onBlur={() => window.setTimeout(selectionLost, 150)}
                  placeholder="Hi {{borrower_name}}, this is ClearGrid calling about your account..."
                  className={cn(
                    "min-h-[260px] resize-none text-base leading-relaxed transition-opacity duration-300",
                    animating && "opacity-30"
                  )}
                />
                {animating && (
                  <div className="pointer-events-none absolute inset-0 -m-2 animate-pulse rounded-lg border border-primary/40 bg-primary/5" />
                )}
              </div>

              {state.voiceScript && (
                <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tokens in script
                  </div>
                  <TokenizedPreview text={state.voiceScript} />
                </div>
              )}

              {/* Voice settings 2x2 grid */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/10 p-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Volume2 className="h-3 w-3" />
                    Voice
                  </Label>
                  <Select
                    value={state.voiceVoice}
                    onValueChange={(v) =>
                      update("voiceVoice", ((v ?? "female") as VoiceVoice))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">
                        <span className="flex items-center justify-between gap-2">
                          <span>Female (Warm)</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="male">
                        <span className="flex items-center justify-between gap-2">
                          <span>Male (Firm)</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-full justify-start text-[10px] text-muted-foreground"
                    onClick={() =>
                      toast.info("Voice preview not available in prototype")
                    }
                  >
                    <Volume2 className="h-3 w-3" />
                    Preview voice sample
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Languages className="h-3 w-3" />
                    Language
                  </Label>
                  <Select
                    value={state.voiceLang}
                    onValueChange={(v) =>
                      update("voiceLang", ((v ?? "en") as VoiceLang))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <PhoneOutgoing className="h-3 w-3" />
                    Max attempts
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={state.voiceMaxAttempts}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (Number.isFinite(n) && n >= 1 && n <= 10) {
                        update("voiceMaxAttempts", n)
                      }
                    }}
                    className="w-full"
                  />
                  <p className="text-[10px] leading-tight text-muted-foreground/80">
                    How many times to retry if no answer
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Call window
                  </Label>
                  <Select
                    value={state.voiceCallWindow}
                    onValueChange={(v) =>
                      update("voiceCallWindow", ((v ?? "anytime") as CallWindow))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anytime">Anytime within contact hours</SelectItem>
                      <SelectItem value="morning">Morning (9–12)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12–17)</SelectItem>
                      <SelectItem value="evening">Evening (17–19)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3 w-3" />
                  Estimated duration: <span className="font-medium text-foreground">~{voiceDurationSec}s</span>
                </span>
                <span>{voiceCharCount.toLocaleString()} chars</span>
              </div>

              <EditorToolbar
                onInsertToken={insertToken}
                aiButtonRef={aiButtonRef}
                aiOpen={aiMenuOpen}
                setAiOpen={setAiMenuOpen}
                onAiAction={runAIAction}
                charCount={voiceCharCount}
              />
            </div>
          )}
        </div>
      </div>

      {/* ---- Help me write dialog ---- */}
      <HelpMeWriteDialog
        open={helpOpen}
        onOpenChange={(o) => setHelpOpen(o)}
        onInsert={handleHelpInsert}
      />

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
