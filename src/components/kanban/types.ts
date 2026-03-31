import type { DealRow } from "@/db/schema";

export type DealWithRelations = DealRow & {
  company: { name: string };
  contact: { name: string } | null;
};

export type KanbanColumn = {
  status: string;
  label: string;
  description: string;
  color: string;
  deals: DealWithRelations[];
};
