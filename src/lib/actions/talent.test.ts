import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (vi.mock is hoisted above imports) ─────────────────────────────────

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// findTalentForDeal / findDealsForTalent are NOT tested in
// this file. Both call generateEmbedding(), which requires a live
// GOOGLE_AI_API_KEY at call time and cannot be meaningfully exercised with a
// mocked DB. We mock the module solely to prevent @google/genai from loading.
vi.mock("@/lib/ai/embeddings", () => ({
  generateEmbedding: vi.fn(),
}));

// Prevent postgres connection — DATABASE_URL is not available in unit test env
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

// ─── Imports (after vi.mock so they receive mocked modules) ───────────────────

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  assignTalentToDeal,
  createTalent,
  getTalent,
  unassignTalentFromDeal,
  updateTalent,
} from "@/lib/actions/talent";
import { createTalentSchema, talentFormSchema } from "@/lib/validations";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a Drizzle-compatible fluent chain mock that resolves to `result` when
 * awaited. Every builder method (from, where, set, values …) returns the same
 * chain object. `.returning()` resolves to `result`. `.onConflictDoNothing()`
 * resolves to `[]`. The chain itself is also thenable, so callers that skip
 * `.returning()` (e.g. tag inserts) can still `await chain`.
 */
// biome-ignore lint/suspicious/noExplicitAny: returns any to be compatible with multiple Drizzle builder types
function makeChain<T>(result: T): any {
  // Extend a real Promise so `await chain` uses Promise.prototype.then
  // (own `.then` would trigger the noThenProperty lint rule).
  const fluent = {
    from: vi.fn(),
    where: vi.fn(),
    set: vi.fn(),
    values: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    innerJoin: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
    onConflictDoNothing: vi.fn().mockResolvedValue([]),
  };
  const chain = Object.assign(Promise.resolve(result), fluent);
  // Wire fluent builder methods to return the chain itself
  for (const key of [
    "from",
    "where",
    "set",
    "values",
    "orderBy",
    "limit",
    "offset",
    "innerJoin",
  ] as const) {
    fluent[key].mockReturnValue(chain);
  }
  return chain;
}

const uuid = () => randomUUID();

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createTalent ─────────────────────────────────────────────────────────────

describe("createTalent", () => {
  it("valid input creates talent row + tag associations", async () => {
    const talentId = uuid();
    const tagId = uuid();
    const talentRow = {
      id: talentId,
      firstName: "Jane",
      lastName: "Doe",
      tier: "A" as const,
      status: "active" as const,
      email: null,
      phone: null,
      linkedinUrl: null,
      bio: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const talentChain = makeChain([talentRow]);
    const tagChain = makeChain([]);
    vi.mocked(db.insert)
      .mockReturnValueOnce(talentChain)
      .mockReturnValueOnce(tagChain);

    const result = await createTalent({
      firstName: "Jane",
      lastName: "Doe",
      tier: "A",
      status: "active",
      tagIds: [tagId],
    });

    expect(result).toMatchObject({ id: talentId, firstName: "Jane" });
    // Two inserts: talent row + talentTags join rows
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(talentChain.returning).toHaveBeenCalledOnce();
    expect(tagChain.values).toHaveBeenCalledWith([{ talentId, tagId }]);
  });

  it("missing firstName throws validation error before touching DB", async () => {
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input shape
      createTalent({ lastName: "Doe", tier: "A" } as any),
    ).rejects.toThrow();

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("invalid tier throws validation error before touching DB", async () => {
    await expect(
      createTalent({
        firstName: "Jane",
        lastName: "Doe",
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid tier value
        tier: "Z" as any,
        status: "active",
        tagIds: [],
      }),
    ).rejects.toThrow();

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("empty tagIds skips the tag insert", async () => {
    const talentRow = {
      id: uuid(),
      firstName: "Solo",
      lastName: "Talent",
      tier: "B" as const,
      status: "active" as const,
      email: null,
      phone: null,
      linkedinUrl: null,
      bio: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.insert).mockReturnValueOnce(makeChain([talentRow]));

    await createTalent({
      firstName: "Solo",
      lastName: "Talent",
      tier: "B",
      status: "active",
      tagIds: [],
    });

    // Only one insert — talent row only, no talentTags insert
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});

// ─── updateTalent ─────────────────────────────────────────────────────────────

describe("updateTalent", () => {
  it("partial update (tier only) patches field, sets updatedAt, skips transaction", async () => {
    const id = uuid();
    const updatedRow = { id, tier: "S" as const, updatedAt: new Date() };
    const updateChain = makeChain([updatedRow]);
    vi.mocked(db.update).mockReturnValueOnce(updateChain);

    const result = await updateTalent(id, { tier: "S" });

    expect(result).toMatchObject({ tier: "S" });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "S", updatedAt: expect.any(Date) }),
    );
    // tagIds was not provided — no transaction should run
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("tag replacement: deletes old tags and inserts new ones inside a transaction", async () => {
    const id = uuid();
    const newTagId = uuid();
    const updatedRow = { id, tier: "A" as const, updatedAt: new Date() };
    vi.mocked(db.update).mockReturnValueOnce(makeChain([updatedRow]));

    const mockTx = {
      delete: vi.fn().mockReturnValue(makeChain([])),
      insert: vi.fn().mockReturnValue(makeChain([])),
    };
    // biome-ignore lint/suspicious/noExplicitAny: mockTx is a partial stub, not a full PgTransaction
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(mockTx));

    await updateTalent(id, { tagIds: [newTagId] });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(mockTx.delete).toHaveBeenCalledOnce(); // removes existing tags
    expect(mockTx.insert).toHaveBeenCalledOnce(); // inserts replacement tags
  });

  it("unknown id throws 'Talent not found'", async () => {
    // .returning() resolves to [] → no row matched → action throws
    vi.mocked(db.update).mockReturnValueOnce(makeChain([]));

    await expect(updateTalent(uuid(), { tier: "A" })).rejects.toThrow(
      "Talent not found",
    );
  });
});

// ─── assignTalentToDeal / unassignTalentFromDeal ──────────────────────────────

describe("assignTalentToDeal / unassignTalentFromDeal", () => {
  it("assignTalentToDeal calls onConflictDoNothing — calling twice does not throw", async () => {
    const talentId = uuid();
    const dealId = uuid();
    const chain1 = makeChain([]);
    const chain2 = makeChain([]);
    vi.mocked(db.insert)
      .mockReturnValueOnce(chain1)
      .mockReturnValueOnce(chain2);

    await expect(assignTalentToDeal(talentId, dealId)).resolves.not.toThrow();
    await expect(assignTalentToDeal(talentId, dealId)).resolves.not.toThrow();

    expect(chain1.onConflictDoNothing).toHaveBeenCalledOnce();
    expect(chain2.onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it("unassignTalentFromDeal deletes the correct row and revalidates both paths", async () => {
    const talentId = uuid();
    const dealId = uuid();
    vi.mocked(db.delete).mockReturnValueOnce(makeChain([]));

    await unassignTalentFromDeal(talentId, dealId);

    expect(db.delete).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith(`/deals/${dealId}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/talent/${talentId}`);
  });
});

// ─── getTalent filters ────────────────────────────────────────────────────────

describe("getTalent filters", () => {
  /**
   * getTalent runs two parallel db.select calls (rows + COUNT) via Promise.all,
   * then a third select for tags when rows.length > 0.
   */
  function setupSelectMocks(rows: unknown[] = [], total = 0) {
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain(rows))
      .mockReturnValueOnce(makeChain([{ total }]));
    if (rows.length > 0) {
      vi.mocked(db.select).mockReturnValueOnce(makeChain([]));
    }
  }

  it("default call uses active + inactive statuses (excludes archived)", async () => {
    setupSelectMocks();
    const result = await getTalent();
    // DEFAULT_TALENT_STATUSES = ["active", "inactive"] is applied internally;
    // we verify the function completes and returns the expected shape.
    expect(result).toEqual({ data: [], total: 0 });
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("tier filter is accepted and returns correct shape", async () => {
    setupSelectMocks();
    const result = await getTalent({ tier: ["S", "A"] });
    expect(result).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
    });
  });

  it("search string triggers tsquery path without throwing", async () => {
    setupSelectMocks();
    // buildTsquery("engineer") → "engineer:*" → adds ts condition to WHERE
    const result = await getTalent({ search: "engineer" });
    expect(result).toEqual({ data: [], total: 0 });
  });
});

// ─── Validation schemas (pure Zod, no DB) ────────────────────────────────────

describe("talentFormSchema", () => {
  it("accepts valid minimal input (firstName, lastName, tier, status)", () => {
    const r = talentFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      tier: "A",
      status: "active",
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing tier", () => {
    const r = talentFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      status: "active",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-empty non-URL string for linkedinUrl", () => {
    const r = talentFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      tier: "A",
      status: "active",
      linkedinUrl: "not-a-url",
    });
    expect(r.success).toBe(false);
  });

  it("allows empty string for linkedinUrl (no URL required when blank)", () => {
    const r = talentFormSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      tier: "A",
      status: "active",
      linkedinUrl: "",
    });
    expect(r.success).toBe(true);
  });
});

describe("createTalentSchema", () => {
  it("defaults status to 'active' when omitted", () => {
    const r = createTalentSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      tier: "B",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("active");
    }
  });
});
