import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { NewTalentForm } from "./_components/new-talent-form";

export default async function NewTalentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
          New Talent
        </h1>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <NewTalentForm />
      </Suspense>
    </div>
  );
}
