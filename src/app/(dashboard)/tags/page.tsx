import { getTags } from "@/lib/actions/leads";
import { TagManager } from "@/components/tag-manager";

export default async function TagsPage() {
  const allTags = await getTags();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Tags</h1>
      <TagManager tags={allTags} />
    </div>
  );
}
