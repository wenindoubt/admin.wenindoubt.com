"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, Tags, Kanban } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Board", href: "/leads/board", icon: Kanban },
  { label: "Tags", href: "/tags", icon: Tags },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-5 py-5">
        <Link href="/" className="flex items-center gap-3 group">
          {/* Gold monogram */}
          <div className="flex size-9 items-center justify-center rounded-lg bg-gold-400/10 ring-1 ring-gold-400/25 transition-all group-hover:bg-gold-400/15 group-hover:ring-gold-400/40">
            <span className="font-heading text-lg font-bold text-gold-400">W</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-foreground">
              WenInDoubt
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Admin
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  render={<Link href={item.href} />}
                  className={
                    isActive
                      ? "bg-gold-400/10 text-gold-400 font-medium"
                      : "text-sidebar-foreground hover:text-foreground"
                  }
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserButton />
            <span className="text-xs text-muted-foreground truncate">Account</span>
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
