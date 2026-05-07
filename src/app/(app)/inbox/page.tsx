import { PageShell } from "@/components/shared/page-shell";

export default function InboxPage() {
  return (
    <PageShell title="Inbox" description="View and manage inbound communications">
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">Inbox coming soon</p>
      </div>
    </PageShell>
  );
}
