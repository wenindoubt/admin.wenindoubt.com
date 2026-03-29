import { z } from "zod";
import { stripCommas } from "./utils";

// ── Company ──

// Field constraints defined once, shared between form + server schemas
const company = {
  name: z.string().min(1, "Company name is required").max(200),
  website: z.string().url("Invalid URL"),
  industry: z.string().max(100),
  size: z.string(),
};

export const companyFormSchema = z.object({
  name: company.name,
  website: company.website.or(z.literal("")).optional(),
  industry: company.industry.optional(),
  size: company.size.optional(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export const createCompanySchema = z.object({
  name: company.name,
  website: company.website.nullable().optional(),
  industry: company.industry.nullable().optional(),
  size: company.size.nullable().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ── Contact ──

const contact = {
  companyId: z.string().uuid("Company is required"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().max(255),
  phone: z.string().max(50),
  linkedinUrl: z.string().url("Invalid URL"),
  jobTitle: z.string().max(200),
};

export const contactFormSchema = z.object({
  companyId: contact.companyId,
  firstName: contact.firstName,
  lastName: contact.lastName,
  email: contact.email.email("Invalid email").min(1, "Email is required"),
  phone: contact.phone.optional(),
  linkedinUrl: contact.linkedinUrl.or(z.literal("")).optional(),
  jobTitle: contact.jobTitle.optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const createContactSchema = z.object({
  companyId: contact.companyId,
  firstName: contact.firstName,
  lastName: contact.lastName,
  email: contact.email.email("Email is required"),
  phone: contact.phone.nullable().optional(),
  linkedinUrl: contact.linkedinUrl.nullable().optional(),
  jobTitle: contact.jobTitle.nullable().optional(),
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

const deal = {
  companyId: z.string().uuid("Company is required"),
  primaryContactId: z.string().uuid("Primary contact is required"),
  title: z.string().min(1, "Deal title is required").max(300),
  stage: z.enum(dealStages),
  source: z.enum(dealSources),
  sourceDetail: z.string().max(1000),
  estimatedValue: z.string(),
  assignedTo: z.string(),
  followUpAt: z.string(),
};

export const dealFormSchema = z.object({
  companyId: deal.companyId,
  primaryContactId: deal.primaryContactId,
  title: deal.title,
  stage: deal.stage,
  source: deal.source,
  sourceDetail: deal.sourceDetail.optional(),
  estimatedValue: deal.estimatedValue
    .optional()
    .refine(
      (v) => !v || !isNaN(Number(stripCommas(v))),
      "Must be a valid dollar amount",
    ),
  assignedTo: deal.assignedTo.optional(),
  followUpAt: deal.followUpAt.optional(),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

export const createDealSchema = z.object({
  companyId: deal.companyId,
  primaryContactId: deal.primaryContactId,
  title: deal.title,
  stage: deal.stage,
  source: deal.source,
  sourceDetail: deal.sourceDetail.nullable().optional(),
  estimatedValue: deal.estimatedValue.nullable().optional(),
  assignedTo: deal.assignedTo.nullable().optional(),
  followUpAt: deal.followUpAt.nullable().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export const updateDealSchema = createDealSchema.partial();
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

// ── Note ──

const noteTypes = ["note", "transcript", "document"] as const;

export const noteFormSchema = z.object({
  type: z.enum(noteTypes),
  title: z.string().max(300).optional(),
  content: z.string().min(1, "Content is required").max(50000),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;

export const createNoteSchema = z
  .object({
    type: z.enum(noteTypes),
    title: z.string().max(300).nullable().optional(),
    content: z.string().min(1, "Content is required").max(50000),
    dealId: z.string().uuid().nullable().optional(),
    contactId: z.string().uuid().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (d) => d.dealId || d.contactId || d.companyId,
    "At least one entity (deal, contact, or company) is required",
  );

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  type: z.enum(noteTypes).optional(),
  title: z.string().max(300).nullable().optional(),
  content: z.string().min(1).max(50000).optional(),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

// ── Activity ──

const activity = {
  description: z.string().min(1, "Description is required").max(5000),
};

export const activityFormSchema = z.object({
  type: z.enum(["email", "call", "meeting"]),
  description: activity.description,
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export const addDealActivitySchema = z.object({
  dealId: z.string().uuid("Invalid deal ID"),
  type: z.enum(["email", "call", "meeting", "status_change"]),
  description: activity.description,
});
