export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CompaniesTable } from "@/components/companies-table";
import { CompanyFilters } from "@/components/company-filters";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCompanies } from "@/lib/actions/companies";
import { lastPageUrl, PAGE_SIZE } from "@/lib/types";

type SearchParams = Promise<{
  search?: string;
  size?: string;
  lifecycle?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: string;
}>;

async function CompaniesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: companies, total } = await getCompanies({
    search: params.search,
    size: params.size,
    lifecycle: params.lifecycle,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    limit: PAGE_SIZE,
    offset,
  });

  if (companies.length === 0 && total > 0 && page > 1) {
    redirect(lastPageUrl("/companies", params, total, PAGE_SIZE));
  }

  return (
    <>
      <CompaniesTable companies={companies} />
      <Pagination total={total} pageSize={PAGE_SIZE} />
    </>
  );
}

export default async function CompaniesPage(props: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Companies
          </h1>
          <Button
            nativeButton={false}
            render={<Link href="/companies/new" />}
            className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
          >
            <Plus className="size-4" />
            Add Company
          </Button>
        </div>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <CompanyFilters />
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
        <CompaniesContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
