import { expect, test } from "./fixtures";

test.describe("Dashboard", () => {
  test("KPI cards visible with data", async ({ crm }) => {
    await crm.goto("/");
    await crm.waitForContentLoad();

    await expect(crm.page.getByText("Total Deals")).toBeVisible();
    await expect(crm.page.getByText("Active Pipeline")).toBeVisible();
    await expect(crm.page.getByText("Total Pipeline")).toBeVisible();
    await expect(crm.page.getByText("Won Deals")).toBeVisible();
  });

  test("pipeline by stage section renders", async ({ crm }) => {
    await crm.goto("/");
    await crm.waitForContentLoad();

    await expect(crm.page.getByText("Pipeline by Stage")).toBeVisible();
  });

  test("deals by source section renders", async ({ crm }) => {
    await crm.goto("/");
    await crm.waitForContentLoad();

    await expect(crm.page.getByText("Deals by Source")).toBeVisible();
  });

  test("recent activity timeline loads", async ({ crm }) => {
    await crm.goto("/");
    await crm.waitForContentLoad();

    await expect(crm.page.getByText("Recent Activity")).toBeVisible();
  });
});
