import { existsSync } from "node:fs";
import path from "node:path";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { cleanupE2EData } from "./cleanup";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(__dirname, "../playwright/.clerk/user.json");

setup("clean stale E2E data", async () => {
  await cleanupE2EData();
});

setup("clerk setup", async () => {
  await clerkSetup();
});

setup("authenticate", async ({ page }) => {
  // Reuse existing session if available (avoids Clerk re-auth in local dev)
  if (existsSync(authFile)) return;

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_EMAIL!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.context().storageState({ path: authFile });
});
