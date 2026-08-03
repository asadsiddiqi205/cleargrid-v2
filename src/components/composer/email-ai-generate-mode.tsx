"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Wand2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  FileText,
  LayoutTemplate,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
} from "@/components/ui/dropdown-menu"

import { cn } from "@/lib/utils"
import {
  generateAiEmail,
  type AiGenerateConfig,
  type AiGeneratedEmail,
} from "@/data/composer-ai-variants"

export interface GeneratedEmailPayload {
  subject: string
  preheader: string
  body: string
}

interface EmailAiGenerateModeProps {
  /** Called when the user clicks "Use this email" — parent loads it into the editor and switches to inline. */
  onUseEmail: (payload: GeneratedEmailPayload) => void
}

const OBJECTIVES = [
  { id: "reminder", label: "Payment reminder" },
  { id: "overdue", label: "Overdue notice" },
  { id: "settlement", label: "Settlement offer" },
  { id: "welcome", label: "Welcome" },
  { id: "ptp", label: "PTP follow-up" },
  { id: "hardship", label: "Hardship outreach" },
  { id: "final", label: "Final notice" },
]

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly" },
  { id: "firm", label: "Firm" },
  { id: "empathetic", label: "Empathetic" },
  { id: "urgent", label: "Urgent" },
]

const FIRMNESS = [
  { id: "soft", label: "Soft" },
  { id: "moderate", label: "Moderate" },
  { id: "firm", label: "Firm" },
  { id: "aggressive", label: "Aggressive" },
]

const LANGUAGES = [
  { id: "English", label: "English" },
  { id: "Arabic", label: "Arabic" },
]

const LENGTHS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
]

const CTA_TYPES = [
  { id: "payment", label: "Make Payment" },
  { id: "settlement", label: "View Settlement" },
  { id: "callback", label: "Schedule Callback" },
  { id: "plan", label: "Set Up Plan" },
]

const REFINE_OPTIONS = [
  { id: "formalize", label: "Formalize" },
  { id: "elaborate", label: "Elaborate" },
  { id: "shorten", label: "Shorten" },
  { id: "empathetic", label: "More empathetic" },
  { id: "urgency", label: "Add urgency" },
]

/**
 * Email "AI Generate" mode.
 *
 * Form fields → big Generate button → simulated 1.5s thinking →
 * generated subject/preheader/body + reasoning expander + Use/Regenerate/Refine.
 */
export function EmailAiGenerateMode({ onUseEmail }: EmailAiGenerateModeProps) {
  const router = useRouter()
  /** Whether the user wants a text-based email (stays in composer) or a full
   *  HTML template (pushes to the v3 builder). Null until they pick. */
  const [outputFormat, setOutputFormat] = React.useState<"text" | "html" | null>(null)
  const [config, setConfig] = React.useState<AiGenerateConfig>({
    objective: "reminder",
    tone: "professional",
    firmness: "moderate",
    language: "English",
    length: "medium",
    ctaType: "payment",
    includePaymentReminder: true,
    includeOverdueSummary: false,
    mentionPreviousInteractions: false,
    brandVoice: "",
  })
  const [generating, setGenerating] = React.useState(false)
  const [generated, setGenerated] = React.useState<AiGeneratedEmail | null>(null)
  const [showReasoning, setShowReasoning] = React.useState(false)

  /** Map AI objective → starter-doc purpose (v3 builder route). */
  function objectiveToPurpose(o: string): string {
    switch (o) {
      case "reminder": return "reminder"
      case "overdue": return "reminder"
      case "settlement": return "settlement"
      case "welcome": return "welcome"
      case "ptp": return "broken-promise"
      case "hardship": return "hardship"
      case "final": return "final-notice"
      default: return "reminder"
    }
  }

  function openInV3Builder() {
    const params = new URLSearchParams({
      name: `AI · ${config.objective}`,
      lender: "general",
      purpose: objectiveToPurpose(config.objective),
      channel: "email",
      // Signals to the builder page to use the complete HTML-email factory
      // instead of the lean starter.
      from: "ai",
    })
    router.push(`/email-generator/builder/new?${params.toString()}`)
  }

  const updateConfig = <K extends keyof AiGenerateConfig>(
    key: K,
    value: AiGenerateConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const runGenerate = React.useCallback(() => {
    setGenerating(true)
    setGenerated(null)
    window.setTimeout(() => {
      setGenerated(generateAiEmail(config))
      setGenerating(false)
    }, 1500)
  }, [config])

  const refine = React.useCallback(
    (refinement: string) => {
      // Toggle config knobs based on refinement and regenerate
      const next: AiGenerateConfig = { ...config }
      if (refinement === "formalize") next.tone = "professional"
      if (refinement === "elaborate") next.length = "long"
      if (refinement === "shorten") next.length = "short"
      if (refinement === "empathetic") next.tone = "empathetic"
      if (refinement === "urgency") {
        next.tone = "urgent"
        next.firmness = "firm"
      }
      setConfig(next)
      setGenerating(true)
      setGenerated(null)
      window.setTimeout(() => {
        setGenerated(generateAiEmail(next))
        setGenerating(false)
      }, 1200)
    },
    [config]
  )

  // Step 0 — pick the output format before showing the form.
  if (!outputFormat) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-300">AI Email Generation</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            What kind of email do you want to generate?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setOutputFormat("text")}
            className="group flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-4 text-left transition-all hover:border-purple-500/40 hover:bg-purple-500/5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-500/15 text-purple-300">
              <FileText className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">Text-based template</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              A plain-text email body with a subject + preheader. Stays in the inline composer — quick to edit and send.
            </p>
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
              Best for SMS/email follow-ups
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOutputFormat("html")}
            className="group flex flex-col gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-left transition-all hover:border-emerald-500/70 hover:bg-emerald-500/10"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">Complete HTML template</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              A full branded email with header, body blocks, CTA, footer. Opens the v3 builder so you can drag, drop, and refine.
            </p>
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              Recommended for campaigns
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold text-purple-300">
              AI Email Generation · {outputFormat === "text" ? "Text-based" : "HTML template"}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {outputFormat === "text"
              ? "Generates a subject + preheader + body. Stays inline."
              : "After Generate, hand off to the v3 builder for layout and branding."}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setOutputFormat(null)}>
          Change
        </Button>
      </div>

      {/* Form */}
      {!generated && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Objective
              </Label>
              <Select
                value={config.objective}
                onValueChange={(v) => updateConfig("objective", v ?? "reminder")}
              >
                <SelectTrigger className="mt-1 h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Tone
              </Label>
              <Select
                value={config.tone}
                onValueChange={(v) => updateConfig("tone", v ?? "professional")}
              >
                <SelectTrigger className="mt-1 h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Firmness level
              </Label>
              <Select
                value={config.firmness}
                onValueChange={(v) => updateConfig("firmness", v ?? "moderate")}
              >
                <SelectTrigger className="mt-1 h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIRMNESS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Language
              </Label>
              <Select
                value={config.language}
                onValueChange={(v) => updateConfig("language", v ?? "English")}
              >
                <SelectTrigger className="mt-1 h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Length
              </Label>
              <Select
                value={config.length}
                onValueChange={(v) => updateConfig("length", v ?? "medium")}
              >
                <SelectTrigger className="mt-1 h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENGTHS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                CTA type
              </Label>
              <Select
                value={config.ctaType}
                onValueChange={(v) => updateConfig("ctaType", v ?? "payment")}
              >
                <SelectTrigger className="mt-1 h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CTA_TYPES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
            <ToggleRow
              label="Include payment reminder details"
              checked={config.includePaymentReminder}
              onCheckedChange={(val) => updateConfig("includePaymentReminder", val)}
            />
            <ToggleRow
              label="Include overdue summary"
              checked={config.includeOverdueSummary}
              onCheckedChange={(val) => updateConfig("includeOverdueSummary", val)}
            />
            <ToggleRow
              label="Mention previous interactions"
              checked={config.mentionPreviousInteractions}
              onCheckedChange={(val) =>
                updateConfig("mentionPreviousInteractions", val)
              }
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Brand voice / additional context (optional)
            </Label>
            <Textarea
              className="mt-1 min-h-[64px] text-xs"
              placeholder="e.g., 'Always sign off as the Customer Care team. Avoid words like aggressive or final notice.'"
              value={config.brandVoice}
              onChange={(e) => updateConfig("brandVoice", e.target.value)}
            />
          </div>

          <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={outputFormat === "html" ? openInV3Builder : runGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : outputFormat === "html" ? (
              <LayoutTemplate className="h-4 w-4" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {generating
              ? "Generating..."
              : outputFormat === "html"
                ? "Build HTML template in v3 builder"
                : "Generate Email"}
          </Button>
        </div>
      )}

      {/* Generating placeholder */}
      {generating && generated === null && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-purple-500/30 bg-purple-500/5 px-4 py-8 text-purple-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Composing your email...</span>
        </div>
      )}

      {/* Generated preview */}
      {generated && !generating && (
        <div className="space-y-3">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Subject
            </div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">
              {generated.subject}
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Preheader
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {generated.preheader}
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              Body
            </div>
            <pre className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-foreground">
              {generated.body}
            </pre>
          </div>

          {/* Reasoning expander */}
          <div className="rounded-lg border border-border bg-muted/10">
            <button
              type="button"
              onClick={() => setShowReasoning((s) => !s)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Sparkles className="h-3 w-3 text-purple-400" />
                Why this email?
              </span>
              {showReasoning ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
            {showReasoning && (
              <div className="border-t border-border/50 px-3 py-2">
                <pre className="whitespace-pre-wrap font-sans text-[10px] leading-relaxed text-muted-foreground">
                  {generated.reasoning}
                </pre>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="default"
              className={cn(
                "flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() =>
                onUseEmail({
                  subject: generated.subject,
                  preheader: generated.preheader,
                  body: generated.body,
                })
              }
            >
              <Check className="h-4 w-4" />
              Use this email
            </Button>
            <Button variant="outline" size="default" onClick={runGenerate}>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="default" />}>
                <Wand2 className="h-4 w-4" />
                Refine
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {REFINE_OPTIONS.map((r) => (
                  <DropdownMenuItem key={r.id} onClick={() => refine(r.id)}>
                    {r.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button
            type="button"
            onClick={() => {
              setGenerated(null)
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            ← Back to settings
          </button>
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={(val) => onCheckedChange(val)} />
    </div>
  )
}
