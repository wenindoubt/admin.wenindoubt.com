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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/leads/board" />}>
            <Kanban className="size-4" />
            Board
          </Button>
          <Button nativeButton={false} render={<Link href="/leads/new" />}>
            <Plus className="size-4" />
            Add Lead
          </Button>
        </div>
      </div>
      <Suspense fallback={<LeadFilters />}>
        <LeadFilters />
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        }
      >
        <LeadsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
