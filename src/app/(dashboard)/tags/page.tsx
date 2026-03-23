import { getTags } from "@/lib/actions/leads";
import { TagManager } from "@/components/tag-manager";

export default async function TagsPage() {
  const allTags = await getTags();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Tags</h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <TagManager tags={allTags} />
    </div>
  );
}
