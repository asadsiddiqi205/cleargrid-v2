/**
 * Seeded human-agent campaigns. Feeds the Human Campaign node's "Use existing
 * campaign" picker (Part 5).
 *
 * The real Campaigns app owns authoring, activation, and agent-facing config.
 * Journey Builder only enrolls into these.
 */

export type AgentSkillGroup =
  | "collections_uae_en"
  | "collections_uae_ar"
  | "collections_ksa_ar"
  | "hardship_care"
  | "settlement_negotiators"
  | "final_notice"

export const SKILL_GROUP_LABEL: Record<AgentSkillGroup, string> = {
  collections_uae_en: "Collections · UAE · English",
  collections_uae_ar: "Collections · UAE · Arabic",
  collections_ksa_ar: "Collections · KSA · Arabic",
  hardship_care: "Hardship Care",
  settlement_negotiators: "Settlement Negotiators",
  final_notice: "Final Notice Specialists",
}

export type CampaignPriorityTier = "high" | "medium" | "low"

export interface HumanCampaign {
  id: string
  name: string
  lenderId: string
  skillGroup: AgentSkillGroup
  priorityTier: CampaignPriorityTier
  urgency: "urgent" | "normal"
  queueDepth: number
  status: "active" | "paused" | "archived"
  scriptId: string
  scriptName: string
  createdAt: string
  updatedAt: string
}

export const humanCampaigns: HumanCampaign[] = [
  {
    id: "camp-mashreq-90dpd",
    name: "Mashreq · 90+ DPD Recovery",
    lenderId: "lnd-mashreq",
    skillGroup: "collections_uae_ar",
    priorityTier: "high",
    urgency: "urgent",
    queueDepth: 412,
    status: "active",
    scriptId: "scr-mashreq-formal-v3",
    scriptName: "Mashreq Formal Collections · v3",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-07-20T14:23:00Z",
  },
  {
    id: "camp-tamara-ptp",
    name: "Tamara · PTP Broken Recovery",
    lenderId: "lnd-tamara",
    skillGroup: "collections_uae_en",
    priorityTier: "medium",
    urgency: "normal",
    queueDepth: 187,
    status: "active",
    scriptId: "scr-tamara-friendly-v2",
    scriptName: "Tamara Friendly Reminder · v2",
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-07-19T09:00:00Z",
  },
  {
    id: "camp-enbd-hardship",
    name: "ENBD · Hardship Outreach",
    lenderId: "lnd-enbd",
    skillGroup: "hardship_care",
    priorityTier: "medium",
    urgency: "normal",
    queueDepth: 42,
    status: "active",
    scriptId: "scr-enbd-hardship-v1",
    scriptName: "ENBD Hardship Care · v1",
    createdAt: "2026-05-20T11:00:00Z",
    updatedAt: "2026-07-15T11:00:00Z",
  },
  {
    id: "camp-cashnow-settlement",
    name: "CashNow · Settlement Negotiation",
    lenderId: "lnd-cashnow",
    skillGroup: "settlement_negotiators",
    priorityTier: "high",
    urgency: "urgent",
    queueDepth: 89,
    status: "active",
    scriptId: "scr-cashnow-settlement-v1",
    scriptName: "CashNow Settlement · v1",
    createdAt: "2026-06-15T09:00:00Z",
    updatedAt: "2026-07-25T09:00:00Z",
  },
  {
    id: "camp-fab-final",
    name: "FAB · Final Notice",
    lenderId: "lnd-fab",
    skillGroup: "final_notice",
    priorityTier: "high",
    urgency: "urgent",
    queueDepth: 24,
    status: "paused",
    scriptId: "scr-fab-final-v1",
    scriptName: "FAB Final Notice · v1",
    createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-26T15:00:00Z",
  },
]

export function getCampaignsForLender(lenderId: string): HumanCampaign[] {
  return humanCampaigns.filter(
    (c) => c.status !== "archived" && (c.lenderId === lenderId || lenderId === "general"),
  )
}

export function getCampaignById(id: string): HumanCampaign | undefined {
  return humanCampaigns.find((c) => c.id === id)
}

/**
 * Stub enrollment — logs to console. Production wires this to Campaigns'
 * enrollment API.
 */
export function enrollBorrowerInCampaign(input: {
  campaignId: string
  journeyId: string
  nodeId: string
  borrowerId: string
  dealId: string
  overrides?: { priorityTier?: CampaignPriorityTier; urgency?: "urgent" | "normal" }
}): void {
  // eslint-disable-next-line no-console
  console.info("[human-campaign] would enroll borrower via Campaigns API", input)
}
