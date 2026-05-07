import { PageShell } from "@/components/shared/page-shell";

export default function FilesPage() {
  return (
    <PageShell title="Files" description="Manage uploaded files and documents">
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">Files coming soon</p>
      </div>
    </PageShell>
  );
}
