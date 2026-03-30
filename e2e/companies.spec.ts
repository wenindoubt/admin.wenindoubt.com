import { expect, test, uniqueName } from "./fixtures";

test.describe("Companies — List & Filters", () => {
  test("companies list loads with data", async ({ crm }) => {
    await crm.goto("/companies");
    await crm.waitForContentLoad();

    await expect(crm.page.locator("h1")).toContainText("Companies");
    await expect(crm.page.locator("table tbody tr").first()).toBeVisible();
  });

  test("search filter works", async ({ crm }) => {
    await crm.goto("/companies");
    await crm.waitForContentLoad();

    await crm.search("Search companies...", "Acme");
    await expect(crm.page).toHaveURL(/search=Acme/);
  });

  test("size filter works", async ({ crm }) => {
    await crm.goto("/companies");
    await crm.waitForContentLoad();

    const sizeTrigger = crm.page
      .getByRole("combobox")
      .filter({ hasText: /All Sizes/ })
      .first();
    if (await sizeTrigger.isVisible().catch(() => false)) {
      await sizeTrigger.click();
      await crm.page.getByRole("option", { name: /11-50/ }).click();
      await expect(crm.page).toHaveURL(/size=/);
    }
  });
});

test.describe("Companies — CRUD", () => {
  test("create company", async ({ crm }) => {
    const name = uniqueName("E2E Company");

    await crm.goto("/companies/new");
    await crm.waitForContentLoad();

    await crm.page.locator("#name").fill(name);
    await crm.page.locator("#website").fill("https://e2e-test.com");
    await crm.page.locator("#industry").fill("Technology");

    const sizeTrigger = crm.page.getByRole("combobox").first();
    if (await sizeTrigger.isVisible().catch(() => false)) {
      await sizeTrigger.click();
      await crm.page.getByRole("option", { name: "11-50" }).click();
    }

    await crm.page.getByRole("button", { name: "Create Company" }).click();
    await crm.expectToast("Company created");

    await expect(crm.page).toHaveURL(/\/companies\/[a-f0-9-]+$/);
    await expect(crm.page.locator("h1")).toContainText(name);
  });

  test("view company detail — sections render", async ({ crm }) => {
    await crm.goto("/companies");
    await crm.waitForContentLoad();

    // Get the href from the first company link and navigate directly
    const href = await crm.page
      .locator("table tbody tr a[href^='/companies/']")
      .first()
      .getAttribute("href");
    await crm.goto(href!);
    await crm.waitForContentLoad();

    // Scope to main content; use .first() to avoid strict mode with duplicate text
    const main = crm.page.locator("main");
    await expect(main.getByText("Contacts").first()).toBeVisible();
    await expect(main.getByText("Deals").first()).toBeVisible();
  });

  test("edit company name", async ({ crm }) => {
    const name = uniqueName("E2E CoEdit");

    await crm.goto("/companies/new");
    await crm.page.locator("#name").fill(name);
    await crm.page.getByRole("button", { name: "Create Company" }).click();
    await crm.expectToast("Company created");

    // Edit button on company detail
    await crm.page.getByRole("button", { name: "Edit" }).click();
    await crm.waitForContentLoad();

    const updated = uniqueName("E2E CoUpdated");
    await crm.page.locator("#name").fill(updated);
    await crm.page.getByRole("button", { name: "Update Company" }).click();
    await crm.expectToast("Company updated");

    await expect(crm.page.locator("h1")).toContainText(updated);
  });

  test("inline add contact from company detail", async ({ crm }) => {
    // Navigate to company detail via direct URL
    await crm.goto("/companies");
    await crm.waitForContentLoad();
    const href = await crm.page
      .locator("table tbody tr a[href^='/companies/']")
      .first()
      .getAttribute("href");
    await crm.goto(href!);
    await crm.waitForContentLoad();

    // Click "Add contact"
    await crm.page.getByRole("button", { name: /Add contact/i }).click();

    // Fill inline contact form
    const firstName = uniqueName("E2E");
    await crm.page.locator("#firstName").fill(firstName);
    await crm.page.locator("#lastName").fill("TestContact");
    await crm.page.locator("#email").fill(`${firstName}@test.com`);

    // Submit
    await crm.page.getByRole("button", { name: "Add Contact" }).click();
    await crm.expectToast("Contact added");

    await expect(crm.page.getByText(`${firstName} TestContact`)).toBeVisible();
  });
});
