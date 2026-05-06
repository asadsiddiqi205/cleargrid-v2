import { PageShell } from "@/components/shared/page-shell";
import { KpiCard } from "@/components/shared/kpi-card";
import { JourneysTable } from "@/components/journeys/journeys-table";
import { Users, Play, Clock, Pause, Plus } from "lucide-react";
import { journeyKpis } from "@/data/journeys";

const kpiIcons = [Users, Play, Clock, Pause];
const kpiColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

export default function JourneysPage() {
  return (
    <PageShell
      title="Journeys"
      description="Multi-step automated flows. Set up rules so messages go out at the right time, every time."
      action={{ label: "New journey", href: "/journeys/new", icon: Plus }}
    >
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {journeyKpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpiIcons[i]}
            iconColor={kpiColors[i]}
          />
        ))}
      </div>

      {/* Journeys table */}
      <JourneysTable />
    </PageShell>
  );
}
