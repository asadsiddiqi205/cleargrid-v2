"use client"

import { LibraryTabs } from "@/components/templates/library-tabs"
import { PageShell } from "@/components/shared/page-shell"
import { StrategiesGrid } from "@/components/strategies/strategies-grid"

export default function PlaybooksPage() {
  return (
    <div className="flex h-full flex-col">
      <LibraryTabs />
      <div className="flex-1 min-h-0">
        <PageShell
          title="Playbooks"
          description="Pre-built playbooks for different debt collection scenarios. Each playbook bundles email, SMS, and WhatsApp templates with the right tone."
        >
          <StrategiesGrid />
        </PageShell>
      </div>
    </div>
  )
}
