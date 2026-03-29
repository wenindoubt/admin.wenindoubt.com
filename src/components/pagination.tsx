"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

function buildPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];
  const unique = new Set<number>();
  for (const p of [
    1,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    totalPages,
  ]) {
    if (p >= 1 && p <= totalPages) unique.add(p);
  }
  const sorted = [...unique].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push("ellipsis");
    pages.push(sorted[i]);
  }
  return pages;
}

export function PaginationBar({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        Showing {start}&ndash;{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft />
        </Button>
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-sm text-muted-foreground/50"
            >
              &hellip;
            </span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? "secondary" : "ghost"}
              size="icon-sm"
              className={
                p === currentPage
                  ? "bg-neon-400/10 text-neon-600 border border-neon-400/30 hover:bg-neon-400/15"
                  : ""
              }
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function Pagination({
  total,
  pageSize,
}: {
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const totalPages = Math.ceil(total / pageSize);

  const navigate = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <PaginationBar
      currentPage={currentPage}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={navigate}
    />
  );
}
