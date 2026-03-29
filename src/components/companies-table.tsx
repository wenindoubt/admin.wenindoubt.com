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
import type { Company } from "@/db/schema";
import { deleteCompany } from "@/lib/actions/companies";
import { COMPANY_LIFECYCLES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type CompanyRow = Company & {
  lifecycle: string;
  dealCount: number;
  pipelineValue: number;
};

export function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this company? All associated contacts and deals will also be deleted.",
      )
    )
      return;
    try {
      await deleteCompany(id);
      toast.success("Company deleted");
    } catch {
      toast.error("Failed to delete company");
    }
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full bg-neon-400/10 mb-4">
          <span className="font-heading text-lg text-neon-400">+</span>
        </div>
        <p className="text-sm">No companies found</p>
        <Button
          className="mt-4 bg-neon-400 hover:bg-neon-500 text-primary-foreground border-0"
          nativeButton={false}
          render={<Link href="/companies/new" />}
        >
          Create your first company
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden text-base">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <SortableHeader column="name">Name</SortableHeader>
            <SortableHeader column="industry">Industry</SortableHeader>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Size
            </TableHead>
            <SortableHeader column="dealCount">Deals</SortableHeader>
            <SortableHeader column="pipelineValue">
              Pipeline Value
            </SortableHeader>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Lifecycle
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const lifecycle = COMPANY_LIFECYCLES.find(
              (l) => l.value === company.lifecycle,
            );
            return (
              <ClickableRow
                key={company.id}
                href={`/companies/${company.id}`}
                className="border-border/30 hover:bg-accent/50 transition-colors"
              >
                <TableCell>
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-semibold text-foreground hover:text-neon-400 transition-colors"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.industry ?? (
                    <span className="text-muted-foreground/50">&mdash;</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {company.size ?? (
                    <span className="text-muted-foreground/50">&mdash;</span>
                  )}
                </TableCell>
                <TableCell className="font-heading tabular-nums">
                  {company.dealCount}
                </TableCell>
                <TableCell className="tabular-nums text-emerald-600">
                  {company.pipelineValue > 0 ? (
                    formatCurrency(company.pipelineValue)
                  ) : (
                    <span className="text-muted-foreground/50">&mdash;</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={lifecycle?.color}>
                    {lifecycle?.label ?? company.lifecycle}
                  </Badge>
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
                        onClick={() =>
                          router.push(`/companies/${company.id}/edit`)
                        }
                      >
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(company.id)}
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
