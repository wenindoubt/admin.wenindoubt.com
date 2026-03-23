"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import type { Lead } from "@/db/schema";
import { createLead, updateLead } from "@/lib/actions/leads";
import { COMPANY_SIZES, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { type LeadFormValues, leadFormSchema } from "@/lib/validations";

type LeadFormProps = {
  lead?: Lead;
};

export function LeadForm({ lead }: LeadFormProps) {
  const router = useRouter();
  const isEditing = !!lead;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: lead
      ? {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          linkedinUrl: lead.linkedinUrl ?? "",
          companyName: lead.companyName ?? "",
          companyWebsite: lead.companyWebsite ?? "",
          jobTitle: lead.jobTitle ?? "",
          industry: lead.industry ?? "",
          companySize: lead.companySize ?? "",
          status: lead.status,
          source: lead.source,
          sourceDetail: lead.sourceDetail ?? "",
          estimatedValue: lead.estimatedValue ?? "",
          assignedTo: lead.assignedTo ?? "",
        }
      : {
          status: "new",
          source: "other",
        },
  });

  async function onSubmit(data: LeadFormValues) {
    try {
      const payload = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        linkedinUrl: data.linkedinUrl || null,
        companyName: data.companyName || null,
        companyWebsite: data.companyWebsite || null,
        jobTitle: data.jobTitle || null,
        industry: data.industry || null,
        companySize: data.companySize || null,
        sourceDetail: data.sourceDetail || null,
        estimatedValue: data.estimatedValue || null,
        assignedTo: data.assignedTo || null,
      };

      if (isEditing) {
        await updateLead(lead.id, payload);
        toast.success("Lead updated");
      } else {
        await createLead(payload);
        toast.success("Lead created");
      }
      router.push("/leads");
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
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className={labelClasses}>
              First Name *
            </Label>
            <Input
              id="firstName"
              {...register("firstName")}
              className={inputClasses}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className={labelClasses}>
              Last Name *
            </Label>
            <Input
              id="lastName"
              {...register("lastName")}
              className={inputClasses}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
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
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className={labelClasses}>
              Phone
            </Label>
            <Input id="phone" {...register("phone")} className={inputClasses} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="linkedinUrl" className={labelClasses}>
              LinkedIn URL
            </Label>
            <Input
              id="linkedinUrl"
              {...register("linkedinUrl")}
              className={inputClasses}
            />
            {errors.linkedinUrl && (
              <p className="text-sm text-destructive">
                {errors.linkedinUrl.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="gold-underline pb-1 text-base">
            Company Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName" className={labelClasses}>
              Company Name
            </Label>
            <Input
              id="companyName"
              {...register("companyName")}
              className={inputClasses}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyWebsite" className={labelClasses}>
              Company Website
            </Label>
            <Input
              id="companyWebsite"
              {...register("companyWebsite")}
              className={inputClasses}
            />
            {errors.companyWebsite && (
              <p className="text-sm text-destructive">
                {errors.companyWebsite.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle" className={labelClasses}>
              Job Title
            </Label>
            <Input
              id="jobTitle"
              {...register("jobTitle")}
              className={inputClasses}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry" className={labelClasses}>
              Industry
            </Label>
            <Input
              id="industry"
              {...register("industry")}
              className={inputClasses}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClasses}>Company Size</Label>
            <Select
              defaultValue={lead?.companySize ?? undefined}
              onValueChange={(v) => setValue("companySize", v ?? "")}
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="gold-underline pb-1 text-base">
            Lead Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={labelClasses}>Status</Label>
            <Select
              defaultValue={lead?.status ?? "new"}
              onValueChange={(v) =>
                v && setValue("status", v as LeadFormValues["status"])
              }
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={labelClasses}>Source</Label>
            <Select
              defaultValue={lead?.source ?? "other"}
              onValueChange={(v) =>
                v && setValue("source", v as LeadFormValues["source"])
              }
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gold-400 text-primary-foreground hover:bg-gold-500 border-0"
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Lead"
              : "Create Lead"}
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
