"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { TableHead } from "@/components/ui/table";

export function SortableHeader({
  column,
  children,
}: {
  column: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sortBy");
  const currentOrder = searchParams.get("sortOrder") ?? "desc";
  const isActive = currentSort === column;

  const handleSort = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", column);
    params.set(
      "sortOrder",
      isActive && currentOrder === "asc" ? "desc" : "asc",
    );
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, column, isActive, currentOrder]);

  return (
    <TableHead
      className="text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer select-none hover:text-muted-foreground transition-colors"
      onClick={handleSort}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (
          currentOrder === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}
