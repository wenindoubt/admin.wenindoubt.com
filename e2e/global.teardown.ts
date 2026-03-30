import { test as teardown } from "@playwright/test";
import { cleanupE2EData } from "./cleanup";

teardown("clean up E2E test data", async () => {
  await cleanupE2EData();
});
