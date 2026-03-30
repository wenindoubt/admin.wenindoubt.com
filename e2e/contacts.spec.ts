import { expect, test, uniqueName } from "./fixtures";

test.describe("Contacts — List", () => {
  test("contacts list loads with data", async ({ crm }) => {
    await crm.goto("/contacts");
    await crm.waitForContentLoad();

    await expect(crm.page.locator("h1")).toContainText("Contacts");
    await expect(crm.page.locator("table tbody tr").first()).toBeVisible();
  });

  test("search filter works", async ({ crm }) => {
    await crm.goto("/contacts");
    await crm.waitForContentLoad();

    await crm.search("Search contacts...", "Sarah");
    await expect(crm.page).toHaveURL(/search=Sarah/);
  });
});

test.describe("Contacts — CRUD", () => {
  test("create standalone contact", async ({ crm }) => {
    const firstName = uniqueName("E2E");

    await crm.goto("/contacts/new");
    await crm.waitForContentLoad();

    // Select company (first combobox on the page)
    const companyCombobox = crm.page.getByRole("combobox").first();
    await companyCombobox.click();
    await crm.page.getByRole("option").first().click();

    await crm.page.locator("#firstName").fill(firstName);
    await crm.page.locator("#lastName").fill("E2ELast");
    await crm.page.locator("#email").fill(`${firstName}@test.com`);

    await crm.page.getByRole("button", { name: "Create Contact" }).click();
    await crm.expectToast("Contact added");

    // Standalone form redirects to /contacts list
    await expect(crm.page).toHaveURL("/contacts");
  });

  test("view contact detail", async ({ crm }) => {
    await crm.goto("/contacts");
    await crm.waitForContentLoad();

    // Click the name link in the first row
    await crm.page
      .locator("table tbody tr a[href^='/contacts/']")
      .first()
      .click();
    await crm.page.waitForURL(/\/contacts\/[a-f0-9-]+$/);
    await crm.waitForContentLoad();

    await expect(crm.page.locator("h1")).toBeVisible();
  });

  test("edit contact", async ({ crm }) => {
    // Go to contact detail via link in the table
    await crm.goto("/contacts");
    await crm.waitForContentLoad();
    await crm.page
      .locator("table tbody tr a[href^='/contacts/']")
      .first()
      .click();
    await crm.page.waitForURL(/\/contacts\/[a-f0-9-]+$/);
    await crm.waitForContentLoad();

    // Get the contact's URL and navigate to edit page directly
    const url = crm.page.url();
    await crm.goto(`${url.replace("http://localhost:3000", "")}/edit`);
    await crm.waitForContentLoad();

    await crm.page.locator("#jobTitle").fill("Updated E2E Title");
    await crm.page.getByRole("button", { name: "Update Contact" }).click();
    await crm.expectToast("Contact updated");
  });
});
