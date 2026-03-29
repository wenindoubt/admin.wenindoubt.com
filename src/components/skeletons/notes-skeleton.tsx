import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NotesSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <Skeleton className="h-9 w-full rounded-md" />
        {/* Note cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-border/50 p-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
