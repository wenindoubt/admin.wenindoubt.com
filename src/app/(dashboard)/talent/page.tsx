export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Pagination } from "@/components/pagination";
import { TalentFilters } from "@/components/talent-filters";
import { TalentTable } from "@/components/talent-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTalent } from "@/lib/actions/talent";
import { lastPageUrl, PAGE_SIZE } from "@/lib/types";

type SearchParams = Promise<{
  search?: string;
  tier?: string | string[];
  status?: string;
  sortBy?: "name" | "tier" | "created";
  sortOrder?: "asc" | "desc";
  page?: string;
}>;

function resolveStatuses(status?: string): string[] {
  if (status === "all") return ["active", "inactive", "archived"];
  if (status === "archived") return ["archived"];
  return ["active", "inactive"];
}

async function TalentContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const tierParam = params.tier;
  const tier = tierParam
    ? Array.isArray(tierParam)
      ? tierParam
      : [tierParam]
    : undefined;

  const { data, total } = await getTalent({
    search: params.search,
    tier,
    status: resolveStatuses(params.status),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    limit: PAGE_SIZE,
    offset,
  });

  if (data.length === 0 && total > 0 && page > 1) {
    redirect(lastPageUrl("/talent", params, total, PAGE_SIZE));
  }

  return (
    <>
      <TalentTable rows={data} />
      <Pagination total={total} pageSize={PAGE_SIZE} />
    </>
  );
}

export default async function TalentPage(props: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Talent
          </h1>
          <Button
            nativeButton={false}
            render={<Link href="/talent/new" />}
            className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
          >
            <Plus className="size-4" />
            Add Talent
          </Button>
        </div>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <TalentFilters />
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <TalentContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
