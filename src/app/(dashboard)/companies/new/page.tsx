import { CompanyForm } from "@/components/company-form";

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
          New Company
        </h1>
        <div className="accent-line" />
      </div>
      <CompanyForm />
    </div>
  );
}
