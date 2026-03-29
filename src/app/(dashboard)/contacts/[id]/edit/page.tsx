import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { getContact } from "@/lib/actions/contacts";
import { ContactEditForm } from "./_components/contact-edit-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditContactPage({ params }: Props) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Edit Contact
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <ContactEditForm contact={contact} />
      </Suspense>
    </div>
  );
}
