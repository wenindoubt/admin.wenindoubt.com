import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { LeadsTable } from "@/components/leads-table";
import { LeadFilters } from "@/components/lead-filters";
import { getLeads } from "@/lib/actions/leads";
import { Plus, Kanban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type SearchParams = Promise<{
  status?: string;
  source?: string;
  search?: string;
  assignedTo?: string;
}>;

async function LeadsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const leads = await getLeads({
    status: params.status,
    source: params.source,
    search: params.search,
    assignedTo: params.assignedTo,
  });

  return <LeadsTable leads={leads} />;
}

export default async function LeadsPage(props: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Leads</h1>
          <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/leads/board" />}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            <Kanban className="size-4" />
            Board
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/leads/new" />}
            className="bg-gold-400 text-gold-400-foreground hover:bg-gold-500 border-0"
          >
            <Plus className="size-4" />
            Add Lead
          </Button>
        </div>
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <LeadFilters />
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
        <LeadsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
