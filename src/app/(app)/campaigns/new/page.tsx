"use client"

/**
 * Blank campaign creation route. Seeds a draft, pushes it into the
 * campaigns store so /campaigns/[id]/edit can pick it up, then redirects
 * to the edit route so authoring uses the same UI as editing an
 * existing campaign.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_CAMPAIGN_SCHEDULE,
  humanCampaigns,
  type HumanCampaign,
} from "@/data/campaigns-seed"

export default function NewCampaignPage() {
  const router = useRouter()
  React.useEffect(() => {
    const id = `camp-draft-${Date.now().toString(36)}`
    const now = new Date().toISOString()
    const draft: HumanCampaign = {
      id,
      name: "Untitled campaign",
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
    }
    humanCampaigns.unshift(draft)
    router.replace(`/campaigns/${id}/edit`)
  }, [router])

  return (
    <div className="flex h-[70vh] items-center justify-center text-[13px] text-muted-foreground">
      Creating campaign…
    </div>
  )
}

function shortStamp(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1} · ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`
}
