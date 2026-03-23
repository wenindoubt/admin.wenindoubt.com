import { z } from "zod";

export const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").or(z.literal("")).optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().url("Invalid URL").or(z.literal("")).optional(),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  status: z.enum([
    "new",
    "contacted",
    "qualifying",
    "proposal_sent",
    "negotiating",
    "won",
    "lost",
    "churned",
  ]),
  source: z.enum([
    "website",
    "referral",
    "linkedin",
    "conference",
    "cold_outreach",
    "other",
  ]),
  sourceDetail: z.string().optional(),
  estimatedValue: z.string().optional(),
  assignedTo: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const activityFormSchema = z.object({
  type: z.enum(["note", "email", "call", "meeting"]),
  description: z.string().min(1, "Description is required"),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
