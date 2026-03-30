import { NotesSection } from "@/components/notes-section";
import { TokenStatsBadge } from "@/components/token-stats-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAttachmentsForNotes,
  getNotes,
  getNotesForDeal,
  getNoteTokenStats,
} from "@/lib/actions/notes";

import type { LinkedEntity } from "@/lib/types";

type DealProps = {
  entityType: "deal";
  entityId: string;
  resolvedDeal: { primaryContactId: string | null; companyId: string };
  linkedContact?: LinkedEntity;
  linkedCompany: LinkedEntity;
};

type ContactProps = {
  entityType: "contact";
  entityId: string;
  linkedContact: LinkedEntity;
};

type CompanyProps = {
  entityType: "company";
  entityId: string;
  linkedCompany: LinkedEntity;
};

type Props = DealProps | ContactProps | CompanyProps;

async function fetchNotes(props: Props) {
  if (props.entityType === "deal") {
    return Promise.all([
      getNotesForDeal(props.entityId, {
        limit: 10,
        offset: 0,
        ...props.resolvedDeal,
      }),
      getNoteTokenStats("deal", props.entityId, props.resolvedDeal),
    ]);
  }
  const filter =
    props.entityType === "contact"
      ? { contactId: props.entityId }
      : { companyId: props.entityId };
  return Promise.all([
    getNotes({ ...filter, limit: 10, offset: 0 }),
    getNoteTokenStats(props.entityType, props.entityId),
  ]);
}

export async function EntityNotesSection(props: Props) {
  const [notesResult, tokenStats] = await fetchNotes(props);
  const attachments = await getAttachmentsForNotes(
    notesResult.data.map((n) => n.id),
  );

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="neon-underline pb-1 text-base">Notes</CardTitle>
          <TokenStatsBadge stats={tokenStats} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <NotesSection
          entityType={props.entityType}
          entityId={props.entityId}
          initialNotes={notesResult.data}
          initialTotal={notesResult.total}
          initialAttachments={attachments}
          linkedContact={
            "linkedContact" in props ? props.linkedContact : undefined
          }
          linkedCompany={
            "linkedCompany" in props ? props.linkedCompany : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
