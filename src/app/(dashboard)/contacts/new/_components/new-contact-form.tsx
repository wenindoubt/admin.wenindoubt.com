import { ContactForm } from "@/components/contact-form";
import { getCompanyList } from "@/lib/actions/companies";

type Props = {
  defaultCompanyId?: string;
};

export async function NewContactForm({ defaultCompanyId }: Props) {
  const companies = await getCompanyList();
  return <ContactForm companies={companies} companyId={defaultCompanyId} />;
}
