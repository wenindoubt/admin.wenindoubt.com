export const dynamic = "force-dynamic";

import { DealForm } from "@/components/deal-form";
import { getCompanies } from "@/lib/actions/companies";

type Props = {
  searchParams: Promise<{ companyId?: string }>;
};

export default async function NewDealPage({ searchParams }: Props) {
  const params = await searchParams;
  const companies = await getCompanies();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          New Deal
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <DealForm companies={companies} defaultCompanyId={params.companyId} />
    </div>
  );
}
