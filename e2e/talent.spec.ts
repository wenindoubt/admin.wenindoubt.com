import { expect, test, uniqueName } from "./fixtures";

// ─── Types ────────────────────────────────────────────────────────────────────

// CRMHelpers is not exported from fixtures.ts; use any for helper function
// params so the file compiles without importing internals.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CRM = any;
type TalentHandle = { id: string; firstName: string; lastName: string };

// ─── UI helpers ───────────────────────────────────────────────────────────────

/**
 * Creates a new talent via the /talent/new form UI.
 * Returns the created talent's id and names so tests can refer to them.
 *
 * Cleanup: talent created here is left in the DB after each test.
 * uniqueName() ensures test runs don't collide with each other.
 */
async function createTestTalent(crm: CRM): Promise<TalentHandle> {
  const firstName = "TestTlnt";
  const lastName = uniqueName("E2E");

  await crm.goto("/talent/new");
  await crm.waitForContentLoad();

  // Fill required text fields
  await crm.page.locator("#firstName").fill(firstName);
  await crm.page.locator("#lastName").fill(lastName);

  // Tier select — first combobox in the form (no tier default, must be chosen)
  // Options render as "<TierBadge /> {label.slice(4)}" e.g. "A" + "Senior"
  await crm.page.getByRole("combobox").first().click();
  await crm.page
    .getByRole("option")
    .filter({ hasText: "Senior" }) // tier A
    .click();

  // Status defaults to "Active" — no change needed

  await crm.page.getByRole("button", { name: "Add Talent" }).click();
  await crm.expectToast("Talent added");

  // Action redirects to /talent/[id]
  await crm.page.waitForURL(/\/talent\/[a-f0-9-]+$/);
  const id = new URL(crm.page.url()).pathname.split("/").pop()!;

  return { id, firstName, lastName };
}

/**
 * Navigates to /deals, clicks the first seeded deal, and returns the deal path.
 * Requires at least one seeded deal (`mise run seed`).
 */
async function getFirstDealPath(crm: CRM): Promise<string> {
  await crm.goto("/deals");
  await crm.waitForContentLoad();

  const link = crm.page
    .locator("table tbody tr a[href^='/deals/']")
    .first();

  const href = await link.getAttribute("href");
  if (!href) throw new Error("No seeded deal found — run `mise run seed` first");
  return href;
}

// ─── Create talent ────────────────────────────────────────────────────────────

test.describe("Talent — Create", () => {
  test("create talent redirects to detail page with correct name, tier badge, and status", async ({
    crm,
  }) => {
    const { firstName, lastName } = await createTestTalent(crm);

    // Redirected to /talent/[id]
    await expect(crm.page).toHaveURL(/\/talent\/[a-f0-9-]+$/);

    // Name visible in the h1 heading
    await expect(crm.page.locator("h1")).toContainText(firstName);
    await expect(crm.page.locator("h1")).toContainText(lastName);

    // Tier badge "A" — TierBadge renders the tier letter in a font-mono span
    await expect(
      crm.page.locator("span.font-mono", { hasText: /^A$/ }).first(),
    ).toBeVisible();

    // Status badge "Active"
    await expect(crm.page.getByText("Active").first()).toBeVisible();
  });
});

// ─── Edit talent ──────────────────────────────────────────────────────────────

test.describe("Talent — Edit", () => {
  test("changing tier to S redirects to detail page showing updated tier badge", async ({
    crm,
  }) => {
    const { id } = await createTestTalent(crm);

    await crm.goto(`/talent/${id}/edit`);
    await crm.waitForContentLoad();

    // Tier select is the first combobox; current value is "A" (Senior)
    await crm.page.getByRole("combobox").first().click();
    await crm.page
      .getByRole("option")
      .filter({ hasText: "Principal" }) // tier S
      .click();

    await crm.page.getByRole("button", { name: "Update Talent" }).click();
    await crm.expectToast("Talent updated");

    // Redirected back to detail page
    await crm.page.waitForURL(/\/talent\/[a-f0-9-]+$/);
    await crm.waitForContentLoad();

    // Tier badge should now show "S"
    await expect(
      crm.page.locator("span.font-mono", { hasText: /^S$/ }).first(),
    ).toBeVisible();
  });
});

// ─── Assign talent to deal ────────────────────────────────────────────────────

test.describe("Talent — Assign to Deal", () => {
  test("assign talent via picker → talent appears in Assigned Talent card", async ({
    crm,
  }) => {
    const { firstName, lastName } = await createTestTalent(crm);
    const dealPath = await getFirstDealPath(crm);

    await crm.goto(dealPath);
    await crm.waitForContentLoad();

    // Open the assign dialog
    await crm.page.getByRole("button", { name: "Assign Talent" }).click();
    await expect(
      crm.page.getByRole("dialog", { name: "Assign Talent" }),
    ).toBeVisible();

    // Search by unique last name — filters the picker list
    await crm.page.getByPlaceholder("Search by name…").fill(lastName);
    await crm.page.waitForTimeout(300);

    // Click the talent button (renders "{firstName} {lastName}" as button text)
    await crm.page
      .getByRole("button", { name: `${firstName} ${lastName}` })
      .click();
    await crm.expectToast("Talent assigned");

    // Page refreshes after server action — talent should appear in the card
    await crm.waitForContentLoad();
    await expect(
      crm.page.getByRole("link", { name: `${firstName} ${lastName}` }),
    ).toBeVisible();
  });
});

// ─── Unassign talent from deal ────────────────────────────────────────────────

test.describe("Talent — Unassign from Deal", () => {
  test("unassign talent → disappears from Assigned Talent list", async ({
    crm,
  }) => {
    const { firstName, lastName } = await createTestTalent(crm);
    const dealPath = await getFirstDealPath(crm);

    // Setup: assign talent first via the picker
    await crm.goto(dealPath);
    await crm.waitForContentLoad();
    await crm.page.getByRole("button", { name: "Assign Talent" }).click();
    await crm.page.getByPlaceholder("Search by name…").fill(lastName);
    await crm.page.waitForTimeout(300);
    await crm.page
      .getByRole("button", { name: `${firstName} ${lastName}` })
      .click();
    await crm.expectToast("Talent assigned");
    await crm.waitForContentLoad();

    // Verify talent is now in the list
    const talentLink = crm.page.getByRole("link", {
      name: `${firstName} ${lastName}`,
    });
    await expect(talentLink).toBeVisible();

    // Unassign: find the "Unassign" button in the same flex row as the talent link.
    // DOM: div.flex > [TierBadge, Link(name), UnassignTalentButton(ml-auto)]
    await talentLink
      .locator("..")
      .getByRole("button", { name: "Unassign" })
      .click();
    await crm.expectToast("Unassigned");

    // Talent should no longer appear in the card
    await expect(talentLink).not.toBeVisible({ timeout: 8_000 });
  });
});

// ─── Filter by tier ───────────────────────────────────────────────────────────

test.describe("Talent — Filter by Tier", () => {
  test("selecting tier S updates URL; clearing filters removes tier param", async ({
    crm,
  }) => {
    await crm.goto("/talent");
    await crm.waitForContentLoad();

    // The Tier button is a DropdownMenuTrigger rendered as a plain <button>
    await crm.page.getByRole("button", { name: /^Tier/ }).first().click();

    // DropdownMenuCheckboxItem renders as role="menuitemcheckbox"
    // Item content: <TierBadge /> + <span>Tier S</span>
    await crm.page
      .getByRole("menuitemcheckbox", { name: /Tier S/ })
      .click();

    // URL should now contain tier=S
    await expect(crm.page).toHaveURL(/tier=S/);

    // Close the dropdown
    await crm.page.keyboard.press("Escape");

    // "Clear filters" button appears when any filter is active
    await crm.page.getByRole("button", { name: "Clear filters" }).click();

    // tier param should be gone
    await expect(crm.page).not.toHaveURL(/tier=/);
  });
});
