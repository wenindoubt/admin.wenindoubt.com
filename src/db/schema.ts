import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  timestamp,
  jsonb,
  primaryKey,
  index,
  vector,
} from "drizzle-orm/pg-core";

// Enums
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualifying",
  "proposal_sent",
  "negotiating",
  "won",
  "lost",
  "churned",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "website",
  "referral",
  "linkedin",
  "conference",
  "cold_outreach",
  "other",
]);

// Core lead record
export const leads = pgTable(
  "leads",
  {
    id: uuid().primaryKey().defaultRandom(),
    // identity
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text(),
    phone: text(),
    linkedinUrl: text("linkedin_url"),
    // company
    companyName: text("company_name"),
    companyWebsite: text("company_website"),
    jobTitle: text("job_title"),
    industry: text(),
    companySize: text("company_size"),
    // lead meta
    status: leadStatusEnum().notNull().default("new"),
    source: leadSourceEnum().notNull().default("other"),
    sourceDetail: text("source_detail"),
    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
    // ownership
    assignedTo: text("assigned_to"),
    // timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_leads_status").on(table.status),
    index("idx_leads_assigned_to").on(table.assignedTo),
    index("idx_leads_created_at").on(table.createdAt),
    index("idx_leads_company").on(table.companyName),
  ]
);

// AI-generated insights
export const leadInsights = pgTable(
  "lead_insights",
  {
    id: uuid().primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    rawInput: text("raw_input"),
    analysisText: text("analysis_text").notNull(),
    summary: text(),
    embedding: vector({ dimensions: 768 }),
    analysisModel: text("analysis_model").notNull(),
    embeddingModel: text("embedding_model")
      .notNull()
      .default("gemini-embedding-2-preview"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_lead_insights_lead_id").on(table.leadId)]
);

// Activity log
export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid().primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: text().notNull(),
    description: text().notNull(),
    metadata: jsonb(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_lead_activities_lead_id").on(table.leadId),
    index("idx_lead_activities_created_at").on(table.createdAt),
  ]
);

// Tags
export const tags = pgTable("tags", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  color: text(),
});

export const leadTags = pgTable(
  "lead_tags",
  {
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.leadId, table.tagId] })]
);

// Type exports
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadInsight = typeof leadInsights.$inferSelect;
export type NewLeadInsight = typeof leadInsights.$inferInsert;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type NewLeadActivity = typeof leadActivities.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
