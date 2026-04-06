"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PhoneInput } from "@/components/phone-input";
import { TierBadge } from "@/components/talent-tier-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Tag, TalentRow } from "@/db/schema";
import { createTalent, updateTalent } from "@/lib/actions/talent";
import { toE164 } from "@/lib/phone";
import { cn, FORM_INPUT_CLASSES, FORM_LABEL_CLASSES } from "@/lib/utils";
import { type TalentFormValues, talentFormSchema } from "@/lib/validations";

const TIERS = [
  { value: "S", label: "S — Principal" },
  { value: "A", label: "A — Senior" },
  { value: "B", label: "B — Mid-level" },
  { value: "C", label: "C — Junior" },
  { value: "D", label: "D — No-go" },
] as const;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
] as const;

type TalentFormProps = {
  talent?: TalentRow & { tags?: Tag[] };
  availableTags: Tag[];
  onDone?: () => void;
  onCancel?: () => void;
};

export function TalentForm({
  talent,
  availableTags,
  onDone,
  onCancel,
}: TalentFormProps) {
  const router = useRouter();
  const isEditing = !!talent;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TalentFormValues>({
    resolver: zodResolver(talentFormSchema),
    mode: "onTouched",
    defaultValues: talent
      ? {
          firstName: talent.firstName,
          lastName: talent.lastName,
          email: talent.email ?? "",
          phone: talent.phone ?? "",
          linkedinUrl: talent.linkedinUrl ?? "",
          tier: talent.tier,
          status: talent.status,
          bio: talent.bio ?? "",
          tagIds: talent.tags?.map((t) => t.id) ?? [],
        }
      : {
          status: "active",
          tagIds: [],
        },
  });

  const selectedTagIds = watch("tagIds") ?? [];
  const selectedTier = watch("tier");
  const selectedStatus = watch("status");

  function toggleTag(tagId: string) {
    const current = selectedTagIds;
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    setValue("tagIds", next);
  }

  async function onSubmit(data: TalentFormValues) {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone ? toE164(data.phone) : null,
        linkedinUrl: data.linkedinUrl || null,
        tier: data.tier,
        status: data.status,
        bio: data.bio || null,
        tagIds: data.tagIds ?? [],
      };

      if (isEditing) {
        await updateTalent(talent.id, payload);
        toast.success("Talent updated");
        if (onDone) {
          onDone();
        } else {
          router.push(`/talent/${talent.id}`);
        }
      } else {
        const created = await createTalent(payload);
        toast.success("Talent added");
        if (onDone) {
          onDone();
        } else {
          router.push(`/talent/${created.id}`);
        }
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }

  const inputClasses = cn(FORM_INPUT_CLASSES, "h-9 text-sm");
  const labelClasses = FORM_LABEL_CLASSES;

  const selectedTags = availableTags.filter((t) =>
    selectedTagIds.includes(t.id),
  );

  const fields = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="firstName" className={labelClasses}>
            First Name *
          </Label>
          <Input
            id="firstName"
            {...register("firstName")}
            className={inputClasses}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName" className={labelClasses}>
            Last Name *
          </Label>
          <Input
            id="lastName"
            {...register("lastName")}
            className={inputClasses}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="email" className={labelClasses}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className={inputClasses}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone" className={labelClasses}>
            Phone
          </Label>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                id="phone"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className={inputClasses}
              />
            )}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="linkedinUrl" className={labelClasses}>
          LinkedIn URL
        </Label>
        <Input
          id="linkedinUrl"
          {...register("linkedinUrl")}
          placeholder="https://linkedin.com/in/..."
          className={inputClasses}
        />
        {errors.linkedinUrl && (
          <p className="text-xs text-destructive">
            {errors.linkedinUrl.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className={labelClasses}>Tier *</Label>
          <Select
            value={selectedTier}
            onValueChange={(v) =>
              setValue("tier", v as TalentFormValues["tier"])
            }
          >
            <SelectTrigger className={inputClasses}>
              <SelectValue placeholder="Select tier">
                {selectedTier && (
                  <span className="flex items-center gap-2">
                    <TierBadge tier={selectedTier} />
                    {TIERS.find((t) => t.value === selectedTier)?.label.slice(
                      4,
                    )}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    <TierBadge tier={t.value} />
                    {t.label.slice(4)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tier && (
            <p className="text-xs text-destructive">{errors.tier.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className={labelClasses}>Status *</Label>
          <Select
            value={selectedStatus}
            onValueChange={(v) =>
              setValue("status", v as TalentFormValues["status"])
            }
          >
            <SelectTrigger className={inputClasses}>
              <SelectValue placeholder="Select status">
                {STATUSES.find((s) => s.value === selectedStatus)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="bio" className={labelClasses}>
          Bio
        </Label>
        <Textarea
          id="bio"
          {...register("bio")}
          rows={4}
          placeholder="Background, expertise, notes..."
          className={cn(FORM_INPUT_CLASSES, "text-sm resize-none")}
        />
        {errors.bio && (
          <p className="text-xs text-destructive">{errors.bio.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className={labelClasses}>Specialties</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              className="border-0 gap-1 pr-1"
              style={
                tag.color
                  ? { backgroundColor: `${tag.color}20`, color: tag.color }
                  : undefined
              }
            >
              {tag.name}
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex size-6 items-center justify-center rounded-full border border-dashed border-border/50 text-muted-foreground/50 hover:border-neon-400/40 hover:text-neon-400 hover:bg-neon-400/5 transition-all"
                />
              }
            >
              +
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {availableTags.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No talent tags created yet
                </p>
              )}
              {availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => toggleTag(tag.id)}
                >
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color ?? "#6b7280" }}
                  />
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 animate-fade-in"
    >
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-1 text-base">
            Talent Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{fields}</CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Talent"
              : "Add Talent"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="border-border/50 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
