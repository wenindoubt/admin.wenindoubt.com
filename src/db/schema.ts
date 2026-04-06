import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

// Shared RLS policy — single-tenant, SELECT-only for authenticated role
const authReadPolicy = () =>
  pgPolicy("Authenticated read access", {
    as: "permissive",
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

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

export const talentTierEnum = pgEnum("talent_tier", ["S", "A", "B", "C", "D"]);
export const talentStatusEnum = pgEnum("talent_status", [
  "active",
  "inactive",
  "archived",
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
    searchVector: tsvector("search_vector"),
  },
  (table) => [
    index("idx_companies_name").on(table.name),
    index("idx_companies_search_vector").using("gin", table.searchVector),
    authReadPolicy(),
  ],
).enableRLS();

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
    email: text(),
    phone: text(),
    linkedinUrl: text("linkedin_url"),
    jobTitle: text("job_title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    searchVector: tsvector("search_vector"),
  },
  (table) => [
    index("idx_contacts_company_id").on(table.companyId),
    uniqueIndex("idx_contacts_company_email").on(table.companyId, table.email),
    // Partial unique index: dedup by name when email is absent (API ingest path)
    uniqueIndex("idx_contacts_company_name")
      .on(table.companyId, sql`lower(first_name)`, sql`lower(last_name)`)
      .where(sql`email IS NULL`),
    index("idx_contacts_search_vector").using("gin", table.searchVector),
    authReadPolicy(),
  ],
).enableRLS();

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
    // Trigger-maintained: title + company name + contact name + source detail
    searchVector: tsvector("search_vector"),
  },
  (table) => [
    index("idx_deals_stage").on(table.stage),
    index("idx_deals_source").on(table.source),
    index("idx_deals_company_id").on(table.companyId),
    index("idx_deals_assigned_to").on(table.assignedTo),
    index("idx_deals_created_at").on(table.createdAt),
    index("idx_deals_primary_contact_id").on(table.primaryContactId),
    index("idx_deals_search_vector").using("gin", table.searchVector),
    authReadPolicy(),
  ],
).enableRLS();

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
  (table) => [
    index("idx_deal_insights_deal_id").on(table.dealId),
    index("idx_deal_insights_embedding").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("idx_deal_insights_deal_generated").on(
      table.dealId,
      table.generatedAt,
    ),
    authReadPolicy(),
  ],
).enableRLS();

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
    index("idx_deal_activities_deal_created").on(table.dealId, table.createdAt),
    authReadPolicy(),
  ],
).enableRLS();

// Tags
export const tags = pgTable(
  "tags",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull().unique(),
    color: text(),
    scope: text().notNull().default("general"),
  },
  () => [authReadPolicy()],
).enableRLS();

export const dealContacts = pgTable(
  "deal_contacts",
  {
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.dealId, table.contactId] }),
    index("idx_deal_contacts_contact_id").on(table.contactId),
    authReadPolicy(),
  ],
).enableRLS();

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
  (table) => [
    primaryKey({ columns: [table.dealId, table.tagId] }),
    index("idx_deal_tags_tag_id").on(table.tagId),
    authReadPolicy(),
  ],
).enableRLS();

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
  (table) => [
    primaryKey({ columns: [table.companyId, table.tagId] }),
    index("idx_company_tags_tag_id").on(table.tagId),
    authReadPolicy(),
  ],
).enableRLS();

// Talent (engineers/freelancers to assign to deals)
export const talent = pgTable(
  "talent",
  {
    id: uuid().primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text(),
    phone: text(),
    linkedinUrl: text("linkedin_url"),
    tier: talentTierEnum().notNull(),
    status: talentStatusEnum().notNull().default("active"),
    bio: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    searchVector: tsvector("search_vector"),
  },
  (table) => [
    index("idx_talent_tier").on(table.tier),
    index("idx_talent_status").on(table.status),
    index("idx_talent_tier_status")
      .on(table.tier, table.status)
      .where(sql`status != 'archived'`),
    index("idx_talent_search_vector").using("gin", table.searchVector),
    authReadPolicy(),
  ],
).enableRLS();

export const talentTags = pgTable(
  "talent_tags",
  {
    talentId: uuid("talent_id")
      .notNull()
      .references(() => talent.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.talentId, table.tagId] }),
    index("idx_talent_tags_tag_id").on(table.tagId),
    authReadPolicy(),
  ],
).enableRLS();

export const talentDeals = pgTable(
  "talent_deals",
  {
    talentId: uuid("talent_id")
      .notNull()
      .references(() => talent.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.talentId, table.dealId] }),
    index("idx_talent_deals_deal_id").on(table.dealId),
    index("idx_talent_deals_talent_id").on(table.talentId),
    authReadPolicy(),
  ],
).enableRLS();

// Notes (multi-entity: deal, contact, company, talent)
export const notes = pgTable(
  "notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    type: text().notNull().default("note"),
    title: text(),
    content: text().notNull(),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    talentId: uuid("talent_id").references(() => talent.id, {
      onDelete: "cascade",
    }),
    externalId: text("external_id"),
    embedding: vector({ dimensions: 768 }),
    tokenCount: integer("token_count"),
    searchVector: tsvector("search_vector"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notes_deal_id").on(table.dealId),
    index("idx_notes_contact_id").on(table.contactId),
    index("idx_notes_company_id").on(table.companyId),
    index("idx_notes_talent_id").on(table.talentId),
    index("idx_notes_created_at").on(table.createdAt),
    index("idx_notes_embedding").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("idx_notes_search_vector").using("gin", table.searchVector),
    uniqueIndex("idx_notes_external_id")
      .on(table.externalId)
      .where(sql`external_id IS NOT NULL`),
    check(
      "notes_at_least_one_entity",
      sql`COALESCE(deal_id, contact_id, company_id, talent_id) IS NOT NULL`,
    ),
    authReadPolicy(),
  ],
).enableRLS();

// Note attachments (files stored in Supabase Storage)
export const noteAttachments = pgTable(
  "note_attachments",
  {
    id: uuid().primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_note_attachments_note_id").on(table.noteId),
    authReadPolicy(),
  ],
).enableRLS();

// Gmail OAuth tokens (per Clerk user)
export const gmailTokens = pgTable(
  "gmail_tokens",
  {
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
  },
  (table) => [
    // Owner-only: each user can only read their own Gmail tokens
    pgPolicy("Owner read access", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`${table.clerkUserId} = (select auth.jwt() ->> 'sub')`,
    }),
  ],
).enableRLS();

// API keys (external service auth — server-only, no RLS read policy)
export const apiKeys = pgTable("api_keys", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  hmacSecret: text("hmac_secret").notNull(),
  scopes: text().array().notNull().default(sql`'{}'::text[]`),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

// Type exports — full types (for writes/inserts)
export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type DealInsight = typeof dealInsights.$inferSelect;
export type DealActivity = typeof dealActivities.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type NoteAttachment = typeof noteAttachments.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;

// Slim types — exclude heavy columns never used in UI reads
export type CompanyRow = Omit<Company, "searchVector">;
export type ContactRow = Omit<Contact, "searchVector">;
export type DealRow = Omit<Deal, "searchVector">;
export type NoteRow = Omit<Note, "embedding" | "searchVector">;
export type Talent = typeof talent.$inferSelect;
export type TalentRow = Omit<Talent, "searchVector">;
export type TalentDeal = typeof talentDeals.$inferSelect;
