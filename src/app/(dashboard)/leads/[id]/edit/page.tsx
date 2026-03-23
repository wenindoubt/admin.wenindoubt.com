import { notFound } from "next/navigation";
import { getLead } from "@/lib/actions/leads";
import { LeadForm } from "@/components/lead-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditLeadPage({ params }: Props) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Lead</h1>
      <LeadForm lead={lead} />
    </div>
  );
}
