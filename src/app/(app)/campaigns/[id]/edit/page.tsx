"use client"

/**
 * Full-page campaign editor — replaces the modal wizard from the ClearGrid
 * reference with a persistent editor that always shows a live preview on
 * the right. Tabs on the left (Basics / Audience / Schedule / Messages).
 * Nested template editing opens in a modal via TemplateEditor.
 */

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  X,
  Save,
  Phone,
  Users,
  Calendar,
  MessageSquare,
  Info,
  Route,
  Pencil,
  Play,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  humanCampaigns,
  describeSource,
  type HumanCampaign,
} from "@/data/campaigns-seed"
import { TemplateEditor } from "@/components/templates/template-editor"
import { CampaignScheduleTab } from "@/components/campaigns/campaign-schedule-tab"

const TABS = [
  { id: "basics", label: "Basics", icon: Info },
  { id: "audience", label: "Audience", icon: Users },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "messages", label: "Messages", icon: MessageSquare },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function CampaignEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id ?? ""
  const seed = humanCampaigns.find((c) => c.id === id)

  const [draft, setDraft] = React.useState<HumanCampaign | null>(seed ?? null)
  const [tab, setTab] = React.useState<TabId>("messages")
  const [templateEditorOpen, setTemplateEditorOpen] = React.useState(false)

  if (!draft) {
    return (
      <div className="flex h-screen items-center justify-center text-[13px] text-muted-foreground">
        Campaign not found —{" "}
        <Link href="/campaigns" className="ml-2 text-primary hover:underline">
          back to campaigns
        </Link>
      </div>
    )
  }

  const set = <K extends keyof HumanCampaign>(k: K, v: HumanCampaign[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d))
  const setMsg = (k: "welcome" | "loop" | "busy", v: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            callMessages: { ...d.callMessages, [k]: v },
          }
        : d,
    )
  const save = () => {
    // Mutate the in-memory seed so the detail page reflects changes this session.
    const idx = humanCampaigns.findIndex((c) => c.id === draft.id)
    if (idx >= 0) humanCampaigns[idx] = draft
    toast.success("Campaign saved", {
      description: `${draft.name} updated.`,
    })
    router.push(`/campaigns/${draft.id}`)
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
              Edit campaign
            </div>
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              className="mt-0.5 h-6 border-none bg-transparent px-0 text-[15px] font-semibold focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push(`/campaigns/${draft.id}`)}>
            Cancel
          </Button>
          <Button onClick={save} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save & Close
          </Button>
          <button
            type="button"
            onClick={() => router.push(`/campaigns/${draft.id}`)}
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body — left tabs / form  ·  right preview */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
        <div className="min-h-0 overflow-y-auto border-r border-border bg-background">
          <div className="mx-auto max-w-3xl px-6 py-5">
            {/* Tab strip */}
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

            {tab === "basics" && (
              <BasicsTab draft={draft} set={set} />
            )}
            {tab === "audience" && <AudienceTab draft={draft} />}
            {tab === "schedule" && (
              <CampaignScheduleTab
                schedule={draft.schedule}
                onChange={(schedule) =>
                  setDraft((d) => (d ? { ...d, schedule } : d))
                }
              />
            )}
            {tab === "messages" && (
              <MessagesTab
                draft={draft}
                setMsg={setMsg}
                onOpenTemplateEditor={() => setTemplateEditorOpen(true)}
              />
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-muted/30">
          <div className="sticky top-0 p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Live preview
              </div>
            </div>
            <CampaignPreview draft={draft} tab={tab} />
          </div>
        </div>
      </div>

      {/* Template editor modal */}
      <Dialog open={templateEditorOpen} onOpenChange={setTemplateEditorOpen}>
        <DialogContent className="!max-w-[min(1600px,96vw)] h-[92vh] p-0 overflow-hidden gap-0">
          <div className="flex h-full flex-col">
            <TemplateEditor />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────── Tabs ─────────── */

function BasicsTab({
  draft,
  set,
}: {
  draft: HumanCampaign
  set: <K extends keyof HumanCampaign>(k: K, v: HumanCampaign[K]) => void
}) {
  return (
    <div className="space-y-4">
      <FormField label="Campaign name">
        <Input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          className="h-9 text-[13px]"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Dialer">
          <Input
            value={draft.dialerName}
            onChange={(e) => set("dialerName", e.target.value)}
            className="h-9 text-[13px]"
          />
        </FormField>
        <FormField label="Gateway">
          <Input
            value={draft.gateway}
            onChange={(e) => set("gateway", e.target.value)}
            className="h-9 text-[13px]"
          />
        </FormField>
        <FormField label="Agent group">
          <Input
            value={draft.agentGroup}
            onChange={(e) => set("agentGroup", e.target.value)}
            className="h-9 text-[13px]"
          />
        </FormField>
        <FormField label="Secondary group">
          <Input
            value={draft.secondaryGroup ?? ""}
            onChange={(e) => set("secondaryGroup", e.target.value)}
            placeholder="Optional — used when primary is busy"
            className="h-9 text-[13px]"
          />
        </FormField>
        <FormField label="Dial speed">
          <Input
            value={draft.dialSpeed}
            onChange={(e) => set("dialSpeed", e.target.value)}
            placeholder="e.g. 5x"
            className="h-9 text-[13px]"
          />
        </FormField>
        <FormField label="Priority tier">
          <select
            value={draft.priorityTier}
            onChange={(e) =>
              set(
                "priorityTier",
                e.target.value as HumanCampaign["priorityTier"],
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </FormField>
      </div>
    </div>
  )
}

function AudienceTab({ draft }: { draft: HumanCampaign }) {
  const src = describeSource(draft.source)
  const isJourney = draft.source.kind === "journey"
  return (
    <div className="space-y-4">
      {isJourney ? (
        <div className="rounded-lg border border-info-500/40 bg-info-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-info-300">
            <Route className="h-3 w-3" />
            Journey-sourced audience
          </div>
          <p className="mt-2 text-[12px] text-foreground">
            Audience is dynamically inherited from{" "}
            <span className="font-semibold">{src.primary}</span> — every borrower
            reaching the campaign&apos;s source node is enrolled automatically. You
            can&apos;t manually add segments to a journey-sourced campaign.
          </p>
          <Link
            href={src.href ?? "#"}
            className="mt-3 inline-flex items-center gap-1 rounded border border-info-500/40 bg-info-500/10 px-1.5 py-0.5 text-[10px] font-medium text-info-300 hover:bg-info-500/20"
          >
            Open journey →
          </Link>
        </div>
      ) : (
        <div>
          <div className="text-[12px] font-semibold">Segments</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Add one or more saved Views. Drag rows to reorder — top segment is
            dialed first.
          </p>
          <div className="mt-3 rounded border border-dashed border-border bg-muted/20 p-6 text-center text-[11px] text-muted-foreground">
            + Add segment
          </div>
        </div>
      )}
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

function MessagesTab({
  draft,
  setMsg,
  onOpenTemplateEditor,
}: {
  draft: HumanCampaign
  setMsg: (k: "welcome" | "loop" | "busy", v: string) => void
  onOpenTemplateEditor: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold">Call messages</div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            What the borrower hears at each phase of the call.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onOpenTemplateEditor}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Open template editor
        </Button>
      </div>
      <FormField label="Welcome message">
        <textarea
          value={draft.callMessages.welcome ?? ""}
          onChange={(e) => setMsg("welcome", e.target.value)}
          placeholder="This is an important call regarding your account. Please stay on the line."
          className="min-h-[110px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
        />
      </FormField>
      <FormField label="Loop message">
        <textarea
          value={draft.callMessages.loop ?? ""}
          onChange={(e) => setMsg("loop", e.target.value)}
          placeholder="Please wait while we connect your call to one of our agents."
          className="min-h-[90px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
        />
      </FormField>
      <FormField label="Busy message">
        <textarea
          value={draft.callMessages.busy ?? ""}
          onChange={(e) => setMsg("busy", e.target.value)}
          placeholder="We're sorry, all of our agents are currently unavailable. We'll call you back."
          className="min-h-[110px] w-full rounded-md border border-input bg-background p-3 text-[12px] outline-none focus-visible:border-ring"
        />
      </FormField>
    </div>
  )
}

/* ─────────── Right preview ─────────── */

function CampaignPreview({ draft, tab }: { draft: HumanCampaign; tab: TabId }) {
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
          <Row k="Dialer" v={draft.dialerName} />
          <Row k="Gateway" v={draft.gateway} />
          <Row k="Agent group" v={draft.agentGroup} />
          <Row k="Dial speed" v={draft.dialSpeed} />
          <Row
            k="Schedule"
            v={draft.schedule.mode === "immediate" ? "Start immediately" : "Scheduled"}
          />
          <Row k="Redial" v={draft.schedule.redialEnabled ? "Enabled" : "Off"} />
          <Row
            k="Pause by default"
            v={draft.schedule.pauseByDefault ? "Yes" : "No"}
          />
        </div>
      </div>

      {(tab === "messages" || tab === "basics") && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Call flow — how the borrower experiences it
          </div>
          <div className="space-y-2">
            <CallBubble kind="welcome" text={draft.callMessages.welcome} />
            <CallBubble kind="loop" text={draft.callMessages.loop} />
            <CallBubble kind="busy" text={draft.callMessages.busy} />
          </div>
        </div>
      )}

      {tab === "audience" && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Audience summary
          </div>
          <div className="grid gap-1 text-[11px]">
            <Row k="Source" v={describeSource(draft.source).primary} />
            <Row k="Total contacts" v={draft.totalContacts.toLocaleString()} />
            <Row k="Queued" v={draft.queued.toLocaleString()} />
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
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}
