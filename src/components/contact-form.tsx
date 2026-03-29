"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Contact } from "@/db/schema";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { type ContactFormValues, contactFormSchema } from "@/lib/validations";

type ContactFormProps = {
  companyId: string;
  contact?: Contact;
  onDone?: () => void;
  onCancel: () => void;
};

export function ContactForm({
  companyId,
  contact,
  onDone,
  onCancel,
}: ContactFormProps) {
  const isEditing = !!contact;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onTouched",
    defaultValues: contact
      ? {
          companyId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          jobTitle: contact.jobTitle ?? "",
        }
      : { companyId },
  });

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
      } else {
        await createContact(payload);
        toast.success("Contact added");
        reset({ companyId });
      }
      onDone?.();
    } catch {
      toast.error("Something went wrong");
    }
  }

  const inputClasses =
    "bg-card/50 border-border/50 focus:border-gold-400/50 focus:ring-gold-400/20 h-9 text-sm";
  const labelClasses =
    "text-xs uppercase tracking-wider text-muted-foreground/80";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input type="hidden" {...register("companyId")} />
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
      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-gold-400 text-primary-foreground hover:bg-gold-500 border-0"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add Contact"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="border-border/50 text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
