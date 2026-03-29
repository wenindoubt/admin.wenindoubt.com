"use client";

import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ContactForm } from "@/components/contact-form";
import { Separator } from "@/components/ui/separator";
import type { Contact } from "@/db/schema";
import { deleteContact } from "@/lib/actions/contacts";

type ContactListProps = {
  companyId: string;
  contacts: Contact[];
};

export function ContactList({ companyId, contacts }: ContactListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    try {
      await deleteContact(id);
      toast.success("Contact deleted");
    } catch {
      toast.error("Failed to delete contact");
    }
  }

  return (
    <div className="space-y-3">
      {contacts.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground">No contacts yet</p>
      )}

      {contacts.map((contact) => (
        <div key={contact.id}>
          {editingId === contact.id ? (
            <div className="rounded-lg border border-border/30 bg-accent/30 p-3">
              <ContactForm
                companyId={companyId}
                contact={contact}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div className="group flex items-start justify-between rounded-md px-3 py-2 hover:bg-accent/30 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {contact.firstName} {contact.lastName}
                </p>
                {contact.jobTitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {contact.jobTitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-neon-400 transition-colors"
                    >
                      <Mail className="size-3" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingId(contact.id)}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(contact.id)}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAddForm ? (
        <>
          <Separator className="bg-border/30" />
          <div className="rounded-lg border border-border/30 bg-accent/30 p-3">
            <ContactForm
              companyId={companyId}
              onDone={() => setShowAddForm(false)}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 hover:text-neon-400 transition-colors pt-1"
        >
          <Plus className="size-3.5" />
          Add contact
        </button>
      )}
    </div>
  );
}
