import { KanbanBoard } from "@/components/kanban/kanban-board";
import { getDeals } from "@/lib/actions/deals";

export async function BoardContent() {
  const { data: deals } = await getDeals();
  return <KanbanBoard initialDeals={deals} />;
}
