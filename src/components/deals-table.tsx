"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClickableRow } from "@/components/clickable-row";
import { SortableHeader } from "@/components/sortable-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Deal, Tag } from "@/db/schema";
import { deleteDeal, updateDeal } from "@/lib/actions/deals";
import { DEAL_SOURCES, DEAL_STAGES, stageLabel } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

type DealRow = Deal & {
  company: { name: string };
  contact: { name: string } | null;
  tags: Tag[];
};

function StageBadge({ stage }: { stage: string }) {
  const s = DEAL_STAGES.find((s) => s.value === stage);
  return (
    <Badge variant="outline" className={s?.color}>
      {s?.label ?? stage}
    </Badge>
  );
}

function StageDropdown({ deal }: { deal: Deal }) {
  async function handleStageChange(newStage: string) {
    try {
      await updateDeal(deal.id, {
        stage: newStage as Deal["stage"],
      });
      toast.success(`Stage updated to ${stageLabel(newStage)}`);
    } catch {
      toast.error("Failed to update stage");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <StageBadge stage={deal.stage} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {DEAL_STAGES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onClick={() => handleStageChange(s.value)}
          >
            <span
              className={`mr-2 inline-block size-2 rounded-full ${s.color.split(" ")[0]}`}
            />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DealsTable({ deals }: { deals: DealRow[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this deal?")) return;
    try {
      await deleteDeal(id);
      toast.success("Deal deleted");
    } catch {
      toast.error("Failed to delete deal");
    }
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full bg-neon-400/10 mb-4">
          <span className="font-heading text-lg text-neon-400">+</span>
        </div>
        <p className="text-sm">No deals found</p>
        <Button
          className="mt-4 bg-neon-400 hover:bg-neon-500 text-primary-foreground border-0"
          nativeButton={false}
          render={<Link href="/deals/new" />}
        >
          Create your first deal
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <SortableHeader column="title">Title</SortableHeader>
            <SortableHeader column="company">Company</SortableHeader>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Contact
            </TableHead>
            <SortableHeader column="stage">Stage</SortableHeader>
            <SortableHeader column="source">Source</SortableHeader>
            <SortableHeader column="value">Value</SortableHeader>
            <SortableHeader column="created">Created</SortableHeader>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <ClickableRow
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="border-border/30 hover:bg-accent/50 transition-colors"
            >
              <TableCell>
                <Link
                  href={`/deals/${deal.id}`}
                  className="font-medium text-foreground hover:text-neon-400 transition-colors"
                >
                  {deal.title}
                </Link>
                {deal.tags.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger className="inline-flex items-center gap-1 ml-2 align-middle">
                      {deal.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="size-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: tag.color ?? "#6b7280",
                          }}
                        />
                      ))}
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                      <div className="flex flex-wrap gap-1.5">
                        {deal.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 text-xs"
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{
                                backgroundColor: tag.color ?? "#6b7280",
                              }}
                            />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell className="text-sm">{deal.company.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {deal.contact?.name ?? (
                  <span className="text-muted-foreground/50">&mdash;</span>
                )}
              </TableCell>
              <TableCell>
                <StageDropdown deal={deal} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {DEAL_SOURCES.find((s) => s.value === deal.source)?.label ??
                  deal.source}
              </TableCell>
              <TableCell className="tabular-nums text-emerald-600">
                {deal.estimatedValue ? (
                  formatCurrency(deal.estimatedValue)
                ) : (
                  <span className="text-muted-foreground/50">&mdash;</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {formatDate(deal.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/deals/${deal.id}/edit`)}
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(deal.id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </ClickableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
