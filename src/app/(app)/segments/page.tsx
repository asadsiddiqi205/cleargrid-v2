import { PageShell } from "@/components/shared/page-shell"
import { SegmentsTable } from "@/components/segments/segments-table"
import { Plus } from "lucide-react"

export default function SegmentsPage() {
  return (
    <PageShell
      title="Audiences"
      description="Groups of borrowers you can target with messages and journeys."
      action={{ label: "New audience", href: "/segments/create", icon: Plus }}
    >
      <SegmentsTable />
    </PageShell>
  )
}
