import { KanbanBoard } from "@/components/kanban/kanban-board";
import { getDeals } from "@/lib/actions/deals";
import { getTalentForDeals } from "@/lib/actions/talent";

export async function BoardContent() {
  const { data: deals } = await getDeals();
  const talentByDeal = await getTalentForDeals(deals.map((d) => d.id));

  const dealsWithTalent = deals.map((d) => ({
    ...d,
    assignedTalent: (talentByDeal[d.id] ?? []).map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      tier: t.tier,
    })),
  }));

  return <KanbanBoard initialDeals={dealsWithTalent} />;
}
