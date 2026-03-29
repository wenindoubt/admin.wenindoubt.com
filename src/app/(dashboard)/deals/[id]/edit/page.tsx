import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { getDealForEdit } from "@/lib/actions/deals";
import { DealEditForm } from "./_components/deal-edit-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditDealPage({ params }: Props) {
  const { id } = await params;
  const deal = await getDealForEdit(id);
  if (!deal) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Edit Deal
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <DealEditForm deal={deal} />
      </Suspense>
    </div>
  );
}
