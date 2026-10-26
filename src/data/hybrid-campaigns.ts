/**
 * Mock catalog of existing hybrid campaigns, used by the Journey Builder
 * Hybrid Campaign node when the author picks "Use existing" instead of
 * creating a fresh campaign. Real backend reads from the campaigns table
 * and filters to `dialingMode === "hybrid"`; the prototype hard-codes two.
 */

import { HYBRID_AGENTS, isAgentEligibleForHybrid } from "./hybrid-agents"

export interface HybridCampaignCatalogEntry {
  id: string
  name: string
  agentGroup: string
  dialerName: string
  projectName: string
  maxAttempts: number
}

export const HYBRID_CAMPAIGN_CATALOG: HybridCampaignCatalogEntry[] = [
  {
    id: "hybrid-mashreq-high-dpd",
    name: "Mashreq High DPD Hybrid",
    agentGroup: "Mashreq Collections",
    dialerName: "ClearVoice (Jabi)",
    projectName: "Mashreq · High DPD",
    maxAttempts: 5,
  },
  {
    id: "hybrid-enbd-hardship",
    name: "ENBD Hardship Hybrid",
    agentGroup: "ENBD Hardship",
    dialerName: "ClearVoice (Jabi)",
    projectName: "ENBD · Hardship Care",
    maxAttempts: 4,
  },
]

export function getHybridCampaignById(
  id: string | undefined,
): HybridCampaignCatalogEntry | undefined {
  if (!id) return undefined
  return HYBRID_CAMPAIGN_CATALOG.find((c) => c.id === id)
}

/** Readiness summary for an agent group — ready count and total. */
export function readinessForGroup(group: string): { ready: number; total: number } {
  const inGroup = HYBRID_AGENTS.filter((a) => a.group === group)
  return {
    ready: inGroup.filter(isAgentEligibleForHybrid).length,
    total: inGroup.length,
  }
}
