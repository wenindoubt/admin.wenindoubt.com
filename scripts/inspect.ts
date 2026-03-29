import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const url = process.argv[2];
if (!url) {
  console.error("Usage: npx playwright test scripts/inspect.ts <path>");
  process.exit(1);
}

const baseURL = "http://localhost:3000";
const storageState = path.resolve(__dirname, "../playwright/.clerk/user.json");
const outDir = path.resolve(__dirname, "../playwright/.inspect");

async function inspect() {
  if (!fs.existsSync(storageState)) {
    console.error(
      "No auth state found. Run `mise run test:e2e` first to authenticate.",
    );
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Collect failed network requests
  const failedRequests: string[] = [];
  page.on("requestfailed", (req) => {
    failedRequests.push(
      `${req.method()} ${req.url()} — ${req.failure()?.errorText}`,
    );
  });

  // Collect non-2xx responses
  const errorResponses: string[] = [];
  page.on("response", (res) => {
    if (res.status() >= 400) {
      errorResponses.push(
        `${res.status()} ${res.request().method()} ${res.url()}`,
      );
    }
  });

  const fullURL = url.startsWith("http") ? url : `${baseURL}${url}`;
  await page.goto(fullURL, { waitUntil: "networkidle" });

  // Screenshot
  const screenshotPath = path.join(outDir, "screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Accessibility snapshot (ARIA tree)
  const a11y = await page.locator(":root").ariaSnapshot();

  // Build report
  const report: string[] = [];
  report.push(`# Page Inspection: ${fullURL}`);
  report.push(`## URL: ${page.url()}`);
  report.push(`## Title: ${await page.title()}`);
  report.push(`## Screenshot: ${screenshotPath}`);

  if (consoleErrors.length > 0) {
    report.push("\n## Console Errors");
    for (const err of consoleErrors) report.push(`- ${err}`);
  } else {
    report.push("\n## Console Errors\nNone");
  }

  if (failedRequests.length > 0) {
    report.push("\n## Failed Requests");
    for (const req of failedRequests) report.push(`- ${req}`);
  }

  if (errorResponses.length > 0) {
    report.push("\n## Error Responses (4xx/5xx)");
    for (const res of errorResponses) report.push(`- ${res}`);
  }

  if (!failedRequests.length && !errorResponses.length) {
    report.push("\n## Network Errors\nNone");
  }

  report.push("\n## Accessibility Tree");
  report.push("```");
  report.push(a11y);
  report.push("```");

  const reportPath = path.join(outDir, "report.md");
  fs.writeFileSync(reportPath, report.join("\n"));

  console.log(fs.readFileSync(reportPath, "utf-8"));
  console.log(`\nScreenshot saved: ${screenshotPath}`);

  await browser.close();
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});
