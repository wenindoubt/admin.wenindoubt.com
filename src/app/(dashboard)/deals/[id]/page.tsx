import {
  Building2,
  ExternalLink,
  Mail,
  Pencil,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityForm } from "@/components/activity-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { EntityNotesSection } from "@/components/entity-notes-section";
import { LazyDealInsightsPanel as DealInsightsPanel } from "@/components/lazy";
import { NotesSkeleton } from "@/components/skeletons/notes-skeleton";
import { TagPicker } from "@/components/tag-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDeal, getTags } from "@/lib/actions/deals";
import { DEAL_SOURCES, DEAL_STAGES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params;
  const [deal, allTags] = await Promise.all([getDeal(id), getTags()]);
  if (!deal) notFound();

  const resolvedDeal = {
    primaryContactId: deal.primaryContact?.id ?? null,
    companyId: deal.company.id,
  };

  const stageConfig = DEAL_STAGES.find((s) => s.value === deal.stage);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {deal.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            <Link
              href={`/companies/${deal.company.id}`}
              className="text-foreground/80 hover:text-neon-400 transition-colors"
            >
              {deal.company.name}
            </Link>
            {deal.primaryContact && (
              <>
                {" "}
                &middot; {deal.primaryContact.firstName}{" "}
                {deal.primaryContact.lastName}
              </>
            )}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant="outline" className={stageConfig?.color}>
              {stageConfig?.label}
            </Badge>
            <TagPicker
              entityId={id}
              entityType="deal"
              currentTags={deal.tags}
              allTags={allTags}
            />
          </div>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/deals/${id}/edit`} />}
          className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      {/* Deal Details + Contact Info row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Deal details */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Deal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Company
              </span>
              <p className="mt-0.5">
                <Link
                  href={`/companies/${deal.company.id}`}
                  className="hover:text-neon-400 transition-colors inline-flex items-center gap-1"
                >
                  <Building2 className="size-3 text-neon-400/60" />
                  {deal.company.name}
                </Link>
              </p>
            </div>
            {deal.primaryContact && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Contact
                </span>
                <p className="mt-0.5 inline-flex items-center gap-1">
                  <User className="size-3 text-neon-400/60" />
                  {deal.primaryContact.firstName} {deal.primaryContact.lastName}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Source
              </span>
              <p className="mt-0.5">
                {DEAL_SOURCES.find((s) => s.value === deal.source)?.label ??
                  deal.source}
                {deal.sourceDetail && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({deal.sourceDetail})
                  </span>
                )}
              </p>
            </div>
            {deal.estimatedValue && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Est. Value
                </span>
                <p className="mt-0.5 font-semibold text-emerald-600">
                  {formatCurrency(deal.estimatedValue)}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Created
              </span>
              <p className="mt-0.5 tabular-nums">
                {formatDate(deal.createdAt)}
              </p>
            </div>
            {deal.followUpAt && (
              <div>
                <span className="text-xs uppercase tracking-wider text-teal-600/70">
                  Follow-Up
                </span>
                <p className="mt-0.5 tabular-nums text-teal-600">
                  {formatDate(deal.followUpAt)}
                </p>
              </div>
            )}
            {deal.lastContactedAt && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Last Contact
                </span>
                <p className="mt-0.5 tabular-nums">
                  {formatDate(deal.lastContactedAt)}
                </p>
              </div>
            )}
            {deal.closedAt && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Closed
                </span>
                <p className="mt-0.5 tabular-nums">
                  {formatDate(deal.closedAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            {deal.primaryContact ? (
              <>
                <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                  <User className="size-4 text-neon-400/60" />
                  <span>
                    {deal.primaryContact.firstName}{" "}
                    {deal.primaryContact.lastName}
                    {deal.primaryContact.jobTitle && (
                      <span className="text-muted-foreground">
                        {" "}
                        &middot; {deal.primaryContact.jobTitle}
                      </span>
                    )}
                  </span>
                </div>
                {deal.primaryContact.email && (
                  <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                    <Mail className="size-4 text-neon-400/60" />
                    <a
                      href={`mailto:${deal.primaryContact.email}`}
                      className="hover:text-neon-400 transition-colors"
                    >
                      {deal.primaryContact.email}
                    </a>
                  </div>
                )}
                {deal.primaryContact.phone && (
                  <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                    <Phone className="size-4 text-neon-400/60" />
                    <span>{deal.primaryContact.phone}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground col-span-2">
                No primary contact assigned
              </p>
            )}
            {deal.company.website && (
              <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                <ExternalLink className="size-4 text-neon-400/60" />
                <a
                  href={deal.company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neon-400 transition-colors truncate"
                >
                  {deal.company.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights -- full width */}
      <DealInsightsPanel
        deal={deal}
        company={deal.company}
        contact={deal.primaryContact}
        insights={deal.insights}
        insightsTotal={deal.insightsTotal}
      />

      {/* Notes */}
      <Suspense fallback={<NotesSkeleton />}>
        <EntityNotesSection
          entityType="deal"
          entityId={id}
          resolvedDeal={resolvedDeal}
          linkedContact={
            deal.primaryContact
              ? {
                  id: deal.primaryContact.id,
                  name: `${deal.primaryContact.firstName} ${deal.primaryContact.lastName}`,
                }
              : undefined
          }
          linkedCompany={{ id: deal.company.id, name: deal.company.name }}
        />
      </Suspense>

      {/* Activity timeline */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-1 text-base">
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActivityForm dealId={id} />
          <Separator className="bg-border/30" />
          <ActivityTimeline
            activities={deal.activities}
            total={deal.activitiesTotal}
          />
        </CardContent>
      </Card>
    </div>
  );
}
