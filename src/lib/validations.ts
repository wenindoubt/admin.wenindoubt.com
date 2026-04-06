import { z } from "zod";
import { isValidPhone } from "./phone";
import { stripCommas } from "./utils";

// ── Company ──

// Field constraints defined once, shared between form + server schemas
const company = {
  name: z.string().min(1, "Company name is required").max(200),
  website: z.url("Invalid URL"),
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
  companyId: z.uuid("Company is required"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.email(),
  phone: z
    .string()
    .max(50)
    .refine((v) => !v || isValidPhone(v), "Invalid phone number"),
  linkedinUrl: z.url("Invalid URL"),
  jobTitle: z.string().max(200),
};

export const contactFormSchema = z.object({
  companyId: contact.companyId,
  firstName: contact.firstName,
  lastName: contact.lastName,
  email: contact.email,
  phone: contact.phone.optional(),
  linkedinUrl: contact.linkedinUrl.or(z.literal("")).optional(),
  jobTitle: contact.jobTitle.optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const createContactSchema = z.object({
  companyId: contact.companyId,
  firstName: contact.firstName,
  lastName: contact.lastName,
  email: contact.email,
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
  companyId: z.uuid("Company is required"),
  primaryContactId: z.uuid("Primary contact is required"),
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
  additionalContactIds: z.array(z.uuid()),
  title: deal.title,
  stage: deal.stage,
  source: deal.source,
  sourceDetail: deal.sourceDetail.optional(),
  estimatedValue: deal.estimatedValue
    .optional()
    .refine(
      (v) => !v || !Number.isNaN(Number(stripCommas(v))),
      "Must be a valid dollar amount",
    ),
  assignedTo: deal.assignedTo.optional(),
  followUpAt: deal.followUpAt.optional(),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

export const createDealSchema = z.object({
  companyId: deal.companyId,
  primaryContactId: deal.primaryContactId,
  additionalContactIds: z.array(z.uuid()).optional().default([]),
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

const attachmentMetaSchema = z.object({
  storagePath: z.string(),
  fileName: z.string(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

export type AttachmentMeta = z.infer<typeof attachmentMetaSchema>;

export const noteFormSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().max(50000),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;

export const createNoteSchema = z
  .object({
    title: z.string().max(300).nullable().optional(),
    content: z.string().max(50000).optional().default(""),
    dealId: z.uuid().nullable().optional(),
    contactId: z.uuid().nullable().optional(),
    companyId: z.uuid().nullable().optional(),
    talentId: z.uuid().nullable().optional(),
    attachments: z.array(attachmentMetaSchema).optional(),
  })
  .refine(
    (d) => d.dealId || d.contactId || d.companyId || d.talentId,
    "At least one entity (deal, contact, company, or talent) is required",
  )
  .refine(
    (d) =>
      (d.content && d.content.trim().length > 0) ||
      (d.attachments && d.attachments.length > 0),
    "Either content or at least one attachment is required",
  );

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
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
  dealId: z.uuid("Invalid deal ID"),
  type: z.enum(["email", "call", "meeting", "status_change"]),
  description: activity.description,
});

// ── Ingest API (external — OpenClaw / service-to-service) ──

const ingestCompanySchema = z.object({
  name: company.name,
  website: company.website.nullable().optional(),
  industry: company.industry.nullable().optional(),
  size: company.size.nullable().optional(),
});

const ingestContactSchema = z.object({
  firstName: contact.firstName,
  lastName: contact.lastName,
  // Email is optional for the ingest API — contacts.email is nullable in DB
  email: contact.email.nullable().optional(),
  phone: contact.phone.nullable().optional(),
  linkedinUrl: contact.linkedinUrl.nullable().optional(),
  jobTitle: contact.jobTitle.nullable().optional(),
});

const ingestNoteSchema = z.object({
  content: z.string().min(1).max(50000),
  title: z.string().max(300).nullable().optional(),
  // Which upserted entities to attach the note to — must include at least one
  associateTo: z
    .array(z.enum(["contact", "company"]))
    .min(1, "associateTo must include at least one of: contact, company"),
  // Stable caller-generated UUID — enables idempotent upsert
  externalId: z.uuid().optional(),
});

export const ingestRequestSchema = z
  .object({
    company: ingestCompanySchema.optional(),
    contact: ingestContactSchema.optional(),
    notes: z.array(ingestNoteSchema).optional(),
  })
  .refine(
    (d) => d.company || d.contact,
    "At least one of 'company' or 'contact' is required",
  );

export type IngestRequest = z.infer<typeof ingestRequestSchema>;

// ── Talent ──

const talentTiers = ["S", "A", "B", "C", "D"] as const;
const talentStatuses = ["active", "inactive", "archived"] as const;

const talentFields = {
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.email(),
  phone: z
    .string()
    .max(50)
    .refine((v) => !v || isValidPhone(v), "Invalid phone number"),
  linkedinUrl: z.url("Invalid URL"),
  tier: z.enum(talentTiers),
  status: z.enum(talentStatuses),
  bio: z.string().max(5000),
};

export const talentFormSchema = z.object({
  firstName: talentFields.firstName,
  lastName: talentFields.lastName,
  email: talentFields.email.or(z.literal("")).optional(),
  phone: talentFields.phone.optional(),
  linkedinUrl: talentFields.linkedinUrl.or(z.literal("")).optional(),
  tier: talentFields.tier,
  status: talentFields.status,
  bio: talentFields.bio.optional(),
  tagIds: z.array(z.uuid()).optional(),
});
export type TalentFormValues = z.infer<typeof talentFormSchema>;

export const createTalentSchema = z.object({
  firstName: talentFields.firstName,
  lastName: talentFields.lastName,
  email: talentFields.email.nullable().optional(),
  phone: talentFields.phone.nullable().optional(),
  linkedinUrl: talentFields.linkedinUrl.nullable().optional(),
  tier: talentFields.tier,
  status: talentFields.status.default("active"),
  bio: talentFields.bio.nullable().optional(),
  tagIds: z.array(z.uuid()).optional().default([]),
});
export type CreateTalentInput = z.infer<typeof createTalentSchema>;
export const updateTalentSchema = createTalentSchema
  .omit({ tagIds: true })
  .partial()
  .extend({ tagIds: z.array(z.uuid()).optional() });
export type UpdateTalentInput = z.infer<typeof updateTalentSchema>;
