"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClickableRow } from "@/components/clickable-row";
import { SortableHeader } from "@/components/sortable-header";
import { StatusBadge } from "@/components/talent-status-badge";
import { TierBadge } from "@/components/talent-tier-badge";
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
import type { Tag, TalentRow } from "@/db/schema";
import { deleteTalent } from "@/lib/actions/talent";
import { formatDate } from "@/lib/utils";

type TalentRowWithTags = TalentRow & { tags: Tag[] };

const MAX_VISIBLE_TAGS = 3;

export function TalentTable({ rows }: { rows: TalentRowWithTags[] }) {
  const router = useRouter();

  async function handleDelete(row: TalentRowWithTags) {
    if (!confirm(`Delete ${row.firstName} ${row.lastName}?`)) return;
    try {
      await deleteTalent(row.id);
      toast.success("Talent deleted");
    } catch {
      toast.error("Failed to delete talent");
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full bg-neon-400/10 mb-4">
          <span className="text-lg text-neon-400">+</span>
        </div>
        <p className="text-sm">No talent found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden text-base">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <SortableHeader column="name">Name</SortableHeader>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Tier
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Specialties
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Email
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Status
            </TableHead>
            <SortableHeader column="created">Created</SortableHeader>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const visibleTags = row.tags.slice(0, MAX_VISIBLE_TAGS);
            const overflow = row.tags.length - MAX_VISIBLE_TAGS;
            return (
              <ClickableRow
                key={row.id}
                href={`/talent/${row.id}`}
                className="border-border/30 hover:bg-accent/50 transition-colors"
              >
                <TableCell>
                  <Link
                    href={`/talent/${row.id}`}
                    className="font-semibold text-foreground hover:text-neon-400 transition-colors"
                  >
                    {row.firstName} {row.lastName}
                  </Link>
                </TableCell>
                <TableCell>
                  <TierBadge tier={row.tier} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {visibleTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="border-0 text-xs"
                        style={
                          tag.color
                            ? {
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }
                            : undefined
                        }
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {overflow > 0 && (
                      <span className="text-xs text-muted-foreground">
                        +{overflow}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.email ?? (
                    <span className="text-muted-foreground/50">&mdash;</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(row.createdAt)}
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
                        onClick={() => router.push(`/talent/${row.id}/edit`)}
                      >
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </ClickableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
