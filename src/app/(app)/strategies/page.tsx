"use client"

import { PageShell } from "@/components/shared/page-shell"
import { StrategiesGrid } from "@/components/strategies/strategies-grid"

export default function StrategiesPage() {
  return (
    <PageShell
      title="Playbooks"
      description="Pre-built playbooks for different debt collection scenarios. Each playbook bundles email, SMS, and WhatsApp templates with the right tone."
    >
      <StrategiesGrid />
    </PageShell>
  )
}
