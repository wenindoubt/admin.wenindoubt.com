"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LazyTiptapEditor as TiptapEditor } from "@/components/lazy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Company, ContactRow, DealRow } from "@/db/schema";
import { getContactsForCompany } from "@/lib/actions/contacts";
import { createDeal, updateDeal } from "@/lib/actions/deals";
import { createNote } from "@/lib/actions/notes";
import { DEAL_SOURCES, DEAL_STAGES } from "@/lib/constants";
import {
  FORM_INPUT_CLASSES,
  FORM_LABEL_CLASSES,
  formatCurrencyInput,
  formatFileSize,
  stripCommas,
} from "@/lib/utils";
import type { AttachmentMeta } from "@/lib/validations";
import { type DealFormValues, dealFormSchema } from "@/lib/validations";

// ── File upload constants (shared with note-form) ──

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

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  return FileIcon;
}

// ── Component ──

type CompanyOption = Pick<Company, "id" | "name">;

type DealWithCompany = DealRow & {
  company: Pick<Company, "id" | "name">;
  additionalContactIds?: string[];
};

type DealFormProps = {
  deal?: DealWithCompany;
  companies: CompanyOption[];
  defaultCompanyId?: string;
};

export function DealForm({ deal, companies, defaultCompanyId }: DealFormProps) {
  const router = useRouter();
  const isEditing = !!deal;

  const initialCompanyId = deal?.companyId ?? defaultCompanyId ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    mode: "onTouched",
    defaultValues: deal
      ? {
          title: deal.title,
          companyId: deal.companyId,
          primaryContactId: deal.primaryContactId ?? "",
          additionalContactIds: deal.additionalContactIds ?? [],
          stage: deal.stage,
          source: deal.source,
          sourceDetail: deal.sourceDetail ?? "",
          estimatedValue: deal.estimatedValue
            ? formatCurrencyInput(deal.estimatedValue)
            : "",
          assignedTo: deal.assignedTo ?? "",
          followUpAt: deal.followUpAt
            ? new Date(deal.followUpAt).toISOString().split("T")[0]
            : "",
        }
      : {
          title: "",
          companyId: initialCompanyId,
          primaryContactId: "",
          additionalContactIds: [],
          stage: "new",
          source: "other",
        },
  });

  const currentStage = watch("stage");
  const currentCompanyId = watch("companyId");
  const currentContactId = watch("primaryContactId");

  // ── Contact fetching ──
  const [contactOptions, setContactOptions] = useState<ContactRow[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) {
      setContactOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingContacts(true);

    getContactsForCompany(currentCompanyId)
      .then((contacts) => {
        if (!cancelled) {
          setContactOptions(contacts);
          if (deal && currentCompanyId !== deal.companyId) {
            setValue("primaryContactId", "");
            setValue("additionalContactIds", []);
          } else if (!deal && contacts.length > 0) {
            const earliest = contacts.reduce((a, b) =>
              a.createdAt < b.createdAt ? a : b,
            );
            setValue("primaryContactId", earliest.id);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setContactOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingContacts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentCompanyId, deal, setValue]);

  // ── Initial context (new deals only) ──
  const [noteContent, setNoteContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [runAnalysis, setRunAnalysis] = useState(true);

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

  // ── Submit ──
  async function onSubmit(data: DealFormValues) {
    try {
      const payload = {
        ...data,
        primaryContactId: data.primaryContactId,
        sourceDetail: data.sourceDetail || null,
        estimatedValue: data.estimatedValue
          ? stripCommas(data.estimatedValue) || null
          : null,
        assignedTo: data.assignedTo || null,
        followUpAt: data.followUpAt || null,
      };

      if (isEditing) {
        await updateDeal(deal.id, payload);
        toast.success("Deal updated");
        router.push(`/deals/${deal.id}`);
        return;
      }

      const newDeal = await createDeal(payload);

      // Create initial context note if content or files provided
      const hasContent = noteContent.trim().length > 0;
      const hasFiles = pendingFiles.length > 0;
      if (hasContent || hasFiles) {
        let attachments: AttachmentMeta[] = [];
        if (hasFiles) {
          attachments = await uploadFiles();
        }
        await createNote({
          title: "Initial Context",
          content: noteContent || "",
          dealId: newDeal.id,
          contactId: null,
          companyId: data.companyId,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }

      toast.success("Deal created");
      const analyzeParam = runAnalysis ? "" : "?analyze=false";
      router.push(`/deals/${newDeal.id}${analyzeParam}`);
    } catch {
      toast.error("Something went wrong");
    }
  }

  const inputClasses = FORM_INPUT_CLASSES;
  const labelClasses = FORM_LABEL_CLASSES;

  const estimatedValueReg = register("estimatedValue");
  const estimatedValueProps = {
    ref: estimatedValueReg.ref,
    name: estimatedValueReg.name,
    onBlur: estimatedValueReg.onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const pos = input.selectionStart ?? 0;
      const prevLen = input.value.length;
      const formatted = formatCurrencyInput(input.value);
      input.value = formatted;
      const newPos = Math.max(0, pos + (formatted.length - prevLen));
      requestAnimationFrame(() => input.setSelectionRange(newPos, newPos));
      estimatedValueReg.onChange(e);
    },
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 animate-fade-in"
    >
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-1 text-base">
            Deal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title" className={labelClasses}>
              Title *
            </Label>
            <Input
              id="title"
              placeholder='e.g. "Website Redesign for Acme Corp"'
              {...register("title")}
              className={inputClasses}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className={labelClasses}>Stage</Label>
            <Select
              defaultValue={deal?.stage ?? "new"}
              onValueChange={(v) => {
                if (!v) return;
                setValue("stage", v as DealFormValues["stage"]);
                if (v !== "nurture") setValue("followUpAt", "");
              }}
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue>
                  {DEAL_STAGES.find((s) => s.value === currentStage)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stage && (
              <p className="text-sm text-destructive">{errors.stage.message}</p>
            )}
          </div>
          {currentStage === "nurture" && (
            <div className="space-y-2">
              <Label htmlFor="followUpAt" className={labelClasses}>
                Follow-Up Date
              </Label>
              <Input
                id="followUpAt"
                type="date"
                {...register("followUpAt")}
                className={inputClasses}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className={labelClasses}>Source</Label>
            <Select
              defaultValue={deal?.source ?? "other"}
              onValueChange={(v) =>
                v && setValue("source", v as DealFormValues["source"])
              }
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue>
                  {DEAL_SOURCES.find((s) => s.value === watch("source"))?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DEAL_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source && (
              <p className="text-sm text-destructive">
                {errors.source.message}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sourceDetail" className={labelClasses}>
              Source Detail
            </Label>
            <Textarea
              id="sourceDetail"
              placeholder='e.g. "Referred by John Smith" or "AWS re:Invent 2026"'
              {...register("sourceDetail")}
              className={inputClasses}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedValue" className={labelClasses}>
              Estimated Value ($)
            </Label>
            <Input
              id="estimatedValue"
              type="text"
              inputMode="decimal"
              placeholder="0"
              {...estimatedValueProps}
              className={inputClasses}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-1 text-base">
            Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className={labelClasses}>Company *</Label>
            <Select
              defaultValue={initialCompanyId || undefined}
              onValueChange={(v) => v && setValue("companyId", v)}
            >
              <SelectTrigger className={`${inputClasses} w-full`}>
                <SelectValue placeholder="Select a company">
                  {companies.find((c) => c.id === currentCompanyId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.companyId && (
              <p className="text-sm text-destructive">
                {errors.companyId.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-1 text-base">
            Primary Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className={labelClasses}>Contact *</Label>
            <Select
              value={currentContactId}
              onValueChange={(v) => setValue("primaryContactId", v ?? "")}
              disabled={!currentCompanyId || loadingContacts}
            >
              <SelectTrigger className={`${inputClasses} w-full`}>
                <SelectValue
                  placeholder={
                    !currentCompanyId
                      ? "Select a company first"
                      : loadingContacts
                        ? "Loading contacts..."
                        : contactOptions.length === 0
                          ? "No contacts at this company"
                          : "Select a contact"
                  }
                >
                  {(() => {
                    const c = contactOptions.find(
                      (c) => c.id === currentContactId,
                    );
                    if (!c) return undefined;
                    return c.jobTitle
                      ? `${c.firstName} ${c.lastName} · ${c.jobTitle}`
                      : `${c.firstName} ${c.lastName}`;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contactOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.jobTitle && (
                      <span className="text-muted-foreground">
                        {" "}
                        &middot; {c.jobTitle}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional contacts — only when >1 contact available */}
          {contactOptions.filter((c) => c.id !== currentContactId).length >
            0 && (
            <div className="space-y-2 mt-3">
              <Label className={labelClasses}>Additional Contacts</Label>
              <div className="space-y-1.5">
                {contactOptions
                  .filter((c) => c.id !== currentContactId)
                  .map((c) => {
                    const checked = (
                      watch("additionalContactIds") ?? []
                    ).includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 cursor-pointer text-sm rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = watch("additionalContactIds") ?? [];
                            setValue(
                              "additionalContactIds",
                              e.target.checked
                                ? [...current, c.id]
                                : current.filter((id) => id !== c.id),
                            );
                          }}
                          className="size-3.5 rounded accent-neon-400"
                        />
                        <span>
                          {c.firstName} {c.lastName}
                          {c.jobTitle && (
                            <span className="text-muted-foreground">
                              {" "}
                              &middot; {c.jobTitle}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initial Context — new deals only */}
      {!isEditing && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Initial Context
            </CardTitle>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Add meeting notes, transcripts, RFPs, or any background that led
              to this deal. This becomes the first note and feeds the AI
              analysis.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <TiptapEditor
              content={noteContent}
              onChange={setNoteContent}
              placeholder="Paste transcripts, meeting notes, requirements..."
              disabled={isSubmitting}
            />

            {/* File drop zone */}
            <button
              type="button"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs transition-colors ${
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

            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
        >
          {isSubmitting
            ? pendingFiles.length > 0
              ? "Uploading..."
              : "Saving..."
            : isEditing
              ? "Update Deal"
              : "Create Deal"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border-border/50 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>

        {/* AI Analysis toggle — new deals only */}
        {!isEditing && (
          <label className="ml-auto flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Sparkles className="size-3.5 text-neon-400/70" />
            <span>Run AI analysis</span>
            <input
              type="checkbox"
              checked={runAnalysis}
              onChange={(e) => setRunAnalysis(e.target.checked)}
              className="size-4 rounded accent-neon-400"
            />
          </label>
        )}
      </div>
    </form>
  );
}
