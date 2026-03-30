import { ExternalLink, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { ClickableRow } from "@/components/clickable-row";
import { ContactList } from "@/components/contact-list";
import { EntityNotesSection } from "@/components/entity-notes-section";
import { NotesSkeleton } from "@/components/skeletons/notes-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompany } from "@/lib/actions/companies";
import {
  COMPANY_LIFECYCLES,
  computeLifecycle,
  DEAL_STAGES,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const lifecycle = computeLifecycle(company.deals);
  const lifecycleConfig = COMPANY_LIFECYCLES.find((l) => l.value === lifecycle);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {company.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={lifecycleConfig?.color}>
              {lifecycleConfig?.label}
            </Badge>
            {company.website && (
              <>
                <div className="h-4 w-px bg-border/40" />
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-neon-400 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/companies/${id}/edit`} />}
          className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      {/* Details + Contacts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Company Details */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {company.industry && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Industry
                </span>
                <p className="mt-0.5">{company.industry}</p>
              </div>
            )}
            {company.size && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Company Size
                </span>
                <p className="mt-0.5">{company.size}</p>
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Created
              </span>
              <p className="mt-0.5 tabular-nums">
                {formatDate(company.createdAt)}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Deals
              </span>
              <p className="mt-0.5 font-semibold tabular-nums">
                {company.dealsTotal}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContactList
              companyId={id}
              contacts={company.contacts}
              total={company.contactsTotal}
            />
          </CardContent>
        </Card>
      </div>

      {/* Deals — full width */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="neon-underline pb-3 text-base">
              Deals
            </CardTitle>
          </div>
          <Button
            nativeButton={false}
            render={<Link href={`/deals/new?companyId=${id}`} />}
            className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
            size="sm"
          >
            <Plus className="size-4" />
            Add Deal
          </Button>
        </CardHeader>
        <CardContent>
          {company.deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deals yet</p>
          ) : (
            <div className="rounded-lg border border-border/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Title
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Stage
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Value
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Contact
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.deals.map((deal) => {
                    const stageConfig = DEAL_STAGES.find(
                      (s) => s.value === deal.stage,
                    );
                    return (
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
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={stageConfig?.color}
                          >
                            {stageConfig?.label ?? deal.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-emerald-600">
                          {deal.estimatedValue ? (
                            formatCurrency(deal.estimatedValue)
                          ) : (
                            <span className="text-muted-foreground/50">
                              &mdash;
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {deal.primaryContact ? (
                            `${deal.primaryContact.firstName} ${deal.primaryContact.lastName}`
                          ) : (
                            <span className="text-muted-foreground/50">
                              &mdash;
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(deal.createdAt)}
                        </TableCell>
                      </ClickableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {company.dealsTotal > company.deals.length && (
            <p className="text-xs text-muted-foreground/50 mt-3">
              Showing {company.deals.length} of {company.dealsTotal} deals
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Suspense fallback={<NotesSkeleton />}>
        <EntityNotesSection
          entityType="company"
          entityId={id}
          linkedCompany={{ id: company.id, name: company.name }}
        />
      </Suspense>

      {/* Activity timeline — full width */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-3 text-base">
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            activities={company.activities}
            total={company.activitiesTotal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
