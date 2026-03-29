export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { NewDealForm } from "./_components/new-deal-form";

type Props = {
  searchParams: Promise<{ companyId?: string }>;
};

export default async function NewDealPage({ searchParams }: Props) {
  const { companyId } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          New Deal
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <NewDealForm defaultCompanyId={companyId} />
      </Suspense>
    </div>
  );
}
