import { LeadForm } from "@/components/lead-form";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Create Lead</h1>
      <LeadForm />
    </div>
  );
}
