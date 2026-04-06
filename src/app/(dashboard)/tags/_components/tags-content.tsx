import { TagManager } from "@/components/tag-manager";
import { getTags } from "@/lib/actions/deals";

export async function TagsContent() {
  const [generalTags, talentTags] = await Promise.all([
    getTags(),
    getTags("talent"),
  ]);
  return <TagManager generalTags={generalTags} talentTags={talentTags} />;
}
