import type { DealRow, TalentRow } from "@/db/schema";

export type DealWithRelations = DealRow & {
  company: { name: string };
  contact: { name: string } | null;
  assignedTalent?: Pick<TalentRow, "id" | "firstName" | "lastName" | "tier">[];
};

export type KanbanColumn = {
  status: string;
  label: string;
  description: string;
  color: string;
  deals: DealWithRelations[];
};
