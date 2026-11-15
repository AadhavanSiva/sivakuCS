// Milestone 3, part 3: an attempt from start to results. The timer
// question, a countdown that survives a refresh, the lock and automatic
// submission at zero, Submit with a confirmation, the results page, and
// the submitted code read-only afterwards. At 1366x768, as the brief asks.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const EXAM_ID = "cs180/samples";
const EXAM = `/exams/${EXAM_ID}`;
const STORAGE_KEY = `sivaku:attempt:v1:${EXAM_ID}`;
const TICKET = "cs180/samples/01-ticket-price";
const TICKET_SOLUTION = readFileSync("content/cs180/samples/01-ticket-price/solution/Main.java", "utf8");
const GRADING_TIMEOUT = 4 * 60_000;

test.use({ viewport: { width: 1366, height: 768 } });

type Model = { uri: { path: string }; getValue(): string; setValue(v: string): void };
type Models = { editor: { getModels(): Model[]; getEditors(): { getModel(): Model | null }[] } };

async function setFile(page: Page, path: string, text: string) {
  await page.waitForFunction((p) => {
    const monaco = (window as unknown as { sivakuMonaco?: Models }).sivakuMonaco;
    return monaco?.editor.getModels().some((m) => m.uri.path.endsWith(p));
  }, path);
  await page.evaluate(
    ([p, t]) => {
      const monaco = (window as unknown as { sivakuMonaco: Models }).sivakuMonaco;
      monaco.editor.getModels().find((m) => m.uri.path.endsWith(p))!.setValue(t);
    },
    [path, text] as const,
  );
  await expect(page.getByTestId("save-status")).toHaveText("All changes saved");
}

/**
 * The text of the file the editor is showing. (Earlier attempts' buffers
 * stay in memory under other paths ending the same way, so this asks the
 * editor rather than searching every buffer.)
 */
async function fileText(page: Page, path: string) {
  await page.waitForFunction((p) => {
    const monaco = (window as unknown as { sivakuMonaco?: Models }).sivakuMonaco;
    return monaco?.editor.getEditors()[0]?.getModel()?.uri.path.endsWith(p);
  }, path);
  return page.evaluate(() => {
    const monaco = (window as unknown as { sivakuMonaco: Models }).sivakuMonaco;
    return monaco.editor.getEditors()[0].getModel()!.getValue();
  });
}

const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "null"), STORAGE_KEY);

test.beforeEach(async ({ page }) => {
  await page.goto("/exams");
  await page.evaluate(() => window.localStorage.clear());
});

test("the exam opens with the timer question; untimed shows no clock", async ({ page }) => {
  await page.goto(EXAM);
  const prompt = page.getByTestId("timer-prompt");
  await expect(prompt).toContainText("Do you want a 60-minute timer?");
  // The question must be answered: Escape does not dismiss it.
  await page.keyboard.press("Escape");
  await expect(prompt).toBeVisible();

  await page.getByTestId("timer-no").click();
  await expect(prompt).toHaveCount(0);
  await expect(page.getByTestId("countdown")).toHaveCount(0);
  await expect(page.getByTestId("submit")).toBeEnabled();
  await page.reload();
  await expect(page.getByTestId("timer-prompt")).toHaveCount(0);
  await expect(page.getByTestId("countdown")).toHaveCount(0);
});

test("a timed attempt counts down, and a refresh keeps the time left", async ({ page }) => {
  await page.goto(EXAM);
  await page.getByTestId("timer-yes").click();
  const countdown = page.getByTestId("countdown");
  await expect(countdown).toBeVisible();
  await expect(countdown).toHaveText(/^⏱ (60:00|59:5\d)$/);
  const { timer } = await stored(page);
  expect(timer.deadline - timer.startedAt).toBe(60 * 60_000);

  await page.waitForTimeout(2_500);
  const before = Number(await countdown.getAttribute("data-remaining-ms"));
  await page.reload();
  await expect(page.getByTestId("timer-prompt")).toHaveCount(0);
  const after = Number(await page.getByTestId("countdown").getAttribute("data-remaining-ms"));
  // Not restarted: still counting down to the same deadline.
  expect(after).toBeLessThanOrEqual(before);
  expect(after).toBeLessThan(60 * 60_000 - 2_000);
  expect((await stored(page)).timer.deadline).toBe(timer.deadline);
});

test("at zero the code locks and the exam is submitted automatically", async ({ page }) => {
  test.setTimeout(GRADING_TIMEOUT + 60_000);
  await page.goto(`${EXAM}#1`);
  await page.getByTestId("timer-yes").click();
  await setFile(page, `${TICKET}/Main.java`, TICKET_SOLUTION);

  // Bring the deadline forward to a few seconds from now, as if the hour had
  // passed. Done away from the exam page, which saves its state as it is left.
  await page.goto("/exams");
  await page.evaluate((key) => {
    const attempt = JSON.parse(window.localStorage.getItem(key)!);
    attempt.timer.deadline = Date.now() + 4_000;
    window.localStorage.setItem(key, JSON.stringify(attempt));
  }, STORAGE_KEY);
  await page.goto(`${EXAM}#1`);
  await expect(page.getByTestId("countdown")).toBeVisible();

  await expect(page.getByTestId("lock-reason")).toContainText("Time is up", { timeout: 15_000 });
  await expect(page.getByTestId("submitting")).toContainText("Time is up");
  await page.waitForURL(`**${EXAM}/results`, { timeout: GRADING_TIMEOUT });
  await expect(page.getByTestId("results-when")).toContainText("submitted automatically when time ran out");
  await expect(page.getByTestId("result-q1").getByTestId("question-points")).toHaveText("6 / 6");
});

test("Submit asks first, then shows the results; the submitted code stays read-only", async ({ page }) => {
  test.setTimeout(GRADING_TIMEOUT + 2 * 60_000);
  await page.goto(`${EXAM}#1`);
  await page.getByTestId("timer-no").click();
  await setFile(page, `${TICKET}/Main.java`, TICKET_SOLUTION);

  // The confirmation can be backed out of.
  await page.getByTestId("submit").click();
  await expect(page.getByTestId("submit-confirm")).toContainText("This ends the attempt");
  await page.getByTestId("submit-cancel").click();
  await expect(page.getByTestId("submit-confirm")).toHaveCount(0);
  expect((await stored(page)).submission).toBeUndefined();

  await page.getByTestId("submit").click();
  await page.getByTestId("submit-confirm-yes").click();
  await expect(page.getByTestId("submitting-progress")).toContainText("Grading question");
  await page.waitForURL(`**${EXAM}/results`, { timeout: GRADING_TIMEOUT });

  // The total is out of the exam's points; Q1 solved, Q3's stubs pass its two empty-array cases.
  await expect(page.getByTestId("results-total")).toHaveText("8 / 31 points");
  await expect(page.getByTestId("results-when")).toContainText("untimed");
  const points = async (n: number) => page.getByTestId(`result-q${n}`).getByTestId("question-points").textContent();
  expect([await points(1), await points(2), await points(3), await points(4)]).toEqual(["6 / 6", "0 / 7", "2 / 6", "0 / 12"]);

  // Each question opens to its cases, laid out like the Feedback panel.
  await page.getByTestId("result-q3").getByRole("button", { name: /Q3: Playlist/ }).click();
  const q3 = page.getByTestId("result-q3");
  await expect(q3.getByTestId("testcases-header")).toHaveText("TESTCASES   2 / 7 passed, 2 points");
  await expect(q3.locator('[data-testid="testcase"][data-passed="true"]')).toHaveCount(2);
  await q3.getByTestId("testcase-toggle").click();
  await expect(q3.getByTestId("sample-reason")).toContainText("expected: <345> but was: <0>");
  // Q2 was left empty: it compiles, but there is no main to run.
  await page.getByTestId("result-q2").getByRole("button", { name: /Q2: Lap times/ }).click();
  await expect(page.getByTestId("result-q2").getByTestId("testcases-header")).toHaveText("TESTCASES   0 / 8 passed, 0 points");

  // Reopen the exam: the submitted code, read-only, with no way to run, test or resubmit.
  await page.getByTestId("review-code").click();
  await expect(page.getByTestId("slide-title")).toHaveText("Q1: Ticket price");
  await expect(page.getByTestId("timer-prompt")).toHaveCount(0);
  await expect(page.getByTestId("lock-reason")).toHaveText("🔒 Submitted: read-only");
  await expect(page.getByTestId("submitted-badge")).toBeVisible();
  await expect(page.getByTestId("submit")).toHaveCount(0);
  await expect(page.getByTestId("run")).toBeDisabled();
  await expect(page.getByTestId("test")).toBeDisabled();
  expect(await fileText(page, `${TICKET}/Main.java`)).toBe(TICKET_SOLUTION);
  await page.locator(".monaco-editor").first().click();
  await page.keyboard.type("// change");
  expect(await fileText(page, `${TICKET}/Main.java`)).toBe(TICKET_SOLUTION);

  // A new attempt starts over: the timer question again, and empty files.
  await page.getByTestId("view-results").click();
  await page.getByTestId("results-new-attempt").click();
  await page.getByTestId("restart-confirm-yes").click();
  await expect(page.getByTestId("timer-prompt")).toBeVisible();
  await page.getByTestId("timer-no").click();
  await page.getByTestId("rail-1").click();
  expect(await fileText(page, `${TICKET}/Main.java`)).toBe("");
  await expect(page.getByTestId("lock-reason")).toHaveCount(0);
});
