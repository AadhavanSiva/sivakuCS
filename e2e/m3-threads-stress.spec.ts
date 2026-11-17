// Thread questions in fresh browser JVMs, on the path students use: for
// each round, a new browser context (a new JVM, nothing cached in memory)
// grades every correct solution (solution/ and solutions/) and every broken
// one of every question with concurrent cases, as the Test button does,
// and runs each question's Main as Run does, warm-up included.
//
// Every correct solution must pass every case, and every broken one fail a
// hidden case, in every round; no tab may crash. 20 rounds by default
// (SIVAKU_ROUNDS). Slow, so nightly only (playwright.config.ts).
import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CONTENT_ROOT, examDirs, loadBrokenVariants, loadOtherSolutions, loadQuestion, loadSolution, questionDirs } from "../lib/content/load";
import { gradeQuestion, runOptions } from "../lib/grading/grade";
import type { Question } from "../lib/grading/types";
import { sandboxDirs } from "../lib/java/backend";
import { compileFiles, prepareWorkDir, runCompiled, type JavaFiles } from "../lib/java/programs";
import { STUDENT_STATE, inBrowser } from "./helpers";

const ROUNDS = Number(process.env.SIVAKU_ROUNDS ?? 20);

type Entry = { question: Question; solutions: Record<string, JavaFiles>; broken: Record<string, JavaFiles>; sample: string };

function threadQuestions(): Entry[] {
  const out: Entry[] = [];
  for (const examDir of examDirs(CONTENT_ROOT)) {
    for (const dir of questionDirs(examDir, { allVariants: true })) {
      const question = loadQuestion(dir);
      if (!question.tests.cases.some((c) => c.concurrent)) continue;
      // The sample run's output, from the question's "## Sample run" block.
      const sample = /## Sample run[\s\S]*?```\n([\s\S]*?)```/.exec(question.description)?.[1] ?? "";
      out.push({ question, solutions: { "solution/": loadSolution(dir), ...loadOtherSolutions(dir) }, broken: loadBrokenVariants(dir), sample });
    }
  }
  return out;
}

test("thread questions grade the same in 20 fresh browser JVMs, and no tab crashes", async ({ browser }) => {
  const entries = threadQuestions();
  expect(entries.length).toBeGreaterThan(0);
  test.setTimeout(ROUNDS * 5 * 60_000);
  const problems: string[] = [];
  const rounds: { round: number; seconds: number; crashed: boolean; problems: number }[] = [];

  for (let round = 1; round <= ROUNDS; round++) {
    const started = Date.now();
    const before = problems.length;
    const context = await browser.newContext({ storageState: STUDENT_STATE });
    const page = await context.newPage();
    let crashed = false;
    page.on("crash", () => (crashed = true));
    try {
      const java = await inBrowser(page);
      for (const { question, solutions, broken, sample } of entries) {
        for (const [name, files] of Object.entries(solutions)) {
          const graded = await gradeQuestion(java, question, files);
          const failed = graded.cases.filter((c) => !c.passed).map((c) => `${c.name}: ${c.reason ?? "failed"}`);
          if (failed.length) problems.push(`round ${round}: ${question.id} ${name} failed ${failed.join("; ")}`);

          // Run, as the Run button does it: compile, then the main class with the warm-up.
          const compiled = await compileFiles(java, { ...question.helpers, ...question.given, ...files });
          if (!compiled.ok) {
            problems.push(`round ${round}: ${question.id} ${name} did not compile for Run`);
            continue;
          }
          await prepareWorkDir(java, {});
          const classes = sandboxDirs(java.paths).classes;
          const run = await runCompiled(java, classes, question.meta.mainClass ?? "Main", "", 30_000, runOptions(question));
          if (run.stdout.replace(/\r\n/g, "\n") !== sample) {
            problems.push(`round ${round}: ${question.id} ${name} Run printed ${JSON.stringify(run.stdout)}`);
          }
        }
        for (const [name, files] of Object.entries(broken)) {
          const graded = await gradeQuestion(java, question, files);
          if (!graded.cases.some((c) => !c.sample && !c.passed)) problems.push(`round ${round}: ${question.id} ${name} passed every hidden case`);
        }
      }
    } catch (error) {
      if (!crashed && !/Target crashed|Page crashed/.test(String(error))) throw error;
      crashed = true;
    } finally {
      await context.close();
    }
    if (crashed) problems.push(`round ${round}: the tab crashed`);
    rounds.push({ round, seconds: Math.round((Date.now() - started) / 1000), crashed, problems: problems.length - before });
  }

  writeFileSync("test-results/m3-threads-stress.json", JSON.stringify({ rounds, problems }, null, 2));
  test.info().annotations.push({ type: "rounds", description: JSON.stringify(rounds) });
  expect(problems).toEqual([]);
});
