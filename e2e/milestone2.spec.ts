// Milestone 2: grading in the browser (CheerpJ) agrees with `npm run
// verify` (local JDK) on every sample question, for the starter, the
// reference solution and every broken variant; and the Test results read
// as on the real exam. Needs JDK 25 locally, like verify.
import { expect, test } from "@playwright/test";
import { join } from "node:path";
import {
  CONTENT_ROOT,
  examDirs,
  loadBrokenVariants,
  loadExam,
  loadSolution,
  questionDirs,
} from "../lib/content/load";
import { gradeQuestion } from "../lib/grading/grade";
import type { GradeResult } from "../lib/grading/types";
import type { JavaFiles } from "../lib/java/programs";
import { LocalJava } from "../scripts/lib/local-java";

const EXAM_DIR = join(CONTENT_ROOT, "cs180", "samples");
const JVM_START_TIMEOUT = 4 * 60_000;

/** What must match between the two JVMs. */
const summary = (r: GradeResult) => ({
  compiled: r.compiled,
  score: r.score,
  cases: r.cases.map((c) => `${c.name}: ${c.passed ? "pass" : "fail"}`),
  sampleReason: r.cases[0]?.passed ? null : (r.cases[0]?.reason ?? null),
});

test("the browser grades every sample variant exactly as the local JDK does", async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const exam = loadExam(EXAM_DIR);
  const dirs = questionDirs(EXAM_DIR);

  const local = new LocalJava();
  await page.goto("/lab/grade");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });

  try {
    for (const [i, question] of exam.questions.entries()) {
      const variants: Record<string, JavaFiles> = {
        starter: question.starter,
        solution: loadSolution(dirs[i]),
        ...loadBrokenVariants(dirs[i]),
      };
      for (const [name, files] of Object.entries(variants)) {
        const expected = await gradeQuestion(local, question, files);
        const actual = await page.evaluate(([q, f]) => window.sivakuGrade!(q, f), [question, files] as const);
        expect(summary(actual), `${question.id} ${name}`).toEqual(summary(expected));
        if (name === "solution") expect(actual.passed, `${question.id} solution passes everything`).toBe(actual.total);
      }
    }
  } finally {
    await local.close();
  }
});

// The midterms are too big to grade every broken variant in the browser
// too; their reference solutions cover what they add (helpers/, labelled
// lines, the last line), and verify covers the broken variants.
test("the browser grades every exam's reference solutions exactly as the local JDK does", async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const local = new LocalJava();
  await page.goto("/lab/grade");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });

  try {
    for (const examDir of examDirs()) {
      const exam = loadExam(examDir);
      const dirs = questionDirs(examDir);
      for (const [i, question] of exam.questions.entries()) {
        const files = loadSolution(dirs[i]);
        const expected = await gradeQuestion(local, question, files);
        const actual = await page.evaluate(([q, f]) => window.sivakuGrade!(q, f), [question, files] as const);
        expect(summary(actual), question.id).toEqual(summary(expected));
        expect(actual.passed, `${question.id} solution passes everything`).toBe(actual.total);
      }
    }
  } finally {
    await local.close();
  }
});

test("Test shows the header, the sample's reason, and only pass or fail for hidden cases", async ({ page }) => {
  await page.goto("/lab/grade");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });

  // The playlist starter's stubs (return 0, return null) happen to pass
  // the two empty-array cases, as stubs do on the real exam.
  await page.getByRole("button", { name: "Playlist (harness)" }).click();
  await page.getByTestId("test").click();
  await expect(page.getByTestId("testcases-header")).toHaveText("TESTCASES   2 / 7 passed, 2 points", { timeout: 120_000 });
  // Collapsed until opened; every row opens, and only the failed sample says why.
  await expect(page.getByTestId("sample-reason")).toHaveCount(0);
  await expect(page.getByTestId("testcase-toggle")).toHaveCount(7);
  await page.locator('[data-name="Sample from the handout"]').getByTestId("testcase-toggle").click();
  await expect(page.getByTestId("sample-reason")).toHaveText(
    "Failed: total of the sample songs ==> expected: <345> but was: <0>",
  );
  const hidden = page.locator('[data-testid="testcase"]:not([data-name="Sample from the handout"])');
  await expect(hidden).toHaveCount(6);
  for (const row of await hidden.all()) await row.getByTestId("testcase-toggle").click();
  const failedHidden = hidden.and(page.locator('[data-passed="false"]')).first();
  const failedName = await failedHidden.getAttribute("data-name");
  await expect(failedHidden.getByTestId("testcase-detail")).toHaveText(`Failed: ${failedName}: did not pass.`);
  await expect(hidden.and(page.locator('[data-passed="true"]')).first().getByTestId("testcase-detail")).toHaveText("Passed.");
  await expect(page.getByTestId("sample-reason")).toHaveCount(1);

  // Code that does not compile scores 0 and shows the compiler's message.
  await page.locator("textarea").first().fill("public class Playlist {\n    int x = \n}\n");
  await page.getByTestId("test").click();
  await expect(page.getByTestId("testcases-header")).toHaveText("TESTCASES   0 / 7 passed, 0 points", { timeout: 120_000 });
  await expect(page.getByTestId("testcases-compile-error")).toContainText("Playlist.java:3: error: illegal start of expression");
});
