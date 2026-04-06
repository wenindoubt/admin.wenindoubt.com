import { TalentForm } from "@/components/talent-form";
import { getTags } from "@/lib/actions/deals";
import type { getTalentById } from "@/lib/actions/talent";

type Props = {
  talent: NonNullable<Awaited<ReturnType<typeof getTalentById>>>;
};

export async function TalentEditForm({ talent }: Props) {
  const availableTags = await getTags("talent");
  return <TalentForm talent={talent} availableTags={availableTags} />;
}
