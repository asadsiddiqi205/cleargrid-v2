import { KpiCard } from "@/components/shared/kpi-card";
import { MessagesTable } from "@/components/composer/messages-table";
import { Send, FileEdit, Clock, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { messageKpis } from "@/data/messages";

const kpiIcons = [Send, FileEdit, Clock, AlertTriangle];
const kpiColors = ["#22c55e", "#71717a", "#f59e0b", "#ef4444"];

export default function MessagesListingPage() {
  return (
    <div className="flex-1 space-y-3 p-5">
      {/* Title + CTA — kept compact so the table lands above the fold */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          <p className="text-[12px] text-muted-foreground">
            Outbound emails, SMS and WhatsApp — drafts, scheduled, sent, failed.
          </p>
        </div>
        <Link
          href="/email-generator/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New message
        </Link>
      </div>

      {/* KPI cards — compact (single row on desktop) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      {/* Messages table — parents + occurrence copies + one-off messages all
          in one queue, filterable by Type (Recurring / Scheduled / Immediate). */}
      <MessagesTable />
    </div>
  );
}
