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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {lead.firstName} {lead.lastName}
          </h1>
          {lead.jobTitle && lead.companyName && (
            <p className="text-muted-foreground">
              {lead.jobTitle} at {lead.companyName}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <Badge variant="outline" className={statusConfig?.color}>
              {statusConfig?.label}
            </Badge>
            {lead.tags.map((tag) => (
              <Badge
                key={tag.id}
                style={tag.color ? { backgroundColor: tag.color, color: "#fff" } : undefined}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href={`/leads/${id}/edit`} />}>
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.linkedinUrl && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="size-4 text-muted-foreground" />
                  <a
                    href={lead.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
              {lead.companyWebsite && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="size-4 text-muted-foreground" />
                  <a
                    href={lead.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {lead.companyWebsite}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead details */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Source:</span>{" "}
                <span className="capitalize">{lead.source.replace("_", " ")}</span>
                {lead.sourceDetail && (
                  <span className="text-muted-foreground"> ({lead.sourceDetail})</span>
                )}
              </div>
              {lead.estimatedValue && (
                <div>
                  <span className="text-muted-foreground">Est. Value:</span>{" "}
                  ${Number(lead.estimatedValue).toLocaleString()}
                </div>
              )}
              {lead.industry && (
                <div>
                  <span className="text-muted-foreground">Industry:</span> {lead.industry}
                </div>
              )}
              {lead.companySize && (
                <div>
                  <span className="text-muted-foreground">Company Size:</span>{" "}
                  {lead.companySize}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                {new Date(lead.createdAt).toLocaleDateString()}
              </div>
              {lead.lastContactedAt && (
                <div>
                  <span className="text-muted-foreground">Last Contact:</span>{" "}
                  {new Date(lead.lastContactedAt).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Log notes, calls, emails, and meetings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActivityForm leadId={id} />
              <Separator />
              <div className="space-y-4">
                {lead.activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
                {lead.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                      {activity.type[0]}
                    </div>
                    <div className="flex-1">
                      <p>{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()} &middot;{" "}
                        {activity.type}
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
