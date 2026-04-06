import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { getTalentById } from "@/lib/actions/talent";
import { TalentEditForm } from "./_components/talent-edit-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTalentPage({ params }: Props) {
  const { id } = await params;
  const talent = await getTalentById(id);
  if (!talent) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
          Edit Talent
        </h1>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <TalentEditForm talent={talent} />
      </Suspense>
    </div>
  );
}
