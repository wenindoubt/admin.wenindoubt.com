export const dynamic = "force-dynamic";

import { List } from "lucide-react";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban-board";
import { Button } from "@/components/ui/button";
import { getDeals } from "@/lib/actions/deals";

export default async function BoardPage() {
  const { data: deals } = await getDeals();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Pipeline Board
          </h1>
          <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
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
      <KanbanBoard initialDeals={deals} />
    </div>
  );
}
