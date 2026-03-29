import { NotesSection } from "@/components/notes-section";
import { TokenStatsBadge } from "@/components/token-stats-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
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

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="neon-underline pb-1 text-base">Notes</CardTitle>
        <CardDescription>
          {props.entityType === "deal"
            ? "Notes, transcripts, and documents"
            : "Notes and documents"}
          <TokenStatsBadge stats={tokenStats} />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <NotesSection
          entityType={props.entityType}
          entityId={props.entityId}
          initialNotes={notesResult.data}
          initialTotal={notesResult.total}
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
