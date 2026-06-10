"use client"

import { PageShell } from "@/components/shared/page-shell"
import { CallbackMonitorView } from "@/components/journeys/callback-monitor-view"

export default function JourneyMonitorPage() {
  return (
    <PageShell
      title="Callback monitor"
      description="Borrower-requested AI callbacks scheduled by AI Call nodes in any journey. Hold = transient compliance block, will re-evaluate. Cancel = terminal."
    >
      <CallbackMonitorView />
    </PageShell>
  )
}
