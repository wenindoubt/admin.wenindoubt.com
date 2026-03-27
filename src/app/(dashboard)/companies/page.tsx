import { Plus } from "lucide-react";
import Link from "next/link";
import { ClickableRow } from "@/components/clickable-row";
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
import { getCompanies } from "@/lib/actions/companies";
import { COMPANY_LIFECYCLES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Companies
          </h1>
          <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/companies/new" />}
          className="bg-gold-400 text-gold-400-foreground hover:bg-gold-500 border-0"
        >
          <Plus className="size-4" />
          Add Company
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-muted-foreground">
          <div className="flex size-12 items-center justify-center rounded-full bg-gold-400/10 mb-4">
            <span className="font-heading text-lg text-gold-400">+</span>
          </div>
          <p className="text-sm">No companies found</p>
          <Button
            className="mt-4 bg-gold-400 hover:bg-gold-500 text-primary-foreground border-0"
            nativeButton={false}
            render={<Link href="/companies/new" />}
          >
            Create your first company
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden text-base">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Name
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Industry
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Size
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Deals
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Pipeline Value
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Lifecycle
                </TableHead>
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
                        className="font-semibold text-foreground hover:text-gold-400 transition-colors"
                      >
                        {company.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.industry ?? (
                        <span className="text-muted-foreground/50">
                          &mdash;
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.size ?? (
                        <span className="text-muted-foreground/50">
                          &mdash;
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-heading tabular-nums">
                      {company.dealCount}
                    </TableCell>
                    <TableCell className="font-heading tabular-nums text-emerald-600">
                      {company.pipelineValue > 0 ? (
                        formatCurrency(company.pipelineValue)
                      ) : (
                        <span className="text-muted-foreground/50">
                          &mdash;
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={lifecycle?.color}>
                        {lifecycle?.label ?? company.lifecycle}
                      </Badge>
                    </TableCell>
                  </ClickableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
