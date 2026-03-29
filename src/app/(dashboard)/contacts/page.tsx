export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactFilters } from "@/components/contact-filters";
import { ContactsTable } from "@/components/contacts-table";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getContacts } from "@/lib/actions/contacts";
import { lastPageUrl, PAGE_SIZE } from "@/lib/types";

type SearchParams = Promise<{
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: string;
}>;

async function ContactsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: contacts, total } = await getContacts({
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    limit: PAGE_SIZE,
    offset,
  });

  if (contacts.length === 0 && total > 0 && page > 1) {
    redirect(lastPageUrl("/contacts", params, total, PAGE_SIZE));
  }

  return (
    <>
      <ContactsTable contacts={contacts} />
      <Pagination total={total} pageSize={PAGE_SIZE} />
    </>
  );
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
          className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
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
