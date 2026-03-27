import { z } from "zod";

// ── Company ──

export const companyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string().url("Invalid URL").or(z.literal("")).optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

const nullable = z.string().nullable().optional();

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string().url("Invalid URL").nullable().optional(),
  industry: nullable,
  size: nullable,
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ── Contact ──

export const contactFormSchema = z.object({
  companyId: z.string().uuid("Company is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").or(z.literal("")).optional(),
  jobTitle: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const createContactSchema = z.object({
  companyId: z.string().uuid("Company is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: nullable,
  linkedinUrl: z.string().url("Invalid URL").nullable().optional(),
  jobTitle: nullable,
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export const updateContactSchema = createContactSchema.partial();
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ── Deal ──

const dealStages = [
  "new",
  "contacted",
  "qualifying",
  "proposal_sent",
  "negotiating",
  "nurture",
  "won",
  "lost",
] as const;

const dealSources = [
  "website",
  "referral",
  "linkedin",
  "conference",
  "cold_outreach",
  "other",
] as const;

export const dealFormSchema = z.object({
  companyId: z.string().uuid("Company is required"),
  primaryContactId: z.string().uuid().or(z.literal("")).optional(),
  title: z.string().min(1, "Deal title is required"),
  stage: z.enum(dealStages),
  source: z.enum(dealSources),
  sourceDetail: z.string().optional(),
  estimatedValue: z.string().optional(),
  assignedTo: z.string().optional(),
  followUpAt: z.string().optional(),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

export const createDealSchema = z.object({
  companyId: z.string().uuid("Company is required"),
  primaryContactId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Deal title is required"),
  stage: z.enum(dealStages),
  source: z.enum(dealSources),
  sourceDetail: nullable,
  estimatedValue: nullable,
  assignedTo: nullable,
  followUpAt: z.string().nullable().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export const updateDealSchema = createDealSchema.partial();
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

// ── Activity ──

export const activityFormSchema = z.object({
  type: z.enum(["note", "email", "call", "meeting"]),
  description: z.string().min(1, "Description is required"),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export const addDealActivitySchema = z.object({
  dealId: z.string().uuid("Invalid deal ID"),
  type: z.enum(["note", "email", "call", "meeting", "status_change"]),
  description: z.string().min(1, "Description is required"),
});
