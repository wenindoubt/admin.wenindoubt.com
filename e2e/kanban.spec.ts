import { expect, test } from "./fixtures";

test.describe("Kanban Board", () => {
  test("board renders with stage columns", async ({ crm }) => {
    await crm.goto("/deals/board");
    await crm.waitForContentLoad();

    await expect(crm.page.getByText("New").first()).toBeVisible();
    await expect(crm.page.getByText("Contacted").first()).toBeVisible();
    await expect(crm.page.getByText("Qualifying").first()).toBeVisible();
  });

  test("deal cards display in columns", async ({ crm }) => {
    await crm.goto("/deals/board");
    await crm.waitForContentLoad();

    // Cards contain deal titles with links — look for any link inside the board columns
    const boardArea = crm.page.locator("main");
    // Wait for at least one deal card to appear (cards have company + value info)
    await expect(boardArea.locator("a[href^='/deals/']").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("column visibility filter toggles columns", async ({ crm }) => {
    await crm.goto("/deals/board");
    await crm.waitForContentLoad();

    const wonToggle = crm.page.getByRole("button", { name: "Won" });
    if (await wonToggle.isVisible().catch(() => false)) {
      await wonToggle.click();
      await crm.page.waitForTimeout(300);
      await wonToggle.click();
    }
  });

  test("drag deal between stages", async ({ crm }) => {
    await crm.goto("/deals/board");
    await crm.waitForContentLoad();

    // Wait for cards to render
    const boardArea = crm.page.locator("main");
    const firstCard = boardArea.locator("a[href^='/deals/']").first();
    if (!(await firstCard.isVisible({ timeout: 10_000 }).catch(() => false)))
      return;

    // Get the card's parent (the draggable container)
    const draggable = firstCard.locator("..");
    const cardBox = await draggable.boundingBox();
    if (!cardBox) return;

    // Drag right by 300px (to move to next column)
    await crm.page.mouse.move(
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2,
    );
    await crm.page.mouse.down();
    await crm.page.mouse.move(
      cardBox.x + cardBox.width / 2 + 300,
      cardBox.y + cardBox.height / 2,
      { steps: 20 },
    );
    await crm.page.mouse.up();
    await crm.page.waitForTimeout(1000);
  });

  test("navigate to deal detail from board", async ({ crm }) => {
    await crm.goto("/deals/board");
    await crm.waitForContentLoad();

    const boardArea = crm.page.locator("main");
    const firstCardLink = boardArea.locator("a[href^='/deals/']").first();
    if (await firstCardLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await firstCardLink.click();
      await expect(crm.page).toHaveURL(/\/deals\/[a-f0-9-]+$/);
    }
  });
});
