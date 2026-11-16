import { expect, type Page } from "@playwright/test";

/** The signed-in test student the tests start as (e2e/auth.setup.ts). */
export const STUDENT_STATE = "e2e/.auth/student.json";

/** Opens an exam with a fresh attempt and answers the timer question: no timer. */
export async function openExam(page: Page, path: string) {
  await page.goto(path);
  await page.getByTestId("timer-no").click();
}

/**
 * Signs in with the test login (lib/test-login.ts) as a made-up user, from
 * the landing page or wherever a signed-out visitor was sent to it. Ends on
 * the page the visitor was going to (the exam list by default).
 */
export async function signInAs(page: Page, name: string) {
  if (!new URL(page.url(), "http://x").pathname.match(/^\/$/)) await page.goto("/");
  const form = page.getByTestId("test-login");
  await form.getByLabel("Test user name").fill(name);
  await form.getByRole("button", { name: "Test sign-in" }).click();
  await expect(page).not.toHaveURL(/\/(\?.*)?$/);
}
