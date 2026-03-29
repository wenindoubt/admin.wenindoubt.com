import { ContactForm } from "@/components/contact-form";
import { getCompanyList } from "@/lib/actions/companies";
import type { getContact } from "@/lib/actions/contacts";

type Props = {
  contact: NonNullable<Awaited<ReturnType<typeof getContact>>>;
};

export async function ContactEditForm({ contact }: Props) {
  const companies = await getCompanyList();
  return <ContactForm contact={contact} companies={companies} />;
}
