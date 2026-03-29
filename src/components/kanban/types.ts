import type { Deal } from "@/db/schema";

export type DealWithRelations = Deal & {
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
