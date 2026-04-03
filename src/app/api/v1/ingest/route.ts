import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts } from "@/db/schema";
import { validateApiRequest } from "@/lib/api-auth";
import { ingestRequestSchema } from "@/lib/validations";

type UpsertStatus = "created" | "updated" | "unchanged";

export async function POST(request: Request) {
  // Read raw body first — HMAC verification requires the exact bytes
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json(
      { error: "Failed to read request body" },
      { status: 400 },
    );
  }

  // Authenticate
  const auth = await validateApiRequest(request, rawBody);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  // Parse + validate body
  let parsed: ReturnType<typeof ingestRequestSchema.safeParse>;
  try {
    parsed = ingestRequestSchema.safeParse(JSON.parse(rawBody));
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    );
  }

  const { company: companyInput, contact: contactInput } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      let companyResult: {
        data: typeof companies.$inferSelect;
        status: UpsertStatus;
      } | null = null;
      let contactResult: {
        data: typeof contacts.$inferSelect;
        status: UpsertStatus;
      } | null = null;

      // ── Company upsert ───────────────────────────────────────────────────────
      if (companyInput) {
        const [existing] = await tx
          .select()
          .from(companies)
          .where(sql`lower(${companies.name}) = lower(${companyInput.name})`)
          .limit(1);

        if (existing) {
          // Merge: only overwrite fields that are newly provided and non-null
          const updates: Partial<typeof companyInput> = {};
          if (companyInput.website != null)
            updates.website = companyInput.website;
          if (companyInput.industry != null)
            updates.industry = companyInput.industry;
          if (companyInput.size != null) updates.size = companyInput.size;

          if (Object.keys(updates).length > 0) {
            const [updated] = await tx
              .update(companies)
              .set({ ...updates, updatedAt: new Date() })
              .where(eq(companies.id, existing.id))
              .returning();
            companyResult = { data: updated, status: "updated" };
          } else {
            companyResult = { data: existing, status: "unchanged" };
          }
        } else {
          const [created] = await tx
            .insert(companies)
            .values(companyInput)
            .returning();
          companyResult = { data: created, status: "created" };
        }
      }

      // ── Contact upsert ───────────────────────────────────────────────────────
      if (contactInput) {
        if (!companyResult) {
          throw new Error(
            "Contact requires a company — include 'company' in the request",
          );
        }

        const companyId = companyResult.data.id;

        if (contactInput.email) {
          // Email present — first check if a no-email record exists with same name (merge case)
          const [noEmailMatch] = await tx
            .select()
            .from(contacts)
            .where(
              and(
                eq(contacts.companyId, companyId),
                sql`lower(${contacts.firstName}) = lower(${contactInput.firstName})`,
                sql`lower(${contacts.lastName}) = lower(${contactInput.lastName})`,
                isNull(contacts.email),
              ),
            )
            .limit(1);

          if (noEmailMatch) {
            // Merge email (and any other new fields) onto the existing no-email record
            const updates: Record<string, unknown> = {
              email: contactInput.email,
              updatedAt: new Date(),
            };
            if (contactInput.phone != null) updates.phone = contactInput.phone;
            if (contactInput.linkedinUrl != null)
              updates.linkedinUrl = contactInput.linkedinUrl;
            if (contactInput.jobTitle != null)
              updates.jobTitle = contactInput.jobTitle;

            const [updated] = await tx
              .update(contacts)
              .set(updates)
              .where(eq(contacts.id, noEmailMatch.id))
              .returning();
            contactResult = { data: updated, status: "updated" };
          } else {
            // Check for a name match with any email — handles the email-change case
            const [nameMatch] = await tx
              .select()
              .from(contacts)
              .where(
                and(
                  eq(contacts.companyId, companyId),
                  sql`lower(${contacts.firstName}) = lower(${contactInput.firstName})`,
                  sql`lower(${contacts.lastName}) = lower(${contactInput.lastName})`,
                ),
              )
              .limit(1);

            if (nameMatch) {
              const updates: Record<string, unknown> = {
                email: contactInput.email,
                updatedAt: new Date(),
              };
              if (contactInput.phone != null)
                updates.phone = contactInput.phone;
              if (contactInput.linkedinUrl != null)
                updates.linkedinUrl = contactInput.linkedinUrl;
              if (contactInput.jobTitle != null)
                updates.jobTitle = contactInput.jobTitle;

              const [updated] = await tx
                .update(contacts)
                .set(updates)
                .where(eq(contacts.id, nameMatch.id))
                .returning();
              contactResult = { data: updated, status: "updated" };
            } else {
              // No existing record by name — use the unique index on (company_id, email) for upsert
              const mergeFields: Record<string, unknown> = {
                updatedAt: new Date(),
              };
              if (contactInput.phone != null)
                mergeFields.phone = contactInput.phone;
              if (contactInput.linkedinUrl != null)
                mergeFields.linkedinUrl = contactInput.linkedinUrl;
              if (contactInput.jobTitle != null)
                mergeFields.jobTitle = contactInput.jobTitle;

              const [upserted] = await tx
                .insert(contacts)
                .values({ companyId, ...contactInput })
                .onConflictDoUpdate({
                  target: [contacts.companyId, contacts.email],
                  set: mergeFields,
                })
                .returning();

              const wasUpdated = upserted.updatedAt > upserted.createdAt;
              contactResult = {
                data: upserted,
                status: wasUpdated ? "updated" : "created",
              };
            }
          }
        } else {
          // No email: use partial unique index on (company_id, lower(first), lower(last)) WHERE email IS NULL
          const [existing] = await tx
            .select()
            .from(contacts)
            .where(
              and(
                eq(contacts.companyId, companyId),
                sql`lower(${contacts.firstName}) = lower(${contactInput.firstName})`,
                sql`lower(${contacts.lastName}) = lower(${contactInput.lastName})`,
                isNull(contacts.email),
              ),
            )
            .limit(1);

          if (existing) {
            const updates: Record<string, unknown> = { updatedAt: new Date() };
            if (contactInput.phone != null) updates.phone = contactInput.phone;
            if (contactInput.linkedinUrl != null)
              updates.linkedinUrl = contactInput.linkedinUrl;
            if (contactInput.jobTitle != null)
              updates.jobTitle = contactInput.jobTitle;

            const [updated] = await tx
              .update(contacts)
              .set(updates)
              .where(eq(contacts.id, existing.id))
              .returning();
            contactResult = { data: updated, status: "updated" };
          } else {
            // Fall back to name match with any email — avoids duplicate when contact already has email
            const [nameMatch] = await tx
              .select()
              .from(contacts)
              .where(
                and(
                  eq(contacts.companyId, companyId),
                  sql`lower(${contacts.firstName}) = lower(${contactInput.firstName})`,
                  sql`lower(${contacts.lastName}) = lower(${contactInput.lastName})`,
                ),
              )
              .limit(1);

            if (nameMatch) {
              const updates: Record<string, unknown> = {
                updatedAt: new Date(),
              };
              if (contactInput.phone != null)
                updates.phone = contactInput.phone;
              if (contactInput.linkedinUrl != null)
                updates.linkedinUrl = contactInput.linkedinUrl;
              if (contactInput.jobTitle != null)
                updates.jobTitle = contactInput.jobTitle;

              const [updated] = await tx
                .update(contacts)
                .set(updates)
                .where(eq(contacts.id, nameMatch.id))
                .returning();
              contactResult = { data: updated, status: "updated" };
            } else {
              const [created] = await tx
                .insert(contacts)
                .values({ companyId, ...contactInput })
                .returning();
              contactResult = { data: created, status: "created" };
            }
          }
        }
      }

      return { companyResult, contactResult };
    });

    // Exclude searchVector — internal tsvector column, not useful to callers
    const omitSearchVector = <T extends { searchVector?: unknown }>(
      obj: T,
    ): Omit<T, "searchVector"> => {
      const { searchVector: _, ...rest } = obj;
      return rest;
    };

    return Response.json({
      company: result.companyResult
        ? {
            ...omitSearchVector(result.companyResult.data),
            _status: result.companyResult.status,
          }
        : null,
      contact: result.contactResult
        ? {
            ...omitSearchVector(result.contactResult.data),
            _status: result.contactResult.status,
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Surface client-visible validation errors (e.g. missing company for contact)
    if (message.includes("Contact requires a company")) {
      return Response.json({ error: message }, { status: 400 });
    }

    console.error("[POST /api/v1/ingest]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
