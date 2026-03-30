import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

/** Generate a unique name for test data isolation */
export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

class CRMHelpers {
  constructor(readonly page: Page) {}

  /** Assert a sonner toast appeared with matching text */
  async expectToast(text: string | RegExp) {
    const toast = this.page
      .locator("[data-sonner-toast]")
      .filter({ hasText: text });
    await expect(toast.first()).toBeVisible({ timeout: 10_000 });
  }

  /** Click a shadcn Select trigger and pick an option by visible text */
  async selectOption(trigger: Locator, optionText: string | RegExp) {
    await trigger.click();
    const option = this.page.getByRole("option", { name: optionText });
    await option.click();
  }

  /** Fill a debounced search input and wait for results to settle */
  async search(placeholder: string, query: string) {
    const input = this.page.getByPlaceholder(placeholder);
    await input.fill(query);
    // Wait for debounce (300ms) + network
    await this.page.waitForTimeout(400);
    await this.page.waitForLoadState("networkidle");
  }

  /** Wait for skeleton loading to finish */
  async waitForContentLoad() {
    // Wait for any visible skeletons to disappear
    await expect(this.page.locator('[class*="skeleton"]').first())
      .not.toBeVisible({ timeout: 15_000 })
      .catch(() => {
        // No skeletons found, page is already loaded
      });
  }

  /** Navigate and wait for page to be interactive */
  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
  }
}

export const test = base.extend<{ crm: CRMHelpers }>({
  crm: async ({ page }, use) => {
    await use(new CRMHelpers(page));
  },
});

export { expect };
