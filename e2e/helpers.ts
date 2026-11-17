import { expect, type Page } from "@playwright/test";
import type { JavaBackend } from "../lib/java/backend";

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

export const JVM_START_TIMEOUT = 4 * 60_000;

/** The grading lab page, once its JVM is ready. */
export async function openLab(page: Page) {
  await page.goto("/lab/grade");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });
}

/** The page's JVM as a JavaBackend, for gradeQuestion and direct sandbox calls. */
export async function inBrowser(page: Page): Promise<JavaBackend> {
  await openLab(page);
  const paths = await page.evaluate(() => window.sivakuJava!.paths);
  return {
    paths,
    call: (method, args, options) =>
      page.evaluate(([m, a, t]) => window.sivakuJava!.call(m, a, { timeoutMs: t }), [method, args, options?.timeoutMs] as const),
  };
}
