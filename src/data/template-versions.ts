/**
 * Template authoring metadata — versions, status, approval, references.
 *
 * Sits alongside the rich-email-templates registry. The registry holds the
 * rendered React templates; this file holds the authoring state Command
 * surfaces (Draft/Active, version history, approval status, audit trail).
 */

export type TemplateStatus = "draft" | "in_review" | "active" | "archived"

export interface TemplateVersionEntry {
  versionLabel: string
  /** ISO timestamp. */
  at: string
  by: string
  /** Free-text summary of what changed in this version. */
  changeSummary: string
  /** Status the version transitioned to (if any). */
  statusTransition?: TemplateStatus
}

export interface TemplateApproval {
  status: TemplateStatus
  /** If in_review or active, the most recent maker. */
  submittedBy?: string
  submittedAt?: string
  /** If active, the checker who approved. */
  approvedBy?: string
  approvedAt?: string
  /** Whether maker and checker were the same person (governance violation flag). */
  selfApproved?: boolean
}

export interface TemplateAuthoring {
  /** Template id (matches the rich-email-templates id). */
  templateId: string
  /** Current version label, e.g. "v3" or "v2.1". */
  currentVersion: string
  /** Sorted newest-first. */
  versions: TemplateVersionEntry[]
  approval: TemplateApproval
  /** Linked builder document id (Surface 1). */
  builderDocId?: string
  /** Linked playbook id (Surface 3). */
  playbookId?: string
  /** Lender's brand-kit id (Surface 2). */
  brandKitId?: string
  /** A/B test wired to this template (Surface 5). */
  activeAbTestId?: string
}

export const templateAuthoring: Record<string, TemplateAuthoring> = {
  "rich-cg-payment-reminder": {
    templateId: "rich-cg-payment-reminder",
    currentVersion: "v3.1",
    versions: [
      {
        versionLabel: "v3.1",
        at: "2026-06-04T11:23:00Z",
        by: "Rabab Abbas",
        changeSummary:
          "Tightened subject line; locked CBUAE disclaimer module after compliance review.",
        statusTransition: "active",
      },
      {
        versionLabel: "v3.0",
        at: "2026-05-30T10:00:00Z",
        by: "Asad Siddiqi",
        changeSummary: "Rewrote in v3 builder. Replaced inline disclaimer with locked module.",
        statusTransition: "in_review",
      },
      {
        versionLabel: "v2.3",
        at: "2026-05-12T08:00:00Z",
        by: "Khalil Ahmed",
        changeSummary: "Minor copy fix — corrected account number placeholder.",
        statusTransition: "active",
      },
      {
        versionLabel: "v2.0",
        at: "2026-04-22T15:00:00Z",
        by: "Rabab Abbas",
        changeSummary: "Initial rollout under the rich-template engine.",
        statusTransition: "active",
      },
    ],
    approval: {
      status: "active",
      submittedBy: "Asad Siddiqi",
      submittedAt: "2026-05-30T10:00:00Z",
      approvedBy: "Rabab Abbas",
      approvedAt: "2026-06-04T11:23:00Z",
    },
    builderDocId: "doc-mashreq-reminder",
    playbookId: "pbk-mashreq-formal",
    brandKitId: "bk-mashreq",
  },
  "rich-tamara-friendly": {
    templateId: "rich-tamara-friendly",
    currentVersion: "v2.0",
    versions: [
      {
        versionLabel: "v2.0",
        at: "2026-05-28T14:00:00Z",
        by: "Asad Siddiqi",
        changeSummary: "Rewrote in v3 builder. Added Pay Now CTA tracking.",
        statusTransition: "active",
      },
      {
        versionLabel: "v1.0",
        at: "2026-04-10T09:00:00Z",
        by: "Asad Siddiqi",
        changeSummary: "Initial version under Tamara Friendly playbook.",
        statusTransition: "active",
      },
    ],
    approval: {
      status: "active",
      submittedBy: "Asad Siddiqi",
      submittedAt: "2026-05-28T14:00:00Z",
      approvedBy: "Rabab Abbas",
      approvedAt: "2026-05-29T09:00:00Z",
    },
    builderDocId: "doc-tamara-friendly",
    playbookId: "pbk-tamara-friendly",
    brandKitId: "bk-tamara",
  },
  "rich-cg-settlement": {
    templateId: "rich-cg-settlement",
    currentVersion: "v1.4",
    versions: [
      {
        versionLabel: "v1.4",
        at: "2026-05-22T14:40:00Z",
        by: "Khalil Ahmed",
        changeSummary: "Adjusted settlement discount percentage placeholder.",
        statusTransition: "active",
      },
      {
        versionLabel: "v1.0",
        at: "2026-03-15T11:00:00Z",
        by: "Rabab Abbas",
        changeSummary: "First settlement-offer template.",
        statusTransition: "active",
      },
    ],
    approval: {
      status: "active",
      submittedBy: "Khalil Ahmed",
      submittedAt: "2026-05-22T14:40:00Z",
      approvedBy: "Rabab Abbas",
      approvedAt: "2026-05-23T10:00:00Z",
    },
    playbookId: "pbk-cashnow-urgent",
    brandKitId: "bk-cleargrid",
  },
  "rich-cg-final-notice": {
    templateId: "rich-cg-final-notice",
    currentVersion: "v1.0",
    versions: [
      {
        versionLabel: "v1.0",
        at: "2026-06-08T12:00:00Z",
        by: "Asad Siddiqi",
        changeSummary: "Drafted Final-Stage Notice template. Awaiting compliance review.",
        statusTransition: "in_review",
      },
    ],
    approval: {
      status: "in_review",
      submittedBy: "Asad Siddiqi",
      submittedAt: "2026-06-08T12:00:00Z",
    },
    playbookId: "pbk-fab-final",
    brandKitId: "bk-fab",
  },
}

export const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  active: "Active",
  archived: "Archived",
}

export const TEMPLATE_STATUS_COLOR: Record<TemplateStatus, string> = {
  draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  in_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  archived: "bg-zinc-700/30 text-zinc-500 border-zinc-700/40",
}

export function getTemplateAuthoring(id: string): TemplateAuthoring | undefined {
  return templateAuthoring[id]
}

// ───────── A/B tests ─────────

export interface AbTest {
  id: string
  templateId: string
  name: string
  variants: Array<{
    label: string
    subject: string
    /** % of audience this variant gets. */
    allocationPct: number
    /** Conversion %, against the payment-outcome funnel. */
    conversionPct?: number
    sent?: number
  }>
  /** Goal metric — what the test is optimising for. */
  goal: "paid" | "ptp" | "rpc" | "settled" | "replies" | "activated"
  status: "running" | "paused" | "decided"
  startedAt: string
  decidedWinnerLabel?: string
  /** Stat-sig confidence, 0..1. */
  confidence?: number
}

export const abTests: AbTest[] = [
  {
    id: "ab-mq-reminder-subject",
    templateId: "rich-cg-payment-reminder",
    name: "Mashreq Reminder — Subject A/B",
    variants: [
      {
        label: "A: Direct",
        subject: "Payment Reminder — Action Required",
        allocationPct: 50,
        conversionPct: 6.7,
        sent: 624,
      },
      {
        label: "B: Question hook",
        subject: "Have you seen this? Account {{account_number}}",
        allocationPct: 50,
        conversionPct: 8.4,
        sent: 624,
      },
    ],
    goal: "paid",
    status: "running",
    startedAt: "2026-06-02T09:00:00Z",
    confidence: 0.72,
  },
  {
    id: "ab-tamara-cta-copy",
    templateId: "rich-tamara-friendly",
    name: "Tamara — CTA copy",
    variants: [
      { label: "A: Pay Now", subject: "Hey {{borrower_name}} — quick reminder 👋", allocationPct: 50, conversionPct: 12.1, sent: 4210 },
      { label: "B: Tap to settle", subject: "Hey {{borrower_name}} — quick reminder 👋", allocationPct: 50, conversionPct: 11.4, sent: 4205 },
    ],
    goal: "paid",
    status: "decided",
    startedAt: "2026-05-20T10:00:00Z",
    decidedWinnerLabel: "A: Pay Now",
    confidence: 0.94,
  },
]

export function getAbTestForTemplate(templateId: string): AbTest | undefined {
  return abTests.find((t) => t.templateId === templateId && t.status !== "decided")
}
