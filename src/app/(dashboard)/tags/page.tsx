export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { TagsContent } from "./_components/tags-content";

export default function TagsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Tags</h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <TagsContent />
      </Suspense>
    </div>
  );
}
