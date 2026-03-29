"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClickableRow } from "@/components/clickable-row";
import { SortableHeader } from "@/components/sortable-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact } from "@/db/schema";
import { deleteContact } from "@/lib/actions/contacts";
import { formatDate } from "@/lib/utils";

type ContactRow = Contact & {
  company: { id: string; name: string };
};

export function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
  const router = useRouter();

  async function handleDelete(contact: ContactRow) {
    if (!confirm(`Delete ${contact.firstName} ${contact.lastName}?`)) return;
    try {
      await deleteContact(contact.id);
      toast.success("Contact deleted");
    } catch {
      toast.error(
        "Failed to delete contact. They may be referenced by a deal.",
      );
    }
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-full bg-neon-400/10 mb-4">
          <span className="font-heading text-lg text-neon-400">+</span>
        </div>
        <p className="text-sm">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden text-base">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <SortableHeader column="name">Name</SortableHeader>
            <SortableHeader column="email">Email</SortableHeader>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Job Title
            </TableHead>
            <SortableHeader column="company">Company</SortableHeader>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Phone
            </TableHead>
            <SortableHeader column="created">Created</SortableHeader>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <ClickableRow
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="border-border/30 hover:bg-accent/50 transition-colors"
            >
              <TableCell>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="font-semibold text-foreground hover:text-neon-400 transition-colors"
                >
                  {contact.firstName} {contact.lastName}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {contact.email}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {contact.jobTitle ?? (
                  <span className="text-muted-foreground/50">&mdash;</span>
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/companies/${contact.company.id}`}
                  className="text-sm text-foreground hover:text-neon-400 transition-colors"
                >
                  {contact.company.name}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {contact.phone ?? (
                  <span className="text-muted-foreground/50">&mdash;</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {formatDate(contact.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/contacts/${contact.id}/edit`)
                      }
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(contact)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </ClickableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
