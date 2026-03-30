import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  activityFormSchema,
  addDealActivitySchema,
  companyFormSchema,
  contactFormSchema,
  createCompanySchema,
  createNoteSchema,
  dealFormSchema,
  noteFormSchema,
  updateNoteSchema,
} from "./validations";

const uuid = () => randomUUID();

// ── Company ──

describe("companyFormSchema", () => {
  it("passes with name only", () => {
    expect(companyFormSchema.safeParse({ name: "Acme" }).success).toBe(true);
  });

  it("fails without name", () => {
    const r = companyFormSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("fails with empty name", () => {
    const r = companyFormSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  it("fails with name exceeding 200 chars", () => {
    const r = companyFormSchema.safeParse({ name: "x".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("allows empty string for website", () => {
    const r = companyFormSchema.safeParse({ name: "Acme", website: "" });
    expect(r.success).toBe(true);
  });

  it("allows valid URL for website", () => {
    const r = companyFormSchema.safeParse({
      name: "Acme",
      website: "https://acme.com",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid URL for website", () => {
    const r = companyFormSchema.safeParse({
      name: "Acme",
      website: "not-a-url",
    });
    expect(r.success).toBe(false);
  });

  it("allows optional industry and size", () => {
    const r = companyFormSchema.safeParse({
      name: "Acme",
      industry: "Tech",
      size: "11-50",
    });
    expect(r.success).toBe(true);
  });
});

describe("createCompanySchema", () => {
  it("allows nullable optional fields", () => {
    const r = createCompanySchema.safeParse({
      name: "Acme",
      website: null,
      industry: null,
      size: null,
    });
    expect(r.success).toBe(true);
  });
});

// ── Contact ──

describe("contactFormSchema", () => {
  const valid = {
    companyId: uuid(),
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
  };

  it("passes with valid required fields", () => {
    expect(contactFormSchema.safeParse(valid).success).toBe(true);
  });

  it("fails with invalid UUID for companyId", () => {
    const r = contactFormSchema.safeParse({ ...valid, companyId: "bad" });
    expect(r.success).toBe(false);
  });

  it("fails with empty firstName", () => {
    const r = contactFormSchema.safeParse({ ...valid, firstName: "" });
    expect(r.success).toBe(false);
  });

  it("fails with empty lastName", () => {
    const r = contactFormSchema.safeParse({ ...valid, lastName: "" });
    expect(r.success).toBe(false);
  });

  it("fails with invalid email", () => {
    const r = contactFormSchema.safeParse({ ...valid, email: "not-email" });
    expect(r.success).toBe(false);
  });

  it("fails with empty email", () => {
    const r = contactFormSchema.safeParse({ ...valid, email: "" });
    expect(r.success).toBe(false);
  });

  it("allows optional phone, linkedinUrl, jobTitle", () => {
    const r = contactFormSchema.safeParse({
      ...valid,
      phone: "555-1234",
      linkedinUrl: "https://linkedin.com/in/jane",
      jobTitle: "CEO",
    });
    expect(r.success).toBe(true);
  });

  it("allows empty string for linkedinUrl", () => {
    const r = contactFormSchema.safeParse({ ...valid, linkedinUrl: "" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid linkedinUrl", () => {
    const r = contactFormSchema.safeParse({
      ...valid,
      linkedinUrl: "not-url",
    });
    expect(r.success).toBe(false);
  });
});

// ── Deal ──

describe("dealFormSchema", () => {
  const valid = {
    companyId: uuid(),
    primaryContactId: uuid(),
    title: "Big Deal",
    stage: "new" as const,
    source: "website" as const,
  };

  it("passes with valid required fields", () => {
    expect(dealFormSchema.safeParse(valid).success).toBe(true);
  });

  it("fails with empty title", () => {
    const r = dealFormSchema.safeParse({ ...valid, title: "" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid stages", () => {
    const stages = [
      "new",
      "contacted",
      "qualifying",
      "proposal_sent",
      "negotiating",
      "nurture",
      "won",
      "lost",
    ];
    for (const stage of stages) {
      expect(dealFormSchema.safeParse({ ...valid, stage }).success).toBe(true);
    }
  });

  it("rejects invalid stage", () => {
    const r = dealFormSchema.safeParse({ ...valid, stage: "invalid" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid sources", () => {
    const sources = [
      "website",
      "referral",
      "linkedin",
      "conference",
      "cold_outreach",
      "other",
    ];
    for (const source of sources) {
      expect(dealFormSchema.safeParse({ ...valid, source }).success).toBe(true);
    }
  });

  it("rejects invalid source", () => {
    const r = dealFormSchema.safeParse({ ...valid, source: "twitter" });
    expect(r.success).toBe(false);
  });

  it("accepts formatted currency for estimatedValue", () => {
    const r = dealFormSchema.safeParse({
      ...valid,
      estimatedValue: "1,234,567",
    });
    expect(r.success).toBe(true);
  });

  it("accepts empty estimatedValue", () => {
    const r = dealFormSchema.safeParse({ ...valid, estimatedValue: "" });
    expect(r.success).toBe(true);
  });

  it("rejects non-numeric estimatedValue", () => {
    const r = dealFormSchema.safeParse({ ...valid, estimatedValue: "abc" });
    expect(r.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const r = dealFormSchema.safeParse({
      ...valid,
      sourceDetail: "From blog post",
      assignedTo: "John",
      followUpAt: "2025-06-01",
    });
    expect(r.success).toBe(true);
  });
});

// ── Note ──

describe("noteFormSchema", () => {
  it("passes with content only", () => {
    expect(noteFormSchema.safeParse({ content: "Hello" }).success).toBe(true);
  });

  it("allows optional title", () => {
    const r = noteFormSchema.safeParse({ title: "Title", content: "Body" });
    expect(r.success).toBe(true);
  });

  it("rejects content over 50000 chars", () => {
    const r = noteFormSchema.safeParse({ content: "x".repeat(50001) });
    expect(r.success).toBe(false);
  });
});

describe("createNoteSchema", () => {
  const dealId = uuid();
  const contactId = uuid();
  const companyId = uuid();

  it("passes with dealId + content", () => {
    const r = createNoteSchema.safeParse({ dealId, content: "Note text" });
    expect(r.success).toBe(true);
  });

  it("passes with contactId + content", () => {
    const r = createNoteSchema.safeParse({ contactId, content: "Note text" });
    expect(r.success).toBe(true);
  });

  it("passes with companyId + content", () => {
    const r = createNoteSchema.safeParse({ companyId, content: "Note text" });
    expect(r.success).toBe(true);
  });

  it("fails without any entity ID", () => {
    const r = createNoteSchema.safeParse({ content: "Orphan note" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toMatch(/at least one entity/i);
    }
  });

  it("fails without content and without attachments", () => {
    const r = createNoteSchema.safeParse({ dealId, content: "" });
    expect(r.success).toBe(false);
  });

  it("passes with attachments but no content", () => {
    const r = createNoteSchema.safeParse({
      dealId,
      content: "",
      attachments: [
        {
          storagePath: "notes/file.pdf",
          fileName: "file.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("validates attachment fields", () => {
    const r = createNoteSchema.safeParse({
      dealId,
      content: "text",
      attachments: [
        { storagePath: "", fileName: "", fileSize: -1, mimeType: "" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("allows multiple entity IDs", () => {
    const r = createNoteSchema.safeParse({
      dealId,
      contactId,
      companyId,
      content: "Cross-linked note",
    });
    expect(r.success).toBe(true);
  });
});

describe("updateNoteSchema", () => {
  it("passes with content", () => {
    expect(updateNoteSchema.safeParse({ content: "Updated" }).success).toBe(
      true,
    );
  });

  it("fails with empty content", () => {
    const r = updateNoteSchema.safeParse({ content: "" });
    expect(r.success).toBe(false);
  });

  it("allows nullable title", () => {
    const r = updateNoteSchema.safeParse({ title: null });
    expect(r.success).toBe(true);
  });
});

// ── Activity ──

describe("activityFormSchema", () => {
  it("passes with valid type and description", () => {
    expect(
      activityFormSchema.safeParse({ type: "email", description: "Sent intro" })
        .success,
    ).toBe(true);
    expect(
      activityFormSchema.safeParse({ type: "call", description: "Follow-up" })
        .success,
    ).toBe(true);
    expect(
      activityFormSchema.safeParse({
        type: "meeting",
        description: "Demo call",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid type", () => {
    const r = activityFormSchema.safeParse({
      type: "sms",
      description: "Text",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty description", () => {
    const r = activityFormSchema.safeParse({ type: "email", description: "" });
    expect(r.success).toBe(false);
  });
});

describe("addDealActivitySchema", () => {
  it("accepts status_change type", () => {
    const r = addDealActivitySchema.safeParse({
      dealId: uuid(),
      type: "status_change",
      description: "Moved to qualifying",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid dealId", () => {
    const r = addDealActivitySchema.safeParse({
      dealId: "not-uuid",
      type: "email",
      description: "Sent",
    });
    expect(r.success).toBe(false);
  });
});
