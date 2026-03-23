"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
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
import type { Lead, Tag } from "@/db/schema";
import { deleteLead, updateLead } from "@/lib/actions/leads";
import { LEAD_STATUSES } from "@/lib/constants";

type LeadWithTags = Lead & { tags: Tag[] };

function StatusBadge({ status }: { status: string }) {
  const s = LEAD_STATUSES.find((s) => s.value === status);
  return (
    <Badge variant="outline" className={s?.color}>
      {s?.label ?? status}
    </Badge>
  );
}

function StatusDropdown({ lead }: { lead: Lead }) {
  async function handleStatusChange(newStatus: string) {
    try {
      await updateLead(lead.id, {
        status: newStatus as Lead["status"],
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <StatusBadge status={lead.status} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {LEAD_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onClick={() => handleStatusChange(s.value)}
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

function SortableHeader({
  column,
  children,
}: {
  column: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sortBy");
  const currentOrder = searchParams.get("sortOrder") ?? "desc";
  const isActive = currentSort === column;

  const handleSort = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", column);
    params.set(
      "sortOrder",
      isActive && currentOrder === "asc" ? "desc" : "asc",
    );
    router.push(`/leads?${params.toString()}`);
  }, [router, searchParams, column, isActive, currentOrder]);

  return (
    <TableHead
      className="text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer select-none hover:text-muted-foreground transition-colors"
      onClick={handleSort}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (
          currentOrder === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

export function LeadsTable({ leads }: { leads: LeadWithTags[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    try {
      await deleteLead(id);
      toast.success("Lead deleted");
    } catch {
      toast.error("Failed to delete lead");
    }
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full bg-gold-400/10 mb-4">
          <span className="font-heading text-lg text-gold-400">+</span>
        </div>
        <p className="text-sm">No leads found</p>
        <Button
          className="mt-4 bg-gold-400 hover:bg-gold-500 text-primary-foreground border-0"
          nativeButton={false}
          render={<Link href="/leads/new" />}
        >
          Create your first lead
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <SortableHeader column="name">Name</SortableHeader>
            <SortableHeader column="company">Company</SortableHeader>
            <SortableHeader column="status">Status</SortableHeader>
            <SortableHeader column="source">Source</SortableHeader>
            <SortableHeader column="value">Value</SortableHeader>
            <SortableHeader column="created">Created</SortableHeader>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              className="border-border/30 hover:bg-accent/50 transition-colors"
            >
              <TableCell>
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-foreground hover:text-gold-400 transition-colors"
                >
                  {lead.firstName} {lead.lastName}
                </Link>
                {lead.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lead.email}
                  </p>
                )}
                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={
                          tag.color
                            ? {
                                backgroundColor: `${tag.color}15`,
                                color: tag.color,
                              }
                            : undefined
                        }
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {lead.companyName && (
                  <div>
                    <p className="text-sm">{lead.companyName}</p>
                    {lead.jobTitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.jobTitle}
                      </p>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <StatusDropdown lead={lead} />
              </TableCell>
              <TableCell className="capitalize text-sm text-muted-foreground">
                {lead.source.replaceAll("_", " ")}
              </TableCell>
              <TableCell className="font-heading tabular-nums text-emerald-600">
                {lead.estimatedValue ? (
                  `$${Number(lead.estimatedValue).toLocaleString()}`
                ) : (
                  <span className="text-muted-foreground/50">&mdash;</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {new Date(lead.createdAt).toLocaleDateString()}
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
                      onClick={() => router.push(`/leads/${lead.id}/edit`)}
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(lead.id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
