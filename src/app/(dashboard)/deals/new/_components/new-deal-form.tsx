import { DealForm } from "@/components/deal-form";
import { getCompanyList } from "@/lib/actions/companies";

type Props = {
  defaultCompanyId?: string;
};

export async function NewDealForm({ defaultCompanyId }: Props) {
  const companies = await getCompanyList();
  return <DealForm companies={companies} defaultCompanyId={defaultCompanyId} />;
}
