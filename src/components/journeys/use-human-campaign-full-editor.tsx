"use client"

/**
 * UseHumanCampaignFullEditor — the editor for the `use_human_campaign`
 * action node.
 *
 * It's a picker, not a builder: authors pick a campaign that was already
 * created inside this same journey (via a "Create Human Campaign" node),
 * and every field of that campaign — basics, messages, audience,
 * schedule — is read from the source and locked. The only thing this
 * node lets you override is redial settings, because those often need
 * to differ per enrollment point (e.g. a broken-PTP escalation may want
 * a tighter round sequence than the parent campaign).
 */

import * as React from "react"
import Link from "next/link"
import type { Node, Edge } from "@xyflow/react"
import {
  X,
  Save,
  Phone,
  Lock,
  ExternalLink,
  Info,
  Trash2,
  Route,
  BarChart3,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CampaignScheduleTab } from "@/components/campaigns/campaign-schedule-tab"
import { NodeAnalyticsTab } from "@/components/journeys/node-analytics-tab"
import {
  DEFAULT_CAMPAIGN_SCHEDULE,
  humanCampaigns,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_DOT,
  type CampaignRedialConfig,
  type HumanCampaign,
} from "@/data/campaigns-seed"

interface UseHumanCampaignNodeConfig {
  /** Id of the source campaign this node enrolls into. */
  sourceCampaignId?: string
  /** Redial overrides — the only mutable slice of the copied config. */
  redialOverride?: CampaignRedialConfig
  /** True once the author edits the redial section — otherwise stays in sync
   *  with the source campaign's redial config. */
  hasRedialOverride?: boolean
}

interface Props {
  node: Node
  journeyId: string
  edges: Edge[]
  onUpdate: (nodeId: string, field: string, value: unknown) => void
  onDeleteNode: () => void
  onClose: () => void
  selectedRunId?: string | null
}

const TABS = [
  { id: "campaign", label: "Campaign", icon: Route },
  { id: "redial", label: "Redial", icon: Phone },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const

type TabId = (typeof TABS)[number]["id"]

export function UseHumanCampaignFullEditor({
  node,
  journeyId,
  onUpdate,
  onDeleteNode,
  onClose,
  selectedRunId,
}: Props) {
  const d = (node.data ?? {}) as Record<string, unknown>
  const cfg = (d.useCampaignConfig as UseHumanCampaignNodeConfig) ?? {}

  // Only campaigns whose source is this journey are eligible — this node
  // reuses campaigns *created* inside the journey.
  const eligible = React.useMemo(
    () =>
      humanCampaigns.filter(
        (c) => c.source.kind === "journey" && c.source.journeyId === journeyId,
      ),
    [journeyId],
  )

  const [tab, setTab] = React.useState<TabId>("campaign")
  const source = cfg.sourceCampaignId
    ? humanCampaigns.find((c) => c.id === cfg.sourceCampaignId)
    : null
  const redial = cfg.hasRedialOverride && cfg.redialOverride
    ? cfg.redialOverride
    : source?.schedule.redial ?? DEFAULT_CAMPAIGN_SCHEDULE.redial

  const setCfg = (patch: Partial<UseHumanCampaignNodeConfig>) => {
    const next = { ...cfg, ...patch }
    onUpdate(node.id, "useCampaignConfig", next)
  }

  const pickCampaign = (id: string) => {
    const chosen = humanCampaigns.find((c) => c.id === id)
    setCfg({
      sourceCampaignId: id,
      hasRedialOverride: false,
      redialOverride: chosen?.schedule.redial,
    })
    if (chosen) onUpdate(node.id, "label", `→ ${chosen.name}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Use Existing Human Campaign
            </div>
            <div className="mt-0.5 text-[15px] font-semibold text-foreground">
              {source ? source.name : "Pick a campaign"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteNode}
            className="text-error-300 hover:bg-error-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button onClick={onClose} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save & Close
          </Button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-3xl px-6 py-5">
          {/* Tab strip */}
          <div className="mb-4 flex border-b border-border">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.id
              const disabled = t.id !== "campaign" && !source
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setTab(t.id)}
                  className={cn(
                    "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-medium",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                    disabled && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {tab === "campaign" && (
            <CampaignPickerTab
              eligible={eligible}
              chosenId={cfg.sourceCampaignId}
              onPick={pickCampaign}
              source={source ?? null}
              journeyId={journeyId}
            />
          )}
          {tab === "redial" && source && (
            <RedialOverrideTab
              source={source}
              redial={redial}
              hasOverride={!!cfg.hasRedialOverride}
              onChange={(next) =>
                setCfg({ hasRedialOverride: true, redialOverride: next })
              }
              onReset={() =>
                setCfg({
                  hasRedialOverride: false,
                  redialOverride: source.schedule.redial,
                })
              }
            />
          )}
          {tab === "analytics" && source && (
            <div className="-mx-6 -mb-5 min-h-[60vh]">
              <NodeAnalyticsTab
                journeyId={journeyId}
                runId={selectedRunId ?? null}
                nodeId={node.id}
                nodeLabel={(node.data as { label?: string })?.label ?? node.id}
                nodeType={node.type ?? "action"}
                blockType={(node.data as { blockType?: string })?.blockType}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────── Campaign picker + locked settings preview ─────────── */

function CampaignPickerTab({
  eligible,
  chosenId,
  onPick,
  source,
  journeyId,
}: {
  eligible: HumanCampaign[]
  chosenId?: string
  onPick: (id: string) => void
  source: HumanCampaign | null
  journeyId: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[13px] font-semibold">Pick a campaign</div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Choose a campaign already created inside this journey. Every
          setting — basics, messages, audience, schedule — is copied down
          from the source and locked. Only the{" "}
          <span className="font-semibold text-foreground">Redial</span> tab
          can be adjusted per-enrollment.
        </p>
      </div>

      {eligible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/[0.04] p-6 text-center">
          <p className="text-[12px] font-medium text-foreground">
            No campaigns exist in this journey yet
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Add a{" "}
            <span className="font-semibold text-foreground">
              Create Human Campaign
            </span>{" "}
            node earlier in the journey. Once it&apos;s saved, it&apos;ll
            appear in this dropdown.
          </p>
        </div>
      ) : (
        <div className="relative">
          <select
            value={chosenId ?? ""}
            onChange={(e) => onPick(e.target.value)}
            className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-9 text-[13px] outline-none focus-visible:border-ring"
          >
            <option value="">Select a campaign…</option>
            {eligible.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {CAMPAIGN_STATUS_LABEL[c.status]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      )}

      {source && (
        <>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[12px] font-semibold text-foreground">
                  {source.name}
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      CAMPAIGN_STATUS_DOT[source.status],
                    )}
                  />
                  {CAMPAIGN_STATUS_LABEL[source.status]}
                </span>
              </div>
              <Link
                href={`/campaigns/${source.id}`}
                className="inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
              >
                Open campaign
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
            <div className="grid gap-x-6 gap-y-2 text-[11px] sm:grid-cols-2">
              <LockedRow k="Dialer" v={source.dialerName} />
              <LockedRow k="Gateway" v={source.gateway} />
              <LockedRow k="Agent group" v={source.agentGroup} />
              <LockedRow k="Dial speed" v={source.dialSpeed} />
              <LockedRow
                k="Schedule"
                v={
                  source.schedule.mode === "immediate"
                    ? "Start immediately"
                    : source.schedule.recurring.enabled
                      ? "Recurring"
                      : "Scheduled"
                }
              />
              <LockedRow
                k="Calling hours"
                v={source.schedule.callingHoursOnly ? "9 AM – 6 PM" : "Any time"}
              />
            </div>
            <MessagesPreview source={source} />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/[0.04] px-3 py-2 text-[10px] text-muted-foreground">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              These fields are read-only — to change them, open the source
              campaign or edit its{" "}
              <Link
                href={`/campaigns/${source.id}/edit`}
                className="text-primary hover:underline"
              >
                Create Human Campaign
              </Link>{" "}
              node inside this journey. Redial settings can be adjusted
              per-enrollment in the{" "}
              <span className="text-foreground font-semibold">Redial</span>{" "}
              tab.
            </span>
          </div>
        </>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-info-500/40 bg-info-500/[0.06] px-3 py-2 text-[10px] text-info-300">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Enrolling into an existing campaign lets multiple journey branches
          feed the same operator queue instead of spinning up parallel
          campaigns.
        </span>
      </div>
      <span className="hidden">{journeyId}</span>
    </div>
  )
}

function LockedRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded border border-border/60 bg-background/60 px-2 py-1.5">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Lock className="h-2.5 w-2.5" />
        {k}
      </span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  )
}

function MessagesPreview({ source }: { source: HumanCampaign }) {
  const items: Array<{ label: string; body?: string }> = [
    { label: "Welcome", body: source.callMessages.welcome },
    { label: "Loop", body: source.callMessages.loop },
    { label: "Busy", body: source.callMessages.busy },
  ]
  const anyBody = items.some((i) => i.body)
  if (!anyBody) return null
  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <div className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Lock className="h-2.5 w-2.5" />
        Call messages (locked)
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.label}
            className="rounded border border-border/60 bg-background/60 p-2"
          >
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {i.label}
            </div>
            <div className="mt-0.5 line-clamp-3 text-[10px] text-foreground">
              {i.body ?? (
                <span className="italic text-muted-foreground">
                  (not configured)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── Redial override tab ─────────── */

function RedialOverrideTab({
  source,
  redial,
  hasOverride,
  onChange,
  onReset,
}: {
  source: HumanCampaign
  redial: CampaignRedialConfig
  hasOverride: boolean
  onChange: (next: CampaignRedialConfig) => void
  onReset: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold">Redial</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            The only slice you can adjust on this node. Everything else is
            inherited from{" "}
            <Link
              href={`/campaigns/${source.id}`}
              className="text-primary hover:underline"
            >
              {source.name}
            </Link>
            .
          </p>
        </div>
        {hasOverride && (
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted"
          >
            Reset to source
          </button>
        )}
      </div>

      {hasOverride ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/[0.06] px-3 py-2 text-[10px] text-warning-300">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            This node uses a per-enrollment redial override. Changes here
            don&apos;t affect the source campaign or other nodes that reuse
            it.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/[0.04] px-3 py-2 text-[10px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Currently syncing with the source campaign. Any edit below turns
            this into an override — only for this node.
          </span>
        </div>
      )}

      {/* Reuse the full CampaignScheduleTab but only expose its redial section
          by passing a minimal schedule with everything else defaulted. We
          write back just the redial slice via `onChange` below. */}
      <CampaignScheduleTab
        schedule={{
          ...source.schedule,
          redial,
          redialEnabled: redial.enabled,
        }}
        onChange={(next) => {
          onChange({ ...next.redial, enabled: next.redialEnabled })
        }}
      />
    </div>
  )
}

function Label_({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  )
}
// Silence unused import warning while keeping Label available for future edits.
void Label_
