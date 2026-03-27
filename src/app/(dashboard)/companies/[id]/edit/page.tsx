import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/company-form";
import { getCompany } from "@/lib/actions/companies";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCompanyPage({ params }: Props) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Edit Company
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <CompanyForm company={company} />
    </div>
  );
}
