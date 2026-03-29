"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { LazyTiptapEditor as TiptapEditor } from "@/components/lazy";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createNote } from "@/lib/actions/notes";
import { NOTE_TYPES } from "@/lib/constants";
import type { LinkedEntity, NoteEntityType } from "@/lib/types";
import { FORM_INPUT_CLASSES } from "@/lib/utils";
import { type NoteFormValues, noteFormSchema } from "@/lib/validations";

type Props = {
  entityType: NoteEntityType;
  entityId: string;
  linkedContact?: LinkedEntity;
  linkedCompany?: LinkedEntity;
};

export function NoteForm({
  entityType,
  entityId,
  linkedContact,
  linkedCompany,
}: Props) {
  const router = useRouter();
  const [alsoLinkContact, setAlsoLinkContact] = useState(false);
  const [alsoLinkCompany, setAlsoLinkCompany] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    mode: "onTouched",
    defaultValues: { type: "note", title: "", content: "" },
  });

  const currentType = watch("type");
  const showLinkOptions =
    entityType === "deal" && (linkedContact || linkedCompany);

  async function onSubmit(data: NoteFormValues) {
    try {
      await createNote({
        type: data.type,
        title: data.title || null,
        content: data.content,
        dealId: entityType === "deal" ? entityId : null,
        contactId:
          entityType === "contact"
            ? entityId
            : alsoLinkContact && linkedContact
              ? linkedContact.id
              : null,
        companyId:
          entityType === "company"
            ? entityId
            : alsoLinkCompany && linkedCompany
              ? linkedCompany.id
              : null,
      });
      toast.success("Note added");
      reset();
      setAlsoLinkContact(false);
      setAlsoLinkCompany(false);
      router.refresh();
    } catch {
      toast.error("Failed to add note");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex gap-3">
        <Select
          defaultValue="note"
          onValueChange={(v) =>
            v && setValue("type", v as NoteFormValues["type"])
          }
        >
          <SelectTrigger className={`w-36 ${FORM_INPUT_CLASSES}`}>
            <SelectValue>
              {NOTE_TYPES.find((t) => t.value === currentType)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Title (optional)"
          className={`flex-1 ${FORM_INPUT_CLASSES}`}
          {...register("title")}
        />
      </div>
      {errors.title && (
        <p className="text-sm text-destructive">{errors.title.message}</p>
      )}

      <Controller
        name="content"
        control={control}
        render={({ field }) => (
          <TiptapEditor
            content={field.value}
            onChange={field.onChange}
            placeholder="Write your note..."
            disabled={isSubmitting}
          />
        )}
      />
      {errors.content && (
        <p className="text-sm text-destructive">{errors.content.message}</p>
      )}

      <div className="flex items-center justify-between">
        {showLinkOptions ? (
          <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
            <span>Also link to:</span>
            {linkedContact && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoLinkContact}
                  onChange={(e) => setAlsoLinkContact(e.target.checked)}
                  className="rounded border-border/50 size-3.5 accent-neon-400"
                />
                {linkedContact.name}
              </label>
            )}
            {linkedCompany && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoLinkCompany}
                  onChange={(e) => setAlsoLinkCompany(e.target.checked)}
                  className="rounded border-border/50 size-3.5 accent-neon-400"
                />
                {linkedCompany.name}
              </label>
            )}
          </div>
        ) : (
          <div />
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
        >
          Add Note
        </Button>
      </div>
    </form>
  );
}
