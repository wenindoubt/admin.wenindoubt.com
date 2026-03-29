export const dynamic = "force-dynamic";

import { Kanban, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DealFilters } from "@/components/deal-filters";
import { DealsTable } from "@/components/deals-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeals, getTags } from "@/lib/actions/deals";

type SearchParams = Promise<{
  stage?: string;
  source?: string;
  search?: string;
  assignedTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  tag?: string | string[];
}>;

async function DealsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const tagIds = params.tag
    ? Array.isArray(params.tag)
      ? params.tag
      : [params.tag]
    : undefined;

  const deals = await getDeals({
    stage: params.stage,
    source: params.source,
    search: params.search,
    assignedTo: params.assignedTo,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    tagIds,
  });

  return <DealsTable deals={deals} />;
}

async function FiltersWithTags() {
  const allTags = await getTags();
  return <DealFilters allTags={allTags} />;
}

export default async function DealsPage(props: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Deals
          </h1>
          <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/deals/board" />}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            <Kanban className="size-4" />
            Board
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/deals/new" />}
            className="bg-neon-400 text-neon-400-foreground hover:bg-neon-500 border-0"
          >
            <Plus className="size-4" />
            Add Deal
          </Button>
        </div>
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <FiltersWithTags />
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
        <DealsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
