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
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Edit Lead</h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <LeadForm lead={lead} />
    </div>
  );
}
