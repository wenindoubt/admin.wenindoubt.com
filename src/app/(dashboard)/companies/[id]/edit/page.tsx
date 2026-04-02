import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/company-form";
import { getCompanyForEdit } from "@/lib/actions/companies";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCompanyPage({ params }: Props) {
  const { id } = await params;
  const company = await getCompanyForEdit(id);
  if (!company) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
          Edit Company
        </h1>
        <div className="accent-line" />
      </div>
      <CompanyForm company={company} />
    </div>
  );
}
