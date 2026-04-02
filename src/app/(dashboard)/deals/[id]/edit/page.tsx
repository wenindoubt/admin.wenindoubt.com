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
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
          Edit Deal
        </h1>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <DealEditForm deal={deal} />
      </Suspense>
    </div>
  );
}
