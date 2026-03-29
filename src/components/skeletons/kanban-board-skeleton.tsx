import { Skeleton } from "@/components/ui/skeleton";

export function KanbanBoardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      {/* Columns */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {Array.from({ length: 3 - Math.min(i, 2) }).map((_, j) => (
              <div
                key={j}
                className="space-y-2 rounded-lg border border-border/50 p-3"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
