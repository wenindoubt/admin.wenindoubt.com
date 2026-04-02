export const dynamic = "force-dynamic";

import { List } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { KanbanBoardSkeleton } from "@/components/skeletons/kanban-board-skeleton";
import { Button } from "@/components/ui/button";
import { BoardContent } from "./_components/board-content";

export default function BoardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Pipeline Board
          </h1>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/deals" />}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            <List className="size-4" />
            List View
          </Button>
        </div>
        <div className="accent-line" />
      </div>
      <Suspense fallback={<KanbanBoardSkeleton />}>
        <BoardContent />
      </Suspense>
    </div>
  );
}
