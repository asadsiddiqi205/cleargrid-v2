import { PageShell } from "@/components/shared/page-shell";

export default function CampaignsPage() {
  return (
    <PageShell title="Campaigns" description="Create and manage outreach campaigns">
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">Campaigns coming soon</p>
      </div>
    </PageShell>
  );
}
