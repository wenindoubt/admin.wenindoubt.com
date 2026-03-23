import { ExternalLink, Mail, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/activity-form";
import { ActivityTimeline } from "@/components/activity-timeline";
import { LeadInsightsPanel } from "@/components/lead-insights-panel";
import { TagPicker } from "@/components/tag-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLead, getTags } from "@/lib/actions/leads";
import { LEAD_STATUSES } from "@/lib/constants";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const [lead, allTags] = await Promise.all([getLead(id), getTags()]);
  if (!lead) notFound();

  const statusConfig = LEAD_STATUSES.find((s) => s.value === lead.status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {lead.firstName} {lead.lastName}
          </h1>
          {lead.jobTitle && lead.companyName && (
            <p className="mt-1 text-muted-foreground">
              {lead.jobTitle} at{" "}
              <span className="text-foreground/80">{lead.companyName}</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusConfig?.color}>
              {statusConfig?.label}
            </Badge>
            <div className="h-4 w-px bg-border/40" />
            <TagPicker leadId={id} currentTags={lead.tags} allTags={allTags} />
          </div>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/leads/${id}/edit`} />}
          className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      {/* Contact + Lead Details row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="gold-underline pb-1 text-base">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            {lead.email && (
              <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                <Mail className="size-4 text-gold-400/60" />
                <a
                  href={`mailto:${lead.email}`}
                  className="hover:text-gold-400 transition-colors"
                >
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                <Phone className="size-4 text-gold-400/60" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.linkedinUrl && (
              <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                <ExternalLink className="size-4 text-gold-400/60" />
                <a
                  href={lead.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-400 transition-colors"
                >
                  LinkedIn
                </a>
              </div>
            )}
            {lead.companyWebsite && (
              <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                <ExternalLink className="size-4 text-gold-400/60" />
                <a
                  href={lead.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-400 transition-colors truncate"
                >
                  {lead.companyWebsite}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead details */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="gold-underline pb-1 text-base">
              Lead Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Source
              </span>
              <p className="mt-0.5 capitalize">
                {lead.source.replaceAll("_", " ")}
                {lead.sourceDetail && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({lead.sourceDetail})
                  </span>
                )}
              </p>
            </div>
            {lead.estimatedValue && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Est. Value
                </span>
                <p className="mt-0.5 font-heading font-semibold text-emerald-600">
                  ${Number(lead.estimatedValue).toLocaleString()}
                </p>
              </div>
            )}
            {lead.industry && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Industry
                </span>
                <p className="mt-0.5">{lead.industry}</p>
              </div>
            )}
            {lead.companySize && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Company Size
                </span>
                <p className="mt-0.5">{lead.companySize}</p>
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Created
              </span>
              <p className="mt-0.5 tabular-nums">
                {new Date(lead.createdAt).toLocaleDateString()}
              </p>
            </div>
            {lead.lastContactedAt && (
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                  Last Contact
                </span>
                <p className="mt-0.5 tabular-nums">
                  {new Date(lead.lastContactedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights — full width */}
      <LeadInsightsPanel leadId={id} insights={lead.insights} />

      {/* Activity timeline */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="gold-underline pb-1 text-base">
            Activity
          </CardTitle>
          <CardDescription>
            Log notes, calls, emails, and meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActivityForm leadId={id} />
          <Separator className="bg-border/30" />
          <ActivityTimeline activities={lead.activities} />
        </CardContent>
      </Card>
    </div>
  );
}
