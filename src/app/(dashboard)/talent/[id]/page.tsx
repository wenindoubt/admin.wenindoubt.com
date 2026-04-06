import { ExternalLink, Link2, Mail, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EntityNotesSection } from "@/components/entity-notes-section";
import { FindDealsPanel } from "@/components/find-deals-panel";
import { NotesSkeleton } from "@/components/skeletons/notes-skeleton";
import { StatusBadge } from "@/components/talent-status-badge";
import { TierBadge } from "@/components/talent-tier-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnassignTalentButton } from "@/components/unassign-talent-button";
import { getTalentById } from "@/lib/actions/talent";
import { DEAL_STAGES } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TalentDetailPage({ params }: Props) {
  const { id } = await params;
  const person = await getTalentById(id);
  if (!person) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              {person.firstName} {person.lastName}
            </h1>
            <TierBadge tier={person.tier} />
            <StatusBadge status={person.status} />
          </div>
          <div className="accent-line" />
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/talent/${id}/edit`} />}
          className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      {/* Info + Specialties */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {person.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground/60" />
                <a
                  href={`mailto:${person.email}`}
                  className="text-foreground hover:text-neon-400 transition-colors"
                >
                  {person.email}
                </a>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground/60" />
                <a
                  href={`tel:${person.phone}`}
                  className="text-foreground hover:text-neon-400 transition-colors"
                >
                  {formatPhoneDisplay(person.phone)}
                </a>
              </div>
            )}
            {person.linkedinUrl && (
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground/60" />
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-neon-400 transition-colors"
                >
                  LinkedIn Profile
                  <ExternalLink className="inline ml-1 size-3" />
                </a>
              </div>
            )}
            {person.bio && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-muted-foreground leading-relaxed">
                  {person.bio}
                </p>
              </div>
            )}
            <div className="pt-2 border-t border-border/30">
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Created
              </span>
              <p className="mt-0.5 tabular-nums">
                {formatDate(person.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="neon-underline pb-1 text-base">
                Specialties
              </CardTitle>
              <Link
                href="/tags"
                className="text-xs text-muted-foreground hover:text-neon-400 transition-colors"
              >
                Manage tags
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {person.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No specialties added
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {person.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="border-0"
                    style={
                      tag.color
                        ? {
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }
                        : undefined
                    }
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assigned Deals */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-1 text-base">
            Assigned Deals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {person.assignedDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not assigned to any deals yet
            </p>
          ) : (
            <div className="rounded-lg border border-border/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Deal
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Stage
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      Assigned
                    </TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {person.assignedDeals.map((deal) => {
                    const stageConfig = DEAL_STAGES.find(
                      (s) => s.value === deal.stage,
                    );
                    return (
                      <TableRow
                        key={deal.id}
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
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(deal.assignedAt)}
                        </TableCell>
                        <TableCell>
                          <UnassignTalentButton
                            talentId={id}
                            dealId={deal.id}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Find Matching Deals */}
      <FindDealsPanel talentId={id} />

      {/* Notes */}
      <Suspense fallback={<NotesSkeleton />}>
        <EntityNotesSection
          entityType="talent"
          entityId={id}
          linkedTalent={{
            id: person.id,
            name: `${person.firstName} ${person.lastName}`,
          }}
        />
      </Suspense>
    </div>
  );
}
