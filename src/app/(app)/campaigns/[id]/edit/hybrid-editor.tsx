"use client"

/**
 * Hybrid dialer campaign editor. Seven tabs: Basics, Agents, Audience,
 * Handover, Supply, PTP, Schedule. Live preview on the right shows the
 * call journey built from the current settings.
 */

import * as React from "react"
import {
  X,
  Save,
  Sparkles,
  Info,
  Users,
  Phone,
  Timer,
  Gauge,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  DIALER_OPTIONS,
  type HumanCampaign,
  type HybridCampaignConfig,
} from "@/data/campaigns-seed"
import {
  CampaignScheduleTab,
} from "@/components/campaigns/campaign-schedule-tab"
import {
  HYBRID_AGENTS,
  HYBRID_AGENT_GROUPS,
  VOICE_CLONE_LABEL,
  GREETING_CLIP_LABEL,
  isAgentEligibleForHybrid,
  reasonAgentNotEligible,
  getHybridAgentById,
  type HybridAgent,
} from "@/data/hybrid-agents"
import {
  CLEARVOICE_PROJECTS,
  BUCKET_LABEL,
  getProjectById,
} from "@/data/clearvoice"
import { FormField, Select } from "./page"

const TABS = [
  { id: "basics", label: "Basics", icon: Info },
  { id: "agents", label: "Agents", icon: Users },
  { id: "audience", label: "Audience", icon: Users },
  { id: "handover", label: "Handover", icon: Timer },
  { id: "supply", label: "Supply", icon: Gauge },
  { id: "ptp", label: "PTP", icon: ShieldCheck },
  { id: "schedule", label: "Schedule", icon: Calendar },
] as const

type TabId = (typeof TABS)[number]["id"]

const SAVED_VIEWS: Array<{ id: string; name: string }> = [
  { id: "view-mashreq-high-dpd", name: "Mashreq · High DPD" },
  { id: "view-mashreq-30-60", name: "Mashreq · 30-60 DPD" },
  { id: "view-mashreq-settlement", name: "Mashreq · Settlement candidates" },
  { id: "view-tamara-early", name: "Tamara · Early delinquency" },
  { id: "view-tamara-final", name: "Tamara · Final notice" },
  { id: "view-cashnow-b1", name: "CashNow · B1 Reminder" },
  { id: "view-cashnow-b2", name: "CashNow · B2 Collections" },
  { id: "view-fab-hardship", name: "FAB · Hardship candidates" },
]

export function HybridCampaignEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: HumanCampaign
  setDraft: React.Dispatch<React.SetStateAction<HumanCampaign | null>>
  onSave: () => void
  onCancel: () => void
}) {
  const [tab, setTab] = React.useState<TabId>("basics")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [ackWarnings, setAckWarnings] = React.useState<Record<string, boolean>>({})

  const hybrid = draft.hybrid!
  const setHybrid = (patch: Partial<HybridCampaignConfig>) =>
    setDraft((d) =>
      d && d.hybrid ? { ...d, hybrid: { ...d.hybrid, ...patch } } : d,
    )
  const setBasic = <K extends keyof HumanCampaign>(k: K, v: HumanCampaign[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d))

  const errors = computeErrors(draft)
  const warnings = computeWarnings(draft)
  const tabsWithErrors = React.useMemo(() => {
    const out = new Set<TabId>()
    errors.forEach((e) => out.add(e.tab))
    return out
  }, [errors])

  const canLaunch = errors.length === 0
  const attemptStart = () => {
    if (!canLaunch) return
    if (warnings.length > 0) {
      setAckWarnings({})
      setConfirmOpen(true)
    } else {
      onSave()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Create hybrid campaign
            </div>
            <Input
              value={draft.name}
              onChange={(e) => setBasic("name", e.target.value)}
              className="mt-0.5 h-6 border-none bg-transparent px-0 text-[15px] font-semibold focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={attemptStart} disabled={!canLaunch} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Start Campaign
          </Button>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        <div className="min-h-0 overflow-y-auto border-r border-border bg-background">
          <div className="mx-auto max-w-3xl px-6 py-5">
            <div className="mb-4 flex overflow-x-auto border-b border-border">
              {TABS.map((t) => {
                const Icon = t.icon
                const active = tab === t.id
                const hasError = tabsWithErrors.has(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-medium whitespace-nowrap",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    {hasError && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-error-500" />
                    )}
                  </button>
                )
              })}
            </div>

            {tab === "basics" && (
              <BasicsTab draft={draft} setBasic={setBasic} />
            )}
            {tab === "agents" && <AgentsTab hybrid={hybrid} setHybrid={setHybrid} />}
            {tab === "audience" && <AudienceTab hybrid={hybrid} setHybrid={setHybrid} />}
            {tab === "handover" && <HandoverTab hybrid={hybrid} setHybrid={setHybrid} errors={errors} />}
            {tab === "supply" && <SupplyTab hybrid={hybrid} setHybrid={setHybrid} />}
            {tab === "ptp" && <PtpTab hybrid={hybrid} setHybrid={setHybrid} />}
            {tab === "schedule" && (
              <div className="space-y-4">
                <CampaignScheduleTab
                  schedule={draft.schedule}
                  onChange={(schedule) =>
                    setDraft((d) => (d ? { ...d, schedule } : d))
                  }
                />
                <div className="rounded-md border border-info-500/40 bg-info-500/[0.06] px-3 py-2 text-[11px] text-info-300">
                  Attempts count across AI and agent work on the shared contact record.
                </div>
              </div>
            )}
            <div className="mt-6 rounded-md border border-border bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
              Borrowers never hear hold or busy messages in Hybrid mode, so
              there is no Messages tab. Jabi stays on the line and talks.
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-muted/30">
          <div className="sticky top-0 p-6">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Live preview
            </div>
            <HybridPreview draft={draft} hybrid={hybrid} />
          </div>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          warnings={warnings}
          ack={ackWarnings}
          onAckChange={setAckWarnings}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            onSave()
          }}
        />
      )}
    </div>
  )
}

/* ─────────── Tabs ─────────── */

function BasicsTab({
  draft,
  setBasic,
}: {
  draft: HumanCampaign
  setBasic: <K extends keyof HumanCampaign>(k: K, v: HumanCampaign[K]) => void
}) {
  return (
    <div className="space-y-4">
      <FormField label="Campaign name">
        <Input
          value={draft.name}
          onChange={(e) => setBasic("name", e.target.value)}
          className="h-9 text-[13px]"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Dialer *">
          <Select
            value={draft.dialerName}
            onChange={(v) => setBasic("dialerName", v)}
            options={DIALER_OPTIONS}
          />
        </FormField>
        <FormField label="Priority tier">
          <Select
            value={draft.priorityTier}
            onChange={(v) =>
              setBasic("priorityTier", v as HumanCampaign["priorityTier"])
            }
            options={["high", "medium", "low"]}
          />
        </FormField>
      </div>
      <FormField label="Gateway">
        <div className="rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-[12px] text-foreground">
          {draft.gateway}
        </div>
      </FormField>
    </div>
  )
}

function AgentsTab({
  hybrid,
  setHybrid,
}: {
  hybrid: HybridCampaignConfig
  setHybrid: (patch: Partial<HybridCampaignConfig>) => void
}) {
  const [groupFilter, setGroupFilter] = React.useState<string>("")
  const list = HYBRID_AGENTS.filter(
    (a) => !groupFilter || a.group === groupFilter,
  )
  const toggle = (a: HybridAgent) => {
    if (!isAgentEligibleForHybrid(a)) return
    const on = hybrid.agentIds.includes(a.id)
    setHybrid({
      agentIds: on
        ? hybrid.agentIds.filter((x) => x !== a.id)
        : [...hybrid.agentIds, a.id],
    })
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold">Hybrid agents</div>
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
            Calls only ever start in the voice of a selected agent. An agent
            can take over only calls in their own voice.
          </p>
        </div>
        <a
          href="/agents/voice-consent"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Manage voice consent <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormField label="Group filter">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring"
          >
            <option value="">All groups</option>
            {HYBRID_AGENT_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </FormField>
        <div className="rounded-md border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="text-foreground font-medium">{hybrid.agentIds.length}</span>{" "}
          selected
        </div>
      </div>
      <div className="space-y-1.5">
        {list.map((a) => {
          const eligible = isAgentEligibleForHybrid(a)
          const checked = hybrid.agentIds.includes(a.id)
          return (
            <label
              key={a.id}
              title={!eligible ? reasonAgentNotEligible(a) : undefined}
              className={cn(
                "flex items-center justify-between gap-3 rounded border px-3 py-2 text-[12px]",
                eligible
                  ? "cursor-pointer border-border bg-background/60 hover:bg-muted/40"
                  : "border-dashed border-border bg-muted/10 opacity-60",
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!eligible}
                  onChange={() => toggle(a)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <div>
                  <div className="font-medium text-foreground">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground">{a.group}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <StatusChip
                  tone={a.voiceClone === "approved" ? "ok" : a.voiceClone === "pending" ? "warn" : "err"}
                  label={`Voice: ${VOICE_CLONE_LABEL[a.voiceClone]}`}
                />
                <StatusChip
                  tone={a.greetingClip === "ready" ? "ok" : "err"}
                  label={`Greeting: ${GREETING_CLIP_LABEL[a.greetingClip]}`}
                />
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function StatusChip({ tone, label }: { tone: "ok" | "warn" | "err"; label: string }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[9.5px] font-medium",
        tone === "ok" && "bg-emerald-500/15 text-emerald-300",
        tone === "warn" && "bg-amber-500/15 text-amber-300",
        tone === "err" && "bg-error-500/15 text-error-300",
      )}
    >
      {label}
    </span>
  )
}

function AudienceTab({
  hybrid,
  setHybrid,
}: {
  hybrid: HybridCampaignConfig
  setHybrid: (patch: Partial<HybridCampaignConfig>) => void
}) {
  const segments = hybrid.segments ?? []
  const [applyProject, setApplyProject] = React.useState<string>("")
  const update = (next: HybridCampaignConfig["segments"]) =>
    setHybrid({ segments: next })
  const addRow = () =>
    update([
      ...segments,
      { id: `seg-${Date.now().toString(36)}`, viewName: "" },
    ])
  const removeRow = (id: string) =>
    update(segments.filter((s) => s.id !== id))
  const patch = (id: string, p: Partial<(typeof segments)[number]>) =>
    update(segments.map((s) => (s.id === id ? { ...s, ...p } : s)))

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold">Segments</div>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              Add saved Views. Top segment is dialed first. Every segment needs
              a Jabi project.
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {segments.length} of 5
          </div>
        </div>

        {segments.length > 1 && (
          <div className="mt-3 flex items-center gap-2 rounded border border-border bg-background/40 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <div className="flex-1 text-[11px]">
              <div className="font-medium text-foreground">Apply to all segments</div>
              <div className="text-[10px] text-muted-foreground">
                Sets the same Jabi project on every row.
              </div>
            </div>
            <select
              value={applyProject}
              onChange={(e) => setApplyProject(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-[11.5px] outline-none focus-visible:border-ring"
            >
              <option value="">Select project</option>
              {CLEARVOICE_PROJECTS.filter((p) => p.status !== "disabled").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!applyProject}
              onClick={() =>
                update(
                  segments.map((s) => ({ ...s, projectId: applyProject })),
                )
              }
              className={cn(
                "rounded border border-primary bg-primary px-2 py-1 text-[10.5px] font-semibold text-primary-foreground",
                !applyProject && "cursor-not-allowed opacity-50",
              )}
            >
              Apply
            </button>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {segments.map((s, i) => {
            const project = getProjectById(s.projectId)
            const needsProject = !s.projectId
            return (
              <div key={s.id} className="rounded-md border border-border bg-background/60">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <select
                    value={s.viewName}
                    onChange={(e) => patch(s.id, { viewName: e.target.value })}
                    className={cn(
                      "h-8 flex-1 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring",
                      !s.viewName && "text-muted-foreground",
                    )}
                  >
                    <option value="">Select a saved view</option>
                    {SAVED_VIEWS.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(s.id)}
                    aria-label="Remove segment"
                    className="rounded border border-border bg-background p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {s.viewName && (
                  <div className="border-t border-border/70 bg-background/40 px-3 py-2.5 space-y-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Jabi project *
                      </div>
                      <select
                        value={s.projectId ?? ""}
                        onChange={(e) =>
                          patch(s.id, { projectId: e.target.value || undefined })
                        }
                        className={cn(
                          "mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-[12.5px] outline-none focus-visible:border-ring",
                          !s.projectId && "text-muted-foreground",
                        )}
                      >
                        <option value="">Select a project</option>
                        {CLEARVOICE_PROJECTS.map((p) => {
                          const buckets = p.buckets.map((b) => BUCKET_LABEL[b]).join(", ")
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={p.status === "disabled"}
                            >
                              {p.name}
                              {p.status === "disabled" ? " (disabled)" : ""} ·{" "}
                              {p.lenderName} · {buckets} · {p.pool}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    {needsProject && (
                      <WarnRow block>
                        A Jabi project is required for every segment.
                      </WarnRow>
                    )}
                    {project && (
                      <div className="text-[10.5px] text-muted-foreground">
                        {project.lenderName} ·{" "}
                        {project.buckets.map((b) => BUCKET_LABEL[b]).join(", ")} ·{" "}
                        {project.pool}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {segments.length < 5 && (
            <button
              type="button"
              onClick={addRow}
              className="w-full rounded border border-dashed border-border bg-muted/20 p-3 text-center text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            >
              + Add segment
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="text-[12px] font-semibold">Calling priority</div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Decides which deals get dialed first.
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

function HandoverTab({
  hybrid,
  setHybrid,
  errors,
}: {
  hybrid: HybridCampaignConfig
  setHybrid: (patch: Partial<HybridCampaignConfig>) => void
  errors: ValidationFinding[]
}) {
  const h = hybrid.handover
  const setH = (patch: Partial<HybridCampaignConfig["handover"]>) =>
    setHybrid({ handover: { ...h, ...patch } })
  const windowError = errors.find((e) => e.id === "window_order")
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Window opens at">
          <select
            value={h.opensAt}
            onChange={(e) =>
              setH({ opensAt: e.target.value as typeof h.opensAt })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring"
          >
            <option value="welcome">Welcome</option>
            <option value="right_party_confirmed">Right party confirmed</option>
          </select>
        </FormField>
        <FormField label="Window closes at">
          <select
            value={h.closesAt}
            onChange={(e) =>
              setH({ closesAt: e.target.value as typeof h.closesAt })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring"
          >
            <option value="debt_disclosed">Debt disclosed</option>
            <option value="negotiation_starts">Negotiation starts</option>
          </select>
        </FormField>
      </div>
      {windowError && <WarnRow block>{windowError.message}</WarnRow>}

      <div className="rounded-md border border-border bg-background/60 p-3 space-y-2">
        <label className="flex cursor-pointer items-start gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={h.maxAgeEnabled}
            onChange={(e) => setH({ maxAgeEnabled: e.target.checked })}
            className="mt-0.5 h-3.5 w-3.5 accent-primary"
          />
          <div>
            <div className="font-medium text-foreground">Max age</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Closes the window earlier if reached first.
            </div>
          </div>
        </label>
        {h.maxAgeEnabled && (
          <div className="flex items-center gap-2 text-[11.5px]">
            <input
              type="number"
              min={1}
              max={600}
              value={h.maxAgeSec}
              onChange={(e) =>
                setH({
                  maxAgeSec: Math.max(1, Math.min(600, Number(e.target.value) || 1)),
                })
              }
              className="h-7 w-20 rounded border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring"
            />
            <span className="text-muted-foreground">seconds</span>
          </div>
        )}
      </div>

      <FormField label="Voice binding">
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-start gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]">
            <input
              type="radio"
              checked={h.voiceBinding === "at_answer"}
              onChange={() => setH({ voiceBinding: "at_answer" })}
              className="mt-0.5 h-3.5 w-3.5 accent-primary"
            />
            <div>
              <div className="font-medium text-foreground">
                At answer <span className="ml-1 rounded bg-primary/15 px-1.5 py-px text-[9px] font-semibold text-primary">Recommended</span>
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                The voice is chosen when the borrower answers, from agents who
                are Ready or finishing wrap.
              </div>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]">
            <input
              type="radio"
              checked={h.voiceBinding === "at_dial"}
              onChange={() => setH({ voiceBinding: "at_dial" })}
              className="mt-0.5 h-3.5 w-3.5 accent-primary"
            />
            <div className="font-medium text-foreground">At dial</div>
          </label>
        </div>
      </FormField>

      <FormField label="Call selection">
        <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-[12px] text-foreground">
          Freshest right-party call first
        </div>
      </FormField>

      <div className="rounded-md border border-border bg-background/60 p-3 space-y-2">
        <label className="flex cursor-pointer items-start gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={h.claimDuringWrap}
            onChange={(e) => setH({ claimDuringWrap: e.target.checked })}
            className="mt-0.5 h-3.5 w-3.5 accent-primary"
          />
          <div>
            <div className="font-medium text-foreground">
              Claim the next call during wrap
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Agent sees the next brief while finishing the current wrap.
            </div>
          </div>
        </label>
        {h.claimDuringWrap && (
          <div className="flex items-center gap-2 text-[11.5px]">
            <span className="text-muted-foreground">Show brief for the last</span>
            <input
              type="number"
              min={1}
              max={30}
              value={h.briefLastSec}
              onChange={(e) =>
                setH({
                  briefLastSec: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                })
              }
              className="h-7 w-16 rounded border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring"
            />
            <span className="text-muted-foreground">seconds of wrap</span>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-background/60 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Brief preview
        </div>
        <div className="mt-2 space-y-1 text-[11.5px] text-foreground">
          <div><span className="text-muted-foreground">Borrower and lender:</span> Ahmed Al Maktoum, Mashreq</div>
          <div><span className="text-muted-foreground">Status:</span> Right party confirmed, 42 seconds in</div>
          <div><span className="text-muted-foreground">Last said:</span> &quot;I need to speak to someone about my payment.&quot;</div>
          <div><span className="text-muted-foreground">Jabi next:</span> Confirm balance and propose a 7-day plan.</div>
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground">
          Full transcript stays one click away.
        </div>
      </div>
    </div>
  )
}

function SupplyTab({
  hybrid,
  setHybrid,
}: {
  hybrid: HybridCampaignConfig
  setHybrid: (patch: Partial<HybridCampaignConfig>) => void
}) {
  const s = hybrid.supply
  const setS = (patch: Partial<HybridCampaignConfig["supply"]>) =>
    setHybrid({ supply: { ...s, ...patch } })
  const estimated = s.mode === "steady"
    ? `About ${(s.maxCallsPerSec * 25200).toLocaleString()} attempts per day`
    : "Varies with agent availability"
  return (
    <div className="space-y-4">
      <FormField label="Supply mode">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]">
            <input
              type="radio"
              checked={s.mode === "steady"}
              onChange={() => setS({ mode: "steady" })}
              className="mt-0.5 h-3.5 w-3.5 accent-primary"
            />
            <div className="font-medium text-foreground">Steady</div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]">
            <input
              type="radio"
              checked={s.mode === "responsive"}
              onChange={() => setS({ mode: "responsive" })}
              className="mt-0.5 h-3.5 w-3.5 accent-primary"
            />
            <div className="font-medium text-foreground">Responsive</div>
          </label>
        </div>
      </FormField>

      {s.mode === "steady" ? (
        <FormField label="Max new calls per second">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={s.maxCallsPerSec}
              onChange={(e) =>
                setS({
                  maxCallsPerSec: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                })
              }
              className="h-8 w-20 rounded border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring"
            />
            <span className="text-[11.5px] text-muted-foreground">calls / second</span>
          </div>
        </FormField>
      ) : (
        <FormField label="Max outstanding calls per agent">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={s.maxOutstandingPerAgent}
              onChange={(e) =>
                setS({
                  maxOutstandingPerAgent: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                })
              }
              className="h-8 w-20 rounded border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring"
            />
            <span className="text-[11.5px] text-muted-foreground">calls / agent</span>
          </div>
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            New calls start only while an agent is Ready or wrapping.
          </p>
        </FormField>
      )}

      <div className="rounded-md border border-info-500/40 bg-info-500/[0.06] px-3 py-2 text-[11px] text-info-300">
        {estimated}
      </div>
    </div>
  )
}

function PtpTab({
  hybrid,
  setHybrid,
}: {
  hybrid: HybridCampaignConfig
  setHybrid: (patch: Partial<HybridCampaignConfig>) => void
}) {
  const p = hybrid.ptp
  const setP = (patch: Partial<HybridCampaignConfig["ptp"]>) =>
    setHybrid({ ptp: { ...p, ...patch } })
  const toggleRule = (
    r: HybridCampaignConfig["ptp"]["riskRules"][number],
  ) => {
    const on = p.riskRules.includes(r)
    setP({ riskRules: on ? p.riskRules.filter((x) => x !== r) : [...p.riskRules, r] })
  }
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-background/60 p-3 space-y-3">
        <label className="flex cursor-pointer items-start gap-2 text-[11.5px]">
          <input
            type="checkbox"
            checked={p.digitalConfirm}
            onChange={(e) => setP({ digitalConfirm: e.target.checked })}
            className="mt-0.5 h-3.5 w-3.5 accent-primary"
          />
          <div className="flex-1">
            <div className="font-medium text-foreground">Digital confirmation</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              After a PTP, send a confirmation message. The borrower replies 1 to confirm.
            </div>
          </div>
        </label>
        {p.digitalConfirm && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Channel">
                <select
                  value={p.channel}
                  onChange={(e) =>
                    setP({ channel: e.target.value as typeof p.channel })
                  }
                  className="h-8 w-full rounded border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </FormField>
              <FormField label="Reply window (hours)">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={p.replyWindowHours}
                  onChange={(e) =>
                    setP({
                      replyWindowHours: Math.max(1, Math.min(168, Number(e.target.value) || 1)),
                    })
                  }
                  className="h-8 w-full rounded border border-input bg-background px-2 text-[12px] outline-none focus-visible:border-ring"
                />
              </FormField>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-[11px]">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Message preview
              </div>
              <div className="mt-1 font-mono text-[11.5px] text-foreground">
                Reply 1 to confirm AED [amount] on [date].
              </div>
            </div>
          </>
        )}
      </div>

      <FormField label="Verification policy">
        <div className="space-y-1.5">
          {[
            { id: "all", label: "All Jabi PTPs" },
            { id: "by_risk", label: "By risk" },
            { id: "none", label: "None" },
          ].map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]"
            >
              <input
                type="radio"
                checked={p.verification === o.id}
                onChange={() => setP({ verification: o.id as typeof p.verification })}
                className="h-3.5 w-3.5 accent-primary"
              />
              <span className="text-foreground">{o.label}</span>
            </label>
          ))}
        </div>
      </FormField>

      {p.verification === "by_risk" && (
        <div className="rounded-md border border-border bg-background/60 p-3 space-y-2">
          <div className="text-[10.5px] font-semibold text-foreground">
            Risk rules
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: "first_promise", label: "First promise" },
                { id: "previously_broken", label: "Previously broken promise" },
                { id: "low_confidence", label: "Low Jabi confidence" },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRule(r.id)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10.5px] font-medium",
                  p.riskRules.includes(r.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => toggleRule("amount_over")}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10.5px] font-medium",
                p.riskRules.includes("amount_over")
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Amount over
            </button>
            {p.riskRules.includes("amount_over") && (
              <div className="flex items-center gap-1 text-[10.5px]">
                <span className="text-muted-foreground">AED</span>
                <input
                  type="number"
                  min={1}
                  value={p.amountOver}
                  onChange={(e) =>
                    setP({ amountOver: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="h-6 w-20 rounded border border-input bg-background px-1 text-center tabular-nums outline-none focus-visible:border-ring"
                />
              </div>
            )}
          </div>
          {p.riskRules.length === 0 && (
            <WarnRow block>Select at least one risk rule.</WarnRow>
          )}
        </div>
      )}

      <FormField label="Verification route">
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]">
            <input
              type="radio"
              checked={p.verificationRoute === "owner_voice"}
              onChange={() => setP({ verificationRoute: "owner_voice" })}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span className="text-foreground">
              Owner-voice verification calls <span className="rounded bg-muted px-1 py-px text-[9px] font-semibold text-muted-foreground">Default</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]">
            <input
              type="radio"
              checked={p.verificationRoute === "separate_campaign"}
              onChange={() => setP({ verificationRoute: "separate_campaign" })}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span className="text-foreground">Separate campaign</span>
          </label>
        </div>
      </FormField>

      <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-[10.5px] text-muted-foreground">
        No verification is created when the agent took over and agreed the
        promise.
      </div>
    </div>
  )
}

/* ─────────── Preview ─────────── */

function HybridPreview({
  draft,
  hybrid,
}: {
  draft: HumanCampaign
  hybrid: HybridCampaignConfig
}) {
  const firstAgent = hybrid.agentIds[0]
    ? getHybridAgentById(hybrid.agentIds[0])?.name ?? "a selected agent"
    : "the selected agent"
  const windowOpen = labelOpens(hybrid.handover.opensAt)
  const windowClose = labelCloses(hybrid.handover.closesAt)
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Campaign
        </div>
        <div className="mt-1 text-[15px] font-semibold text-foreground">
          {draft.name}
        </div>
        <div className="mt-2 grid gap-1 text-[11px]">
          <PRow k="Mode" v="Hybrid" />
          <PRow k="Dialer" v={draft.dialerName} />
          <PRow k="Gateway" v={draft.gateway} />
          <PRow k="Priority" v={draft.priorityTier} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Call journey
        </div>
        <ol className="mt-2 space-y-1.5 text-[11.5px]">
          <JourneyRow n={1}>Jabi calls in {firstAgent}&apos;s voice</JourneyRow>
          <JourneyRow n={2}>Window opens at {windowOpen}</JourneyRow>
          <JourneyRow n={3}>Agent joins muted</JourneyRow>
          <JourneyRow n={4}>Take over</JourneyRow>
          <JourneyRow n={5}>
            If no agent is free: Jabi continues, the window closes at {windowClose}, and Jabi completes.
          </JourneyRow>
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </div>
        <div className="mt-2 grid gap-1 text-[11px]">
          <PRow k="Agents" v={`${hybrid.agentIds.length} selected`} />
          <PRow
            k="Segments"
            v={
              hybrid.segments.length === 0
                ? "None"
                : `${hybrid.segments.length} with project${hybrid.segments.length === 1 ? "" : "s"}`
            }
          />
          <PRow
            k="Voice binding"
            v={hybrid.handover.voiceBinding === "at_answer" ? "At answer" : "At dial"}
          />
          <PRow
            k="Supply"
            v={
              hybrid.supply.mode === "steady"
                ? `Steady, ${hybrid.supply.maxCallsPerSec}/s`
                : `Responsive, ${hybrid.supply.maxOutstandingPerAgent}/agent`
            }
          />
          <PRow
            k="PTP verification"
            v={
              hybrid.ptp.verification === "by_risk"
                ? `By risk, ${hybrid.ptp.riskRules.length} rule${hybrid.ptp.riskRules.length === 1 ? "" : "s"}`
                : hybrid.ptp.verification === "all"
                  ? "All Jabi PTPs"
                  : "None"
            }
          />
        </div>
      </div>
    </div>
  )
}

function JourneyRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
        {n}
      </span>
      <span className="text-foreground">{children}</span>
    </li>
  )
}

function PRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  )
}

function labelOpens(id: HybridCampaignConfig["handover"]["opensAt"]): string {
  return id === "welcome" ? "Welcome" : "Right party confirmed"
}
function labelCloses(id: HybridCampaignConfig["handover"]["closesAt"]): string {
  return id === "debt_disclosed" ? "Debt disclosed" : "Negotiation starts"
}

/* ─────────── Validation ─────────── */

type ValidationFinding = {
  id: string
  tab: TabId
  message: string
}

function computeErrors(draft: HumanCampaign): ValidationFinding[] {
  const out: ValidationFinding[] = []
  const h = draft.hybrid
  if (!h) return out
  const eligible = h.agentIds.filter((id) => {
    const a = getHybridAgentById(id)
    return a && isAgentEligibleForHybrid(a)
  })
  if (eligible.length === 0) {
    out.push({ id: "no_agents", tab: "agents", message: "No eligible agents selected." })
  }
  const segsMissingProject = h.segments.filter((s) => s.viewName && !s.projectId)
  if (h.segments.length > 0 && segsMissingProject.length > 0) {
    out.push({
      id: "segment_missing_project",
      tab: "audience",
      message: `${segsMissingProject.length} segment${segsMissingProject.length === 1 ? "" : "s"} without a Jabi project.`,
    })
  }
  const opensRank = h.handover.opensAt === "welcome" ? 0 : 1
  const closesRank = h.handover.closesAt === "debt_disclosed" ? 2 : 3
  if (closesRank <= opensRank) {
    out.push({
      id: "window_order",
      tab: "handover",
      message: "The handover window closes before it opens.",
    })
  }
  if (h.supply.mode === "responsive" && h.supply.maxOutstandingPerAgent < 1) {
    out.push({ id: "supply_cap", tab: "supply", message: "Responsive cap must be at least 1." })
  }
  if (h.ptp.verification === "by_risk" && h.ptp.riskRules.length === 0) {
    out.push({ id: "no_risk_rules", tab: "ptp", message: "By risk is selected but no rules are set." })
  }
  return out
}

function computeWarnings(draft: HumanCampaign): ValidationFinding[] {
  const out: ValidationFinding[] = []
  const h = draft.hybrid
  if (!h) return out
  const pools = new Set(
    h.segments
      .map((s) => getProjectById(s.projectId)?.pool)
      .filter((p): p is string => !!p),
  )
  if (pools.size > 1) {
    out.push({
      id: "different_pools",
      tab: "audience",
      message: `Segments span ${pools.size} pools (${Array.from(pools).join(", ")}).`,
    })
  }
  if (h.handover.maxAgeEnabled && h.handover.maxAgeSec < 10) {
    out.push({
      id: "short_max_age",
      tab: "handover",
      message: `Max age is ${h.handover.maxAgeSec} seconds, which is quite short.`,
    })
  }
  const eligible = h.agentIds.filter((id) => {
    const a = getHybridAgentById(id)
    return a && isAgentEligibleForHybrid(a)
  })
  if (eligible.length > 0 && eligible.length < 3) {
    out.push({
      id: "few_agents",
      tab: "agents",
      message: `Only ${eligible.length} eligible agent${eligible.length === 1 ? "" : "s"} selected.`,
    })
  }
  return out
}

function ConfirmDialog({
  warnings,
  ack,
  onAckChange,
  onCancel,
  onConfirm,
}: {
  warnings: ValidationFinding[]
  ack: Record<string, boolean>
  onAckChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onCancel: () => void
  onConfirm: () => void
}) {
  const allAcked = warnings.every((w) => ack[w.id])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-warning-500/15 text-warning-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[14px] font-semibold">Review warnings</div>
            <p className="text-[11px] text-muted-foreground">
              Confirm each warning to continue.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {warnings.map((w) => (
            <label
              key={w.id}
              className="flex cursor-pointer items-start gap-2 rounded border border-border bg-background/60 px-3 py-2 text-[11.5px]"
            >
              <input
                type="checkbox"
                checked={!!ack[w.id]}
                onChange={(e) =>
                  onAckChange((prev) => ({ ...prev, [w.id]: e.target.checked }))
                }
                className="mt-0.5 h-3.5 w-3.5 accent-primary"
              />
              <span className="text-foreground">{w.message}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!allAcked}
            onClick={onConfirm}
            className={cn(
              "rounded bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground",
              !allAcked && "cursor-not-allowed opacity-50",
            )}
          >
            Start Campaign
          </button>
        </div>
      </div>
    </div>
  )
}

function WarnRow({ children, block }: { children: React.ReactNode; block?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded border px-2.5 py-1.5 text-[10.5px]",
        block
          ? "border-error-500/40 bg-error-500/[0.05] text-error-300"
          : "border-warning-500/40 bg-warning-500/[0.05] text-warning-300",
      )}
    >
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}
