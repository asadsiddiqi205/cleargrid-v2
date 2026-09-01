/**
 * Seeded human-agent campaigns. Feeds the Human Campaign node's "Use existing
 * campaign" picker AND the /campaigns pages.
 *
 * Each campaign carries a `source`: either created manually inside the
 * Campaigns app, or created through a specific Human Campaign node in a
 * journey (in which case the audience is the deterministic set of
 * borrowers reaching that node — see listCampaignAudience).
 */

import { listBorrowersInJourney, synthesizeTrace } from "./borrower-traces"
import { journeysList } from "./journeys"

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

export type CampaignRunStatus =
  | "processing_calls"
  | "initial_queueing"
  | "stopped"
  | "processed"
  | "paused"

/** Where a campaign was created from. */
export type CampaignSource =
  | { kind: "manual"; createdBy: string }
  | {
      kind: "journey"
      journeyId: string
      journeyName: string
      nodeId: string
      nodeLabel: string
      createdBy: string
    }

export interface CampaignCallMessages {
  welcome?: string
  loop?: string
  busy?: string
}

export interface CampaignSchedule {
  mode: "immediate" | "scheduled"
  startsAt?: string
  endsAt?: string
  pauseByDefault: boolean
  redialEnabled: boolean
}

export interface HumanCampaign {
  id: string
  name: string
  /** Short timestamp shown under the name in the list (e.g., "1/9 · 3:48 PM"). */
  listTimestamp: string
  lenderId: string
  skillGroup: AgentSkillGroup
  priorityTier: CampaignPriorityTier
  urgency: "urgent" | "normal"
  status: CampaignRunStatus
  scriptId: string
  scriptName: string
  createdAt: string
  updatedAt: string

  /** Where the campaign was created — journey-sourced ones link back. */
  source: CampaignSource

  /* ─── Basics (from Create Campaign · Basics tab) ─── */
  dialerName: string
  gateway: string
  agentGroup: string
  secondaryGroup?: string
  dialSpeed: string
  mode: "excel_run" | "journey_stream" | "callback" | "view"
  type: "Campaign Human Call" | "Campaign Callback"

  /* ─── Run stats visible on the list + detail ─── */
  totalContacts: number
  initialQueued: number
  queued: number
  completed: number
  successful: number
  failed: number

  /* ─── Messages + schedule tabs ─── */
  callMessages: CampaignCallMessages
  schedule: CampaignSchedule
}

export const humanCampaigns: HumanCampaign[] = [
  /* ─── Journey-sourced (High DPD Collection Flow → Enroll in Human Campaign) ─── */
  {
    id: "camp-high-dpd-human",
    name: "High DPD · Human Escalation",
    listTimestamp: "1/9 · 3:48 PM",
    lenderId: "lnd-mashreq",
    skillGroup: "collections_uae_ar",
    priorityTier: "high",
    urgency: "urgent",
    status: "processing_calls",
    scriptId: "scr-mashreq-formal-v3",
    scriptName: "Mashreq Formal Collections · v3",
    createdAt: "2026-08-30T15:48:00Z",
    updatedAt: "2026-09-01T15:50:00Z",
    source: {
      kind: "journey",
      journeyId: "high-dpd",
      journeyName: "High DPD Collection Flow",
      nodeId: "n-human-1",
      nodeLabel: "Enroll in Human Campaign",
      createdBy: "Rabab Abbas",
    },
    dialerName: "Dialer 1",
    gateway: "KSA ISCT (966115005390)",
    agentGroup: "Mashreq Individual",
    dialSpeed: "7x",
    mode: "journey_stream",
    type: "Campaign Human Call",
    totalContacts: 214,
    initialQueued: 214,
    queued: 187,
    completed: 121,
    successful: 43,
    failed: 78,
    callMessages: {
      welcome:
        "This is an important call regarding your account. Please stay on the line.",
      loop: "Please wait while we connect your call to one of our agents.",
      busy: "All agents are busy — we'll call you back shortly. Thank you for your patience.",
    },
    schedule: {
      mode: "immediate",
      pauseByDefault: false,
      redialEnabled: true,
    },
  },
  /* ─── Journey-sourced (Broken Promise → Escalation) ─── */
  {
    id: "camp-broken-ptp-escalation",
    name: "Broken Promise · PTP Escalation",
    listTimestamp: "1/9 · 2:50 PM",
    lenderId: "lnd-tamara",
    skillGroup: "collections_uae_en",
    priorityTier: "medium",
    urgency: "normal",
    status: "processing_calls",
    scriptId: "scr-tamara-friendly-v2",
    scriptName: "Tamara Friendly Reminder · v2",
    createdAt: "2026-08-31T14:50:00Z",
    updatedAt: "2026-09-01T14:23:00Z",
    source: {
      kind: "journey",
      journeyId: "broken-promise",
      journeyName: "Broken Promise Follow-up",
      nodeId: "n-human-1",
      nodeLabel: "Human Campaign · Escalation",
      createdBy: "Asad Siddiqi",
    },
    dialerName: "Dialer 1",
    gateway: "cleargrid_twilio",
    agentGroup: "Tamara Individual",
    dialSpeed: "5x",
    mode: "journey_stream",
    type: "Campaign Human Call",
    totalContacts: 1645,
    initialQueued: 1645,
    queued: 1546,
    completed: 843,
    successful: 187,
    failed: 656,
    callMessages: {
      welcome:
        "Your Tamara account is showing a broken payment promise. Please stay on the line.",
      loop: "Connecting you to a Tamara collections specialist…",
      busy: "Our agents are busy. We'll retry shortly.",
    },
    schedule: {
      mode: "immediate",
      pauseByDefault: false,
      redialEnabled: true,
    },
  },
  /* ─── Journey-sourced (Escalation Auto-Route) ─── */
  {
    id: "camp-escalation-auto",
    name: "Escalation · Auto-Route Queue",
    listTimestamp: "1/9 · 11:38 AM",
    lenderId: "lnd-mashreq",
    skillGroup: "final_notice",
    priorityTier: "high",
    urgency: "urgent",
    status: "processed",
    scriptId: "scr-mashreq-formal-v3",
    scriptName: "Mashreq Formal Collections · v3",
    createdAt: "2026-09-01T11:38:00Z",
    updatedAt: "2026-09-01T14:00:00Z",
    source: {
      kind: "journey",
      journeyId: "escalation",
      journeyName: "Escalation Auto-Route",
      nodeId: "n-human-1",
      nodeLabel: "Human Campaign · Escalation queue",
      createdBy: "Asad Siddiqi",
    },
    dialerName: "Dialer 2",
    gateway: "cleargrid_twilio",
    agentGroup: "Final Notice Specialists",
    dialSpeed: "6x",
    mode: "journey_stream",
    type: "Campaign Human Call",
    totalContacts: 156,
    initialQueued: 156,
    queued: 0,
    completed: 156,
    successful: 34,
    failed: 122,
    callMessages: {
      welcome:
        "This is a final notice regarding your outstanding balance. Please remain on the line.",
      loop: "Connecting you to a specialist…",
      busy: "All specialists are on other calls. We'll retry shortly.",
    },
    schedule: {
      mode: "immediate",
      pauseByDefault: false,
      redialEnabled: true,
    },
  },
  /* ─── Manually created (from the Campaigns app itself) ─── */
  {
    id: "camp-mashreq-90dpd",
    name: "Mashreq · 90+ DPD Recovery",
    listTimestamp: "1/9 · 12:26 PM",
    lenderId: "lnd-mashreq",
    skillGroup: "collections_uae_ar",
    priorityTier: "high",
    urgency: "urgent",
    status: "processing_calls",
    scriptId: "scr-mashreq-formal-v3",
    scriptName: "Mashreq Formal Collections · v3",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-07-20T14:23:00Z",
    source: { kind: "manual", createdBy: "Amira Abdullah" },
    dialerName: "Dialer 1",
    gateway: "cleargrid_twilio",
    agentGroup: "Mashreq Collections",
    dialSpeed: "5x",
    mode: "excel_run",
    type: "Campaign Human Call",
    totalContacts: 647,
    initialQueued: 647,
    queued: 461,
    completed: 186,
    successful: 45,
    failed: 129,
    callMessages: {},
    schedule: {
      mode: "immediate",
      pauseByDefault: false,
      redialEnabled: true,
    },
  },
  {
    id: "camp-tamara-ptp",
    name: "Tamara · PTP Broken Recovery",
    listTimestamp: "1/9 · 12:07 PM",
    lenderId: "lnd-tamara",
    skillGroup: "collections_uae_en",
    priorityTier: "medium",
    urgency: "normal",
    status: "processing_calls",
    scriptId: "scr-tamara-friendly-v2",
    scriptName: "Tamara Friendly Reminder · v2",
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-07-19T09:00:00Z",
    source: { kind: "manual", createdBy: "Omar Essam" },
    dialerName: "Dialer 1",
    gateway: "cleargrid_twilio",
    agentGroup: "Tamara Individual",
    dialSpeed: "6x",
    mode: "excel_run",
    type: "Campaign Human Call",
    totalContacts: 594,
    initialQueued: 594,
    queued: 425,
    completed: 169,
    successful: 39,
    failed: 126,
    callMessages: {},
    schedule: {
      mode: "immediate",
      pauseByDefault: false,
      redialEnabled: true,
    },
  },
  {
    id: "camp-enbd-hardship",
    name: "ENBD · Hardship Outreach",
    listTimestamp: "1/9 · 11:40 AM",
    lenderId: "lnd-enbd",
    skillGroup: "hardship_care",
    priorityTier: "medium",
    urgency: "normal",
    status: "processing_calls",
    scriptId: "scr-enbd-hardship-v1",
    scriptName: "ENBD Hardship Care · v1",
    createdAt: "2026-05-20T11:00:00Z",
    updatedAt: "2026-07-15T11:00:00Z",
    source: { kind: "manual", createdBy: "Taghreed Alsubay" },
    dialerName: "Dialer 1",
    gateway: "cleargrid_twilio",
    agentGroup: "Hardship Care",
    dialSpeed: "3x",
    mode: "excel_run",
    type: "Campaign Human Call",
    totalContacts: 242,
    initialQueued: 242,
    queued: 199,
    completed: 143,
    successful: 42,
    failed: 96,
    callMessages: {},
    schedule: {
      mode: "immediate",
      pauseByDefault: true,
      redialEnabled: false,
    },
  },
  {
    id: "camp-cashnow-settlement",
    name: "CashNow · Settlement Negotiation",
    listTimestamp: "1/9 · 11:37 AM",
    lenderId: "lnd-cashnow",
    skillGroup: "settlement_negotiators",
    priorityTier: "high",
    urgency: "urgent",
    status: "stopped",
    scriptId: "scr-cashnow-settlement-v1",
    scriptName: "CashNow Settlement · v1",
    createdAt: "2026-06-15T09:00:00Z",
    updatedAt: "2026-07-25T09:00:00Z",
    source: { kind: "manual", createdBy: "Shenice Burbidge" },
    dialerName: "Dialer 1",
    gateway: "cleargrid_twilio",
    agentGroup: "Settlement Negotiators",
    dialSpeed: "4x",
    mode: "excel_run",
    type: "Campaign Human Call",
    totalContacts: 28,
    initialQueued: 28,
    queued: 0,
    completed: 28,
    successful: 6,
    failed: 22,
    callMessages: {},
    schedule: {
      mode: "immediate",
      pauseByDefault: false,
      redialEnabled: true,
    },
  },
  {
    id: "camp-fab-final",
    name: "FAB · Final Notice",
    listTimestamp: "1/9 · 11:30 AM",
    lenderId: "lnd-fab",
    skillGroup: "final_notice",
    priorityTier: "high",
    urgency: "urgent",
    status: "paused",
    scriptId: "scr-fab-final-v1",
    scriptName: "FAB Final Notice · v1",
    createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-26T15:00:00Z",
    source: { kind: "manual", createdBy: "Omar Essam" },
    dialerName: "Dialer 1",
    gateway: "cleargrid_twilio",
    agentGroup: "Final Notice Specialists",
    dialSpeed: "5x",
    mode: "excel_run",
    type: "Campaign Human Call",
    totalContacts: 4648,
    initialQueued: 4648,
    queued: 1822,
    completed: 2826,
    successful: 292,
    failed: 1945,
    callMessages: {},
    schedule: {
      mode: "immediate",
      pauseByDefault: false,
      redialEnabled: true,
    },
  },
]

export function getCampaignsForLender(lenderId: string): HumanCampaign[] {
  return humanCampaigns.filter(
    (c) =>
      c.status !== "processed" &&
      c.status !== "stopped" &&
      (c.lenderId === lenderId || lenderId === "general"),
  )
}

export function getCampaignById(id: string): HumanCampaign | undefined {
  return humanCampaigns.find((c) => c.id === id)
}

/**
 * For journey-sourced campaigns, the audience is the deterministic set of
 * borrowers reaching that campaign's node inside the journey trace. For
 * manually-sourced campaigns, we simulate a snapshot audience keyed off
 * the lender.
 */
export function listCampaignAudience(
  campaign: HumanCampaign,
): ReturnType<typeof listBorrowersInJourney> {
  if (campaign.source.kind === "journey") {
    // Everyone whose synthesised trace passes through the campaign's node
    // (or, if no `human` hops exist for that journey, everyone enrolled —
    // acts as the upper-bound audience on the detail page).
    const enrolled = listBorrowersInJourney(campaign.source.journeyId, 400)
    const journeyId = campaign.source.journeyId
    const withHumanHop = enrolled.filter((row) =>
      synthesizeTrace(row.borrower.id, journeyId).hops.some(
        (h) => h.outcome.kind === "human",
      ),
    )
    return withHumanHop.length > 0 ? withHumanHop : enrolled
  }
  // Manual campaigns — reuse a stand-in enrolled slice.
  return listBorrowersInJourney("high-dpd", 200).slice(0, campaign.totalContacts)
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignRunStatus, string> = {
  processing_calls: "Processing Calls",
  initial_queueing: "Initial queueing",
  stopped: "Stopped",
  processed: "Processed",
  paused: "Paused",
}

export const CAMPAIGN_STATUS_DOT: Record<CampaignRunStatus, string> = {
  processing_calls: "bg-info-500",
  initial_queueing: "bg-info-500",
  stopped: "bg-neutral-500",
  processed: "bg-primary",
  paused: "bg-warning-500",
}

/** Human-friendly source label for the list column + detail card. */
export function describeSource(source: CampaignSource): {
  kindLabel: string
  primary: string
  href?: string
} {
  if (source.kind === "manual") {
    return { kindLabel: "Manual", primary: source.createdBy }
  }
  const journey = journeysList.find((j) => j.id === source.journeyId)
  return {
    kindLabel: "Journey",
    primary: journey?.name ?? source.journeyName,
    href: `/journeys/${source.journeyId}`,
  }
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
