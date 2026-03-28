"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ClickableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        // Don't navigate when clicking interactive elements inside the row
        const target = e.target as HTMLElement;
        if (target.closest("button, a, select, input, [role='menuitem']")) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
