"use client"

import * as React from "react"
import {
  Sparkles,
  RefreshCw,
  Wand2,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { generateVariants, type Tone, type Length, type GeneratedDraft } from "@/data/composer-ai-variants"

export interface HelpMeWriteResult {
  subject: string
  previewText: string
  body: string
}

interface HelpMeWriteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (result: HelpMeWriteResult) => void
}

type Phase = "idle" | "typing" | "ready"

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "firm", label: "Firm" },
  { value: "empathetic", label: "Empathetic" },
  { value: "urgent", label: "Urgent" },
]

const LENGTHS: { value: Length; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
]

function pickDraft(tone: Tone, seed: number): GeneratedDraft {
  const pool = generateVariants[tone]
  return pool[seed % pool.length]
}

function refineDraft(draft: GeneratedDraft, label: string): GeneratedDraft {
  // Prototype refinement: lightly tweak the subject line and body preface.
  switch (label) {
    case "Formalize":
      return {
        ...draft,
        subject: draft.subject.replace(/^Hi /i, "Notice: "),
        body: draft.body.replace(/^(Hi|Hey|Hello)[^,\n]*,\n/i, "Dear {{borrower_name}},\n"),
      }
    case "Shorten":
      return {
        ...draft,
        body: draft.body.split("\n").slice(0, 4).join("\n") + "\n\nClearGrid Collections",
      }
    case "Elaborate":
      return {
        ...draft,
        body:
          draft.body +
          "\n\nYou can also reach out to our hardship assistance team anytime at {{contact_number}} to discuss tailored payment plans or temporary relief options.",
      }
    case "Make more empathetic":
      return {
        ...draft,
        subject: "We understand — let's find a way forward, {{borrower_name}}",
        body:
          "Dear {{borrower_name}},\n\nWe know that dealing with finances isn't always easy, and we want to make this as stress-free as possible for you.\n\n" +
          draft.body.replace(/^(Dear|Hi|Hello)[^,\n]*,\n\n?/i, ""),
      }
    case "Add urgency":
      return {
        ...draft,
        subject: "URGENT: " + draft.subject,
        body:
          draft.body +
          "\n\n⚠ Please act within 48 hours to avoid further escalation of your account.",
      }
    default:
      return draft
  }
}

export function HelpMeWriteDialog({
  open,
  onOpenChange,
  onInsert,
}: HelpMeWriteDialogProps) {
  const [prompt, setPrompt] = React.useState("")
  const [tone, setTone] = React.useState<Tone>("professional")
  const [length, setLength] = React.useState<Length>("medium")
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [typed, setTyped] = React.useState("")
  const [draft, setDraft] = React.useState<GeneratedDraft | null>(null)
  const [seed, setSeed] = React.useState(0)
  const typingTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!open) {
      setPhase("idle")
      setTyped("")
      setDraft(null)
      setPrompt("")
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }
  }, [open])

  const runTyping = React.useCallback((finalDraft: GeneratedDraft) => {
    setPhase("typing")
    setTyped("")
    const target = finalDraft.body
    // Type in chunks for snappy effect
    const chunkSize = Math.max(4, Math.floor(target.length / 60))
    let i = 0
    const step = () => {
      i = Math.min(target.length, i + chunkSize)
      setTyped(target.slice(0, i))
      if (i < target.length) {
        typingTimerRef.current = window.setTimeout(step, 24)
      } else {
        setPhase("ready")
      }
    }
    step()
  }, [])

  const handleGenerate = React.useCallback(() => {
    const d = pickDraft(tone, seed)
    setDraft(d)
    runTyping(d)
  }, [tone, seed, runTyping])

  const handleRecreate = React.useCallback(() => {
    const nextSeed = seed + 1
    setSeed(nextSeed)
    const d = pickDraft(tone, nextSeed)
    setDraft(d)
    runTyping(d)
  }, [seed, tone, runTyping])

  const handleRefine = React.useCallback(
    (label: string) => {
      if (!draft) return
      const refined = refineDraft(draft, label)
      setDraft(refined)
      runTyping(refined)
    },
    [draft, runTyping]
  )

  const handleInsert = React.useCallback(() => {
    if (!draft) return
    onInsert({
      subject: draft.subject,
      previewText: draft.preview,
      body: draft.body,
    })
    onOpenChange(false)
  }, [draft, onInsert, onOpenChange])

  const busy = phase === "typing"

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Help me write
          </DialogTitle>
          <DialogDescription>
            Tell the AI what you want to say. It will write a draft you can edit.
          </DialogDescription>
        </DialogHeader>

        {/* ---- Prompt + options ---- */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              What do you want to say?
            </Label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A friendly payment reminder for borrowers more than 60 days past due"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Tone
              </Label>
              <Select
                value={tone}
                onValueChange={(v) => setTone(((v ?? "professional") as Tone))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Length
              </Label>
              <Select
                value={length}
                onValueChange={(v) => setLength(((v ?? "medium") as Length))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENGTHS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={busy}
            className="w-full"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        {/* ---- Generated preview ---- */}
        {(phase === "typing" || phase === "ready") && draft && (
          <div className="space-y-2.5">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </div>
              <div className="mb-3 font-heading text-sm font-medium text-foreground">
                {draft.subject}
              </div>

              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Body
              </div>
              <div
                className={cn(
                  "max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground transition-opacity",
                  phase === "typing" && "text-muted-foreground"
                )}
              >
                {phase === "typing" ? typed : draft.body}
                {phase === "typing" && (
                  <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-primary align-middle" />
                )}
              </div>
            </div>

            {phase === "ready" && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRecreate}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recreate
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                    <Wand2 className="h-3.5 w-3.5" />
                    Refine
                    <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {[
                      "Formalize",
                      "Elaborate",
                      "Shorten",
                      "Make more empathetic",
                      "Add urgency",
                    ].map((label) => (
                      <DropdownMenuItem
                        key={label}
                        onClick={() => handleRefine(label)}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" className="ml-auto" onClick={handleInsert}>
                  <Check className="h-3.5 w-3.5" />
                  Insert
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
