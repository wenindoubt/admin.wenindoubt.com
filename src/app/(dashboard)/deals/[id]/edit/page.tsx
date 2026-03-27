import { notFound } from "next/navigation";
import { DealForm } from "@/components/deal-form";
import { getCompanies } from "@/lib/actions/companies";
import { getDeal } from "@/lib/actions/deals";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditDealPage({ params }: Props) {
  const { id } = await params;
  const [deal, companies] = await Promise.all([getDeal(id), getCompanies()]);
  if (!deal) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Edit Deal
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <DealForm deal={deal} companies={companies} />
    </div>
  );
}
