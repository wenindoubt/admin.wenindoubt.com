export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { TagsContent } from "./_components/tags-content";

export default function TagsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-3">
          Tags
        </h1>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <TagsContent />
      </Suspense>
    </div>
  );
}
