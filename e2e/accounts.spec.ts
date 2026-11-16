// Milestone 4: accounts. Sign-in is required; Test and Submit save to the
// account; My attempts shows the scores, each question's cases and the last
// submitted code; and the check: two accounts cannot see each other's data.
// (Signing in uses the test login, since a test cannot sign in with Google;
// lib/db/attempts.ts is checked directly by npm run test:accounts.)
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs } from "./helpers";

const EXAM = "/exams/cs180/samples";
const TICKET = "cs180/samples/01-ticket-price";
const TICKET_SOLUTION = readFileSync("content/cs180/samples/01-ticket-price/solution/Main.java", "utf8");
const GRADING_TIMEOUT = 4 * 60_000;
// Fresh names each run, as the test database lives as long as its server.
const RUN = Date.now().toString(36);

// These tests start signed out.
test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1366, height: 768 } });

type Models = { editor: { getModels(): { uri: { path: string }; setValue(v: string): void }[] } };

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

const attemptKeys = (page: Page) =>
  page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith("sivaku:attempt:")));

test("signed-out visitors see only the landing page and the privacy page", async ({ page }) => {
  for (const path of ["/exams", EXAM, `${EXAM}/results`, "/attempts", "/attempts/00000000-0000-4000-8000-000000000000", "/lab"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/\?callbackUrl=/);
    await expect(page.getByTestId("sign-in-google")).toBeVisible();
  }
  await page.goto("/privacy");
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByText("only the last code you sent with Test or Submit")).toBeVisible();

  // After signing in, the visitor lands where they were going.
  await page.goto("/attempts");
  await signInAs(page, `visitor-${RUN}`);
  await expect(page).toHaveURL(/\/attempts$/);
  await expect(page.getByTestId("no-attempts")).toBeVisible();
});

test("two accounts cannot see each other's attempts or code", async ({ browser }) => {
  test.setTimeout(GRADING_TIMEOUT + 3 * 60_000);
  const alice = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();

  // Alice: Test Q1 (a checkpoint saved to her account), then Submit.
  await alice.goto(EXAM);
  await signInAs(alice, `alice-${RUN}`);
  await expect(alice).toHaveURL(new RegExp(`${EXAM}$`));
  await alice.getByTestId("timer-no").click();
  await alice.getByTestId("rail-1").click();
  await setFile(alice, `${TICKET}/Main.java`, TICKET_SOLUTION);
  await alice.getByTestId("test").click();
  await expect(alice.getByTestId("checkpoint-status")).toContainText("Saved to your account", { timeout: 3 * 60_000 });

  // The attempt is in My attempts, not yet submitted, with Q1's checkpoint.
  await alice.goto("/attempts");
  await expect(alice.getByTestId("attempt")).toHaveCount(1);
  await expect(alice.getByTestId("attempt")).toContainText("not submitted");
  await alice.goto(`${EXAM}#1`);
  await alice.getByTestId("submit").click();
  await alice.getByTestId("submit-confirm-yes").click();
  await alice.waitForURL(`**${EXAM}/results`, { timeout: GRADING_TIMEOUT });
  await expect(alice.getByTestId("results-saved")).toContainText("Saved to My attempts");

  // My attempts: the score, each question's points and cases, and the last code.
  await alice.getByRole("link", { name: "My attempts" }).click();
  await expect(alice.getByTestId("attempt")).toHaveCount(1);
  await expect(alice.getByTestId("attempt-score")).toHaveText("8 / 31");
  await alice.getByTestId("attempt").click();
  await expect(alice).toHaveURL(/\/attempts\/[0-9a-f-]{36}$/);
  const aliceAttemptUrl = alice.url();
  await expect(alice.getByTestId("attempt-total")).toHaveText("8 / 31 points");
  const q1 = alice.getByTestId("attempt-q1");
  await expect(q1.getByTestId("question-points")).toHaveText("6 / 6");
  await q1.getByRole("button", { name: /Q1: Ticket price/ }).click();
  await expect(q1.getByTestId("testcases-header")).toContainText("passed, 6 points");
  await expect(q1.getByTestId("code-file")).toHaveText(TICKET_SOLUTION);
  await expect(q1.getByTestId("last-code")).toContainText("From this attempt");

  // Bob, signed in elsewhere: none of it, not even with the address of Alice's attempt.
  const bob = await (await browser.newContext()).newPage();
  await bob.goto("/attempts");
  await signInAs(bob, `bob-${RUN}`);
  await expect(bob.getByTestId("no-attempts")).toBeVisible();
  await bob.goto(aliceAttemptUrl);
  await expect(bob.getByText("This page could not be found")).toBeVisible();
  await expect(bob.getByTestId("attempt-total")).toHaveCount(0);
  await expect(bob.getByText(TICKET_SOLUTION.split("\n")[0])).toHaveCount(0);

  // On Alice's own computer: signing out clears her attempt from the browser,
  // and Bob signing in there starts afresh.
  expect(await attemptKeys(alice)).toHaveLength(1);
  await alice.goto("/exams");
  await alice.getByTestId("sign-out").click();
  await expect(alice.getByTestId("sign-in-google")).toBeVisible();
  expect(await attemptKeys(alice)).toHaveLength(0);
  await alice.goto(EXAM);
  await signInAs(alice, `bob-${RUN}`);
  await expect(alice.getByTestId("timer-prompt")).toBeVisible();
  await alice.goto("/attempts");
  await expect(alice.getByTestId("no-attempts")).toBeVisible();
  await alice.goto(aliceAttemptUrl);
  await expect(alice.getByText("This page could not be found")).toBeVisible();
});

test("deleting an account removes its attempts", async ({ page }) => {
  const name = `carol-${RUN}`;
  await page.goto(EXAM);
  await signInAs(page, name);
  await page.getByTestId("timer-yes").click();
  // Answering the timer question starts the attempt in the account.
  await expect(async () => {
    await page.goto("/attempts");
    await expect(page.getByTestId("attempt")).toHaveCount(1, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByTestId("attempt")).toContainText("timed");

  await page.goto("/privacy");
  await page.getByTestId("delete-account").click();
  await page.getByTestId("delete-confirm-yes").click();
  await expect(page.getByTestId("account-deleted")).toBeVisible();
  expect(await attemptKeys(page)).toHaveLength(0);

  // Signing in again with the same account starts with nothing.
  await page.goto("/attempts");
  await signInAs(page, name);
  await expect(page.getByTestId("no-attempts")).toBeVisible();
});
