import { TalentForm } from "@/components/talent-form";
import { getTags } from "@/lib/actions/deals";

export async function NewTalentForm() {
  const availableTags = await getTags("talent");
  return <TalentForm availableTags={availableTags} />;
}
