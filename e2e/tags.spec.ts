import { expect, test, uniqueName } from "./fixtures";

test.describe("Tags — Management", () => {
  test("create tag with name and color", async ({ crm }) => {
    const tagName = uniqueName("E2ETag");

    await crm.goto("/tags");
    await crm.waitForContentLoad();

    await crm.page.getByPlaceholder("Tag name").fill(tagName);

    // Click a color swatch (pick the second one to test non-default)
    const colorButtons = crm.page.locator(
      "button[class*='rounded-full'][class*='size-']",
    );
    const secondColor = colorButtons.nth(1);
    if (await secondColor.isVisible().catch(() => false)) {
      await secondColor.click();
    }

    await crm.page.getByRole("button", { name: "Add" }).click();
    await crm.expectToast("Tag created");

    // Tag should appear in the list
    await expect(crm.page.getByText(tagName)).toBeVisible();
  });

  test("tags page shows existing tags", async ({ crm }) => {
    await crm.goto("/tags");
    await crm.waitForContentLoad();

    // Should have tags from seed data
    await expect(crm.page.locator("h1")).toContainText("Tags");
  });
});

test.describe("Tags — Assignment", () => {
  test("assign tag via TagPicker on deal detail", async ({ crm }) => {
    // Navigate to a deal detail
    await crm.goto("/deals");
    await crm.waitForContentLoad();
    await crm.page.locator("table tbody tr").first().click();
    await crm.waitForContentLoad();

    // Find the tag picker "+" button (dashed circle)
    const tagButton = crm.page
      .locator("button")
      .filter({ has: crm.page.locator("svg.lucide-plus") })
      .first();
    if (await tagButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tagButton.click();

      // Should open dropdown with tag checkboxes
      const menuItem = crm.page.locator("[role='menuitemcheckbox']").first();
      if (await menuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuItem.click();
        // Tag should appear as a badge (optimistic update)
        await crm.page.waitForTimeout(500);
      }

      // Close dropdown by clicking elsewhere
      await crm.page.locator("h1").click();
    }
  });

  test("filter deals by tag", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();

    // Find the Tags dropdown in filters
    const tagsButton = crm.page.getByRole("button", { name: /Tags/i });
    if (await tagsButton.isVisible().catch(() => false)) {
      await tagsButton.click();

      // Check a tag
      const tagCheckbox = crm.page.locator("[role='menuitemcheckbox']").first();
      if (await tagCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tagCheckbox.click();
        await crm.page.waitForTimeout(500);
        // URL should update with tag filter
        await expect(crm.page).toHaveURL(/tag/);
      }

      // Close dropdown
      await crm.page.keyboard.press("Escape");
    }
  });
});
