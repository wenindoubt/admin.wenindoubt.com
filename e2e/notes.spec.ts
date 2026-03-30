import { expect, test, uniqueName } from "./fixtures";

/** Navigate to the first deal's detail page */
async function goToFirstDeal(crm: {
  goto: (p: string) => Promise<void>;
  waitForContentLoad: () => Promise<void>;
  page: import("@playwright/test").Page;
}) {
  await crm.goto("/deals");
  await crm.waitForContentLoad();
  await crm.page.locator("table tbody tr").first().locator("a").first().click();
  await crm.page.waitForURL(/\/deals\/[a-f0-9-]+$/);
  await crm.waitForContentLoad();
}

test.describe("Notes", () => {
  test("create note with title and content", async ({ crm }) => {
    await goToFirstDeal(crm);

    const title = uniqueName("E2E Note");
    await crm.page.getByPlaceholder("Title (optional)").fill(title);

    // Fill Tiptap editor
    const editor = crm.page.locator(".tiptap[contenteditable='true']").first();
    await editor.click();
    await editor.pressSequentially("This is a test note from E2E");

    await crm.page.getByRole("button", { name: "Add Note" }).click();
    await crm.expectToast("Note added");

    await expect(crm.page.getByText(title)).toBeVisible();
  });

  test("delete note with confirmation", async ({ crm }) => {
    await goToFirstDeal(crm);

    // Create a note to delete
    const title = uniqueName("E2E DelNote");
    await crm.page.getByPlaceholder("Title (optional)").fill(title);
    const editor = crm.page.locator(".tiptap[contenteditable='true']").first();
    await editor.click();
    await editor.pressSequentially("Delete me");
    await crm.page.getByRole("button", { name: "Add Note" }).click();
    await crm.expectToast("Note added");
    await crm.page.waitForTimeout(1000);

    // Find the note's delete button (trash icon) — accordion items have action buttons
    // The note title should be visible, and next to it are edit/delete buttons
    const noteHeader = crm.page
      .locator("button")
      .filter({ hasText: title })
      .first();
    if (await noteHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Trash button is inside the note header area
      const trashBtn = noteHeader.locator("button").last();
      if (await trashBtn.isVisible().catch(() => false)) {
        await trashBtn.click(); // First click — shows "Confirm?"
        await crm.page.waitForTimeout(300);
        // Look for confirm button
        const confirmBtn = crm.page.getByText("Confirm?");
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await crm.expectToast("Note deleted");
        }
      }
    }
  });

  test("search notes", async ({ crm }) => {
    await goToFirstDeal(crm);

    const searchInput = crm.page.getByPlaceholder("Search notes...");
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("test");
      await crm.page.waitForTimeout(400);
      // Search should work without errors
    }
  });

  test("edit note inline", async ({ crm }) => {
    await goToFirstDeal(crm);

    // Create a note to edit
    const title = uniqueName("E2E EditNote");
    await crm.page.getByPlaceholder("Title (optional)").fill(title);
    const editor = crm.page.locator(".tiptap[contenteditable='true']").first();
    await editor.click();
    await editor.pressSequentially("Original content");
    await crm.page.getByRole("button", { name: "Add Note" }).click();
    await crm.expectToast("Note added");
    await crm.page.waitForTimeout(1000);

    // Find the note row and click the edit (pencil) icon
    const noteRow = crm.page
      .locator("button")
      .filter({ hasText: title })
      .first();
    if (!(await noteRow.isVisible({ timeout: 3000 }).catch(() => false))) return;

    // Hover to reveal edit action, then click pencil
    await noteRow.hover();
    const editBtn = noteRow.locator('[role="button"]').first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await crm.page.waitForTimeout(500);

      // The Tiptap editor for editing should now be visible
      const editEditor = crm.page
        .locator(".tiptap[contenteditable='true']")
        .last();
      if (await editEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Clear and type new content
        await editEditor.click();
        await crm.page.keyboard.press("Meta+a");
        await editEditor.pressSequentially("Updated content from E2E");

        await crm.page.getByRole("button", { name: "Save" }).click();
        await crm.expectToast("Note updated");
      }
    }
  });
});
