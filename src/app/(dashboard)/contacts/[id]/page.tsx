import {
  Building2,
  ExternalLink,
  Link2,
  Mail,
  Pencil,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClickableRow } from "@/components/clickable-row";
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
import { getContact } from "@/lib/actions/contacts";
import { DEAL_STAGES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {contact.firstName} {contact.lastName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {contact.jobTitle && (
              <span className="text-sm text-muted-foreground">
                {contact.jobTitle}
              </span>
            )}
            {contact.jobTitle && <div className="h-4 w-px bg-border/40" />}
            <Link
              href={`/companies/${contact.company.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-neon-400 transition-colors"
            >
              <Building2 className="size-3.5" />
              {contact.company.name}
            </Link>
          </div>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/contacts/${contact.id}/edit`} />}
          className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      {/* Details + Company row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact Details */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground/60" />
              <a
                href={`mailto:${contact.email}`}
                className="text-foreground hover:text-neon-400 transition-colors"
              >
                {contact.email}
              </a>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground/60" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.linkedinUrl && (
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground/60" />
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-neon-400 transition-colors"
                >
                  LinkedIn Profile
                  <ExternalLink className="inline ml-1 size-3" />
                </a>
              </div>
            )}
            <div className="pt-2 border-t border-border/30">
              <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                Created
              </span>
              <p className="mt-0.5 tabular-nums">
                {formatDate(contact.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Company */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Company
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              href={`/companies/${contact.company.id}`}
              className="text-lg font-semibold text-foreground hover:text-neon-400 transition-colors"
            >
              {contact.company.name}
            </Link>
            {contact.company.industry && (
              <p className="text-muted-foreground">
                {contact.company.industry}
              </p>
            )}
            {contact.company.website && (
              <a
                href={contact.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-neon-400 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                {contact.company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deals — full width */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-3 text-base">Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {contact.deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deals linked to this contact
            </p>
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
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contact.deals.map((deal) => {
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
        </CardContent>
      </Card>
      {/* Notes */}
      <Suspense fallback={<NotesSkeleton />}>
        <EntityNotesSection
          entityType="contact"
          entityId={id}
          linkedContact={{
            id: contact.id,
            name: `${contact.firstName} ${contact.lastName}`,
          }}
        />
      </Suspense>
    </div>
  );
}
