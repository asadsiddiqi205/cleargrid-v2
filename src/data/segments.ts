export interface Segment {
  id: string
  name: string
  description: string
  type: "Dynamic" | "Static"
  filters: number
  borrowers: number
  lastEvaluated: string
}

export const segments: Segment[] = [
  {
    id: "seg-001",
    name: "High DPD UAE Borrowers",
    description: "Borrowers with 60+ days past due in UAE",
    type: "Dynamic",
    filters: 2,
    borrowers: 1248,
    lastEvaluated: "2026-04-03T14:30:00",
  },
  {
    id: "seg-002",
    name: "PTP Broken Promise",
    description: "Borrowers with broken promises in the last 30 days",
    type: "Dynamic",
    filters: 2,
    borrowers: 342,
    lastEvaluated: "2026-03-31T09:15:00",
  },
  {
    id: "seg-003",
    name: "Low Risk Active Accounts",
    description: "Active accounts with low risk and recent payments",
    type: "Static",
    filters: 2,
    borrowers: 5612,
    lastEvaluated: "2026-03-31T11:45:00",
  },
  {
    id: "seg-004",
    name: "Arabic Speaking Escalations",
    description: "Arabic-speaking borrowers with escalated deals",
    type: "Dynamic",
    filters: 2,
    borrowers: 87,
    lastEvaluated: "2026-03-31T16:20:00",
  },
]
