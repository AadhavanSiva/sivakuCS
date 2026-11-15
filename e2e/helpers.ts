import type { Page } from "@playwright/test";

/** Opens an exam with a fresh attempt and answers the timer question: no timer. */
export async function openExam(page: Page, path: string) {
  await page.goto(path);
  await page.getByTestId("timer-no").click();
}
