"use client"

import * as React from "react"
import {
  Sparkles,
  Wand2,
  Languages,
  Scissors,
  Building2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  X,
  Beaker,
  GitBranchPlus,
  History,
  Eye,
  Smartphone,
  Monitor,
  Moon,
  Mail,
  Inbox,
  Link2,
  Accessibility,
  ShieldCheck,
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { playbooksV3, PLAYBOOK_TONE_LABEL } from "@/data/playbooks-v3"
import { brandKits } from "@/data/brand-kits"
import {
  getCannedDraft,
  getInlineAssist,
  type ComposerIntent,
} from "@/data/composer-gpt-presets"
import {
  templateAuthoring,
  TEMPLATE_STATUS_LABEL,
  TEMPLATE_STATUS_COLOR,
  abTests,
  type AbTest,
} from "@/data/template-versions"
import type { BuilderRow, BuilderBlock, BuilderDocument } from "@/data/builder-blocks"
import { lintAgainstPlaybook, findingsSummary, type LintFinding } from "@/lib/playbook-lint"
import type { Playbook } from "@/data/playbooks-v3"

// ─────────────────────────── Composer GPT ────────────────────────────

const INTENT_PRESETS: Array<{
  id: ComposerIntent
  label: string
  description: string
  /** Seed copy dropped into the prompt when the chip is clicked. */
  seed: string
}> = [
  {
    id: "draft_reminder",
    label: "Payment reminder",
    description: "Friendly reminder that an installment is due.",
    seed: "Draft a payment reminder. Lead with the amount and due date. Keep it on-brand and end with the Pay Now CTA.",
  },
  {
    id: "draft_ptp",
    label: "PTP capture",
    description: "Nudge borrower to schedule a new payment date.",
    seed: "Draft a broken-promise follow-up. Acknowledge the missed payment, offer to reschedule, and put the date-picker CTA front and centre.",
  },
  {
    id: "draft_settlement",
    label: "Settlement offer",
    description: "One-time settlement with discount placeholder.",
    seed: "Draft a settlement offer. Lead with the discount, show the settlement amount, include an expiry, and end with Accept Settlement.",
  },
  {
    id: "draft_hardship",
    label: "Hardship outreach",
    description: "Empathetic outreach, care-line above payment CTA.",
    seed: "Draft a hardship outreach. Lead with empathy, place the care-line first, and only mention the payment option as a secondary path.",
  },
  {
    id: "draft_welcome",
    label: "Welcome / onboarding",
    description: "Activate-the-account email with primary CTA.",
    seed: "Draft a welcome onboarding email. Lead with the activation CTA and keep it short and warm.",
  },
  {
    id: "draft_final",
    label: "Final notice",
    description: "Formal notice — 7-day window, regulatory disclaimer.",
    seed: "Draft a formal Final Notice. Reference the account number, cite the 7-day window, include the regulatory disclaimer.",
  },
]

/**
 * Infer the closest intent from a free-text prompt. Used when the user just
 * types and doesn't click a recommendation chip. Falls back to draft_reminder.
 */
function inferIntent(prompt: string): ComposerIntent {
  const p = prompt.toLowerCase()
  if (/(final|escalat|legal|7[-\s]?day|formal notice)/.test(p)) return "draft_final"
  if (/(settle|settlement|discount|payoff|payoff offer)/.test(p)) return "draft_settlement"
  if (/(hardship|difficult|empath|care.?line|talk to a human|relief)/.test(p)) return "draft_hardship"
  if (/(welcome|onboard|activ|sign[-\s]?up)/.test(p)) return "draft_welcome"
  if (/(broken|missed|didn'?t pay|reschedul|new date|ptp|promise to pay)/.test(p)) return "draft_ptp"
  return "draft_reminder"
}

export function ComposerGptDialog({
  open,
  onClose,
  playbookId,
  lenderId,
  language,
  onInsertRows,
}: {
  open: boolean
  onClose: () => void
  playbookId: string
  lenderId: string
  language: "en" | "ar" | "bilingual"
  onInsertRows: (rows: BuilderRow[], opts: { subject?: string; smsVariant?: string; replace: boolean }) => void
}) {
  const [prompt, setPrompt] = React.useState("")
  /** Manual override of the inferred intent (set when user clicks a chip). */
  const [pickedIntent, setPickedIntent] = React.useState<ComposerIntent | null>(null)
  const [generating, setGenerating] = React.useState(false)
  const [preview, setPreview] = React.useState<{
    reasoning: string
    rows: BuilderRow[]
    subject?: string
    smsVariant?: string
  } | null>(null)
  const [replace, setReplace] = React.useState(true)
  const [lintResult, setLintResult] = React.useState<LintFinding[]>([])

  // Reset state every time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setPrompt("")
      setPickedIntent(null)
      setPreview(null)
      setLintResult([])
    }
  }, [open])

  const playbook = playbooksV3.find((p) => p.id === playbookId)
  /** What intent we'll actually use: manual pick > inferred from prompt > default. */
  const effectiveIntent: ComposerIntent =
    pickedIntent ?? (prompt.trim() ? inferIntent(prompt) : "draft_reminder")
  const effectivePreset = INTENT_PRESETS.find((p) => p.id === effectiveIntent)

  function handlePickIntent(id: ComposerIntent) {
    setPickedIntent(id)
    const preset = INTENT_PRESETS.find((p) => p.id === id)
    // Replace the prompt with the recommendation's seed so the user can tweak.
    if (preset) setPrompt(preset.seed)
  }

  function handleGenerate() {
    if (!prompt.trim() && !pickedIntent) {
      toast.error("Describe what you'd like, or pick a recommendation.")
      return
    }
    setGenerating(true)
    setPreview(null)
    setLintResult([])
    setTimeout(() => {
      const result = getCannedDraft(effectiveIntent, { lenderId, playbookId, language })
      const text = (result.rows ?? [])
        .flatMap((r) => r.columnsBlocks.flat())
        .filter((b) => b.kind === "text")
        .map((b) => (b.kind === "text" ? b.html.replace(/<[^>]*>/g, " ") : ""))
        .join(" ")
      if (playbook) {
        setLintResult(
          lintAgainstPlaybook(playbook, {
            subject: result.subject,
            body: text,
            channel: "email",
            embeddedDisclaimerIds: (result.rows ?? [])
              .flatMap((r) => r.columnsBlocks.flat())
              .map((b) => (b.kind === "saved_module" ? b.moduleId : ""))
              .filter(Boolean) as string[],
          }),
        )
      }
      setPreview({
        reasoning: result.reasoning,
        rows: result.rows ?? [],
        subject: result.subject,
        smsVariant: result.smsVariant,
      })
      setGenerating(false)
    }, 1100)
  }

  function handleInsert() {
    if (!preview) return
    onInsertRows(preview.rows, {
      subject: preview.subject,
      smsVariant: preview.smsVariant,
      replace,
    })
    onClose()
    setPreview(null)
    setPrompt("")
  }

  const lintSummary = preview ? findingsSummary(lintResult) : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Composer GPT
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* PROMPT — primary input. Always at the top. */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Describe the email you want
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                // Once the user starts editing, clear the manual pick so the
                // inferred intent takes over (unless they pick a chip again).
                if (pickedIntent && e.target.value !== INTENT_PRESETS.find((p) => p.id === pickedIntent)?.seed) {
                  setPickedIntent(null)
                }
              }}
              placeholder="e.g. 'A formal Mashreq payment reminder for borrowers 30 days overdue, include the regulatory disclaimer and a clear payment button'"
              className="min-h-[90px] text-[13px]"
              autoFocus
            />
            {prompt.trim() && effectivePreset && !pickedIntent && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3 text-emerald-400" />
                Detected intent: <span className="text-emerald-300">{effectivePreset.label}</span>
              </p>
            )}
          </div>

          {/* RECOMMENDATIONS — chips below the prompt. */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Or start from a recommendation
              </p>
              <span className="text-[10px] text-muted-foreground">click to use</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INTENT_PRESETS.map((p) => {
                const active = pickedIntent === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePickIntent(p.id)}
                    title={p.description}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                      active
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/60 text-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5",
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* CONTEXT — small footnote, no longer a hero. */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Steering by:</span>
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              {playbook?.name ?? playbookId}
            </Badge>
            <span>·</span>
            <Badge className="border-zinc-700 bg-zinc-800 text-zinc-200">
              {brandKits.find((b) => b.lenderId === lenderId)?.lenderName ?? "General"}
            </Badge>
            <span>·</span>
            <Badge className="border-zinc-700 bg-zinc-800 text-zinc-200">
              {language === "en" ? "English" : language === "ar" ? "Arabic" : "Bilingual"}
            </Badge>
          </div>

          {generating && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating per the {playbook?.name} playbook…
            </div>
          )}

          {/* Output preview */}
          {preview && (
            <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-[11px] text-emerald-300">{preview.reasoning}</p>
                </div>
              </div>
              {preview.subject && (
                <div className="rounded border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject
                  </p>
                  <p className="mt-0.5 text-[12px] text-foreground">{preview.subject}</p>
                </div>
              )}
              {preview.smsVariant && (
                <div className="rounded border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    SMS variant
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-foreground">{preview.smsVariant}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} ·{" "}
                {preview.rows.flatMap((r) => r.columnsBlocks.flat()).length} blocks
              </p>

              {/* Playbook lint */}
              {lintSummary && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-[11px]",
                    lintSummary.passes
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : lintSummary.errors > 0
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                  )}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {lintSummary.passes ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    Playbook lint:{" "}
                    {lintSummary.passes
                      ? "passes"
                      : `${lintSummary.errors} error(s)${lintSummary.warnings > 0 ? `, ${lintSummary.warnings} warning(s)` : ""}`}
                  </div>
                  {!lintSummary.passes && (
                    <p className="mt-1 text-[10px] opacity-80">
                      You can insert anyway and revise on the canvas — lint flags will follow the
                      blocks.
                    </p>
                  )}
                  {lintResult.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-4 text-[10px]">
                      {lintResult.slice(0, 3).map((f) => (
                        <li key={f.ruleId} className="list-disc">
                          {f.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Replace vs append */}
              <div className="flex items-center gap-3 text-[11px]">
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={replace}
                    onChange={() => setReplace(true)}
                    className="h-3 w-3 accent-emerald-500"
                  />
                  Replace canvas
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={!replace}
                    onChange={() => setReplace(false)}
                    className="h-3 w-3 accent-emerald-500"
                  />
                  Append to canvas
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-popover px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {preview ? (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Try again
              </Button>
              {lintSummary && !lintSummary.passes ? (
                <Button
                  onClick={handleInsert}
                  className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Insert anyway
                </Button>
              ) : (
                <Button onClick={handleInsert}>
                  Insert into canvas
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Generate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Inline AI assist ─────────────────────────

const INLINE_ACTIONS = [
  { id: "formal", label: "More formal", icon: Building2 },
  { id: "friendly", label: "More friendly", icon: Sparkles },
  { id: "shorten", label: "Shorten", icon: Scissors },
  { id: "translate_ar", label: "Translate to Arabic", icon: Languages },
  { id: "rewrite", label: "Rewrite for clarity", icon: Wand2 },
] as const

export function InlineAiDialog({
  open,
  onClose,
  currentHtml,
  onApply,
}: {
  open: boolean
  onClose: () => void
  currentHtml: string
  onApply: (newHtml: string) => void
}) {
  const [action, setAction] = React.useState<(typeof INLINE_ACTIONS)[number]["id"]>("formal")
  const [result, setResult] = React.useState<{ reasoning: string; html: string } | null>(null)
  const [busy, setBusy] = React.useState(false)

  function go() {
    setBusy(true)
    setResult(null)
    setTimeout(() => {
      const r = getInlineAssist(action, currentHtml)
      setResult({ reasoning: r.reasoning, html: r.replacementHtml })
      setBusy(false)
    }, 700)
  }

  function apply() {
    if (result) onApply(result.html)
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            AI assist · this block
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </p>
            <div className="grid grid-cols-3 gap-2">
              {INLINE_ACTIONS.map((a) => {
                const Icon = a.icon
                return (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-[11px] font-medium transition-colors",
                      action === a.id
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/60 text-foreground hover:border-zinc-700",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current
            </p>
            <div
              className="max-h-32 overflow-y-auto rounded-md border border-zinc-800 bg-white/95 p-3 text-[12px] text-zinc-900"
              dangerouslySetInnerHTML={{ __html: currentHtml }}
            />
          </div>
          {busy && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Reworking…
            </div>
          )}
          {result && (
            <div className="space-y-2">
              <p className="text-[11px] text-emerald-300">{result.reasoning}</p>
              <div
                className="max-h-40 overflow-y-auto rounded-md border border-emerald-500/30 bg-white/95 p-3 text-[12px] text-zinc-900"
                dangerouslySetInnerHTML={{ __html: result.html }}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {result ? (
            <Button onClick={apply}>Apply</Button>
          ) : (
            <Button onClick={go} disabled={busy}>
              <Sparkles className="h-3 w-3" />
              Generate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Merge tag picker ─────────────────────────

const MERGE_TAGS = [
  { tag: "{{borrower_name}}", label: "Borrower name", group: "Borrower" },
  { tag: "{{first_name}}", label: "First name", group: "Borrower" },
  { tag: "{{account_number}}", label: "Account number", group: "Deal" },
  { tag: "{{amount_due}}", label: "Amount due (AED)", group: "Deal" },
  { tag: "{{due_date}}", label: "Due date", group: "Deal" },
  { tag: "{{dpd}}", label: "Days past due", group: "Deal" },
  { tag: "{{payment_link}}", label: "Payment link (auto-resolved)", group: "Deal" },
  { tag: "{{settlement_amount}}", label: "Settlement amount", group: "Settlement" },
  { tag: "{{discount_percent}}", label: "Discount %", group: "Settlement" },
  { tag: "{{settlement_expiry}}", label: "Settlement expiry", group: "Settlement" },
  { tag: "{{callback_date}}", label: "Captured callback date", group: "AI Callback" },
  { tag: "{{callback_time}}", label: "Captured callback time", group: "AI Callback" },
  { tag: "{{lender_name}}", label: "Lender name", group: "Lender" },
  { tag: "{{care_phone}}", label: "Care line phone", group: "Lender" },
]

export function MergeTagDialog({
  open,
  onClose,
  onInsert,
}: {
  open: boolean
  onClose: () => void
  onInsert: (tag: string) => void
}) {
  const grouped = MERGE_TAGS.reduce<Record<string, typeof MERGE_TAGS>>((acc, t) => {
    if (!acc[t.group]) acc[t.group] = []
    acc[t.group].push(t)
    return acc
  }, {})
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Insert merge tag
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, tags]) => (
            <div key={group}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="grid grid-cols-1 gap-1">
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => {
                      onInsert(t.tag)
                      onClose()
                    }}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-left text-[11px] hover:border-emerald-500/40"
                  >
                    <span className="font-mono text-[10px] text-emerald-300">{t.tag}</span>
                    <span className="text-muted-foreground">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Conditional content ────────────────────────

const CONDITIONAL_ATTRS = [
  { id: "dpd", label: "Days past due", values: ["0-30", "31-60", "61-90", "91-180", "180+"] },
  { id: "lender", label: "Lender", values: ["Mashreq", "Tamara", "CashNow", "ENBD", "FAB"] },
  { id: "language", label: "Preferred language", values: ["English", "Arabic"] },
  { id: "ptp_status", label: "PTP status", values: ["active", "broken", "none"] },
  { id: "balance_bucket", label: "Outstanding balance", values: ["<1k", "1k-5k", "5k-25k", "25k+"] },
]

export function ConditionalDialog({
  open,
  onClose,
  block,
  onSave,
}: {
  open: boolean
  onClose: () => void
  block: BuilderBlock | null
  onSave: (cfg: BuilderBlock["conditional"]) => void
}) {
  const [combine, setCombine] = React.useState<"AND" | "OR">("AND")
  const [rules, setRules] = React.useState<
    Array<{ attributeId: string; operator: "one_of" | "none_of"; values: string[] }>
  >([])
  const [showWhenMatch, setShowWhenMatch] = React.useState(true)

  React.useEffect(() => {
    if (block?.conditional) {
      setCombine(block.conditional.combine)
      setRules(
        block.conditional.rules.map((r) => ({
          attributeId: r.attributeId,
          operator: r.operator === "none_of" ? "none_of" : "one_of",
          values: r.values,
        })),
      )
      setShowWhenMatch(block.conditional.showWhenMatch)
    } else {
      setRules([])
    }
  }, [block])

  function addRule() {
    setRules([...rules, { attributeId: "dpd", operator: "one_of", values: [] }])
  }
  function removeRule(i: number) {
    setRules(rules.filter((_, idx) => idx !== i))
  }

  if (!block) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranchPlus className="h-4 w-4 text-violet-400" />
            Conditional content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">
            Show this block only when the borrower's attributes match. Same operators as Journey
            Builder Decision Split — One Of / None Of, AND / OR.
          </p>

          <div className="space-y-2">
            {rules.map((r, i) => {
              const attr = CONDITIONAL_ATTRS.find((a) => a.id === r.attributeId)
              return (
                <div key={i} className="flex items-center gap-2 rounded-md border border-violet-500/30 bg-violet-500/5 p-2">
                  <select
                    value={r.attributeId}
                    onChange={(e) => {
                      const copy = [...rules]
                      copy[i] = { ...copy[i], attributeId: e.target.value, values: [] }
                      setRules(copy)
                    }}
                    className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px]"
                  >
                    {CONDITIONAL_ATTRS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={r.operator}
                    onChange={(e) => {
                      const copy = [...rules]
                      copy[i] = { ...copy[i], operator: e.target.value as "one_of" | "none_of" }
                      setRules(copy)
                    }}
                    className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px]"
                  >
                    <option value="one_of">One of</option>
                    <option value="none_of">None of</option>
                  </select>
                  <div className="flex flex-1 flex-wrap gap-1">
                    {attr?.values.map((v) => {
                      const active = r.values.includes(v)
                      return (
                        <button
                          key={v}
                          onClick={() => {
                            const copy = [...rules]
                            copy[i] = {
                              ...copy[i],
                              values: active
                                ? copy[i].values.filter((x) => x !== v)
                                : [...copy[i].values, v],
                            }
                            setRules(copy)
                          }}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            active ? "bg-violet-500 text-white" : "bg-zinc-800 text-muted-foreground",
                          )}
                        >
                          {v}
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={() => removeRule(i)} className="text-muted-foreground hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={addRule}>
              <Plus className="h-3 w-3" />
              Add rule
            </Button>
          </div>

          {rules.length > 1 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Combine rules with
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCombine("AND")}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-[11px] font-medium",
                    combine === "AND" ? "border-violet-500/40 bg-violet-500/10 text-violet-300" : "border-zinc-800 bg-zinc-900/60 text-foreground",
                  )}
                >
                  AND
                </button>
                <button
                  onClick={() => setCombine("OR")}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-[11px] font-medium",
                    combine === "OR" ? "border-violet-500/40 bg-violet-500/10 text-violet-300" : "border-zinc-800 bg-zinc-900/60 text-foreground",
                  )}
                >
                  OR
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              When rules match
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWhenMatch(true)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[11px] font-medium",
                  showWhenMatch ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 bg-zinc-900/60 text-foreground",
                )}
              >
                Show block
              </button>
              <button
                onClick={() => setShowWhenMatch(false)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[11px] font-medium",
                  !showWhenMatch ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-zinc-800 bg-zinc-900/60 text-foreground",
                )}
              >
                Hide block
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onSave(undefined)}>
            Remove condition
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (rules.length === 0) {
                onSave(undefined)
              } else {
                onSave({
                  combine,
                  rules: rules.map((r) => ({
                    attributeId: r.attributeId,
                    operator: r.operator,
                    values: r.values,
                  })),
                  showWhenMatch,
                })
              }
              onClose()
            }}
          >
            Save condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Preview & test ───────────────────────────

const PREVIEW_MODES = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "dark", label: "Dark mode", icon: Moon },
  { id: "gmail", label: "Gmail (web)", icon: Mail },
  { id: "outlook", label: "Outlook (web)", icon: Inbox },
] as const

export function PreviewTestDialog({
  open,
  onClose,
  doc,
  renderCanvas,
}: {
  open: boolean
  onClose: () => void
  doc: BuilderDocument
  renderCanvas: (mode: { dark: boolean; width: number }) => React.ReactNode
}) {
  const [mode, setMode] = React.useState<(typeof PREVIEW_MODES)[number]["id"]>("desktop")
  const [testEmail, setTestEmail] = React.useState("asad.sidiqqi@cleargrid.co")
  const [testSent, setTestSent] = React.useState(false)
  const isDark = mode === "dark"
  const width = mode === "mobile" ? 320 : 600

  const checks = [
    { id: "spam", label: "Spam score", value: "2.1 / 10", icon: ShieldCheck, ok: true, detail: "Low risk — passes major filters." },
    { id: "links", label: "Link audit", value: "3 of 3 resolve", icon: Link2, ok: true, detail: "All trackable links resolve. {{payment_link}} is recognised as a payment CTA." },
    { id: "a11y", label: "Accessibility", value: "2 minor issues", icon: Accessibility, ok: false, detail: "Image missing alt text · Contrast ratio 3.8:1 on grey text." },
    { id: "img", label: "Images", value: "All resolved", icon: Eye, ok: true, detail: "Brand kit logo loads on light + dark." },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview & test
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_280px] gap-4">
          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-1 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
              {PREVIEW_MODES.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                      mode === m.id ? "bg-zinc-800 text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {m.label}
                  </button>
                )
              })}
            </div>
            <div
              className={cn(
                "flex max-h-[480px] overflow-y-auto rounded-md border p-6",
                isDark ? "border-zinc-700 bg-zinc-900" : "border-zinc-300 bg-zinc-100",
              )}
            >
              <div className="mx-auto" style={{ width }}>
                {renderCanvas({ dark: isDark, width })}
              </div>
            </div>
          </div>

          {/* Right: checks + send-a-test */}
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pre-flight checks
              </p>
              <div className="space-y-1.5">
                {checks.map((c) => {
                  const Icon = c.icon
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "rounded-md border px-2.5 py-2 text-[10px]",
                        c.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <Icon className={cn("h-3 w-3", c.ok ? "text-emerald-400" : "text-amber-400")} />
                          {c.label}
                        </span>
                        <span className={cn(c.ok ? "text-emerald-300" : "text-amber-300")}>{c.value}</span>
                      </div>
                      <p className="mt-1 leading-snug text-muted-foreground">{c.detail}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-md border border-border bg-zinc-900/60 p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Send a test
              </p>
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-7 text-[11px]"
              />
              <Button
                size="sm"
                className="mt-2 h-7 w-full text-[11px]"
                onClick={() => {
                  setTestSent(true)
                  setTimeout(() => setTestSent(false), 2400)
                }}
              >
                <Mail className="h-3 w-3" />
                Send test
              </Button>
              {testSent && (
                <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-300">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Test sent.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── A/B test ─────────────────────────────────

export function AbTestDialog({
  open,
  onClose,
  templateId,
}: {
  open: boolean
  onClose: () => void
  templateId: string
}) {
  const existing = abTests.find((t) => t.templateId === templateId)
  const [test, setTest] = React.useState<AbTest | null>(existing ?? null)
  const [creating, setCreating] = React.useState(!existing)

  function startNew() {
    setCreating(true)
    setTest({
      id: `ab-new-${templateId}`,
      templateId,
      name: "New A/B test",
      variants: [
        { label: "A: Control", subject: "", allocationPct: 50 },
        { label: "B: Variant", subject: "", allocationPct: 50 },
      ],
      goal: "paid",
      status: "running",
      startedAt: new Date().toISOString(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            A/B testing
          </DialogTitle>
        </DialogHeader>
        {!test ? (
          <div className="space-y-4">
            <p className="text-[12px] text-muted-foreground">
              Test subject or content variants against the payment-outcome funnel. Optimise for
              recovered AED — not opens.
            </p>
            <Button onClick={startNew}>
              <Plus className="h-3.5 w-3.5" />
              Start a new test
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                Goal · {test.goal}
              </Badge>
              <Badge className={test.status === "running" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-800 text-zinc-300"}>
                Status · {test.status}
              </Badge>
              {test.confidence != null && (
                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                  Confidence · {(test.confidence * 100).toFixed(0)}%
                </Badge>
              )}
              {test.decidedWinnerLabel && (
                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  Winner · {test.decidedWinnerLabel}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {test.variants.map((v, i) => (
                <div key={i} className="rounded-md border border-border bg-zinc-900/60 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-foreground">{v.label}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {v.allocationPct}% allocation
                    </span>
                  </div>
                  <Input
                    value={v.subject}
                    placeholder="Subject line for this variant"
                    onChange={(e) => {
                      const copy = { ...test }
                      copy.variants = [...copy.variants]
                      copy.variants[i] = { ...copy.variants[i], subject: e.target.value }
                      setTest(copy)
                    }}
                    className="h-7 text-[11px]"
                  />
                  {v.conversionPct != null && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{v.sent?.toLocaleString()} sent</span>
                      <span className="text-emerald-300">
                        {v.conversionPct.toFixed(1)}% → {test.goal}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
              <strong>Goal-aware:</strong> conversion is measured against the message-analytics
              funnel's bottom stage (paid / PTPs / settlements). Opens and clicks are not the goal
              — see the messages list for the goal definition per purpose.
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {test && creating && <Button>Start test</Button>}
          {test && !creating && test.status === "running" && (
            <Button variant="outline">Pause test</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Version history ───────────────────────────

export function VersionHistoryDialog({
  open,
  onClose,
  templateId,
}: {
  open: boolean
  onClose: () => void
  templateId: string
}) {
  const authoring = templateAuthoring[templateId]
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version history & audit trail
          </DialogTitle>
        </DialogHeader>
        {!authoring ? (
          <p className="text-[12px] text-muted-foreground">No versions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-zinc-900/60 px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">Current:</span>
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                {authoring.currentVersion}
              </Badge>
              <span className="text-muted-foreground">·</span>
              <span>
                Approved by {authoring.approval.approvedBy ?? "—"}
                {authoring.approval.approvedAt && ` on ${formatDate(authoring.approval.approvedAt)}`}
              </span>
            </div>
            <ol className="space-y-2">
              {authoring.versions.map((v) => (
                <li key={v.versionLabel} className="rounded-md border border-border bg-zinc-900/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="border-zinc-700 bg-zinc-800 text-zinc-200">{v.versionLabel}</Badge>
                      {v.statusTransition && (
                        <Badge className={TEMPLATE_STATUS_COLOR[v.statusTransition]}>
                          {TEMPLATE_STATUS_LABEL[v.statusTransition]}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(v.at)} · {v.by}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-foreground">{v.changeSummary}</p>
                </li>
              ))}
            </ol>
            <p className="text-[10px] text-muted-foreground">
              Audit trail records maker/checker for each transition. Compliance can replay any
              version that ever went Active.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─────────────────────────── Create journey from composer ───────────

export function CreateJourneyDialog({
  open,
  onClose,
  templateName,
  audienceLabel,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  templateName: string
  audienceLabel: string
  /** Called with the chosen blueprint id so the parent can navigate. */
  onConfirm: (blueprint: "none" | "reminder_3step" | "ptp_recovery" | "settlement_push") => void
}) {
  const [blueprint, setBlueprint] = React.useState<"none" | "reminder_3step" | "ptp_recovery" | "settlement_push">("none")

  const blueprints = [
    {
      id: "none" as const,
      label: "Just a Send node",
      description: "Single Send node with the composed template. You wire the trigger and exit.",
    },
    {
      id: "reminder_3step" as const,
      label: "3-step Reminder cadence",
      description: "Send → wait 3d → Send (SMS variant) → wait 2d → Send (final), with payment-detect exit.",
    },
    {
      id: "ptp_recovery" as const,
      label: "PTP recovery branch",
      description: "Send → Decision Split on PTP status → either confirm path or escalate path.",
    },
    {
      id: "settlement_push" as const,
      label: "Settlement push",
      description: "Send settlement offer → wait → Send reminder → wait → AI call with callback capture.",
    },
  ]
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Create journey from this template
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px]">
            <p className="font-medium text-emerald-300">Pre-filled draft</p>
            <ul className="mt-1 space-y-0.5 text-emerald-300/80">
              <li>· Audience: {audienceLabel}</li>
              <li>· First Send node template: {templateName}</li>
              <li>· Playbook + brand kit inherited from this template</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Blueprint
            </p>
            <div className="space-y-1.5">
              {blueprints.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBlueprint(b.id)}
                  className={cn(
                    "block w-full rounded-md border px-3 py-2 text-left transition-colors",
                    blueprint === b.id ? "border-emerald-500/40 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700",
                  )}
                >
                  <p className="text-[12px] font-medium text-foreground">{b.label}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{b.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
            You'll land in the Journey Builder on a <strong>Draft</strong>. Review, extend, then
            activate. No borrowers are enrolled until you do.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(blueprint)}>
            <ArrowRight className="h-3 w-3" />
            Open Journey Builder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Playbook lint sidebar ────────────────────────

export function PlaybookLintBar({
  playbook,
  doc,
}: {
  playbook: Playbook | undefined
  doc: BuilderDocument
}) {
  if (!playbook) return null
  // Extract plain body + subject from doc.
  const body = doc.rows
    .flatMap((r) => r.columnsBlocks.flat())
    .filter((b) => b.kind === "text" || b.kind === "custom_html")
    .map((b) => {
      const html = (b as { html?: string }).html ?? ""
      return html.replace(/<[^>]+>/g, " ")
    })
    .join("\n")

  const moduleIds = doc.rows
    .flatMap((r) => r.columnsBlocks.flat())
    .filter((b) => b.kind === "saved_module")
    .map((b) => (b as { moduleId: string }).moduleId)

  const findings = lintAgainstPlaybook(playbook, {
    body,
    channel: "email",
    embeddedDisclaimerIds: moduleIds,
  })
  const summary = findingsSummary(findings)

  return (
    <div className="border-t border-border bg-zinc-950/80 px-4 py-2 text-[11px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {summary.passes ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Playbook lint: passes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-300">
              <AlertTriangle className="h-3 w-3" />
              Playbook lint: {summary.errors} error(s)
            </span>
          )}
          {summary.warnings > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              {summary.warnings} warning(s)
            </span>
          )}
          {summary.infos > 0 && (
            <span className="inline-flex items-center gap-1 text-blue-300">{summary.infos} info</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          Against <strong className="text-foreground">{playbook.name}</strong> ·{" "}
          {PLAYBOOK_TONE_LABEL[playbook.tone]} tone
        </span>
      </div>
      {!summary.passes && (
        <ul className="mt-1.5 space-y-0.5 pl-4 text-[10px] text-red-300">
          {findings
            .filter((f) => f.severity === "error")
            .slice(0, 3)
            .map((f) => (
              <li key={f.ruleId} className="list-disc">
                {f.message}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
