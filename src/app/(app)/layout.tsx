import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { LenderProvider } from "@/contexts/lender-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LenderProvider>
        <AppSidebar />
        <SidebarInset>
          <PageHeader />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </LenderProvider>
    </SidebarProvider>
  );
}
