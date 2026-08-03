"use client"

/**
 * VariationsPanel — the tabbed workspace at the top of the email composer.
 *
 * Design intent (post-rewrite):
 *   - Browser-tab shape: each tab shows the variation label chip + subject
 *     preview + split %. The active tab is filled with the variation's
 *     accent color and visually connects to the editor content below.
 *   - Per-variation accent colors (teal, violet, amber, sky, rose, emerald)
 *     — used both on the tab and as a 3px left stripe wrapping the
 *     editor content so authors always know which variation they're on.
 *   - Diff indicators — small dots on the tab flag when a variation
 *     differs from A on subject / sender / template. Answers "did I
 *     actually configure B, or is it still a copy of A?"
 *   - Inline rename — double-click a tab label to edit.
 *   - Traffic split + Test settings live in a compact toolbar to the
 *     right of the tabs, not mixed into the tab strip.
 */

import * as React from "react"
import {
  AlertTriangle,
  BarChart3,
  Check,
  Clock,
  Copy,
  Percent,
  Plus,
  Sliders,
  Target,
  Trophy,
  X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type {
  CampaignVariation,
  ComposerState,
  WinnerMetric,
} from "@/components/composer/composer-view"

interface VariationsPanelProps {
  state: ComposerState
  update: <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void
  /**
   * The per-variation editor content (sender picker, email mode selector,
   * subject, body, template canvas, etc). Rendered inside the same border
   * as the tab strip so the tabs visually own the content below and the
   * accent left-stripe flows from the toolbar all the way down.
   */
  children?: React.ReactNode
}

const NEXT_LABEL = ["A", "B", "C", "D", "E", "F"]

/* ────────────────────────────────────────────────────────────────────── */
/*  Per-variation accent palette                                          */
/* ────────────────────────────────────────────────────────────────────── */

export interface VariationAccent {
  key: string
  /** Hex used inline for the left stripe (bypasses Tailwind's static class scan). */
  hex: string
  /** Tailwind classes for the tab (active state) — bg + text + border. */
  activeBg: string
  activeText: string
  activeBorder: string
  /** Inactive tab hover tint. */
  hoverBg: string
  /** Small chip color for the letter avatar. */
  chipBg: string
  chipText: string
}

const ACCENTS: VariationAccent[] = [
  { key: "teal",    hex: "#069495", activeBg: "bg-primary/12", activeText: "text-primary", activeBorder: "border-primary/60", hoverBg: "hover:bg-primary/8", chipBg: "bg-primary/20", chipText: "text-primary" },
  { key: "violet",  hex: "#A78BFA", activeBg: "bg-violet-500/12", activeText: "text-violet-300", activeBorder: "border-violet-500/60", hoverBg: "hover:bg-violet-500/8", chipBg: "bg-violet-500/20", chipText: "text-violet-300" },
  { key: "amber",   hex: "#F0B529", activeBg: "bg-warning-500/12", activeText: "text-warning-300", activeBorder: "border-warning-500/60", hoverBg: "hover:bg-warning-500/8", chipBg: "bg-warning-500/20", chipText: "text-warning-300" },
  { key: "sky",     hex: "#5E9CF1", activeBg: "bg-info-500/12", activeText: "text-info-300", activeBorder: "border-info-500/60", hoverBg: "hover:bg-info-500/8", chipBg: "bg-info-500/20", chipText: "text-info-300" },
  { key: "rose",    hex: "#F4798B", activeBg: "bg-error-500/12", activeText: "text-error-300", activeBorder: "border-error-500/60", hoverBg: "hover:bg-error-500/8", chipBg: "bg-error-500/20", chipText: "text-error-300" },
  { key: "emerald", hex: "#4FC27F", activeBg: "bg-success-500/12", activeText: "text-success-300", activeBorder: "border-success-500/60", hoverBg: "hover:bg-success-500/8", chipBg: "bg-success-500/20", chipText: "text-success-300" },
]

/** Return the accent for a variation by its position in the list. */
export function accentFor(index: number): VariationAccent {
  return ACCENTS[index % ACCENTS.length]
}

export function accentForVariation(
  variations: CampaignVariation[],
  variationId: string,
): VariationAccent {
  const idx = variations.findIndex((v) => v.id === variationId)
  return accentFor(Math.max(0, idx))
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Diff helper — flags what changed vs variation A                       */
/* ────────────────────────────────────────────────────────────────────── */

type DiffKey = "subject" | "sender" | "template"

function computeDiffs(
  variation: CampaignVariation,
  reference: CampaignVariation | undefined,
): DiffKey[] {
  if (!reference || variation.id === reference.id) return []
  const diffs: DiffKey[] = []
  if ((variation.subject || "") !== (reference.subject || "")) diffs.push("subject")
  const sameSender =
    (variation.senderProfileId ?? null) === (reference.senderProfileId ?? null) &&
    (variation.senderFromName ?? "") === (reference.senderFromName ?? "") &&
    (variation.senderFromEmail ?? "") === (reference.senderFromEmail ?? "")
  if (!sameSender) diffs.push("sender")
  if ((variation.richTemplateId ?? null) !== (reference.richTemplateId ?? null))
    diffs.push("template")
  return diffs
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Panel                                                                 */
/* ────────────────────────────────────────────────────────────────────── */

export function VariationsPanel({ state, update, children }: VariationsPanelProps) {
  const variations = state.variations
  const testing = variations.length > 1 || state.holdoutPct > 0
  const splitSum = variations.reduce((acc, v) => acc + v.splitPct, 0)
  const splitValid = splitSum === 100
  const usableForVariations = 100 - state.holdoutPct
  const activeIdx = Math.max(
    0,
    variations.findIndex((v) => v.id === state.activeVariationId),
  )
  const referenceA = variations[0]

  /* --------------- Variation switching --------------- */

  function switchVariation(nextId: string) {
    if (nextId === state.activeVariationId) return
    const outgoingIdx = variations.findIndex((v) => v.id === state.activeVariationId)
    let nextVariations = variations
    if (outgoingIdx >= 0) {
      nextVariations = variations.map((v, i) =>
        i === outgoingIdx
          ? {
              ...v,
              subject: state.subject,
              preheader: state.previewText,
              body: state.body,
              emailMode: state.emailMode,
              richTemplateId: state.richTemplateId,
              richSlotValues: state.richSlotValues,
              useBlocks: state.useBlocks,
              emailBlocks: state.emailBlocks,
            }
          : v,
      )
    }
    const incoming = nextVariations.find((v) => v.id === nextId)
    update("variations", nextVariations)
    update("activeVariationId", nextId)
    if (incoming) {
      update("subject", incoming.subject)
      update("previewText", incoming.preheader)
      update("body", incoming.body)
      if (incoming.emailMode) update("emailMode", incoming.emailMode)
      update("richTemplateId", incoming.richTemplateId ?? null)
      update("richSlotValues", incoming.richSlotValues ?? {})
      update("useBlocks", incoming.useBlocks ?? false)
      update("emailBlocks", incoming.emailBlocks ?? [])
      toast.info(`Switched to Variation ${incoming.label}`, {
        description: incoming.subject
          ? `Subject: ${incoming.subject.slice(0, 60)}${incoming.subject.length > 60 ? "…" : ""}`
          : "Empty variation — start editing.",
        duration: 1400,
      })
    }
  }

  function addVariation(copyFromId?: string) {
    const current: CampaignVariation[] = variations.map((v) =>
      v.id === state.activeVariationId
        ? {
            ...v,
            subject: state.subject,
            preheader: state.previewText,
            body: state.body,
            emailMode: state.emailMode,
            richTemplateId: state.richTemplateId,
            richSlotValues: state.richSlotValues,
            useBlocks: state.useBlocks,
            emailBlocks: state.emailBlocks,
          }
        : v,
    )
    const source = copyFromId
      ? current.find((v) => v.id === copyFromId)
      : undefined
    const label = NEXT_LABEL[current.length] ?? `V${current.length + 1}`
    const id = `var-${label.toLowerCase()}-${Date.now().toString(36)}`
    const equal = Math.floor(100 / (current.length + 1))
    const remainder = 100 - equal * (current.length + 1)
    const withEvenSplits = current.map((v, i) => ({
      ...v,
      splitPct: i === 0 ? equal + remainder : equal,
    }))
    const newVariation: CampaignVariation = {
      id,
      label,
      splitPct: equal,
      subject: source?.subject ?? "",
      preheader: source?.preheader ?? "",
      body: source?.body ?? "",
      emailMode: source?.emailMode ?? "template",
      richTemplateId: source?.richTemplateId ?? null,
      richSlotValues: source?.richSlotValues ?? {},
      useBlocks: source?.useBlocks ?? false,
      emailBlocks: source?.emailBlocks ?? [],
    }
    const nextVariations = [...withEvenSplits, newVariation]
    update("variations", nextVariations)
    update("activeVariationId", id)
    update("subject", newVariation.subject)
    update("previewText", newVariation.preheader)
    update("body", newVariation.body)
    update("emailMode", newVariation.emailMode ?? "template")
    update("richTemplateId", newVariation.richTemplateId ?? null)
    update("richSlotValues", newVariation.richSlotValues ?? {})
    update("useBlocks", newVariation.useBlocks ?? false)
    update("emailBlocks", newVariation.emailBlocks ?? [])
    toast.success(`Added Variation ${label}`, {
      description: source
        ? `Copied from Variation ${source.label}. Tweak to differentiate.`
        : "Blank slate. Configure sender, template, subject, body.",
    })
  }

  function deleteVariation(id: string) {
    if (variations.length <= 1) return
    const remaining = variations.filter((v) => v.id !== id)
    const equal = Math.floor(100 / remaining.length)
    const remainder = 100 - equal * remaining.length
    const rebalanced = remaining.map((v, i) => ({
      ...v,
      splitPct: i === 0 ? equal + remainder : equal,
    }))
    update("variations", rebalanced)
    if (state.activeVariationId === id) {
      const next = rebalanced[0]
      update("activeVariationId", next.id)
      update("subject", next.subject)
      update("previewText", next.preheader)
      update("body", next.body)
      if (next.emailMode) update("emailMode", next.emailMode)
      update("richTemplateId", next.richTemplateId ?? null)
      update("richSlotValues", next.richSlotValues ?? {})
      update("useBlocks", next.useBlocks ?? false)
      update("emailBlocks", next.emailBlocks ?? [])
    }
  }

  function renameVariation(id: string, label: string) {
    update(
      "variations",
      variations.map((v) => (v.id === id ? { ...v, label: label.trim() || v.label } : v)),
    )
  }

  function updateSplit(id: string, splitPct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(splitPct)))
    update(
      "variations",
      variations.map((v) => (v.id === id ? { ...v, splitPct: clamped } : v)),
    )
  }

  const activeAccent = accentFor(activeIdx)
  const activeVariation = variations[activeIdx]

  return (
    <div
      className="overflow-hidden rounded-lg border border-border transition-colors"
      style={{ borderLeftColor: activeAccent.hex, borderLeftWidth: 3 }}
    >
      {/* ── Toolbar row: label + actions ───────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/[0.04] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Variations
          </span>
          <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
            {variations.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {variations.length < NEXT_LABEL.length && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addVariation()}
                className="h-7 text-[11px]"
              >
                <Plus className="h-3 w-3" />
                Add variation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addVariation(state.activeVariationId)}
                className="h-7 text-[11px]"
              >
                <Copy className="h-3 w-3" />
                Copy active
              </Button>
            </>
          )}
          <TestSettingsButton state={state} update={update} />
        </div>
      </div>

      {/* ── Tab strip ─────────────────────────────────────────────── */}
      <div
        className="flex items-end gap-0 overflow-x-auto px-2 pt-2"
        style={{
          background: `linear-gradient(to bottom, ${activeAccent.hex}0A, transparent)`,
        }}
      >
        {variations.map((v, i) => {
          const accent = accentFor(i)
          const active = v.id === state.activeVariationId
          const diffs = computeDiffs(v, referenceA)
          return (
            <VariationTab
              key={v.id}
              variation={v}
              accent={accent}
              active={active}
              diffs={diffs}
              canDelete={variations.length > 1}
              onSelect={() => switchVariation(v.id)}
              onRename={(label) => renameVariation(v.id, label)}
              onDelete={() => deleteVariation(v.id)}
              onUpdateSplit={(pct) => updateSplit(v.id, pct)}
              showSplit={variations.length > 1}
            />
          )
        })}
      </div>

      {/* ── Below-tab status row ─────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/40 px-3 py-2 text-[10px]"
        style={{ background: `${activeAccent.hex}0A` }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: `${activeAccent.hex}22`, color: activeAccent.hex }}
          >
            {activeVariation?.label?.slice(0, 1)?.toUpperCase() ?? "A"}
          </span>
          <span className="text-foreground">
            Editing Variation{" "}
            <span className="font-semibold" style={{ color: activeAccent.hex }}>
              {activeVariation?.label ?? "A"}
            </span>
          </span>
          {variations.length > 1 && activeVariation && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground tabular-nums">
                {activeVariation.splitPct}% of audience
              </span>
            </>
          )}
        </div>

        {variations.length > 1 && (
          <div className="ml-auto flex items-center gap-2">
            {state.holdoutPct > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning-500/30 bg-warning-500/5 px-1.5 py-0.5 text-warning-300">
                <Target className="h-2.5 w-2.5" />
                Holdout {state.holdoutPct}%
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 tabular-nums",
                splitValid
                  ? "border-success-500/30 bg-success-500/5 text-success-300"
                  : "border-error-500/30 bg-error-500/5 text-error-300",
              )}
            >
              {splitValid ? (
                <>
                  <Check className="h-2.5 w-2.5" />
                  Splits total {splitSum}%
                </>
              ) : (
                <>
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Total {splitSum}% — must be 100
                </>
              )}
            </span>
          </div>
        )}

        {testing && (
          <div className="basis-full flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-2.5 w-2.5" />
              Winner metric:{" "}
              <span className="text-foreground">
                {state.winnerMetric === "payment_conversion" ? "Payment conversion" : "Click-through"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Test window: <span className="text-foreground">{state.testWindowHours}h</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Sliders className="h-2.5 w-2.5" />
              Auto-winner: <span className="text-foreground">{state.autoWinner ? "On" : "Off"}</span>
            </span>
            {state.autoWinner && (
              <span className="inline-flex items-center gap-1 text-success-300">
                → Remaining audience gets the winner after {state.testWindowHours}h.
              </span>
            )}
            {state.holdoutPct > 0 && (
              <span className="basis-full text-muted-foreground">
                Of the {usableForVariations}% receiving the campaign, tab splits allocate the mix.
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Per-variation editor content — same container, so the tab
             strip visually owns everything below it. A thin vertical
             accent line inside the padding reinforces the identity as
             the user scrolls through subject/body. ────────────────── */}
      {children && (
        <div className="relative bg-card/20 p-4 pl-5">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-0.5"
            style={{ background: `${activeAccent.hex}55` }}
          />
          <div className="space-y-4">{children}</div>
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Individual tab                                                        */
/* ────────────────────────────────────────────────────────────────────── */

function VariationTab({
  variation,
  accent,
  active,
  diffs,
  canDelete,
  onSelect,
  onRename,
  onDelete,
  onUpdateSplit,
  showSplit,
}: {
  variation: CampaignVariation
  accent: VariationAccent
  active: boolean
  diffs: DiffKey[]
  canDelete: boolean
  onSelect: () => void
  onRename: (label: string) => void
  onDelete: () => void
  onUpdateSplit: (pct: number) => void
  showSplit: boolean
}) {
  const [renaming, setRenaming] = React.useState(false)
  const [labelDraft, setLabelDraft] = React.useState(variation.label)

  React.useEffect(() => {
    setLabelDraft(variation.label)
  }, [variation.label])

  function commitRename() {
    if (labelDraft.trim() && labelDraft.trim() !== variation.label) {
      onRename(labelDraft.trim())
    }
    setRenaming(false)
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative -mb-px flex min-w-[180px] max-w-[280px] cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 transition-colors",
        active
          ? cn(accent.activeBg, "border-border shadow-[inset_0_2px_0_0_currentColor]", accent.activeText)
          : cn("border-transparent text-muted-foreground", accent.hoverBg, "hover:text-foreground"),
      )}
      style={active ? { color: accent.hex } : undefined}
    >
      {/* Letter chip */}
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          accent.chipBg,
          accent.chipText,
        )}
      >
        {variation.label.slice(0, 1).toUpperCase()}
      </div>

      {/* Label + subject preview */}
      <div className="min-w-0 flex-1">
        {renaming ? (
          <Input
            value={labelDraft}
            autoFocus
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") {
                setLabelDraft(variation.label)
                setRenaming(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-5 border-0 bg-transparent p-0 text-[11px] font-semibold focus-visible:ring-0"
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation()
              setRenaming(true)
            }}
            className={cn(
              "truncate text-[12px] font-semibold",
              active ? "" : "text-foreground",
            )}
            style={active ? { color: accent.hex } : undefined}
            title="Double-click to rename"
          >
            {variation.label}
          </div>
        )}
        <div className="truncate text-[10px] text-muted-foreground">
          {variation.subject || <span className="italic">No subject yet</span>}
        </div>
      </div>

      {/* Diff dots — only when there are differences vs A */}
      {diffs.length > 0 && (
        <div
          className="flex flex-col items-end gap-0.5"
          title={`Differs from A on: ${diffs.join(", ")}`}
        >
          {diffs.slice(0, 3).map((d) => (
            <span
              key={d}
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent.hex }}
            />
          ))}
        </div>
      )}

      {/* Right cluster: split % + delete */}
      <div className="flex items-center gap-1">
        {showSplit && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 rounded bg-muted/40 px-1.5 py-0.5"
          >
            <Input
              type="number"
              value={variation.splitPct}
              min={0}
              max={100}
              onChange={(e) => onUpdateSplit(Number(e.target.value) || 0)}
              className="h-4 w-8 border-0 bg-transparent p-0 text-center text-[10px] tabular-nums focus-visible:ring-0"
            />
            <Percent className="h-2 w-2 text-muted-foreground" />
          </div>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title={`Delete Variation ${variation.label}`}
            className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-black/20 hover:text-error-300 group-hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Test settings popover                                                 */
/* ────────────────────────────────────────────────────────────────────── */

function TestSettingsButton({
  state,
  update,
}: {
  state: ComposerState
  update: VariationsPanelProps["update"]
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 text-[11px]" />
        }
      >
        <Sliders className="h-3 w-3" />
        Test settings
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] space-y-4 p-4">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-3 w-3" />
            Winner metric
          </label>
          <Select
            value={state.winnerMetric}
            onValueChange={(v) => update("winnerMetric", (v as WinnerMetric) ?? "payment_conversion")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment_conversion">
                Payment conversion (from analytics funnel)
              </SelectItem>
              <SelectItem value="click">Click-through</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Payment conversion is the default so the winner follows the payment funnel goal.
          </p>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3" />
            Control / holdout
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={state.holdoutPct}
              min={0}
              max={50}
              onChange={(e) =>
                update("holdoutPct", Math.max(0, Math.min(50, Number(e.target.value) || 0)))
              }
              className="h-8 w-16 text-center text-[12px] tabular-nums"
            />
            <span className="text-[11px] text-muted-foreground">% of the audience gets nothing</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Measures lift vs an unsent control. Applied before variation splits.
          </p>
        </div>

        <label className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/10 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-foreground">Auto-pick winner</div>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
              After the test window elapses, send the winning variation to the remaining audience.
            </p>
          </div>
          <Switch checked={state.autoWinner} onCheckedChange={(v) => update("autoWinner", v)} size="sm" />
        </label>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" />
            Test window
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={state.testWindowHours}
              min={1}
              max={720}
              onChange={(e) =>
                update("testWindowHours", Math.max(1, Math.min(720, Number(e.target.value) || 1)))
              }
              className="h-8 w-20 text-center text-[12px] tabular-nums"
            />
            <span className="text-[11px] text-muted-foreground">hours</span>
          </div>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] leading-relaxed text-primary/90">
          <BarChart3 className="mr-1 inline-block h-3 w-3" />
          Per-variation performance is measured against the message analytics funnel — opens,
          clicks, and paid — same as every other campaign.
        </div>

        <Button size="sm" className="w-full" onClick={() => setOpen(false)}>
          Done
        </Button>
      </PopoverContent>
    </Popover>
  )
}
