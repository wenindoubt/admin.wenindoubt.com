import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban-board";
import { getLeads } from "@/lib/actions/leads";
import { List } from "lucide-react";

export default async function BoardPage() {
  const leads = await getLeads();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Pipeline Board</h1>
          <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/leads" />}
          className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
        >
          <List className="size-4" />
          List View
        </Button>
      </div>
      <KanbanBoard initialLeads={leads} />
    </div>
  );
}
