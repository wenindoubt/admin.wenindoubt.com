import { TagManager } from "@/components/tag-manager";
import { getTags } from "@/lib/actions/deals";

export async function TagsContent() {
  const allTags = await getTags();
  return <TagManager tags={allTags} />;
}
