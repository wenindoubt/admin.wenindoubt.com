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
import { formatPhoneDisplay } from "@/lib/phone";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analyze?: string }>;
};

export default async function DealDetailPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const suppressAutoAnalyze = sp.analyze === "false";
  const [deal, allTags] = await Promise.all([getDeal(id), getTags()]);
  if (!deal) notFound();

  const resolvedDeal = {
    contactIds: deal.contacts.map((c) => c.id),
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
                &middot;{" "}
                <Link
                  href={`/contacts/${deal.primaryContact.id}`}
                  className="text-foreground/80 hover:text-neon-400 transition-colors"
                >
                  {deal.primaryContact.firstName} {deal.primaryContact.lastName}
                </Link>
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
                <p className="mt-0.5">
                  <Link
                    href={`/contacts/${deal.primaryContact.id}`}
                    className="hover:text-neon-400 transition-colors inline-flex items-center gap-1"
                  >
                    <User className="size-3 text-neon-400/60" />
                    {deal.primaryContact.firstName}{" "}
                    {deal.primaryContact.lastName}
                  </Link>
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
          <CardContent className="space-y-2 text-sm">
            {deal.contacts.length > 0 ? (
              deal.contacts.map((contact) => {
                const isPrimary = contact.id === deal.primaryContactId;
                return (
                  <div
                    key={contact.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-3 py-2.5 ${isPrimary ? "bg-neon-400/[0.03] border border-neon-400/10" : "bg-card/60"}`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-neon-400/60" />
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="font-medium hover:text-neon-400 transition-colors"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                      {isPrimary && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-neon-400/70">
                          Primary
                        </span>
                      )}
                    </div>
                    {contact.jobTitle && (
                      <>
                        <span className="hidden sm:inline text-border">|</span>
                        <span className="text-muted-foreground text-xs">
                          {contact.jobTitle}
                        </span>
                      </>
                    )}
                    <div className="flex items-center gap-4 ml-auto text-muted-foreground">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1.5 hover:text-neon-400 transition-colors"
                        >
                          <Mail className="size-3.5" />
                          <span className="hidden lg:inline">
                            {contact.email}
                          </span>
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1.5 hover:text-neon-400 transition-colors"
                        >
                          <Phone className="size-3.5" />
                          <span className="hidden lg:inline">
                            {formatPhoneDisplay(contact.phone)}
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No contacts assigned
              </p>
            )}
            {deal.company.website && (
              <div className="flex items-center gap-2.5 rounded-md bg-card/60 px-3 py-2.5">
                <ExternalLink className="size-3.5 text-neon-400/60" />
                <a
                  href={deal.company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-neon-400 transition-colors truncate"
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
        suppressAutoAnalyze={suppressAutoAnalyze}
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
