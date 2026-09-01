"use client"

/**
 * HumanCampaignNodeFullEditor — fullscreen editor for a Trigger Human
 * Campaign action node. Layout + tab structure mirror the standalone
 * Campaign edit page at /campaigns/[id]/edit (Basics / Audience /
 * Schedule / Messages) so authors get one consistent UI whether they're
 * editing the campaign from the Campaigns app or from the journey node.
 *
 * State is stored on the node's data as `campaignConfig`; nothing writes
 * to the campaigns-seed store from here — the node itself is the source
 * of truth for what happens when the journey enrolls a borrower.
 */

import * as React from "react"
import Link from "next/link"
import type { Node } from "@xyflow/react"
import {
  X,
  Save,
  Phone,
  Users,
  Calendar,
  MessageSquare,
  Info,
  Route,
  Play,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CampaignScheduleTab } from "@/components/campaigns/campaign-schedule-tab"
import {
  DEFAULT_CAMPAIGN_SCHEDULE,
  AGENT_GROUPS,
  DIALER_OPTIONS,
  GATEWAY_OPTIONS,
  DIAL_SPEED_OPTIONS,
  type CampaignSchedule,
} from "@/data/campaigns-seed"

const TABS = [
  { id: "basics", label: "Basics", icon: Info },
  { id: "audience", label: "Audience", icon: Users },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "messages", label: "Messages", icon: MessageSquare },
] as const

type TabId = (typeof TABS)[number]["id"]

interface CampaignConfig {
  campaignName: string
  dialerName: string
  gateway: string
  agentGroup: string
  secondaryGroup?: string
  dialSpeed: string
  priorityTier: "high" | "medium" | "low"
  schedule: CampaignSchedule
  welcomeMessage: string
  loopMessage: string
  busyMessage: string
}

function readConfig(data: Record<string, unknown>): CampaignConfig {
  const c = (data.campaignConfig as Partial<CampaignConfig> & {
    scheduleMode?: "immediate" | "scheduled"
    pauseByDefault?: boolean
    redialEnabled?: boolean
  }) ?? {}
  // Legacy migration — earlier the node stored scheduleMode/pauseByDefault/
  // redialEnabled at the top level. Fold those into the new schedule shape.
  const schedule: CampaignSchedule = c.schedule
    ? { ...DEFAULT_CAMPAIGN_SCHEDULE, ...c.schedule }
    : {
        ...DEFAULT_CAMPAIGN_SCHEDULE,
        mode: c.scheduleMode ?? "immediate",
        pauseByDefault: c.pauseByDefault ?? false,
        redialEnabled: c.redialEnabled ?? true,
        redial: {
          ...DEFAULT_CAMPAIGN_SCHEDULE.redial,
          enabled: c.redialEnabled ?? true,
        },
      }
  return {
    campaignName: c.campaignName ?? ((data.label as string) ?? "Human Campaign"),
    dialerName: c.dialerName ?? "Dialer 1",
    gateway: c.gateway ?? "cleargrid_twilio",
    agentGroup: c.agentGroup ?? "",
    secondaryGroup: c.secondaryGroup ?? "",
    dialSpeed: c.dialSpeed ?? "5x",
    priorityTier: (c.priorityTier as CampaignConfig["priorityTier"]) ?? "medium",
    schedule,
    welcomeMessage: c.welcomeMessage ?? "",
    loopMessage: c.loopMessage ?? "",
    busyMessage: c.busyMessage ?? "",
  }
}

interface HumanCampaignNodeFullEditorProps {
  node: Node
  journeyId: string
  onUpdate: (nodeId: string, field: string, value: unknown) => void
  onDeleteNode: () => void
  onClose: () => void
  incomingNodeLabel?: string | null
}

export function HumanCampaignNodeFullEditor({
  node,
  journeyId,
  onUpdate,
  onDeleteNode,
  onClose,
  incomingNodeLabel,
}: HumanCampaignNodeFullEditorProps) {
  const d = (node.data ?? {}) as Record<string, unknown>
  const cfg = readConfig(d)
  const [tab, setTab] = React.useState<TabId>("basics")

  const set = <K extends keyof CampaignConfig>(k: K, v: CampaignConfig[K]) => {
    const next: CampaignConfig = { ...cfg, [k]: v }
    onUpdate(node.id, "campaignConfig", next)
    if (k === "campaignName" && typeof v === "string" && v.trim().length > 0) {
      onUpdate(node.id, "label", v)
    }
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
              Trigger Human Campaign
            </div>
            <Input
              value={cfg.campaignName}
              onChange={(e) => set("campaignName", e.target.value)}
              placeholder="Campaign name"
              className="mt-0.5 h-6 border-none bg-transparent px-0 text-[15px] font-semibold focus-visible:ring-0"
            />
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
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        {/* Left — tabs + form */}
        <div className="min-h-0 overflow-y-auto border-r border-border bg-background">
          <div className="mx-auto max-w-3xl px-6 py-5">
            <div className="mb-4 flex border-b border-border">
              {TABS.map((t) => {
                const Icon = t.icon
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-medium",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    {t.id === "messages" && (
                      <span className="ml-1 rounded bg-muted px-1 py-px text-[9px] uppercase text-muted-foreground">
                        Optional
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {tab === "basics" && <BasicsTab cfg={cfg} set={set} />}
            {tab === "audience" && (
              <AudienceTab journeyId={journeyId} incomingNodeLabel={incomingNodeLabel ?? null} />
            )}
            {tab === "schedule" && (
              <CampaignScheduleTab
                schedule={cfg.schedule}
                onChange={(schedule) => set("schedule", schedule)}
              />
            )}
            {tab === "messages" && <MessagesTab cfg={cfg} set={set} />}
          </div>
        </div>

        {/* Right — live preview */}
        <div className="min-h-0 overflow-y-auto bg-muted/30">
          <div className="sticky top-0 p-6">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Live preview
            </div>
            <Preview cfg={cfg} tab={tab} journeyId={journeyId} incomingNodeLabel={incomingNodeLabel ?? null} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Tabs ─────────── */

function BasicsTab({
  cfg,
  set,
}: {
  cfg: CampaignConfig
  set: <K extends keyof CampaignConfig>(k: K, v: CampaignConfig[K]) => void
}) {
  return (
    <div className="space-y-4">
      <FormField label="Campaign name">
        <Input
          value={cfg.campaignName}
          onChange={(e) => set("campaignName", e.target.value)}
          placeholder="Enter campaign name"
          className="h-9 text-[13px]"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Dialer *">
          <BasicsSelect
            value={cfg.dialerName}
            onChange={(v) => set("dialerName", v)}
            options={DIALER_OPTIONS}
          />
        </FormField>
        <FormField label="Gateway">
          <BasicsSelect
            value={cfg.gateway}
            onChange={(v) => set("gateway", v)}
            options={GATEWAY_OPTIONS}
          />
        </FormField>
        <FormField
          label="Agent group *"
          actionLabel="Manage user groups"
          onAction={() => window.open("/agents/groups", "_blank")}
        >
          <BasicsSelect
            value={cfg.agentGroup}
            placeholder="Select an agent group"
            onChange={(v) => set("agentGroup", v)}
            options={AGENT_GROUPS}
          />
        </FormField>
        <FormField label="Secondary group">
          <BasicsSelect
            value={cfg.secondaryGroup ?? ""}
            placeholder="Optional — used when the primary group is busy"
            onChange={(v) => set("secondaryGroup", v)}
            options={AGENT_GROUPS}
            allowEmpty
          />
        </FormField>
        <FormField label="Dial speed *">
          <BasicsSelect
            value={cfg.dialSpeed}
            onChange={(v) => set("dialSpeed", v)}
            options={DIAL_SPEED_OPTIONS}
          />
        </FormField>
        <FormField label="Priority tier">
          <BasicsSelect
            value={cfg.priorityTier}
            onChange={(v) =>
              set("priorityTier", v as CampaignConfig["priorityTier"])
            }
            options={["high", "medium", "low"]}
          />
        </FormField>
      </div>
    </div>
  )
}

function BasicsSelect({
  value,
  onChange,
  options,
  placeholder,
  allowEmpty,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  allowEmpty?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring",
        !value && "text-muted-foreground",
      )}
    >
      {(allowEmpty || !value) && (
        <option value="">{placeholder ?? "Select…"}</option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function AudienceTab({
  journeyId,
  incomingNodeLabel,
}: {
  journeyId: string
  incomingNodeLabel: string | null
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-info-500/40 bg-info-500/[0.06] p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-info-300">
          <Route className="h-3 w-3" />
          Journey-sourced audience
        </div>
        <p className="mt-2 text-[12px] text-foreground">
          The audience of this campaign is <span className="font-semibold">whichever borrowers reach this node</span>{" "}
          in the journey — you don&apos;t configure it here. It comes from
          {incomingNodeLabel ? (
            <>
              {" "}
              the upstream <span className="rounded bg-info-500/15 px-1 py-px font-medium text-info-300">{incomingNodeLabel}</span>{" "}
              step
            </>
          ) : (
            <> the immediate previous node</>
          )}
          .
        </p>
        <Link
          href={`/journeys/${journeyId}/borrowers`}
          className="mt-3 inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
        >
          See borrowers currently in this journey →
        </Link>
      </div>

      <div>
        <div className="text-[12px] font-semibold">Calling priority</div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Decides which arriving borrowers get dialed first.
        </p>
        <ol className="mt-3 space-y-1">
          {["PTP", "Broken Promise", "RPC", "Attempted", "Allocated"].map(
            (label, i) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[12px]"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                {label}
              </li>
            ),
          )}
        </ol>
      </div>
    </div>
  )
}

function MessagesTab({
  cfg,
  set,
}: {
  cfg: CampaignConfig
  set: <K extends keyof CampaignConfig>(k: K, v: CampaignConfig[K]) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[12px] font-semibold">Call messages</div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          What the borrower hears at each phase of the call. Optional.
        </p>
      </div>
      <FormField label="Welcome message">
        <textarea
          value={cfg.welcomeMessage}
          onChange={(e) => set("welcomeMessage", e.target.value)}
          placeholder="This is an important call regarding your account. Please stay on the line."
          className="min-h-[110px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
        />
      </FormField>
      <FormField label="Loop message">
        <textarea
          value={cfg.loopMessage}
          onChange={(e) => set("loopMessage", e.target.value)}
          placeholder="Please wait while we connect your call to one of our agents."
          className="min-h-[90px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
        />
      </FormField>
      <FormField label="Busy message">
        <textarea
          value={cfg.busyMessage}
          onChange={(e) => set("busyMessage", e.target.value)}
          placeholder="We're sorry, all of our agents are currently unavailable. We'll call you back."
          className="min-h-[110px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
        />
      </FormField>
    </div>
  )
}

/* ─────────── Right preview ─────────── */

function Preview({
  cfg,
  tab,
  journeyId,
  incomingNodeLabel,
}: {
  cfg: CampaignConfig
  tab: TabId
  journeyId: string
  incomingNodeLabel: string | null
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Campaign summary
        </div>
        <div className="mt-1 text-[15px] font-semibold text-foreground">
          {cfg.campaignName || "Untitled campaign"}
        </div>
        <div className="mt-2 grid gap-1 text-[11px]">
          <Row k="Dialer" v={cfg.dialerName} />
          <Row k="Gateway" v={cfg.gateway} />
          <Row k="Agent group" v={cfg.agentGroup || "—"} />
          {cfg.secondaryGroup ? (
            <Row k="Secondary" v={cfg.secondaryGroup} />
          ) : null}
          <Row k="Dial speed" v={cfg.dialSpeed} />
          <Row k="Priority" v={cfg.priorityTier} />
          <Row
            k="Schedule"
            v={
              cfg.schedule.mode === "immediate"
                ? "Start immediately"
                : cfg.schedule.recurring.enabled
                  ? "Recurring"
                  : "Scheduled"
            }
          />
          <Row
            k="Redial"
            v={
              cfg.schedule.redial.enabled
                ? `${cfg.schedule.redial.rounds.length} round${
                    cfg.schedule.redial.rounds.length === 1 ? "" : "s"
                  }`
                : "Off"
            }
          />
          <Row
            k="Calling hours"
            v={cfg.schedule.callingHoursOnly ? "9 AM – 6 PM" : "Any time"}
          />
          <Row
            k="Pause by default"
            v={cfg.schedule.pauseByDefault ? "Yes" : "No"}
          />
        </div>
      </div>

      {(tab === "audience" || tab === "basics") && (
        <div className="rounded-xl border border-info-500/40 bg-info-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-info-300">
            <Route className="h-3 w-3" />
            Where the audience comes from
          </div>
          <p className="mt-1 text-[11px] text-foreground">
            {incomingNodeLabel ? (
              <>
                Every borrower reaching this node via{" "}
                <span className="rounded bg-info-500/15 px-1 py-px font-medium text-info-300">
                  {incomingNodeLabel}
                </span>{" "}
                is enrolled automatically.
              </>
            ) : (
              <>
                Every borrower reaching this node in the journey is enrolled
                automatically.
              </>
            )}
          </p>
          <Link
            href={`/journeys/${journeyId}/borrowers`}
            className="mt-2 inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
          >
            View borrowers →
          </Link>
        </div>
      )}

      {tab === "messages" && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Call flow · how the borrower experiences it
          </div>
          <div className="space-y-2">
            <CallBubble kind="welcome" text={cfg.welcomeMessage} />
            <CallBubble kind="loop" text={cfg.loopMessage} />
            <CallBubble kind="busy" text={cfg.busyMessage} />
          </div>
        </div>
      )}
    </div>
  )
}

function CallBubble({
  kind,
  text,
}: {
  kind: "welcome" | "loop" | "busy"
  text?: string
}) {
  const iconMap = { welcome: Play, loop: Users, busy: Info }
  const Icon = iconMap[kind]
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-2.5 w-2.5" />
        {kind}
      </div>
      <div className="mt-1 text-[11px] leading-relaxed text-foreground">
        {text ? (
          text
        ) : (
          <span className="italic text-muted-foreground">
            (no {kind} message configured yet)
          </span>
        )}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  )
}

function FormField({
  label,
  actionLabel,
  onAction,
  children,
}: {
  label: string
  actionLabel?: string
  onAction?: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}
