import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// Enums
export const dealStageEnum = pgEnum("deal_stage", [
  "new",
  "contacted",
  "qualifying",
  "proposal_sent",
  "negotiating",
  "nurture",
  "won",
  "lost",
]);

export const dealSourceEnum = pgEnum("deal_source", [
  "website",
  "referral",
  "linkedin",
  "conference",
  "cold_outreach",
  "other",
]);

// Companies (accounts/organizations)
export const companies = pgTable(
  "companies",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    website: text(),
    industry: text(),
    size: text("company_size"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_companies_name").on(table.name)],
);

// Contacts (people at a company)
export const contacts = pgTable(
  "contacts",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text().notNull(),
    phone: text(),
    linkedinUrl: text("linkedin_url"),
    jobTitle: text("job_title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_contacts_company_id").on(table.companyId)],
);

// Deals (sales opportunities / contracts)
export const deals = pgTable(
  "deals",
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    primaryContactId: uuid("primary_contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    title: text().notNull(),
    stage: dealStageEnum().notNull().default("new"),
    source: dealSourceEnum().notNull().default("other"),
    sourceDetail: text("source_detail"),
    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
    assignedTo: text("assigned_to"),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_deals_stage").on(table.stage),
    index("idx_deals_company_id").on(table.companyId),
    index("idx_deals_assigned_to").on(table.assignedTo),
    index("idx_deals_created_at").on(table.createdAt),
  ],
);

// AI-generated insights (per deal)
export const dealInsights = pgTable(
  "deal_insights",
  {
    id: uuid().primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    prompt: text(),
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
  (table) => [index("idx_deal_insights_deal_id").on(table.dealId)],
);

// Activity log (per deal)
export const dealActivities = pgTable(
  "deal_activities",
  {
    id: uuid().primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    type: text().notNull(),
    description: text().notNull(),
    metadata: jsonb(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_deal_activities_deal_id").on(table.dealId),
    index("idx_deal_activities_created_at").on(table.createdAt),
  ],
);

// Tags
export const tags = pgTable("tags", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  color: text(),
});

export const dealTags = pgTable(
  "deal_tags",
  {
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.dealId, table.tagId] })],
);

export const companyTags = pgTable(
  "company_tags",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.companyId, table.tagId] })],
);

// Gmail OAuth tokens (per Clerk user)
export const gmailTokens = pgTable("gmail_tokens", {
  id: uuid().primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text().notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Type exports
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type DealInsight = typeof dealInsights.$inferSelect;
export type NewDealInsight = typeof dealInsights.$inferInsert;
export type DealActivity = typeof dealActivities.$inferSelect;
export type NewDealActivity = typeof dealActivities.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type GmailToken = typeof gmailTokens.$inferSelect;
export type NewGmailToken = typeof gmailTokens.$inferInsert;
