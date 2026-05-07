import { PageShell } from "@/components/shared/page-shell";

export default function EmailTicketsPage() {
  return (
    <PageShell title="Email Tickets" description="Track and respond to email support tickets">
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">Email Tickets coming soon</p>
      </div>
    </PageShell>
  );
}
