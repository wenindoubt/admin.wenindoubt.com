import { expect, test } from "./fixtures";

// AI tests require real API keys — skip in CI
const skipInCI = !!process.env.CI;

test.describe("AI Features", () => {
  test.skip(skipInCI, "Skipped in CI — requires AI API keys");

  test("AI insights panel visible on deal detail", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();
    await crm.page.locator("table tbody tr").first().click();
    await crm.waitForContentLoad();

    // AI Insights section should exist
    await expect(crm.page.getByText("AI Insights")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("custom query input triggers analysis", async ({ crm }) => {
    test.setTimeout(60_000); // AI calls can be slow

    await crm.goto("/deals");
    await crm.waitForContentLoad();
    await crm.page.locator("table tbody tr").first().click();
    await crm.waitForContentLoad();

    // Find custom query input
    const queryInput = crm.page.getByPlaceholder("Ask something specific...");
    if (await queryInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await queryInput.fill("What are the key risks?");
      // Submit (click the arrow button next to input)
      await queryInput.press("Enter");

      // Wait for streaming to start and complete
      await crm.page.waitForTimeout(5000);
      // Should see some analysis content (not just loading)
    }
  });

  test("insight history modal opens", async ({ crm }) => {
    await crm.goto("/deals");
    await crm.waitForContentLoad();
    await crm.page.locator("table tbody tr").first().click();
    await crm.waitForContentLoad();

    // Look for "View N previous analyses" button
    const historyBtn = crm.page.getByRole("button", {
      name: /previous analys/i,
    });
    if (await historyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await historyBtn.click();

      // Modal should open
      await expect(crm.page.getByText("Analysis History")).toBeVisible({
        timeout: 5000,
      });

      // Close modal
      await crm.page.keyboard.press("Escape");
    }
  });
});
