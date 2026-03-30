import { expect, test, uniqueName } from "./fixtures";

/**
 * Core user flow: Company → Contact → Deal → Activity → Note
 *
 * Tests the primary CRM pipeline as a single connected journey.
 * Each step builds on the previous — if earlier steps fail, later ones
 * will too, which is intentional: this validates the real workflow.
 */
test.describe("Core User Flow", () => {
  test("full pipeline: company → contact → deal → activity → note", async ({
    crm,
  }) => {
    test.setTimeout(60_000);
    const companyName = uniqueName("E2E Flow Co");
    const contactFirst = uniqueName("E2EFlow");
    const contactLast = "Contact";
    const contactEmail = `${contactFirst.toLowerCase()}@test.com`;
    const dealTitle = uniqueName("E2E Flow Deal");
    const activityDesc = "Introductory call to discuss project scope";
    const noteTitle = uniqueName("E2E Flow Note");
    const noteContent = "Follow-up items from initial call";

    // ── Step 1: Create company ──
    await crm.goto("/companies/new");
    await crm.waitForContentLoad();

    await crm.page.locator("#name").fill(companyName);
    await crm.page.locator("#website").fill("https://e2e-flow.com");
    await crm.page.locator("#industry").fill("Technology");
    await crm.page.getByRole("button", { name: "Create Company" }).click();
    await crm.expectToast("Company created");

    // Lands on company detail
    await expect(crm.page).toHaveURL(/\/companies\/[a-f0-9-]+$/);
    await expect(crm.page.locator("h1")).toContainText(companyName);

    // ── Step 2: Add contact from company detail ──
    await crm.page.getByRole("button", { name: /Add contact/i }).click();
    await crm.page.locator("#firstName").fill(contactFirst);
    await crm.page.locator("#lastName").fill(contactLast);
    await crm.page.locator("#email").fill(contactEmail);
    await crm.page.getByRole("button", { name: "Add Contact" }).click();
    await crm.expectToast("Contact added");

    await expect(
      crm.page.getByText(`${contactFirst} ${contactLast}`),
    ).toBeVisible();

    // ── Step 3: Create deal for this company ──
    await crm.goto("/deals/new");
    await crm.waitForContentLoad();

    await crm.page.getByRole("textbox", { name: "Title" }).fill(dealTitle);

    // Select company (3rd combobox after Stage, Source)
    const companyCombobox = crm.page.getByRole("combobox").nth(2);
    await companyCombobox.click();
    await crm.page.getByRole("option").first().click();

    // Wait for contacts to load after company selection
    await crm.page.waitForTimeout(1000);

    // Select the contact we just created
    const contactCombobox = crm.page.getByRole("combobox").nth(3);
    if (await contactCombobox.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await contactCombobox.click();
      await crm.page.getByRole("option").first().click();
      await crm.page.keyboard.press("Escape");
    }

    await crm.page.waitForTimeout(300);
    await crm.page
      .getByRole("textbox", { name: "Estimated Value" })
      .fill("75000");

    await crm.page.getByRole("button", { name: "Create Deal" }).click();
    await crm.expectToast("Deal created");

    // Lands on deal detail
    await expect(crm.page).toHaveURL(/\/deals\/[a-f0-9-]+$/);
    await expect(crm.page.locator("h1")).toContainText(dealTitle);

    // Verify deal detail loaded with expected sections
    await expect(crm.page.getByText("Deal Details")).toBeVisible();

    // ── Step 4: Add activity on deal detail ──
    const activityTextarea = crm.page.getByPlaceholder(
      "Log a call, email, or meeting...",
    );
    await activityTextarea.fill(activityDesc);
    await crm.page.getByRole("button", { name: "Add", exact: true }).click();
    await crm.expectToast("Activity added");

    // Verify the activity appears in the timeline
    await expect(crm.page.getByText(activityDesc)).toBeVisible();

    // ── Step 5: Add note on deal detail ──
    await crm.page.getByPlaceholder("Title (optional)").fill(noteTitle);
    const editor = crm.page.locator(".tiptap[contenteditable='true']").first();
    await editor.click();
    await editor.pressSequentially(noteContent);

    await crm.page.getByRole("button", { name: "Add Note" }).click();
    await crm.expectToast("Note added");

    await expect(crm.page.getByText(noteTitle)).toBeVisible();
  });

  test("deal detail shows all expected sections", async ({ crm }) => {
    // Navigate to any deal
    await crm.goto("/deals");
    await crm.waitForContentLoad();
    await crm.page.locator("table tbody tr a[href^='/deals/']").first().click();
    await crm.page.waitForURL(/\/deals\/[a-f0-9-]+$/);
    await crm.waitForContentLoad();

    // All core sections should render
    await expect(crm.page.getByText("Deal Details")).toBeVisible();
    await expect(crm.page.getByText("Activity")).toBeVisible();
    await expect(crm.page.getByText("Notes", { exact: true })).toBeVisible();
    await expect(crm.page.getByText("AI Insights")).toBeVisible();
  });

  test("dashboard links to entity list pages", async ({ crm }) => {
    await crm.goto("/");
    await crm.waitForContentLoad();

    // Sidebar navigation should work
    await crm.page.getByRole("link", { name: "Deals" }).first().click();
    await expect(crm.page).toHaveURL("/deals");
    await expect(crm.page.locator("h1")).toContainText("Deals");

    await crm.page.getByRole("link", { name: "Companies" }).click();
    await expect(crm.page).toHaveURL("/companies");
    await expect(crm.page.locator("h1")).toContainText("Companies");

    await crm.page.getByRole("link", { name: "Contacts" }).click();
    await expect(crm.page).toHaveURL("/contacts");
    await expect(crm.page.locator("h1")).toContainText("Contacts");
  });
});
