import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban-board";
import { getLeads } from "@/lib/actions/leads";
import { List } from "lucide-react";

export default async function BoardPage() {
  const leads = await getLeads();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline Board</h1>
        <Button variant="outline" nativeButton={false} render={<Link href="/leads" />}>
          <List className="size-4" />
          List View
        </Button>
      </div>
      <KanbanBoard initialLeads={leads} />
    </div>
  );
}
