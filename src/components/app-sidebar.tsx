"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Building2,
  Handshake,
  Kanban,
  LayoutDashboard,
  Tags,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Deals", href: "/deals", icon: Handshake },
  { label: "Board", href: "/deals/board", icon: Kanban },
  { label: "Tags", href: "/tags", icon: Tags },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-5 py-5">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="WenInDoubt"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-wide text-foreground">
              WenInDoubt
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
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
                      ? "bg-neon-400/10 text-neon-400 font-medium"
                      : "text-sidebar-foreground hover:text-foreground"
                  }
                >
                  <item.icon className="size-5" />
                  <span className="text-base">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <UserButton />
          <span className="text-xs text-muted-foreground truncate">
            Account
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
