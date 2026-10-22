/**
 * Human agents eligible for Hybrid dialer campaigns. Each agent carries a
 * voice-clone consent status and a greeting-clip status; only agents whose
 * voice is Approved and whose greeting is Ready can be selected on a
 * Hybrid campaign.
 */

export type VoiceCloneStatus = "approved" | "pending" | "not_recorded"
export type GreetingClipStatus = "ready" | "missing"

export interface HybridAgent {
  id: string
  name: string
  /** Agent group name — matches AGENT_GROUPS in campaigns-seed. */
  group: string
  voiceClone: VoiceCloneStatus
  greetingClip: GreetingClipStatus
}

export const HYBRID_AGENTS: HybridAgent[] = [
  // Mashreq Collections — 8 agents, mixed statuses
  { id: "ha-01", name: "Sara Al Marri", group: "Mashreq Collections", voiceClone: "approved", greetingClip: "ready" },
  { id: "ha-02", name: "Omar Khan", group: "Mashreq Collections", voiceClone: "approved", greetingClip: "ready" },
  { id: "ha-03", name: "Rania Nassar", group: "Mashreq Collections", voiceClone: "approved", greetingClip: "ready" },
  { id: "ha-04", name: "Yousef Haddad", group: "Mashreq Collections", voiceClone: "approved", greetingClip: "missing" },
  { id: "ha-05", name: "Nadia Rahman", group: "Mashreq Collections", voiceClone: "pending", greetingClip: "ready" },
  { id: "ha-06", name: "Faisal Al Zaabi", group: "Mashreq Collections", voiceClone: "pending", greetingClip: "missing" },
  { id: "ha-07", name: "Mariam Hussein", group: "Mashreq Collections", voiceClone: "not_recorded", greetingClip: "missing" },
  { id: "ha-08", name: "Khaled Fahim", group: "Mashreq Collections", voiceClone: "approved", greetingClip: "ready" },
  // ENBD Hardship — 4 agents, mixed statuses
  { id: "ha-09", name: "Layla Qasim", group: "ENBD Hardship", voiceClone: "approved", greetingClip: "ready" },
  { id: "ha-10", name: "Tariq Al Nasser", group: "ENBD Hardship", voiceClone: "approved", greetingClip: "ready" },
  { id: "ha-11", name: "Huda Abbas", group: "ENBD Hardship", voiceClone: "pending", greetingClip: "ready" },
  { id: "ha-12", name: "Jamal Rashid", group: "ENBD Hardship", voiceClone: "not_recorded", greetingClip: "missing" },
]

export const VOICE_CLONE_LABEL: Record<VoiceCloneStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  not_recorded: "Not recorded",
}

export const GREETING_CLIP_LABEL: Record<GreetingClipStatus, string> = {
  ready: "Ready",
  missing: "Missing",
}

export function isAgentEligibleForHybrid(a: HybridAgent): boolean {
  return a.voiceClone === "approved" && a.greetingClip === "ready"
}

export function reasonAgentNotEligible(a: HybridAgent): string {
  if (a.voiceClone !== "approved") {
    return `Voice clone is ${VOICE_CLONE_LABEL[a.voiceClone]}.`
  }
  if (a.greetingClip !== "ready") {
    return `Greeting clip is ${GREETING_CLIP_LABEL[a.greetingClip]}.`
  }
  return "Not eligible."
}

export function getHybridAgentById(id: string): HybridAgent | undefined {
  return HYBRID_AGENTS.find((a) => a.id === id)
}

export const HYBRID_AGENT_GROUPS: string[] = Array.from(
  new Set(HYBRID_AGENTS.map((a) => a.group)),
)
