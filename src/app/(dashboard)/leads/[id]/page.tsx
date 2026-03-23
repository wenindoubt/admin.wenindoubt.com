import { notFound } from "next/navigation";
import Link from "next/link";
import { getLead } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LEAD_STATUSES } from "@/lib/constants";
import { ActivityForm } from "@/components/activity-form";
import { LeadInsightsPanel } from "@/components/lead-insights-panel";
import { Pencil, ExternalLink, Mail, Phone } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const lead = await getLead(id);
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
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className={statusConfig?.color}>
              {statusConfig?.label}
            </Badge>
            {lead.tags.map((tag) => (
              <Badge
                key={tag.id}
                className="border-0"
                style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
              >
                {tag.name}
              </Badge>
            ))}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="gold-underline pb-1 text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2.5 rounded-md bg-card/80 px-3 py-2">
                  <Mail className="size-4 text-gold-400/60" />
                  <a href={`mailto:${lead.email}`} className="hover:text-gold-400 transition-colors">
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
              <CardTitle className="gold-underline pb-1 text-base">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Source</span>
                <p className="mt-0.5 capitalize">
                  {lead.source.replace("_", " ")}
                  {lead.sourceDetail && (
                    <span className="text-muted-foreground"> ({lead.sourceDetail})</span>
                  )}
                </p>
              </div>
              {lead.estimatedValue && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Est. Value</span>
                  <p className="mt-0.5 font-heading font-semibold text-gold-400">
                    ${Number(lead.estimatedValue).toLocaleString()}
                  </p>
                </div>
              )}
              {lead.industry && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Industry</span>
                  <p className="mt-0.5">{lead.industry}</p>
                </div>
              )}
              {lead.companySize && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Company Size</span>
                  <p className="mt-0.5">{lead.companySize}</p>
                </div>
              )}
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Created</span>
                <p className="mt-0.5 tabular-nums">{new Date(lead.createdAt).toLocaleDateString()}</p>
              </div>
              {lead.lastContactedAt && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Last Contact</span>
                  <p className="mt-0.5 tabular-nums">{new Date(lead.lastContactedAt).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="gold-underline pb-1 text-base">Activity</CardTitle>
              <CardDescription>Log notes, calls, emails, and meetings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActivityForm leadId={id} />
              <Separator className="bg-border/30" />
              <div className="relative space-y-0">
                {lead.activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
                {lead.activities.map((activity, i) => (
                  <div key={activity.id} className="relative flex gap-3 py-3 text-sm">
                    {/* Connector line */}
                    {i < lead.activities.length - 1 && (
                      <div className="absolute left-3 top-9 bottom-0 w-px bg-border/40" />
                    )}
                    <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-400/10 text-[10px] font-bold uppercase text-gold-400 ring-1 ring-gold-400/20">
                      {activity.type[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/90">{activity.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground/60">
                        {new Date(activity.createdAt).toLocaleString()} &middot;{" "}
                        <span className="capitalize">{activity.type}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — AI Insights */}
        <div className="space-y-6">
          <LeadInsightsPanel leadId={id} insights={lead.insights} />
        </div>
      </div>
    </div>
  );
}
