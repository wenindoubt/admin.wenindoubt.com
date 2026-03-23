"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEAD_STATUSES } from "@/lib/constants";
import { deleteLead, updateLead } from "@/lib/actions/leads";
import type { Lead } from "@/db/schema";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
            <span className={`mr-2 inline-block size-2 rounded-full ${s.color.split(" ")[0]}`} />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
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
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No leads found</p>
        <Button className="mt-4" nativeButton={false} render={<Link href="/leads/new" />}>
          Create your first lead
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>
              <Link
                href={`/leads/${lead.id}`}
                className="font-medium hover:underline"
              >
                {lead.firstName} {lead.lastName}
              </Link>
              {lead.email && (
                <p className="text-sm text-muted-foreground">{lead.email}</p>
              )}
            </TableCell>
            <TableCell>
              {lead.companyName && (
                <div>
                  <p>{lead.companyName}</p>
                  {lead.jobTitle && (
                    <p className="text-sm text-muted-foreground">
                      {lead.jobTitle}
                    </p>
                  )}
                </div>
              )}
            </TableCell>
            <TableCell>
              <StatusDropdown lead={lead} />
            </TableCell>
            <TableCell className="capitalize">
              {lead.source.replace("_", " ")}
            </TableCell>
            <TableCell>
              {lead.estimatedValue
                ? `$${Number(lead.estimatedValue).toLocaleString()}`
                : "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(lead.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-8" />
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
  );
}
