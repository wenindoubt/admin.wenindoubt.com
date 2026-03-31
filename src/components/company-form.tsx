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
import type { CompanyRow } from "@/db/schema";
import { createCompany, updateCompany } from "@/lib/actions/companies";
import { COMPANY_SIZES } from "@/lib/constants";
import { FORM_INPUT_CLASSES, FORM_LABEL_CLASSES } from "@/lib/utils";
import { type CompanyFormValues, companyFormSchema } from "@/lib/validations";

type CompanyFormProps = {
  company?: CompanyRow;
};

export function CompanyForm({ company }: CompanyFormProps) {
  const router = useRouter();
  const isEditing = !!company;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    mode: "onTouched",
    defaultValues: company
      ? {
          name: company.name,
          website: company.website ?? "",
          industry: company.industry ?? "",
          size: company.size ?? "",
        }
      : {},
  });

  async function onSubmit(data: CompanyFormValues) {
    try {
      const payload = {
        name: data.name,
        website: data.website || null,
        industry: data.industry || null,
        size: data.size || null,
      };

      if (isEditing) {
        await updateCompany(company.id, payload);
        toast.success("Company updated");
        router.push(`/companies/${company.id}`);
      } else {
        const newCompany = await createCompany(payload);
        toast.success("Company created");
        router.push(`/companies/${newCompany.id}`);
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  const inputClasses = FORM_INPUT_CLASSES;
  const labelClasses = FORM_LABEL_CLASSES;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 animate-fade-in"
    >
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="neon-underline pb-1 text-base">
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name" className={labelClasses}>
              Company Name *
            </Label>
            <Input id="name" {...register("name")} className={inputClasses} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="website" className={labelClasses}>
              Website
            </Label>
            <Input
              id="website"
              placeholder="https://example.com"
              {...register("website")}
              className={inputClasses}
            />
            {errors.website && (
              <p className="text-sm text-destructive">
                {errors.website.message}
              </p>
            )}
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
              defaultValue={company?.size ?? undefined}
              onValueChange={(v) => setValue("size", v ?? "")}
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

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Company"
              : "Create Company"}
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
