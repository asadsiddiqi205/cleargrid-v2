import { PageShell } from "@/components/shared/page-shell";
import { KpiCard } from "@/components/shared/kpi-card";
import { MessagesTable } from "@/components/composer/messages-table";
import { Send, FileEdit, Clock, AlertTriangle, Plus } from "lucide-react";
import { messageKpis } from "@/data/messages";

const kpiIcons = [Send, FileEdit, Clock, AlertTriangle];
const kpiColors = ["#22c55e", "#71717a", "#f59e0b", "#ef4444"];

export default function MessagesListingPage() {
  return (
    <PageShell
      title="Messages"
      description="Outbound emails, SMS and WhatsApp messages — drafts, scheduled, sent and failed."
      action={{ label: "New message", href: "/email-generator/new", icon: Plus }}
    >
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {messageKpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpiIcons[i]}
            iconColor={kpiColors[i]}
          />
        ))}
      </div>

      {/* Messages table */}
      <MessagesTable />
    </PageShell>
  );
}
