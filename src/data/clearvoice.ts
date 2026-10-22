/**
 * ClearVoice — mock projects and agents for hybrid campaigns.
 *
 * A ClearVoice project is the conversational package for one lender or
 * lender bucket. An agent is a single voice persona inside a project.
 * Agents are always filtered by the selected project.
 *
 * This module is the single source of truth; it is consumed by the
 * campaign editor and the journey AI-Call node.
 */

export type ClearVoiceBucket = "B1" | "B2" | "B3"
export type ClearVoiceLanguage = "en" | "ar" | "bilingual"
export type ClearVoiceCapability =
  | "balance_disclosure"
  | "ptp_capture"
  | "payment_link"
  | "settlement_offers"
  | "callback_booking"
  | "dispute_capture"
export type ClearVoiceStatus = "active" | "disabled"

export interface ClearVoiceProject {
  id: string
  name: string
  lenderId: string
  lenderName: string
  buckets: ClearVoiceBucket[]
  languages: ClearVoiceLanguage[]
  /** AI telephony pool — determines the gateway used at run-time. */
  pool: string
  capabilities: ClearVoiceCapability[]
  status: ClearVoiceStatus
  disabledReason?: string
}

export interface ClearVoiceAgent {
  id: string
  projectId: string
  name: string
  language: ClearVoiceLanguage
  voice: string
  /**
   * Projects this agent can run on. Defaults to just the agent's home
   * project; some multi-skilled agents list several so campaigns can
   * reuse them across lenders / buckets.
   */
  supportedProjectIds?: string[]
}

export const BUCKET_LABEL: Record<ClearVoiceBucket, string> = {
  B1: "B1 · 1–30 DPD",
  B2: "B2 · 31–90 DPD",
  B3: "B3 · 90+ DPD",
}

export const LANGUAGE_LABEL: Record<ClearVoiceLanguage, string> = {
  en: "EN",
  ar: "AR",
  bilingual: "EN+AR",
}

export const CAPABILITY_LABEL: Record<ClearVoiceCapability, string> = {
  balance_disclosure: "Balance disclosure",
  ptp_capture: "PTP capture",
  payment_link: "Payment link",
  settlement_offers: "Settlement offers",
  callback_booking: "Callback booking",
  dispute_capture: "Dispute capture",
}

export const CLEARVOICE_PROJECTS: ClearVoiceProject[] = [
  {
    id: "cvp-mashreq-b1-en",
    name: "Mashreq · B1 Reminder EN",
    lenderId: "lnd-mashreq",
    lenderName: "Mashreq",
    buckets: ["B1"],
    languages: ["en"],
    pool: "pool-emea-1",
    capabilities: ["balance_disclosure", "ptp_capture", "payment_link"],
    status: "active",
  },
  {
    id: "cvp-mashreq-b2-bi",
    name: "Mashreq · B2 Collections",
    lenderId: "lnd-mashreq",
    lenderName: "Mashreq",
    buckets: ["B2"],
    languages: ["bilingual"],
    pool: "pool-emea-1",
    capabilities: [
      "balance_disclosure",
      "ptp_capture",
      "payment_link",
      "settlement_offers",
      "callback_booking",
    ],
    status: "active",
  },
  {
    id: "cvp-mashreq-b3-ar",
    name: "Mashreq · B3 Final Notice AR",
    lenderId: "lnd-mashreq",
    lenderName: "Mashreq",
    buckets: ["B3"],
    languages: ["ar"],
    pool: "pool-emea-2",
    capabilities: [
      "balance_disclosure",
      "settlement_offers",
      "dispute_capture",
    ],
    status: "active",
  },
  {
    id: "cvp-tamara-b1-bi",
    name: "Tamara · Early DPD",
    lenderId: "lnd-tamara",
    lenderName: "Tamara",
    buckets: ["B1", "B2"],
    languages: ["bilingual"],
    pool: "pool-mena-1",
    capabilities: ["balance_disclosure", "ptp_capture", "payment_link"],
    status: "active",
  },
  {
    id: "cvp-tamara-b3-ar",
    name: "Tamara · B3 Settlement AR",
    lenderId: "lnd-tamara",
    lenderName: "Tamara",
    buckets: ["B3"],
    languages: ["ar"],
    pool: "pool-mena-1",
    capabilities: [
      "balance_disclosure",
      "settlement_offers",
      "dispute_capture",
      "callback_booking",
    ],
    status: "active",
  },
  {
    id: "cvp-cashnow-b1-en",
    name: "CashNow · B1 Reminder EN",
    lenderId: "lnd-cashnow",
    lenderName: "CashNow",
    buckets: ["B1"],
    languages: ["en"],
    pool: "pool-emea-1",
    capabilities: ["balance_disclosure", "ptp_capture", "payment_link"],
    status: "active",
  },
  {
    id: "cvp-cashnow-b2-bi",
    name: "CashNow · B2 Collections",
    lenderId: "lnd-cashnow",
    lenderName: "CashNow",
    buckets: ["B2", "B3"],
    languages: ["bilingual"],
    pool: "pool-emea-2",
    capabilities: ["balance_disclosure", "ptp_capture", "callback_booking"],
    status: "active",
  },
  {
    id: "cvp-mashreq-dispute-en",
    name: "Mashreq · Dispute Intake EN",
    lenderId: "lnd-mashreq",
    lenderName: "Mashreq",
    buckets: ["B2", "B3"],
    languages: ["en"],
    pool: "pool-emea-1",
    capabilities: ["dispute_capture", "callback_booking"],
    status: "disabled",
    disabledReason: "Compliance review pending — reactivates once sign-off is in.",
  },
]

export const CLEARVOICE_AGENTS: ClearVoiceAgent[] = [
  // Mashreq B1 EN
  { id: "cva-mashreq-b1-mike", projectId: "cvp-mashreq-b1-en", name: "Mike (EN)", language: "en", voice: "aria", supportedProjectIds: ["cvp-mashreq-b1-en"] },
  { id: "cva-mashreq-b1-sarah", projectId: "cvp-mashreq-b1-en", name: "Sarah (EN)", language: "en", voice: "jenny", supportedProjectIds: ["cvp-mashreq-b1-en", "cvp-cashnow-b1-en"] },
  // Mashreq B2 Bilingual
  { id: "cva-mashreq-b2-rashid", projectId: "cvp-mashreq-b2-bi", name: "Rashid (EN+AR)", language: "bilingual", voice: "guy", supportedProjectIds: ["cvp-mashreq-b2-bi", "cvp-mashreq-b3-ar"] },
  { id: "cva-mashreq-b2-leena", projectId: "cvp-mashreq-b2-bi", name: "Leena (EN+AR)", language: "bilingual", voice: "zara", supportedProjectIds: ["cvp-mashreq-b2-bi"] },
  { id: "cva-mashreq-b2-fahad", projectId: "cvp-mashreq-b2-bi", name: "Fahad (EN+AR)", language: "bilingual", voice: "khalid", supportedProjectIds: ["cvp-mashreq-b2-bi", "cvp-cashnow-b2-bi"] },
  // Mashreq B3 AR
  { id: "cva-mashreq-b3-omar", projectId: "cvp-mashreq-b3-ar", name: "Omar (AR)", language: "ar", voice: "hamed", supportedProjectIds: ["cvp-mashreq-b3-ar"] },
  // Tamara Early DPD Bilingual
  { id: "cva-tamara-b1-salma", projectId: "cvp-tamara-b1-bi", name: "Salma (EN+AR)", language: "bilingual", voice: "zara", supportedProjectIds: ["cvp-tamara-b1-bi", "cvp-tamara-b3-ar"] },
  { id: "cva-tamara-b1-ali", projectId: "cvp-tamara-b1-bi", name: "Ali (EN+AR)", language: "bilingual", voice: "khalid", supportedProjectIds: ["cvp-tamara-b1-bi"] },
  // Tamara B3 AR
  { id: "cva-tamara-b3-huda", projectId: "cvp-tamara-b3-ar", name: "Huda (AR)", language: "ar", voice: "hamed", supportedProjectIds: ["cvp-tamara-b3-ar"] },
  { id: "cva-tamara-b3-saeed", projectId: "cvp-tamara-b3-ar", name: "Saeed (AR)", language: "ar", voice: "nizar", supportedProjectIds: ["cvp-tamara-b3-ar"] },
  // CashNow B1 EN
  { id: "cva-cashnow-b1-emily", projectId: "cvp-cashnow-b1-en", name: "Emily (EN)", language: "en", voice: "aria", supportedProjectIds: ["cvp-cashnow-b1-en"] },
  // CashNow B2 Bilingual
  { id: "cva-cashnow-b2-tariq", projectId: "cvp-cashnow-b2-bi", name: "Tariq (EN+AR)", language: "bilingual", voice: "guy", supportedProjectIds: ["cvp-cashnow-b2-bi"] },
  { id: "cva-cashnow-b2-nour", projectId: "cvp-cashnow-b2-bi", name: "Nour (EN+AR)", language: "bilingual", voice: "zara", supportedProjectIds: ["cvp-cashnow-b2-bi"] },
  // Disabled project — agents still exist but unselectable through the UI.
  { id: "cva-mashreq-dispute-rania", projectId: "cvp-mashreq-dispute-en", name: "Rania (EN)", language: "en", voice: "aria", supportedProjectIds: ["cvp-mashreq-dispute-en"] },
]

/** Projects an agent can run on. Falls back to the agent's home project. */
export function getSupportedProjectIdsForAgent(agentId: string | undefined): string[] {
  const a = CLEARVOICE_AGENTS.find((x) => x.id === agentId)
  if (!a) return []
  return a.supportedProjectIds && a.supportedProjectIds.length > 0
    ? a.supportedProjectIds
    : [a.projectId]
}

export function isAgentCompatibleWithProject(
  agentId: string | undefined,
  projectId: string | undefined,
): boolean {
  if (!agentId || !projectId) return true
  const supported = getSupportedProjectIdsForAgent(agentId)
  return supported.includes(projectId)
}

/** Secondary-group id that signals Jabi (ClearVoice AI) handles fallback. */
export const CLEARVOICE_AI_GROUP_ID = "__clearvoice_ai__"
/** User-facing name for the AI fallback group. */
export const CLEARVOICE_AI_GROUP_LABEL = "Jabi"
export const CLEARVOICE_HUMAN_GATEWAY = "cleargrid_twilio"

export function getProjectById(id: string | undefined): ClearVoiceProject | undefined {
  if (!id) return undefined
  return CLEARVOICE_PROJECTS.find((p) => p.id === id)
}

export function getAgentsForProject(projectId: string | undefined): ClearVoiceAgent[] {
  if (!projectId) return []
  return CLEARVOICE_AGENTS.filter((a) => a.projectId === projectId)
}

export function getAgentById(id: string | undefined): ClearVoiceAgent | undefined {
  if (!id) return undefined
  return CLEARVOICE_AGENTS.find((a) => a.id === id)
}

export function describeProject(p: ClearVoiceProject): string {
  const buckets = p.buckets.join(" · ")
  const langs = p.languages.map((l) => LANGUAGE_LABEL[l]).join("/")
  return `${p.lenderName} · ${buckets} · ${langs} · ${p.pool}`
}

/**
 * Lightweight "coverage" estimate for a segment against a project. In the
 * real product this comes from a run against the audience; here it is a
 * deterministic hash of the segment id + project id so previews stay stable
 * across renders.
 */
export function estimateSegmentCoverage(segmentId: string, projectId: string): number {
  if (!segmentId || !projectId) return 0
  let h = 0
  const src = `${segmentId}::${projectId}`
  for (let i = 0; i < src.length; i++) {
    h = (h * 31 + src.charCodeAt(i)) >>> 0
  }
  // 70–99 range reads as a plausible match.
  return 70 + (h % 30)
}
