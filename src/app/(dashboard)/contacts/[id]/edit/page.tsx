import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { getCompanyList } from "@/lib/actions/companies";
import { getContact } from "@/lib/actions/contacts";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditContactPage({ params }: Props) {
  const { id } = await params;
  const [contact, companies] = await Promise.all([
    getContact(id),
    getCompanyList(),
  ]);
  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Edit Contact
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <ContactForm contact={contact} companies={companies} />
    </div>
  );
}
