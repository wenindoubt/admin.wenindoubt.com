import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <div className="accent-line" />
        <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
          <SidebarTrigger className="text-muted-foreground/60 hover:text-foreground transition-colors" />
          <div className="h-4 w-px bg-border/40" />
          <div className="flex items-center gap-2">
            <span className="signal-dot" />
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.15em] text-muted-foreground/50">
              Intelligence Platform
            </span>
          </div>
        </div>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}
