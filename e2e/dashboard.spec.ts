import { expect, test } from "@playwright/test";

test("can view dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("can view deals board", async ({ page }) => {
  await page.goto("/deals/board");
  await expect(page).toHaveURL("/deals/board");
});
