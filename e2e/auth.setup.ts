// Signs in once as the test student and saves the session for the other tests.
import { test as setup } from "@playwright/test";
import { STUDENT_STATE, signInAs } from "./helpers";

setup("sign in as the test student", async ({ page }) => {
  await page.goto("/");
  await signInAs(page, "student");
  await page.context().storageState({ path: STUDENT_STATE });
});
