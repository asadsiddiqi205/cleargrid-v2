"use client"

/**
 * Choose dialing mode step. Managers pick Power dialer or Hybrid dialer
 * before the audience picker. The choice seeds the right default
 * `dialingMode` on the fresh draft and routes to the editor.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Phone, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DEFAULT_CAMPAIGN_SCHEDULE,
  DEFAULT_HYBRID_CONFIG,
  humanCampaigns,
  type HumanCampaign,
} from "@/data/campaigns-seed"

type Mode = "power" | "hybrid"

export default function NewCampaignPage() {
  const router = useRouter()
  const [choice, setChoice] = React.useState<Mode | null>(null)

  const createCampaign = (mode: Mode) => {
    const id = `camp-draft-${Date.now().toString(36)}`
    const now = new Date().toISOString()
    const draft: HumanCampaign = {
      id,
      name: mode === "hybrid" ? "Untitled hybrid campaign" : "Untitled campaign",
      listTimestamp: shortStamp(new Date()),
      lenderId: "general",
      skillGroup: "collections_uae_en",
      priorityTier: "medium",
      urgency: "normal",
      status: "initial_queueing",
      scriptId: "scr-default",
      scriptName: "Default script",
      createdAt: now,
      updatedAt: now,
      source: { kind: "manual", createdBy: "You" },
      dialerName: "Dialer 1",
      gateway: "cleargrid_twilio",
      agentGroup: "",
      dialSpeed: "5x",
      mode: "excel_run",
      type: "Campaign Human Call",
      totalContacts: 0,
      initialQueued: 0,
      queued: 0,
      completed: 0,
      successful: 0,
      failed: 0,
      callMessages: {},
      schedule: { ...DEFAULT_CAMPAIGN_SCHEDULE },
      dialingMode: mode,
      ...(mode === "hybrid"
        ? { hybrid: { ...DEFAULT_HYBRID_CONFIG } }
        : {}),
    }
    humanCampaigns.unshift(draft)
    router.replace(`/campaigns/${id}/edit`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Create campaign
            </div>
            <h1 className="mt-1 text-[16px] font-semibold">Choose dialing mode</h1>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Pick how calls are placed. You can&apos;t change this later.
            </p>
          </div>
          <Link
            href="/campaigns"
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ModeCard
            icon={<Phone className="h-4 w-4" />}
            title="Power dialer"
            copy="Agents dial through the existing power dialer. No AI."
            selected={choice === "power"}
            onClick={() => setChoice("power")}
            onDoubleClick={() => createCampaign("power")}
          />
          <ModeCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Hybrid dialer"
            copy="Jabi starts every call in an agent's voice. The agent takes over once the right party is confirmed."
            selected={choice === "hybrid"}
            onClick={() => setChoice("hybrid")}
            onDoubleClick={() => createCampaign("hybrid")}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Link
            href="/campaigns"
            className="rounded px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={!choice}
            onClick={() => choice && createCampaign(choice)}
            className={cn(
              "rounded bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground",
              !choice && "cursor-not-allowed opacity-50",
            )}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

function ModeCard({
  icon,
  title,
  copy,
  selected,
  onClick,
  onDoubleClick,
}: {
  icon: React.ReactNode
  title: string
  copy: string
  selected: boolean
  onClick: () => void
  onDoubleClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "flex h-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/[0.05]"
          : "border-border bg-background/60 hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {copy}
      </p>
    </button>
  )
}

function shortStamp(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1} · ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`
}
