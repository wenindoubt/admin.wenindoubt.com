import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { NewContactForm } from "./_components/new-contact-form";

type SearchParams = Promise<{ companyId?: string }>;

export default async function NewContactPage(props: {
  searchParams: SearchParams;
}) {
  const { companyId } = await props.searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
          New Contact
        </h1>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <NewContactForm defaultCompanyId={companyId} />
      </Suspense>
    </div>
  );
}
