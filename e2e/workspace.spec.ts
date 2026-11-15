// Milestone 3, part 1: the exam workspace. At the laptop size the brief
// names (1366x768): the instructions slide starts Java (retrying a stalled
// start), the layout fits without scrolling, Run is an interactive console,
// Test grades and saves a checkpoint, read-only files are locked, and a
// refresh restores the code and the marks.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const EXAM = "/exams/cs180/samples";
const JVM_START_TIMEOUT = 4 * 60_000;
const TICKET = "cs180/samples/01-ticket-price";
const TICKET_SOLUTION = readFileSync("content/cs180/samples/01-ticket-price/solution/Main.java", "utf8");
const WORDS = "cs180/samples/04-word-count";
const WORDS_SOLUTION = readFileSync("content/cs180/samples/04-word-count/solution/Main.java", "utf8");
const WORDS_TIES_LAST = readFileSync("content/cs180/samples/04-word-count/broken/ties-last-wins/Main.java", "utf8");

test.use({ viewport: { width: 1366, height: 768 } });

async function javaReady(page: Page) {
  await expect(page.getByTestId("starting-java")).toHaveCount(0, { timeout: JVM_START_TIMEOUT });
  await expect(page.getByTestId("java-failed")).toHaveCount(0);
}

/** Replaces a file's text the way typing would, through its Monaco model. */
async function setFile(page: Page, path: string, text: string) {
  await page.waitForFunction((p) => {
    const monaco = (window as unknown as { sivakuMonaco?: { editor: { getModels(): { uri: { path: string } }[] } } }).sivakuMonaco;
    return monaco?.editor.getModels().some((m) => m.uri.path.endsWith(p));
  }, path);
  await page.evaluate(
    ([p, t]) => {
      const monaco = (window as unknown as { sivakuMonaco: { editor: { getModels(): { uri: { path: string }; setValue(v: string): void }[] } } }).sivakuMonaco;
      monaco.editor.getModels().find((m) => m.uri.path.endsWith(p))!.setValue(t);
    },
    [path, text] as const,
  );
}

async function fileText(page: Page, path: string) {
  return page.evaluate((p) => {
    const monaco = (window as unknown as { sivakuMonaco: { editor: { getModels(): { uri: { path: string }; getValue(): string }[] } } }).sivakuMonaco;
    return monaco.editor.getModels().find((m) => m.uri.path.endsWith(p))?.getValue();
  }, path);
}

test.beforeEach(async ({ page }) => {
  // Each test starts a fresh attempt.
  await page.goto("/exams");
  await page.evaluate(() => window.localStorage.clear());
});

test("the instructions slide shows the exam and starts Java", async ({ page }) => {
  await page.getByTestId("exam-cs180/samples").click();
  await expect(page.getByTestId("slide-title")).toHaveText("Exam instructions");
  await expect(page.getByTestId("exam-facts")).toContainText("60 minutes");
  await expect(page.getByTestId("exam-facts")).toContainText("4 questions");
  await expect(page.getByTestId("exam-facts")).toContainText("31 points");
  await expect(page.getByText("saves a checkpoint")).toBeVisible();
  // Java starts loading here, before any question is opened.
  await expect(page.getByTestId("starting-java")).toBeVisible();
  await expect(page.getByTestId("java-ready")).toBeVisible({ timeout: JVM_START_TIMEOUT });

  await page.getByTestId("start-exam").click();
  await expect(page.getByTestId("slide-title")).toHaveText("Q1: Ticket price");
  await expect(page.getByTestId("rail-1")).toHaveAttribute("aria-current", "step");
  // Whole-program questions start from an empty Main.java.
  await page.waitForFunction(() => (window as unknown as { sivakuMonaco?: unknown }).sivakuMonaco);
  expect(await fileText(page, `${TICKET}/Main.java`)).toBe("");
});

test("a question fits the screen with every part in view", async ({ page }) => {
  await page.goto(`${EXAM}#1`);
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 60_000 });
  for (const id of ["slide-title", "rail-0", "rail-4", "section-description", "question-description", "tab-Main.java", "file-path", "save-status", "indentation", "run", "test", "panel-console", "console-output"]) {
    await expect(page.getByTestId(id), id).toBeInViewport();
  }
  await expect(page.getByTestId("reference-sheet")).toBeAttached();
  await expect(page.getByTestId("section-feedback")).toBeAttached();
  await expect(page.getByTestId("file-path")).toHaveText("/home/Main.java");
  await expect(page.getByTestId("indentation")).toHaveText("Spaces: 4 (Auto)");
  await expect(page.getByText("Unofficial practice. Not affiliated with Purdue University or Ed.")).toBeInViewport();
  // Nothing scrolls the page itself; long text scrolls inside its pane.
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("Run is an interactive console", async ({ page }) => {
  await page.goto(`${EXAM}#1`);
  await setFile(page, `${TICKET}/Main.java`, TICKET_SOLUTION);
  await javaReady(page);
  await page.getByTestId("run").click();

  const console = page.getByTestId("console-output");
  await expect(console).toContainText("Enter your age:", { timeout: 60_000 });
  // The program is waiting: answer each prompt as it appears.
  await page.getByTestId("console-input").fill("20");
  await page.getByTestId("console-input").press("Enter");
  await expect(console).toContainText("Are you a student? (y/n)");
  await page.getByTestId("console-input").fill("y");
  await page.getByTestId("console-input").press("Enter");
  await expect(console).toContainText("Ticket price: $8.75");
  await expect(console).toContainText("[Program finished]");
  // One stream: what was typed sits inline between the program's lines.
  await expect(console).toContainText("Enter your age:\n20\nAre you a student? (y/n)\ny\nTicket price: $8.75");
  await expect(console.locator('[data-kind="in"]').first()).toHaveText("20\n");
  await expect(page.getByTestId("console-input")).toHaveCount(0);
});

test("Stop ends a program that is still running", async ({ page }) => {
  await page.goto(`${EXAM}#1`);
  await setFile(page, `${TICKET}/Main.java`, "public class Main {\n    public static void main(String[] args) {\n        while (true) { }\n    }\n}\n");
  await javaReady(page);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("stop")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("stop").click();
  await expect(page.getByTestId("console-output")).toContainText("[Stopped]");
  await expect(page.getByTestId("run")).toBeVisible();
});

test("Test grades, marks the question done, and a refresh restores everything", async ({ page }) => {
  await page.goto(`${EXAM}#1`);
  await setFile(page, `${TICKET}/Main.java`, TICKET_SOLUTION);
  await expect(page.getByTestId("save-status")).toHaveText("All changes saved");
  await javaReady(page);

  await page.getByTestId("test").click();
  await expect(page.getByTestId("testcases-header")).toHaveText("TESTCASES   7 / 7 passed, 6 points", { timeout: 120_000 });
  await expect(page.getByTestId("rail-1")).toHaveAttribute("data-state", "done");
  await expect(page.getByText("Checkpoint saved")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("slide-title")).toHaveText("Q1: Ticket price");
  await expect(page.getByTestId("rail-1")).toHaveAttribute("data-state", "done");
  await page.waitForFunction(() => (window as unknown as { sivakuMonaco?: unknown }).sivakuMonaco);
  expect(await fileText(page, `${TICKET}/Main.java`)).toBe(TICKET_SOLUTION);
  // The checkpoint's results are back in Feedback.
  await expect(page.getByTestId("section-feedback").getByTestId("testcases-header")).toHaveText("TESTCASES   7 / 7 passed, 6 points");
});

test("void main() with no class compiles, runs and grades one test per output line", async ({ page }) => {
  await page.goto(`${EXAM}#4`);
  await expect(page.getByTestId("slide-title")).toHaveText("Q4: Word count");
  expect(WORDS_SOLUTION).toMatch(/^void main\(\) \{/);
  await setFile(page, `${WORDS}/Main.java`, WORDS_SOLUTION);
  await javaReady(page);

  // Run: a compact source file runs as Main. The line is typed at once,
  // while the program is still compiling: it waits for the program to
  // ask, as in a terminal.
  await page.getByTestId("run").click();
  await page.getByTestId("console-input").fill("to be or not");
  await page.getByTestId("console-input").press("Enter");
  await expect(page.getByTestId("console-output")).toContainText("Enter a sentence:", { timeout: 60_000 });
  await expect(page.getByTestId("console-output")).toContainText("Words: 4\nLetters: 9\nLongest: not");

  // Test: three tests per input, sample tests worth points.
  await page.getByTestId("test").click();
  const feedback = page.getByTestId("section-feedback");
  await expect(feedback.getByTestId("testcases-header")).toHaveText("TESTCASES   12 / 12 passed, 12 points", { timeout: 120_000 });
  await expect(feedback.locator('[data-name="Sample run from the handout: the Words line"] [data-testid="testcase-points"]')).toHaveText("1/1");
  await expect(feedback.locator('[data-name="Case 3.2"]')).toHaveAttribute("data-passed", "true");

  // A broken version: the failed sample line explains itself; hidden ones do not.
  await setFile(page, `${WORDS}/Main.java`, WORDS_TIES_LAST);
  await page.getByTestId("test").click();
  await expect(feedback.getByTestId("testcases-header")).toHaveText("TESTCASES   10 / 12 passed, 10 points", { timeout: 120_000 });
  const longest = feedback.locator('[data-name="Sample run from the handout: the Longest line"]');
  await expect(longest).toHaveAttribute("data-passed", "false");
  await expect(longest.getByTestId("testcase-points")).toHaveText("0/1");
  await expect(feedback.getByTestId("sample-reason")).toHaveCount(0);
  await longest.getByTestId("testcase-toggle").click();
  await expect(longest.getByTestId("sample-reason")).toHaveText("Failed: line 4 ==> expected: <Longest: quick> but was: <Longest: brown>");
  const hiddenFailure = feedback.locator('[data-name="Case 2.3"]');
  await expect(hiddenFailure).toHaveAttribute("data-passed", "false");
  await expect(hiddenFailure.getByTestId("testcase-toggle")).toHaveCount(0);
});

test("read-only files are locked tabs", async ({ page }) => {
  await page.goto(`${EXAM}#3`);
  await expect(page.getByTestId("slide-title")).toHaveText("Q3: Playlist");
  await expect(page.getByTestId("tab-Playlist.java")).toHaveAttribute("data-locked", "false");
  for (const name of ["Main.java", "Song.java", "Track.java"]) {
    await expect(page.getByTestId(`tab-${name}`)).toHaveAttribute("data-locked", "true");
  }
  await page.getByTestId("tab-Track.java").click();
  await expect(page.getByTestId("file-path")).toHaveText("/home/Track.java");
  const path = "cs180/samples/03-playlist/Track.java";
  await page.waitForFunction((p) => {
    const monaco = (window as unknown as { sivakuMonaco?: { editor: { getModels(): { uri: { path: string } }[] } } }).sivakuMonaco;
    return monaco?.editor.getModels().some((m) => m.uri.path.endsWith(p));
  }, path);
  const before = await fileText(page, path);
  await page.locator(".monaco-editor").first().click();
  await page.keyboard.type("// edited");
  expect(await fileText(page, path)).toBe(before);
});

test("a stalled Java start is retried by itself", async ({ page }) => {
  // The first request for CheerpJ's loader never answers; the retry's does.
  let requests = 0;
  await page.context().route("https://cjrtnc.leaningtech.com/5.0/loader.js", async (route) => {
    requests++;
    if (requests === 1) return; // leave it hanging
    await route.continue();
  });
  // 8 s for the stalled first try; the retry gets twice that, room for a cold start.
  await page.goto(`${EXAM}?javaStartTimeoutMs=8000`);
  await expect(page.getByTestId("starting-java")).toHaveText("Starting Java… (trying again)", { timeout: 30_000 });
  await expect(page.getByTestId("java-ready")).toBeVisible({ timeout: JVM_START_TIMEOUT });
  expect(requests).toBe(2);
});
