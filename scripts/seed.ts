/**
 * Seed script — creates sample companies, contacts, deals, activities, and tags.
 *
 * Run:   npx tsx scripts/seed.ts
 * Clean: npx tsx scripts/seed.ts --clean
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  companies,
  companyTags,
  contacts,
  dealActivities,
  deals,
  dealTags,
  tags,
} from "../src/db/schema";

const SEED_MARKER = "[seed]";

const conn = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(conn);

// ─── Sample Data ───

const sampleTags = [
  { name: "Enterprise", color: "#3b82f6" },
  { name: "Startup", color: "#8b5cf6" },
  { name: "High Priority", color: "#ef4444" },
  { name: "Warm Intro", color: "#f97316" },
  { name: "Design", color: "#ec4899" },
  { name: "SaaS", color: "#22c55e" },
  { name: "Finance", color: "#eab308" },
] as const;

const sampleCompanies = [
  {
    name: "Acme Corp",
    website: "https://acmecorp.io",
    industry: "Enterprise Software",
    size: "201-500",
  },
  {
    name: "Neon Labs",
    website: "https://neonlabs.com",
    industry: "Developer Tools",
    size: "51-200",
  },
  {
    name: "Vault Finance",
    website: "https://vaultfinance.co",
    industry: "Fintech",
    size: "11-50",
  },
  {
    name: "Meridian Health",
    website: "https://meridianhealth.org",
    industry: "Healthcare",
    size: "500+",
  },
  {
    name: "Brightpath Design",
    website: "https://brightpath.design",
    industry: "Design Agency",
    size: "1-10",
  },
  {
    name: "Stratos Cloud",
    website: "https://stratoscloud.io",
    industry: "Cloud Infrastructure",
    size: "201-500",
  },
  {
    name: "Greenlane",
    website: "https://greenlane.co",
    industry: "Supply Chain",
    size: "51-200",
  },
  {
    name: "Pixelcraft Studio",
    website: null,
    industry: "Media & Entertainment",
    size: "11-50",
  },
  {
    name: "NordicPay",
    website: "https://nordicpay.eu",
    industry: "Payments",
    size: "51-200",
  },
  {
    name: "AutoFleet",
    website: "https://autofleet.mx",
    industry: "Logistics & Fleet",
    size: "11-50",
  },
  {
    name: "DataVine AI",
    website: "https://datavine.ai",
    industry: "Artificial Intelligence",
    size: "11-50",
  },
  {
    name: "Summit Capital",
    website: "https://summitcap.com",
    industry: "Venture Capital",
    size: "1-10",
  },
] as const;

const sampleContacts = [
  {
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@acmecorp.io",
    phone: "+1 415-555-0101",
    jobTitle: "VP of Engineering",
    linkedinUrl: "https://linkedin.com/in/sarahchen",
  },
  {
    firstName: "James",
    lastName: "Kowalski",
    email: "j.kowalski@neonlabs.com",
    phone: "+1 212-555-0142",
    jobTitle: "CTO",
    linkedinUrl: "https://linkedin.com/in/jameskowalski",
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya@vaultfinance.co",
    phone: "+1 650-555-0199",
    jobTitle: "Head of Product",
    linkedinUrl: null,
  },
  {
    firstName: "David",
    lastName: "Okafor",
    email: "dokafor@meridianhealth.org",
    phone: null,
    jobTitle: "Director of IT",
    linkedinUrl: null,
  },
  {
    firstName: "Emily",
    lastName: "Nguyen",
    email: "emily@brightpath.design",
    phone: null,
    jobTitle: "Founder & CEO",
    linkedinUrl: null,
  },
  {
    firstName: "Marcus",
    lastName: "Bell",
    email: "mbell@stratoscloud.io",
    phone: "+1 303-555-0178",
    jobTitle: "VP Sales",
    linkedinUrl: null,
  },
  {
    firstName: "Aisha",
    lastName: "Patel",
    email: "aisha.patel@greenlane.co",
    phone: null,
    jobTitle: "COO",
    linkedinUrl: null,
  },
  {
    firstName: "Tom",
    lastName: "Reeves",
    email: "treeves@pixelcraft.studio",
    phone: null,
    jobTitle: "Creative Director",
    linkedinUrl: null,
  },
  {
    firstName: "Lena",
    lastName: "Andersen",
    email: "lena@nordicpay.eu",
    phone: "+45 31-555-0144",
    jobTitle: "Head of Partnerships",
    linkedinUrl: null,
  },
  {
    firstName: "Carlos",
    lastName: "Mendez",
    email: "carlos@autofleet.mx",
    phone: null,
    jobTitle: "CEO",
    linkedinUrl: null,
  },
  {
    firstName: "Rachel",
    lastName: "Kim",
    email: "rkim@datavine.ai",
    phone: null,
    jobTitle: "ML Engineering Lead",
    linkedinUrl: null,
  },
  {
    firstName: "Oliver",
    lastName: "Grant",
    email: "ogrant@summitcap.com",
    phone: "+1 917-555-0166",
    jobTitle: "Managing Partner",
    linkedinUrl: null,
  },
] as const;

const sampleDeals = [
  {
    title: "Acme Corp — Platform Redesign",
    stage: "negotiating" as const,
    source: "referral" as const,
    sourceDetail: "Referred by Mike Torres at CloudBase",
    estimatedValue: "125000",
  },
  {
    title: "Neon Labs — DevTool Integration",
    stage: "proposal_sent" as const,
    source: "linkedin" as const,
    sourceDetail: null,
    estimatedValue: "85000",
  },
  {
    title: "Vault Finance — Product Consulting",
    stage: "qualifying" as const,
    source: "conference" as const,
    sourceDetail: "Met at SaaStr Annual 2026",
    estimatedValue: "45000",
  },
  {
    title: "Meridian Health — IT Modernization",
    stage: "contacted" as const,
    source: "cold_outreach" as const,
    sourceDetail: null,
    estimatedValue: "200000",
  },
  {
    title: "Brightpath Design — Brand Strategy",
    stage: "new" as const,
    source: "website" as const,
    sourceDetail: null,
    estimatedValue: "15000",
  },
  {
    title: "Stratos Cloud — Sales Enablement",
    stage: "won" as const,
    source: "referral" as const,
    sourceDetail: "Referred by Lisa Wang",
    estimatedValue: "180000",
  },
  {
    title: "Greenlane — Supply Chain Audit",
    stage: "lost" as const,
    source: "conference" as const,
    sourceDetail: "Web Summit 2025",
    estimatedValue: "60000",
  },
  {
    title: "Pixelcraft — Content Pipeline",
    stage: "qualifying" as const,
    source: "linkedin" as const,
    sourceDetail: null,
    estimatedValue: "32000",
  },
  {
    title: "NordicPay — Partnership Strategy",
    stage: "proposal_sent" as const,
    source: "referral" as const,
    sourceDetail: "Intro from Anders at Stripe",
    estimatedValue: "95000",
  },
  {
    title: "AutoFleet — Fleet Analytics",
    stage: "new" as const,
    source: "website" as const,
    sourceDetail: null,
    estimatedValue: "22000",
  },
  {
    title: "DataVine AI — ML Ops Consulting",
    stage: "contacted" as const,
    source: "cold_outreach" as const,
    sourceDetail: null,
    estimatedValue: "55000",
  },
  {
    title: "Summit Capital — Portfolio Advisory",
    stage: "negotiating" as const,
    source: "referral" as const,
    sourceDetail: "Portfolio company intro",
    estimatedValue: "300000",
  },
] as const;

const activityTemplates = [
  {
    type: "note",
    descriptions: [
      "Initial research completed — strong fit for our enterprise tier",
      "Reviewed their recent Series B announcement",
      "Checked LinkedIn — mutual connections with our advisory board",
      "Internal discussion: team agrees this is a high-priority deal",
    ],
  },
  {
    type: "email",
    descriptions: [
      "Sent introductory email with case study attached",
      "Followed up on proposal — awaiting feedback",
      "Shared product roadmap deck per their request",
      "Sent pricing breakdown for annual plan",
    ],
  },
  {
    type: "call",
    descriptions: [
      "Discovery call — 30 min. Discussed pain points around current tooling",
      "Demo call completed. Strong interest in analytics dashboard",
      "Quick check-in call. Decision expected by end of quarter",
      "Technical deep-dive with their engineering team",
    ],
  },
  {
    type: "meeting",
    descriptions: [
      "On-site meeting at their HQ. Met the full buying committee",
      "Lunch meeting to discuss partnership structure",
      "Video call with CEO and CTO — alignment on timeline",
      "Workshop session to map integration requirements",
    ],
  },
];

// ─── Seed Logic ───

async function seed() {
  console.log("Seeding sample data...\n");

  // Tags
  const insertedTags = [];
  for (const t of sampleTags) {
    const [tag] = await db
      .insert(tags)
      .values(t)
      .onConflictDoNothing()
      .returning();
    if (tag) insertedTags.push(tag);
  }
  console.log(`  Tags:       ${insertedTags.length} created`);

  const allTags = await db.select().from(tags);
  const tagsByName = Object.fromEntries(allTags.map((t) => [t.name, t]));

  // Companies
  const insertedCompanies = await db
    .insert(companies)
    .values(sampleCompanies.map((c) => ({ ...c })))
    .returning();
  console.log(`  Companies:  ${insertedCompanies.length} created`);

  // Contacts (one per company)
  const insertedContacts = [];
  for (let i = 0; i < sampleContacts.length; i++) {
    const [contact] = await db
      .insert(contacts)
      .values({ ...sampleContacts[i], companyId: insertedCompanies[i].id })
      .returning();
    insertedContacts.push(contact);
  }
  console.log(`  Contacts:   ${insertedContacts.length} created`);

  // Deals (one per company/contact pair)
  const insertedDeals = [];
  for (let i = 0; i < sampleDeals.length; i++) {
    const deal = sampleDeals[i];
    const [inserted] = await db
      .insert(deals)
      .values({
        ...deal,
        companyId: insertedCompanies[i].id,
        primaryContactId: insertedContacts[i].id,
        convertedAt: deal.stage === "won" ? new Date() : null,
        closedAt:
          deal.stage === "won" || deal.stage === "lost" ? new Date() : null,
      })
      .returning();
    insertedDeals.push(inserted);
  }
  console.log(`  Deals:      ${insertedDeals.length} created`);

  // Deal tags (random 1-3 per deal)
  const tagNames = Object.keys(tagsByName);
  let dtCount = 0;
  for (const deal of insertedDeals) {
    const shuffled = [...tagNames].sort(() => Math.random() - 0.5);
    const pick = shuffled.slice(0, 1 + Math.floor(Math.random() * 2));
    for (const name of pick) {
      const tag = tagsByName[name];
      if (tag) {
        await db
          .insert(dealTags)
          .values({ dealId: deal.id, tagId: tag.id })
          .onConflictDoNothing();
        dtCount++;
      }
    }
  }
  console.log(`  Deal tags:  ${dtCount} created`);

  // Company tags (random 0-2 per company)
  let ctCount = 0;
  for (const company of insertedCompanies) {
    const shuffled = [...tagNames].sort(() => Math.random() - 0.5);
    const pick = shuffled.slice(0, Math.floor(Math.random() * 2));
    for (const name of pick) {
      const tag = tagsByName[name];
      if (tag) {
        await db
          .insert(companyTags)
          .values({ companyId: company.id, tagId: tag.id })
          .onConflictDoNothing();
        ctCount++;
      }
    }
  }
  console.log(`  Co. tags:   ${ctCount} created`);

  // Activities (2-5 per deal)
  let actCount = 0;
  for (const deal of insertedDeals) {
    const num = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < num; i++) {
      const tmpl =
        activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
      const desc =
        tmpl.descriptions[Math.floor(Math.random() * tmpl.descriptions.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      await db.insert(dealActivities).values({
        dealId: deal.id,
        type: tmpl.type,
        description: desc,
        createdBy: SEED_MARKER,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      });
      actCount++;
    }
  }
  console.log(`  Activities: ${actCount} created`);

  console.log("\nDone!");
}

async function clean() {
  console.log("Removing seed data...\n");

  const seedActivities = await db
    .select({ dealId: dealActivities.dealId })
    .from(dealActivities)
    .where(eq(dealActivities.createdBy, SEED_MARKER));

  const seedDealIds = [...new Set(seedActivities.map((a) => a.dealId))];

  if (seedDealIds.length > 0) {
    const seedDeals = await db
      .select({ companyId: deals.companyId })
      .from(deals)
      .where(inArray(deals.id, seedDealIds));
    const companyIds = [...new Set(seedDeals.map((d) => d.companyId))];

    const deleted = await db
      .delete(deals)
      .where(inArray(deals.id, seedDealIds))
      .returning();
    console.log(`  Deleted ${deleted.length} seed deals`);

    if (companyIds.length > 0) {
      const dc = await db
        .delete(companies)
        .where(inArray(companies.id, companyIds))
        .returning();
      console.log(`  Deleted ${dc.length} seed companies`);
    }
  } else {
    console.log("  No seed data found");
  }

  for (const t of sampleTags) {
    await db.delete(tags).where(eq(tags.name, t.name));
  }
  console.log("  Deleted seed tags\nDone!");
}

const isClean = process.argv.includes("--clean");
(isClean ? clean() : seed()).catch(console.error).finally(() => conn.end());
