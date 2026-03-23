/**
 * Seed script — creates sample leads, activities, and tags.
 *
 * Run:   npx tsx scripts/seed.ts
 * Clean: npx tsx scripts/seed.ts --clean
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import {
  leads,
  leadActivities,
  tags,
  leadTags,
} from "../src/db/schema";

const SEED_MARKER = "[seed]"; // createdBy marker so we can identify & remove seed data

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

const sampleLeads = [
  {
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@acmecorp.io",
    phone: "+1 415-555-0101",
    companyName: "Acme Corp",
    companyWebsite: "https://acmecorp.io",
    jobTitle: "VP of Engineering",
    industry: "Enterprise Software",
    companySize: "201-500",
    status: "negotiating" as const,
    source: "referral" as const,
    sourceDetail: "Referred by Mike Torres at CloudBase",
    estimatedValue: "125000",
    linkedinUrl: "https://linkedin.com/in/sarahchen",
  },
  {
    firstName: "James",
    lastName: "Kowalski",
    email: "j.kowalski@neonlabs.com",
    phone: "+1 212-555-0142",
    companyName: "Neon Labs",
    companyWebsite: "https://neonlabs.com",
    jobTitle: "CTO",
    industry: "Developer Tools",
    companySize: "51-200",
    status: "proposal_sent" as const,
    source: "linkedin" as const,
    estimatedValue: "85000",
    linkedinUrl: "https://linkedin.com/in/jameskowalski",
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya@vaultfinance.co",
    phone: "+1 650-555-0199",
    companyName: "Vault Finance",
    companyWebsite: "https://vaultfinance.co",
    jobTitle: "Head of Product",
    industry: "Fintech",
    companySize: "11-50",
    status: "qualifying" as const,
    source: "conference" as const,
    sourceDetail: "Met at SaaStr Annual 2026",
    estimatedValue: "45000",
  },
  {
    firstName: "David",
    lastName: "Okafor",
    email: "dokafor@meridianhealth.org",
    companyName: "Meridian Health",
    companyWebsite: "https://meridianhealth.org",
    jobTitle: "Director of IT",
    industry: "Healthcare",
    companySize: "500+",
    status: "contacted" as const,
    source: "cold_outreach" as const,
    estimatedValue: "200000",
  },
  {
    firstName: "Emily",
    lastName: "Nguyen",
    email: "emily@brightpath.design",
    companyName: "Brightpath Design",
    companyWebsite: "https://brightpath.design",
    jobTitle: "Founder & CEO",
    industry: "Design Agency",
    companySize: "1-10",
    status: "new" as const,
    source: "website" as const,
    estimatedValue: "15000",
  },
  {
    firstName: "Marcus",
    lastName: "Bell",
    email: "mbell@stratoscloud.io",
    phone: "+1 303-555-0178",
    companyName: "Stratos Cloud",
    companyWebsite: "https://stratoscloud.io",
    jobTitle: "VP Sales",
    industry: "Cloud Infrastructure",
    companySize: "201-500",
    status: "won" as const,
    source: "referral" as const,
    sourceDetail: "Referred by Lisa Wang",
    estimatedValue: "180000",
  },
  {
    firstName: "Aisha",
    lastName: "Patel",
    email: "aisha.patel@greenlane.co",
    companyName: "Greenlane",
    companyWebsite: "https://greenlane.co",
    jobTitle: "COO",
    industry: "Supply Chain",
    companySize: "51-200",
    status: "lost" as const,
    source: "conference" as const,
    sourceDetail: "Web Summit 2025",
    estimatedValue: "60000",
  },
  {
    firstName: "Tom",
    lastName: "Reeves",
    email: "treeves@pixelcraft.studio",
    companyName: "Pixelcraft Studio",
    jobTitle: "Creative Director",
    industry: "Media & Entertainment",
    companySize: "11-50",
    status: "qualifying" as const,
    source: "linkedin" as const,
    estimatedValue: "32000",
  },
  {
    firstName: "Lena",
    lastName: "Andersen",
    email: "lena@nordicpay.eu",
    phone: "+45 31-555-0144",
    companyName: "NordicPay",
    companyWebsite: "https://nordicpay.eu",
    jobTitle: "Head of Partnerships",
    industry: "Payments",
    companySize: "51-200",
    status: "proposal_sent" as const,
    source: "referral" as const,
    sourceDetail: "Intro from Anders at Stripe",
    estimatedValue: "95000",
  },
  {
    firstName: "Carlos",
    lastName: "Mendez",
    email: "carlos@autofleet.mx",
    companyName: "AutoFleet",
    companyWebsite: "https://autofleet.mx",
    jobTitle: "CEO",
    industry: "Logistics & Fleet",
    companySize: "11-50",
    status: "new" as const,
    source: "website" as const,
    estimatedValue: "22000",
  },
  {
    firstName: "Rachel",
    lastName: "Kim",
    email: "rkim@datavine.ai",
    companyName: "DataVine AI",
    companyWebsite: "https://datavine.ai",
    jobTitle: "ML Engineering Lead",
    industry: "Artificial Intelligence",
    companySize: "11-50",
    status: "contacted" as const,
    source: "cold_outreach" as const,
    estimatedValue: "55000",
  },
  {
    firstName: "Oliver",
    lastName: "Grant",
    email: "ogrant@summitcap.com",
    phone: "+1 917-555-0166",
    companyName: "Summit Capital",
    companyWebsite: "https://summitcap.com",
    jobTitle: "Managing Partner",
    industry: "Venture Capital",
    companySize: "1-10",
    status: "negotiating" as const,
    source: "referral" as const,
    sourceDetail: "Portfolio company intro",
    estimatedValue: "300000",
  },
];

const activityTemplates = [
  { type: "note", descriptions: [
    "Initial research completed — strong fit for our enterprise tier",
    "Reviewed their recent Series B announcement",
    "Checked LinkedIn — mutual connections with our advisory board",
    "Internal discussion: team agrees this is a high-priority lead",
  ]},
  { type: "email", descriptions: [
    "Sent introductory email with case study attached",
    "Followed up on proposal — awaiting feedback",
    "Shared product roadmap deck per their request",
    "Sent pricing breakdown for annual plan",
  ]},
  { type: "call", descriptions: [
    "Discovery call — 30 min. Discussed pain points around current tooling",
    "Demo call completed. Strong interest in analytics dashboard",
    "Quick check-in call. Decision expected by end of quarter",
    "Technical deep-dive with their engineering team",
  ]},
  { type: "meeting", descriptions: [
    "On-site meeting at their HQ. Met the full buying committee",
    "Lunch meeting to discuss partnership structure",
    "Video call with CEO and CTO — alignment on timeline",
    "Workshop session to map integration requirements",
  ]},
];

// ─── Seed Logic ───

async function seed() {
  console.log("Seeding sample data...\n");

  // 1. Tags
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

  // Fetch all tags (including pre-existing ones matching our names)
  const allTags = await db.select().from(tags);
  const tagsByName = Object.fromEntries(allTags.map((t) => [t.name, t]));

  // 2. Leads
  const insertedLeads = await db.insert(leads).values(sampleLeads).returning();
  console.log(`  Leads:      ${insertedLeads.length} created`);

  // 3. Tag assignments (random 1-3 tags per lead)
  const tagNames = Object.keys(tagsByName);
  let tagCount = 0;
  for (const lead of insertedLeads) {
    const shuffled = [...tagNames].sort(() => Math.random() - 0.5);
    const pick = shuffled.slice(0, 1 + Math.floor(Math.random() * 2));
    for (const name of pick) {
      const tag = tagsByName[name];
      if (tag) {
        await db.insert(leadTags).values({ leadId: lead.id, tagId: tag.id }).onConflictDoNothing();
        tagCount++;
      }
    }
  }
  console.log(`  Tag links:  ${tagCount} created`);

  // 4. Activities (2-5 per lead, spread over recent weeks)
  let actCount = 0;
  for (const lead of insertedLeads) {
    const numActivities = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numActivities; i++) {
      const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
      const desc = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      await db.insert(leadActivities).values({
        leadId: lead.id,
        type: template.type,
        description: desc,
        createdBy: SEED_MARKER,
        createdAt,
      });
      actCount++;
    }
  }
  console.log(`  Activities: ${actCount} created`);

  console.log("\nDone! Seed data has createdBy='[seed]' for easy cleanup.");
}

async function clean() {
  console.log("Removing seed data...\n");

  // Find all activities created by seed
  const seedActivities = await db
    .select({ leadId: leadActivities.leadId })
    .from(leadActivities)
    .where(eq(leadActivities.createdBy, SEED_MARKER));

  const seedLeadIds = [...new Set(seedActivities.map((a) => a.leadId))];

  if (seedLeadIds.length > 0) {
    // Cascade deletes will handle activities, insights, lead_tags
    const deleted = await db
      .delete(leads)
      .where(inArray(leads.id, seedLeadIds))
      .returning();
    console.log(`  Deleted ${deleted.length} seed leads (+ cascaded activities, tags, insights)`);
  } else {
    console.log("  No seed data found");
  }

  // Clean up orphaned seed tags (only if no other leads reference them)
  for (const t of sampleTags) {
    await db.delete(tags).where(eq(tags.name, t.name));
  }
  console.log(`  Deleted seed tags`);
  console.log("\nDone!");
}

// ─── Entry ───

const isClean = process.argv.includes("--clean");

(isClean ? clean() : seed())
  .catch(console.error)
  .finally(() => conn.end());
