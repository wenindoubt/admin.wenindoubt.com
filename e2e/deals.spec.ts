import { expect, test, uniqueName } from "./fixtures";

/** Helper to fill the deal form and submit */
async function createTestDeal(crm: {
  goto: (p: string) => Promise<void>;
  waitForContentLoad: () => Promise<void>;
  page: import("@playwright/test").Page;
  expectToast: (t: string) => Promise<void>;
}) {
  const title = uniqueName("E2E Deal");

  await crm.goto("/deals/new");
  await crm.waitForContentLoad();

  await crm.page.getByRole("textbox", { name: "Title" }).fill(title);

  // Select company (3rd combobox after Stage, Source)
  const companyCombobox = crm.page.getByRole("combobox").nth(2);
  await companyCombobox.click();
  await crm.page.getByRole("option").first().click();

  // Wait for contacts to load
  await crm.page.waitForTimeout(1000);

  // Select contact if enabled (4th combobox)
  const contactCombobox = crm.page.getByRole("combobox").nth(3);
  if (await contactCombobox.isEnabled({ timeout: 3000 }).catch(() => false)) {
    await contactCombobox.click();
    await crm.page.getByRole("option").first().click();
    // Close any stale popover
    await crm.page.keyboard.press("Escape");
  }

  // Small delay to let popover close
  await crm.page.waitForTimeout(300);

  // Fill estimated value
  await crm.page
    .getByRole("textbox", { name: "Estimated Value" })
    .fill("50000");

  // Submit
  await crm.page.getByRole("button", { name: "Create Deal" }).click();
  await crm.expectToast("Deal created");

  return title;
}

test.describe("Deals — List & Filters", () => {
  test("deals list page loads with data", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();

    await expect(crm.page.locator("h1")).toContainText("Deals");
    await expect(crm.page.locator("table tbody tr").first()).toBeVisible();
  });

  test("filter by stage", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();

    const stageTrigger = crm.page
      .getByRole("combobox")
      .filter({ hasText: /All Stages|New|Contacted/ })
      .first();
    await stageTrigger.click();
    await crm.page.getByRole("option", { name: "New" }).click();

    await expect(crm.page).toHaveURL(/stage=new/);
  });

  test("filter by source", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();

    const sourceTrigger = crm.page
      .getByRole("combobox")
      .filter({ hasText: /All Sources|Website|Referral/ })
      .first();
    await sourceTrigger.click();
    await crm.page.getByRole("option", { name: "Referral" }).click();

    await expect(crm.page).toHaveURL(/source=referral/);
  });

  test("search with debounce", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();

    await crm.search("Search deals...", "Acme");
    await expect(crm.page).toHaveURL(/search=Acme/);
  });

  test("clear filters resets page", async ({ crm }) => {
    await crm.goto("/deals?stage=new&search=test");
    await crm.waitForContentLoad();

    const clearBtn = crm.page.getByRole("button", { name: "Clear filters" });
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await expect(crm.page).not.toHaveURL(/stage=/);
      await expect(crm.page).not.toHaveURL(/search=/);
    }
  });

  test("sortable column headers update URL", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();

    const titleHeader = crm.page.locator("th").filter({ hasText: "Title" });
    await titleHeader.click();
    await expect(crm.page).toHaveURL(/sortBy=title/);
  });
});

test.describe("Deals — CRUD", () => {
  test("create deal with all fields", async ({ crm }) => {
    const title = await createTestDeal(crm);

    await expect(crm.page).toHaveURL(/\/deals\/[a-f0-9-]+$/);
    await expect(crm.page.locator("h1")).toContainText(title);
  });

  test("view deal detail — all sections render", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();

    // Click the name link in the first row's first cell
    await crm.page.locator("table tbody tr a[href^='/deals/']").first().click();
    await crm.page.waitForURL(/\/deals\/[a-f0-9-]+$/);
    await crm.waitForContentLoad();

    await expect(crm.page.getByText("Deal Details")).toBeVisible();
    await expect(crm.page.getByText("Activity")).toBeVisible();
  });

  test("edit deal title", async ({ crm }) => {
    // Create a deal first
    await createTestDeal(crm);

    // Wait for deal detail page to fully load
    await crm.page.waitForURL(/\/deals\/[a-f0-9-]+$/);
    await crm.waitForContentLoad();

    // Navigate to edit page directly
    const dealUrl = crm.page.url();
    await crm.goto(`${dealUrl.replace("http://localhost:3000", "")}/edit`);
    await crm.waitForContentLoad();

    // Wait for the form to be ready
    await expect(crm.page.locator("#title")).toBeVisible();
    const updated = uniqueName("E2E Updated");
    await crm.page.locator("#title").fill(updated);
    await crm.page.getByRole("button", { name: "Update Deal" }).click();
    await crm.expectToast("Deal updated");

    await expect(crm.page.locator("h1")).toContainText(updated);
  });

  test("delete deal via table menu", async ({ crm }) => {
    const title = await createTestDeal(crm);

    // Go to list and search for the deal
    await crm.goto("/deals");
    await crm.waitForContentLoad();
    await crm.search("Search deals...", title);

    // Accept the confirm dialog
    crm.page.on("dialog", (dialog) => dialog.accept());

    // Open row action menu
    const row = crm.page
      .locator("table tbody tr")
      .filter({ hasText: title })
      .first();
    await row.locator("button").last().click();
    await crm.page.getByRole("menuitem", { name: "Delete" }).click();

    await crm.expectToast("Deal deleted");
  });

  test("nurture stage shows follow-up date field", async ({ crm }) => {
    await crm.goto("/deals/new");
    await crm.waitForContentLoad();

    await expect(crm.page.locator("#followUpAt")).not.toBeVisible();

    // Stage is the first combobox
    const stageTrigger = crm.page.getByRole("combobox").first();
    await stageTrigger.click();
    await crm.page.getByRole("option", { name: "Nurture" }).click();

    await expect(crm.page.locator("#followUpAt")).toBeVisible();

    // Change back
    await crm.page.getByRole("combobox").first().click();
    await crm.page.getByRole("option", { name: "Qualifying" }).click();
    await expect(crm.page.locator("#followUpAt")).not.toBeVisible();
  });
});
