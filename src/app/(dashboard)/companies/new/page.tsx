import { CompanyForm } from "@/components/company-form";

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          New Company
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <CompanyForm />
    </div>
  );
}
