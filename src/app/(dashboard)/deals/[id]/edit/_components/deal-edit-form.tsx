import { DealForm } from "@/components/deal-form";
import { getCompanyList } from "@/lib/actions/companies";
import type { getDealForEdit } from "@/lib/actions/deals";

type Props = {
  deal: NonNullable<Awaited<ReturnType<typeof getDealForEdit>>>;
};

export async function DealEditForm({ deal }: Props) {
  const companies = await getCompanyList();
  return <DealForm deal={deal} companies={companies} />;
}
