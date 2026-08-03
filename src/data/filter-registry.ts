/**
 * Part 6.5 — filter registry with `requiredRole` scaffolding.
 *
 * Every filter available in the segment builder / audience picker declares
 * which role is allowed to see it. The full org-level identity system is
 * out of scope; this file exists so filter dropdowns can start hiding rows
 * once real role-based auth lands.
 *
 * Current author defaults to "crm_manager", which sees every filter.
 */

export type UserRole = "all" | "crm_manager" | "agent" | "supervisor" | "admin"

export interface FilterDefinition {
  id: string
  label: string
  /** Attribute id the filter operates on. */
  attribute: string
  /** Operators the filter supports. */
  operators: Array<"equals" | "not_equals" | "in" | "not_in" | "gte" | "lte" | "between" | "changed">
  /** Role required to see this filter. `"all"` = visible to everyone. */
  requiredRole: UserRole
  /** Free-text description for the tooltip / picker. */
  description: string
  category: "identity" | "deal" | "risk" | "reachability" | "consent" | "system"
}

export const FILTER_REGISTRY: FilterDefinition[] = [
  {
    id: "borrower_id",
    label: "Borrower ID",
    attribute: "borrower.id",
    operators: ["equals", "in"],
    requiredRole: "all",
    description: "Match a specific borrower by id.",
    category: "identity",
  },
  {
    id: "dpd_bucket",
    label: "DPD Bucket",
    attribute: "deal.dpd_bucket",
    operators: ["equals", "in"],
    requiredRole: "all",
    description: "Days-past-due bucket the deal is in (0-30, 31-60, 61-90, 91-180, 180+).",
    category: "deal",
  },
  {
    id: "outstanding_amount",
    label: "Outstanding Amount",
    attribute: "deal.outstanding",
    operators: ["gte", "lte", "between"],
    requiredRole: "all",
    description: "Total outstanding across the deal in the deal's currency.",
    category: "deal",
  },
  {
    id: "risk_score",
    label: "Risk Score",
    attribute: "borrower.risk_score",
    operators: ["equals", "gte", "lte"],
    requiredRole: "crm_manager",
    description: "Internal risk score. CRM managers only — agents cannot filter on this directly.",
    category: "risk",
  },
  {
    id: "reachable_on_channel",
    label: "Reachable On Channel",
    attribute: "borrower.reachable_on",
    operators: ["in"],
    requiredRole: "all",
    description: "Channels the borrower has a valid contact on (email, sms, whatsapp).",
    category: "reachability",
  },
  {
    id: "dnc_status",
    label: "DNC Status",
    attribute: "borrower.dnc_status",
    operators: ["equals"],
    requiredRole: "all",
    description: "Whether the borrower is on the Do-Not-Contact list.",
    category: "consent",
  },
  {
    id: "consent_revoked_at",
    label: "Consent Revoked At",
    attribute: "borrower.consent_revoked_at",
    operators: ["between", "changed"],
    requiredRole: "admin",
    description: "When the borrower revoked marketing/collections consent. Admin only.",
    category: "consent",
  },
  {
    id: "last_touch_at",
    label: "Last Touch At",
    attribute: "deal.last_touch_at",
    operators: ["between", "gte", "lte"],
    requiredRole: "all",
    description: "Timestamp of the most recent outbound touch to this borrower on any channel.",
    category: "system",
  },
  {
    id: "last_touch_channel",
    label: "Last Touch Channel",
    attribute: "deal.last_touch_channel",
    operators: ["equals", "in"],
    requiredRole: "all",
    description: "Channel of the most recent outbound touch.",
    category: "system",
  },
  {
    id: "assigned_agent",
    label: "Assigned Agent",
    attribute: "deal.assigned_agent_id",
    operators: ["equals", "in"],
    requiredRole: "supervisor",
    description: "Which human agent the deal is currently assigned to. Supervisors only.",
    category: "identity",
  },
]

/**
 * Filter the registry down to what a given role is allowed to see.
 */
export function getVisibleFilters(role: UserRole): FilterDefinition[] {
  if (role === "admin") return FILTER_REGISTRY
  return FILTER_REGISTRY.filter((f) => {
    if (f.requiredRole === "all") return true
    if (f.requiredRole === role) return true
    if (role === "supervisor" && f.requiredRole === "crm_manager") return true
    if (role === "crm_manager" && f.requiredRole === "supervisor") return false
    return false
  })
}

/**
 * Current author's role — scaffolded here for future auth wiring. Overriding
 * this via context/props is the seam the real system will use.
 */
export const CURRENT_ROLE: UserRole = "crm_manager"
