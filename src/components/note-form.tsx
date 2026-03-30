"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { LazyTiptapEditor as TiptapEditor } from "@/components/lazy";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNote } from "@/lib/actions/notes";
import type { LinkedEntity, NoteEntityType } from "@/lib/types";
import { FORM_INPUT_CLASSES, formatFileSize } from "@/lib/utils";
import {
  type AttachmentMeta,
  type NoteFormValues,
  noteFormSchema,
} from "@/lib/validations";

const ALLOWED_TYPES: Record<string, { maxSize: number; label: string }> = {
  "application/pdf": { maxSize: 10 * 1024 * 1024, label: "PDF" },
  "image/png": { maxSize: 5 * 1024 * 1024, label: "PNG" },
  "image/jpeg": { maxSize: 5 * 1024 * 1024, label: "JPEG" },
  "image/webp": { maxSize: 5 * 1024 * 1024, label: "WebP" },
  "text/plain": { maxSize: 2 * 1024 * 1024, label: "Text" },
  "text/markdown": { maxSize: 2 * 1024 * 1024, label: "Markdown" },
  "text/csv": { maxSize: 2 * 1024 * 1024, label: "CSV" },
};

const ACCEPT = Object.keys(ALLOWED_TYPES).join(",");

type PendingFile = { file: File; id: string };

type Props = {
  entityType: NoteEntityType;
  entityId: string;
  linkedContact?: LinkedEntity;
  linkedCompany?: LinkedEntity;
};

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  return FileIcon;
}

export function NoteForm({
  entityType,
  entityId,
  linkedContact,
  linkedCompany,
}: Props) {
  const router = useRouter();
  const [alsoLinkContact, setAlsoLinkContact] = useState(false);
  const [alsoLinkCompany, setAlsoLinkCompany] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    mode: "onTouched",
    defaultValues: { title: "", content: "" },
  });

  const showLinkOptions =
    entityType === "deal" && (linkedContact || linkedCompany);

  const validateAndAddFiles = useCallback((files: FileList | File[]) => {
    setUploadError(null);
    const toAdd: PendingFile[] = [];

    for (const file of files) {
      const allowed = ALLOWED_TYPES[file.type];
      if (!allowed) {
        setUploadError(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > allowed.maxSize) {
        setUploadError(
          `${file.name}: exceeds ${formatFileSize(allowed.maxSize)} limit`,
        );
        continue;
      }
      toAdd.push({ file, id: crypto.randomUUID() });
    }

    if (toAdd.length > 0) {
      setPendingFiles((prev) => [...prev, ...toAdd]);
    }
  }, []);

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }

  async function uploadFiles(): Promise<AttachmentMeta[]> {
    const results: AttachmentMeta[] = [];

    await Promise.all(
      pendingFiles.map(async ({ file }) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Upload failed for ${file.name}: ${err}`);
        }

        results.push(await res.json());
      }),
    );

    return results;
  }

  async function onSubmit(data: NoteFormValues) {
    const hasContent = data.content && data.content.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;

    if (!hasContent && !hasFiles) {
      setUploadError("Add some text or attach a file");
      return;
    }

    try {
      let attachments: AttachmentMeta[] = [];
      if (hasFiles) {
        attachments = await uploadFiles();
      }

      await createNote({
        title: data.title || null,
        content: data.content || "",
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
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      toast.success("Note added");
      reset();
      setPendingFiles([]);
      setUploadError(null);
      setAlsoLinkContact(false);
      setAlsoLinkCompany(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Input
        placeholder="Title (optional)"
        className={`${FORM_INPUT_CLASSES}`}
        {...register("title")}
      />
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

      {/* File drop zone */}
      <button
        type="button"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs transition-colors ${
          isDragging
            ? "border-neon-400 bg-neon-400/5 text-neon-500"
            : "border-border/50 text-muted-foreground/50 hover:border-border hover:text-muted-foreground/70"
        }`}
      >
        <Upload className="size-3.5 shrink-0" />
        <span>Drop files here or click to browse</span>
        <span className="ml-auto text-xs text-muted-foreground/60">
          PDF, images, text &middot; max 10 MB
        </span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) validateAndAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </button>

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pendingFiles.map(({ file, id }) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={id}
                className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
              >
                <Icon className="size-3 shrink-0" />
                <span className="max-w-32 truncate">{file.name}</span>
                <span className="text-muted-foreground/40">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(id)}
                  className="ml-0.5 rounded-sm p-0.5 hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      <div className="flex items-center gap-4">
        {showLinkOptions && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="text-muted-foreground/60">Also show on:</span>
            {linkedContact && (
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
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
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
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
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="ml-auto bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
        >
          {isSubmitting
            ? pendingFiles.length > 0
              ? "Uploading..."
              : "Adding..."
            : "Add Note"}
        </Button>
      </div>
    </form>
  );
}
