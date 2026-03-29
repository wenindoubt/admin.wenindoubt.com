export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ContactFilters } from "@/components/contact-filters";
import { ContactsTable } from "@/components/contacts-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getContacts } from "@/lib/actions/contacts";

type SearchParams = Promise<{
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}>;

async function ContactsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const contacts = await getContacts({
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  return <ContactsTable contacts={contacts} />;
}

export default async function ContactsPage(props: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Contacts
          </h1>
          <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/contacts/new" />}
          className="bg-neon-400 text-neon-400-foreground hover:bg-neon-500 border-0"
        >
          <Plus className="size-4" />
          Add Contact
        </Button>
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <ContactFilters />
      </Suspense>
      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <ContactsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
