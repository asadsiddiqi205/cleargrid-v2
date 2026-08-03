"use client"

/**
 * Journey Builder workshop update — modals + banners + panels.
 *
 * Consolidates:
 *   Part 1.3   Validate AI Calls modal (audience-derived sampling + 3 modes)
 *   Part 1.4   Empty-attribute prompt lint UI (rendered inline in Validate)
 *   Part 1.6   Deviation alert banner + Notification Settings section
 *   Part 3.2   Journey Report modal (funnel + business metrics + time-series
 *              + per-node table + CSV export)
 *   Part 6.4   Event trigger info tooltip
 *
 * Wired into journey-canvas.tsx.
 */

import * as React from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Info,
  Phone,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { borrowers, type Borrower } from "@/data/borrowers"
import {
  lintPromptAttributes,
  segmentPromptForDisplay,
  type EmptyAttributeFinding,
} from "@/lib/prompt-attribute-lint"
import { getEventDefinition, type EventTriggerDefinition } from "@/data/event-trigger-catalog"
import type { DeviationAlert, JourneyAlertSettings } from "@/data/journey-alerts"

/* ═════════════════════════════════════════════════════════════════════════
 * Part 1.3 · Validate AI Calls modal — audience-derived sample + 3 modes.
 * ═════════════════════════════════════════════════════════════════════════ */

type SamplingMode = "random" | "oldest_dpd" | "most_recent"

const SAMPLING_MODES: Array<{
  id: SamplingMode
  label: string
  description: string
}> = [
  {
    id: "random",
    label: "Random from audience",
    description: "Picks a borrower at random from the resolved audience.",
  },
  {
    id: "oldest_dpd",
    label: "Oldest DPD in audience",
    description: "Picks the borrower with the highest days-past-due — usually the hardest case.",
  },
  {
    id: "most_recent",
    label: "Most recent to enter audience",
    description: "Picks the borrower who entered the audience most recently.",
  },
]

/**
 * Resolve the audience for a journey based on its trigger + upstream filters.
 * Prototype: samples from the borrowers dataset filtered by a very simple
 * proxy (dpd_bucket / risk_score / status). Real system traces upstream
 * filters back to the entry node.
 */
export function resolveAudience(): Borrower[] {
  // Deterministic pseudo-filter: exclude Closed / Legal.
  return borrowers.filter((b) => b.status !== "Closed" && b.status !== "Legal")
}

function pickBorrower(mode: SamplingMode, pool: Borrower[]): Borrower | null {
  if (pool.length === 0) return null
  switch (mode) {
    case "random":
      return pool[Math.floor(pool.length / 2)] // deterministic "random" for demo
    case "oldest_dpd":
      // Assume dpdBucket like "180+" comes last alphabetically → sort descending.
      return [...pool].sort((a, b) => b.dpdBucket.localeCompare(a.dpdBucket))[0]
    case "most_recent":
      // Use last item as a proxy for "most recent to enter".
      return pool[pool.length - 1]
  }
}

export interface ValidateAiCallModalProps {
  open: boolean
  onClose: () => void
  /** Optional — if a specific Trigger AI Call node was selected. */
  nodeLabel?: string
  /** Prompt / script content to lint. In the prototype we use a canned string
   *  when the caller doesn't provide one. */
  promptText?: string
}

export function ValidateAiCallModal({ open, onClose, nodeLabel, promptText }: ValidateAiCallModalProps) {
  const [mode, setMode] = React.useState<SamplingMode>("random")
  const [phoneOverride, setPhoneOverride] = React.useState("")
  const audience = React.useMemo(() => resolveAudience(), [])
  const sampled = React.useMemo(() => pickBorrower(mode, audience), [mode, audience])

  // Part 1.4 — empty-attribute lint against the audience.
  const script =
    promptText ??
    "Hello {{borrower.first_name}}, this is {{lender.name}} calling about your account {{deal.account_number}}. " +
      "Your PTP of AED {{deal.ptp_amount}} was due on {{deal.ptp_date}}. " +
      "Available settlement options: {{settlement.options}}. " +
      "Callback slot: {{deal.callback_window}}."

  const attributePayloads = React.useMemo(
    () =>
      audience.slice(0, 20).map((b) => ({
        borrower: {
          id: b.id,
          first_name: b.name.split(" ")[0],
          last_name: b.name.split(" ").slice(-1)[0],
          risk_score: b.riskScore,
        },
        deal: {
          account_number: `ACC-${b.id.slice(-4).toUpperCase()}`,
          outstanding: b.outstanding,
          dpd_bucket: b.dpdBucket,
          // Intentionally leave ptp_amount / ptp_date / callback_window mostly empty.
          ptp_amount: b.id.endsWith("2") ? 500 : "",
          ptp_date: "",
          callback_window: "",
        },
        lender: { name: "Mashreq" },
        settlement: { options: b.id.endsWith("3") ? "20% off" : "" },
      })),
    [audience],
  )

  const lintResult = React.useMemo(
    () => lintPromptAttributes({ text: script, sample: attributePayloads }),
    [script, attributePayloads],
  )
  const emptyTagSet = React.useMemo(
    () => new Set(lintResult.findings.map((f) => f.tag)),
    [lintResult],
  )
  const displaySegments = React.useMemo(
    () => segmentPromptForDisplay(script, emptyTagSet),
    [script, emptyTagSet],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Validate AI Call
            {nodeLabel && <span className="text-[11px] font-normal text-muted-foreground">· {nodeLabel}</span>}
          </DialogTitle>
          <DialogDescription>
            Uses a real borrower sampled from the resolved audience. Empty merge-tag references are
            highlighted in red so the prompt is fixed before it fires for real.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {/* Sampling mode selector */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Sample from audience
            </Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {SAMPLING_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-2 text-left text-[11px] transition-colors",
                    mode === m.id
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-muted/10 text-foreground hover:border-neutral-700",
                  )}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">{m.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Empty-audience state */}
          {audience.length === 0 && (
            <div className="rounded-md border border-neutral-700 bg-neutral-800/40 p-3 text-[11px] text-neutral-400">
              No borrowers match the current audience filter. This node won&apos;t fire for anyone
              until the audience is populated.
            </div>
          )}

          {/* Sampled borrower card */}
          {sampled && (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Resolved sample
              </p>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Borrower</span>
                  <div className="font-medium text-foreground">{sampled.name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">DPD</span>
                  <div className="font-medium text-foreground">{sampled.dpdBucket}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk</span>
                  <div className="font-medium text-foreground">{sampled.riskScore}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Emirates ID</span>
                  <div className="font-mono text-[10px] text-foreground">{sampled.emiratesId}</div>
                </div>
              </div>
            </div>
          )}

          {/* Prompt preview with red-highlighted empty tags (Part 1.4) */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Script preview — merge tags resolved
            </Label>
            <div className="mt-1 rounded-md border border-border bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
              {displaySegments.map((seg, i) => {
                if (seg.kind === "text") return <span key={i}>{seg.value}</span>
                return (
                  <span
                    key={i}
                    className={cn(
                      "rounded px-1 py-px",
                      seg.isEmpty
                        ? "bg-error-500/20 text-error-300 ring-1 ring-error-500/40"
                        : "bg-primary-500/15 text-primary-300",
                    )}
                    title={
                      seg.isEmpty
                        ? "Empty for some borrowers — will render as blank"
                        : "Resolves for this borrower"
                    }
                  >
                    {`{{${seg.value}}}`}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Empty-attribute findings */}
          {lintResult.findings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Empty attribute findings ({lintResult.findings.length})
              </p>
              {lintResult.findings.map((f) => (
                <EmptyAttributeRow key={f.tag} finding={f} />
              ))}
            </div>
          )}

          {/* Manual demo phone override */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Enter test phone number (optional)
            </Label>
            <Input
              value={phoneOverride}
              onChange={(e) => setPhoneOverride(e.target.value)}
              placeholder="+971 5x xxx xxxx"
              className="mt-1 h-8 text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Overrides the sampled borrower&apos;s phone. Useful for a demo call to a controlled number.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={!sampled}
            onClick={() => {
              toast.success("AI-Call validation dispatched", {
                description: `Placed a dry-run call for ${sampled?.name}${phoneOverride ? ` on ${phoneOverride}` : ""}.`,
              })
              onClose()
            }}
          >
            <Phone className="h-3.5 w-3.5" />
            Run validation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyAttributeRow({ finding }: { finding: EmptyAttributeFinding }) {
  const [expanded, setExpanded] = React.useState(false)
  return (
    <div className="rounded-md border border-error-500/30 bg-error-500/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-error-300">
            <AlertTriangle className="h-3 w-3" />
            <code className="rounded bg-error-500/20 px-1 py-px font-mono text-[10px]">
              {`{{${finding.tag}}}`}
            </code>
            <span className="text-error-300/80">
              empty for {finding.emptyPct}% of borrowers ({finding.emptyCount}/{finding.sampleSize})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 flex items-center gap-1 text-[10px] text-error-300/80 hover:text-error-200"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
            {expanded ? "Hide" : "Show"} render preview for empty cohort
          </button>
          {expanded && (
            <pre className="mt-2 whitespace-pre-wrap rounded border border-error-500/20 bg-black/40 p-2 font-mono text-[10px] text-foreground">
              {finding.strippedPreview}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Part 1.6 · Deviation alert banner + Notification Settings section.
 * ═════════════════════════════════════════════════════════════════════════ */

export function DeviationAlertBanner({
  alert,
  journeyName,
  onDismiss,
  onInvestigate,
}: {
  alert: DeviationAlert | null
  journeyName: string
  onDismiss: () => void
  onInvestigate: () => void
}) {
  if (!alert) return null
  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-lg border border-error-500/40 bg-error-500/10 px-3 py-2">
      <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-error-300">
          Enrollment deviation detected — {alert.deviationPct}% below 7-day average
        </p>
        <p className="mt-0.5 text-[11px] text-error-300/80">
          <strong className="text-error-200">{journeyName}</strong>: expected ~
          {alert.expectedEntrants.toLocaleString()} today, actual{" "}
          {alert.actualEntrants.toLocaleString()}. Investigate before the drop compounds — usually a
          broken upstream event or a segment filter that started returning nothing.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="outline" onClick={onInvestigate}>
          Investigate
        </Button>
        <button
          onClick={onDismiss}
          className="rounded p-1 text-error-300 hover:bg-error-500/20"
          aria-label="Dismiss alert"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

export function NotificationSettingsSection({
  settings,
  onChange,
}: {
  settings: JourneyAlertSettings
  onChange: (next: JourneyAlertSettings) => void
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div>
        <div className="flex items-center gap-2">
          <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Notification settings
          </h4>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Fire an alert when daily entrants deviate below the 7-day rolling average by more than
          the threshold below. The Slack integration is a stub in this prototype — production posts
          to the configured channel.
        </p>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-[11px] text-foreground">Deviation alerts</span>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(v) => onChange({ ...settings, enabled: v })}
          size="sm"
        />
      </label>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Threshold (% below 7-day avg)
        </Label>
        <Input
          type="number"
          value={settings.thresholdPct}
          onChange={(e) =>
            onChange({
              ...settings,
              thresholdPct: Math.max(1, Math.min(99, Number(e.target.value) || 50)),
            })
          }
          disabled={!settings.enabled}
          className="mt-1 h-7 text-xs"
        />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Slack channel
        </Label>
        <Input
          value={settings.slackChannel}
          onChange={(e) => onChange({ ...settings, slackChannel: e.target.value })}
          disabled={!settings.enabled}
          placeholder="#journeys-alerts"
          className="mt-1 h-7 text-xs"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Leave empty to skip Slack (in-app banner still fires).
        </p>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Part 6.4 · Event trigger info tooltip.
 * ═════════════════════════════════════════════════════════════════════════ */

export function EventTriggerInfoIcon({ eventId }: { eventId: string }) {
  const def = getEventDefinition(eventId)
  const [open, setOpen] = React.useState(false)
  if (!def) return null
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-muted-foreground hover:text-foreground"
        aria-label={`Info about ${def.label}`}
      >
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <EventTriggerTooltipContent def={def} />
      )}
    </span>
  )
}

function EventTriggerTooltipContent({ def }: { def: EventTriggerDefinition }) {
  return (
    <div className="absolute left-4 top-0 z-50 w-64 rounded-md border border-border bg-popover p-2.5 text-[10px] shadow-lg">
      <p className="text-[11px] font-semibold text-foreground">{def.label}</p>
      <p className="mt-0.5 leading-relaxed text-muted-foreground">{def.description}</p>
      <p className="mt-1.5 text-muted-foreground">
        <span className="font-medium">Origin:</span> {def.origin.replace("_", " ")}
      </p>
      {def.payload.length > 0 && (
        <div className="mt-1.5">
          <p className="text-muted-foreground">
            <span className="font-medium">Payload:</span>
          </p>
          <ul className="mt-0.5 space-y-0.5 pl-3">
            {def.payload.slice(0, 6).map((p) => (
              <li key={p.name} className="font-mono text-muted-foreground/80">
                {p.name} <span className="text-muted-foreground/60">· {p.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Small canvas overlay — per-node count pill (Part 3.1).
 * ═════════════════════════════════════════════════════════════════════════ */

export function NodeCountPill({
  count,
  flowThroughPct,
  onClick,
}: {
  count: number
  flowThroughPct?: number
  onClick?: () => void
}) {
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString()
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto absolute -right-1 -top-2 z-10 flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 shadow-sm backdrop-blur-sm transition-colors hover:bg-indigo-500/30 hover:text-indigo-100"
    >
      <Users className="h-2.5 w-2.5" />
      {display}
      {typeof flowThroughPct === "number" && (
        <span className="text-[9px] text-indigo-300/80">→ {flowThroughPct}%</span>
      )}
    </button>
  )
}

/* Named re-exports for icons the canvas uses in wiring these panels. */
export { AlertTriangle, Zap, CheckCircle2, Sparkles, ExternalLink, Clock }
