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
import type { Contact } from "@/db/schema";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { cn, FORM_INPUT_CLASSES, FORM_LABEL_CLASSES } from "@/lib/utils";
import { type ContactFormValues, contactFormSchema } from "@/lib/validations";

type CompanyOption = { id: string; name: string };

type ContactFormProps = {
  companyId?: string;
  contact?: Contact;
  companies?: CompanyOption[];
  onDone?: () => void;
  onCancel?: () => void;
};

export function ContactForm({
  companyId,
  contact,
  companies,
  onDone,
  onCancel,
}: ContactFormProps) {
  const router = useRouter();
  const isEditing = !!contact;
  const isStandalone = !!companies;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onTouched",
    defaultValues: contact
      ? {
          companyId: contact.companyId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          jobTitle: contact.jobTitle ?? "",
        }
      : { companyId: companyId ?? "" },
  });

  const selectedCompanyId = watch("companyId");

  async function onSubmit(data: ContactFormValues) {
    try {
      const payload = {
        companyId: data.companyId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        jobTitle: data.jobTitle || null,
      };

      if (isEditing) {
        await updateContact(contact.id, payload);
        toast.success("Contact updated");
        if (onDone) {
          onDone();
        } else {
          router.push(`/contacts/${contact.id}`);
        }
      } else {
        await createContact(payload);
        toast.success("Contact added");
        if (onDone) {
          reset({ companyId: companyId ?? "" });
          onDone();
        } else {
          router.push("/contacts");
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

  const fields = (
    <>
      {/* Company selector (standalone mode only) */}
      {isStandalone && (
        <div className="space-y-2 sm:col-span-2">
          <Label className={labelClasses}>Company *</Label>
          <Select
            value={selectedCompanyId || undefined}
            onValueChange={(v) => setValue("companyId", v ?? "")}
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
            <p className="text-xs text-destructive">
              {errors.companyId.message}
            </p>
          )}
        </div>
      )}
      {!isStandalone && <input type="hidden" {...register("companyId")} />}

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
            Email *
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
          <Input id="phone" {...register("phone")} className={inputClasses} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="jobTitle" className={labelClasses}>
          Job Title
        </Label>
        <Input
          id="jobTitle"
          {...register("jobTitle")}
          className={inputClasses}
        />
      </div>
    </>
  );

  // Standalone mode: wrap in Card + full-width buttons (matches CompanyForm/DealForm)
  if (isStandalone) {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 animate-fade-in"
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-base">
              Contact Information
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
                ? "Update Contact"
                : "Create Contact"}
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

  // Inline mode: compact form (matches existing ContactList usage)
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {fields}
      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Contact"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="border-border/50 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
