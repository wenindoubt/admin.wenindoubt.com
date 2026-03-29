import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import path from "path";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(__dirname, "../playwright/.clerk/user.json");

setup("clerk setup", async () => {
	await clerkSetup();
});

setup("authenticate", async ({ page }) => {
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
