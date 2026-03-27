"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import type { Company, Contact, Deal } from "@/db/schema";
import { getContactsForCompany } from "@/lib/actions/contacts";
import { createDeal, updateDeal } from "@/lib/actions/deals";
import { DEAL_SOURCES, DEAL_STAGES } from "@/lib/constants";
import { type DealFormValues, dealFormSchema } from "@/lib/validations";

type CompanyOption = Pick<Company, "id" | "name">;

type DealWithCompany = Deal & {
  company: Company;
  primaryContact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
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
          stage: deal.stage,
          source: deal.source,
          sourceDetail: deal.sourceDetail ?? "",
          estimatedValue: deal.estimatedValue ?? "",
          assignedTo: deal.assignedTo ?? "",
          followUpAt: deal.followUpAt
            ? new Date(deal.followUpAt).toISOString().split("T")[0]
            : "",
        }
      : {
          title: "",
          companyId: initialCompanyId,
          primaryContactId: "",
          stage: "new",
          source: "other",
        },
  });

  const currentStage = watch("stage");
  const currentCompanyId = watch("companyId");

  // Fetch contacts when company changes
  const [contactOptions, setContactOptions] = useState<Contact[]>([]);
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
          // Clear contact selection if company changed (not initial load for edit)
          if (deal && currentCompanyId !== deal.companyId) {
            setValue("primaryContactId", "");
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

  async function onSubmit(data: DealFormValues) {
    try {
      const payload = {
        ...data,
        primaryContactId: data.primaryContactId || null,
        sourceDetail: data.sourceDetail || null,
        estimatedValue: data.estimatedValue || null,
        assignedTo: data.assignedTo || null,
        followUpAt: data.followUpAt || null,
      };

      if (isEditing) {
        await updateDeal(deal.id, payload);
        toast.success("Deal updated");
        router.push(`/deals/${deal.id}`);
      } else {
        const newDeal = await createDeal(payload);
        toast.success("Deal created");
        router.push(`/deals/${newDeal.id}`);
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  const inputClasses =
    "bg-card/50 border-border/50 focus:border-gold-400/50 focus:ring-gold-400/20";
  const labelClasses =
    "text-xs uppercase tracking-wider text-muted-foreground/80";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 animate-fade-in"
    >
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="gold-underline pb-1 text-base">
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
                <SelectValue />
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
                <SelectValue />
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
              type="number"
              step="0.01"
              {...register("estimatedValue")}
              className={inputClasses}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="gold-underline pb-1 text-base">
            Company
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className={labelClasses}>Company *</Label>
            <Select
              defaultValue={initialCompanyId || undefined}
              onValueChange={(v) => v && setValue("companyId", v)}
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue placeholder="Select a company" />
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
          <CardTitle className="gold-underline pb-1 text-base">
            Primary Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className={labelClasses}>Contact</Label>
            <Select
              key={currentCompanyId}
              defaultValue={deal?.primaryContactId ?? undefined}
              onValueChange={(v) => setValue("primaryContactId", v ?? "")}
              disabled={!currentCompanyId || loadingContacts}
            >
              <SelectTrigger className={inputClasses}>
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
                />
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
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gold-400 text-primary-foreground hover:bg-gold-500 border-0"
        >
          {isSubmitting
            ? "Saving..."
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
      </div>
    </form>
  );
}
