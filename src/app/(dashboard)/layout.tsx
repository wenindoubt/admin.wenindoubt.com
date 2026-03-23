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
      <main className="flex-1 overflow-auto">
        {/* Gold accent line */}
        <div className="h-[2px] bg-gradient-to-r from-gold-400/80 via-gold-400/30 to-transparent" />
        <div className="flex items-center gap-3 border-b border-border/50 px-6 py-3">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground tracking-wide">
            Lead Intelligence Platform
          </span>
        </div>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}
