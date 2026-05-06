"use client"

import { PageShell } from "@/components/shared/page-shell"
import { StrategiesGrid } from "@/components/strategies/strategies-grid"

export default function StrategiesPage() {
  return (
    <PageShell
      title="Writing styles"
      description="Pre-built playbooks for different debt collection scenarios. Each playbook bundles email, SMS, WhatsApp, and AI call templates with the right tone."
    >
      <StrategiesGrid />
    </PageShell>
  )
}
