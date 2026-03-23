"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUSES, LEAD_SOURCES, COMPANY_SIZES } from "@/lib/constants";
import { leadFormSchema, type LeadFormValues } from "@/lib/validations";
import { createLead, updateLead } from "@/lib/actions/leads";
import type { Lead } from "@/db/schema";

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input id="linkedinUrl" {...register("linkedinUrl")} />
            {errors.linkedinUrl && (
              <p className="text-sm text-destructive">{errors.linkedinUrl.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" {...register("companyName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyWebsite">Company Website</Label>
            <Input id="companyWebsite" {...register("companyWebsite")} />
            {errors.companyWebsite && (
              <p className="text-sm text-destructive">{errors.companyWebsite.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input id="jobTitle" {...register("jobTitle")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" {...register("industry")} />
          </div>
          <div className="space-y-2">
            <Label>Company Size</Label>
            <Select
              defaultValue={lead?.companySize ?? undefined}
              onValueChange={(v) => setValue("companySize", v ?? "")}
            >
              <SelectTrigger>
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

      <Card>
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              defaultValue={lead?.status ?? "new"}
              onValueChange={(v) => v && setValue("status", v as LeadFormValues["status"])}
            >
              <SelectTrigger>
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
            <Label>Source</Label>
            <Select
              defaultValue={lead?.source ?? "other"}
              onValueChange={(v) => v && setValue("source", v as LeadFormValues["source"])}
            >
              <SelectTrigger>
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
            <Label htmlFor="sourceDetail">Source Detail</Label>
            <Textarea
              id="sourceDetail"
              placeholder='e.g. "Referred by John Smith" or "AWS re:Invent 2026"'
              {...register("sourceDetail")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
            <Input
              id="estimatedValue"
              type="number"
              step="0.01"
              {...register("estimatedValue")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update Lead" : "Create Lead"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
