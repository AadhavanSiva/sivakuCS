// Grades a student's files against a question's tests on any JavaBackend:
// the browser (the Test button) and a local JDK (`npm run verify`) run this
// same code.
import { type JavaBackend, JavaStoppedError, JavaTimeoutError, sandboxDirs } from "../java/backend";
import {
  DEFAULT_TIME_LIMIT_MS,
  type JavaFiles,
  type RunResult,
  compileFiles,
  prepareWorkDir,
  readWorkDir,
  runCompiled,
  writeFiles,
} from "../java/programs";
import type { CaseResult, GradeResult, Question, TestCase } from "./types";

/** Line endings never count: Windows JVMs and editors may produce \r\n. */
const normalize = (text: string) => text.replace(/\r\n?/g, "\n");

/**
 * The files to compile: the question's read-only files plus the student's
 * versions of the editable ones (starter text for any the student lacks).
 * Anything else the student sends is ignored.
 */
export function filesToCompile(question: Question, studentFiles: JavaFiles): JavaFiles {
  const files: JavaFiles = { ...question.given };
  for (const name of question.meta.editable) {
    files[name] = studentFiles[name] ?? question.starter[name] ?? "";
  }
  return files;
}

export async function gradeQuestion(
  java: JavaBackend,
  question: Question,
  studentFiles: JavaFiles,
): Promise<GradeResult> {
  const { cases, kind } = question.tests;
  const maxScore = cases.reduce((sum, c) => sum + c.points, 0);
  const result = (caseResults: CaseResult[], extra: Partial<GradeResult> = {}): GradeResult => ({
    compiled: true,
    cases: caseResults,
    passed: caseResults.filter((c) => c.passed).length,
    total: caseResults.length,
    score: caseResults.reduce((sum, c) => sum + (c.passed ? c.points : 0), 0),
    maxScore,
    ...extra,
  });
  const failAll = (reason: string) =>
    cases.map((testCase, i) => caseResult(testCase, i, false, { reason }));

  // Code that does not compile scores 0 and shows the compiler's messages.
  const compile = await compileFiles(java, filesToCompile(question, studentFiles));
  if (!compile.ok) {
    return result(failAll("Your code does not compile."), { compiled: false, compileOutput: compile.output, score: 0 });
  }

  const dirs = sandboxDirs(java.paths);
  let classPath = dirs.classes;
  if (kind === "harness") {
    // The hidden tests are compiled against the student's classes: a
    // renamed method or a changed signature fails the tests, not the build.
    await writeFiles(java, dirs.harnessSrc, question.harness);
    await java.call("reset", [dirs.harnessClasses]);
    const sep = java.paths.pathSeparator;
    const harness = JSON.parse(
      (await java.call("compileWith", [dirs.harnessSrc, dirs.harnessClasses, `${dirs.classes}${sep}${java.paths.sandboxJar}`], {
        activity: "compiling",
      }))!,
    );
    if (!harness.ok) {
      return result(failAll(`The tests could not use your code:\n${harness.output}`));
    }
    classPath = `${dirs.classes}${sep}${dirs.harnessClasses}`;
  }

  const timeLimitMs = question.tests.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
  const runs: RunCache = new Map();
  const results: CaseResult[] = [];
  for (const [i, testCase] of cases.entries()) {
    try {
      results.push(await runCase(java, question, testCase, i, classPath, timeLimitMs, runs));
    } catch (error) {
      if (error instanceof JavaStoppedError) throw error;
      results.push(caseResult(testCase, i, false, { reason: failureReason(error, timeLimitMs) }));
    }
  }
  return result(results);
}

function failureReason(error: unknown, timeLimitMs: number): string {
  return error instanceof JavaTimeoutError
    ? `Timed out: your code ran for more than ${timeLimitMs / 1000} seconds.`
    : `Could not run the test: ${error instanceof Error ? error.message : String(error)}`;
}

function caseResult(testCase: TestCase, index: number, passed: boolean, detail: Partial<CaseResult> = {}): CaseResult {
  return { name: testCase.name, points: testCase.points, sample: testCase.sample === true, passed, ...(passed ? {} : detail) };
}

/**
 * One run per distinct input: Ed's Midterm 1 pattern checks each output
 * line as its own case, so "Case 1.1", "Case 1.2"... share a run.
 */
type RunCache = Map<string, { run: RunResult; files: JavaFiles } | { error: unknown }>;

async function runFor(
  java: JavaBackend,
  question: Question,
  testCase: TestCase,
  classPath: string,
  timeLimitMs: number,
  runs: RunCache,
): Promise<{ run: RunResult; files: JavaFiles }> {
  const { kind } = question.tests;
  const inputFiles = kind === "files" ? (testCase.inputFiles ?? {}) : {};
  const key = JSON.stringify([testCase.stdin ?? "", inputFiles]);
  let cached = runs.get(key);
  if (!cached) {
    try {
      await prepareWorkDir(java, inputFiles);
      const run = await runCompiled(java, classPath, question.meta.mainClass ?? "Main", testCase.stdin ?? "", timeLimitMs);
      const files = kind === "files" ? await readWorkDir(java) : {};
      cached = { run, files };
    } catch (error) {
      if (error instanceof JavaStoppedError) throw error;
      // A run that timed out fails every case that shares it, without
      // running again.
      cached = { error };
    }
    runs.set(key, cached);
  }
  if ("error" in cached) throw cached.error;
  return cached;
}

/** The output's lines, without the empty one after a final line break. */
function outputLines(stdout: string): string[] {
  const lines = normalize(stdout).split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

async function runCase(
  java: JavaBackend,
  question: Question,
  testCase: TestCase,
  index: number,
  classPath: string,
  timeLimitMs: number,
  runs: RunCache,
): Promise<CaseResult> {
  const { kind } = question.tests;

  if (kind === "harness") {
    if (!testCase.call) throw new Error(`Case "${testCase.name}" has no "call"`);
    await prepareWorkDir(java, {});
    const harnessClass = question.meta.harnessClass ?? "Harness";
    const outcome = JSON.parse(
      (await java.call("callHarness", [classPath, harnessClass, testCase.call], {
        activity: "running",
        timeoutMs: timeLimitMs,
      }))!,
    ) as { passed: boolean; reason: string | null };
    return caseResult(testCase, index, outcome.passed, { reason: outcome.reason ?? undefined });
  }

  const { run, files: after } = await runFor(java, question, testCase, classPath, timeLimitMs, runs);
  const crash = describeCrash(run);

  if (kind === "files") {
    for (const [name, expected] of Object.entries(testCase.outputFiles ?? {})) {
      const actual = after[name];
      if (expected === null) {
        if (actual !== undefined) return caseResult(testCase, index, false, { reason: crash ?? `${name} should not have been created` });
        continue;
      }
      if (actual === undefined) {
        return caseResult(testCase, index, false, { reason: crash ?? `${name} was not created` });
      }
      if (normalize(actual) !== normalize(expected)) {
        return caseResult(testCase, index, false, {
          reason: crash ?? `${name} does not match the expected contents`,
          expected,
          actual: normalize(actual),
        });
      }
    }
  }

  if (testCase.outputLine) {
    const { number, text } = testCase.outputLine;
    const actual = outputLines(run.stdout)[number - 1];
    if (actual !== text) {
      const was = actual === undefined ? `no line ${number}` : actual;
      return caseResult(testCase, index, false, {
        reason: crash ?? `line ${number} ==> expected: <${text}> but was: <${was}>`,
      });
    }
  }

  if (testCase.stdout !== undefined && normalize(run.stdout) !== normalize(testCase.stdout)) {
    return caseResult(testCase, index, false, {
      reason: crash ?? "Your output does not match the expected output",
      expected: testCase.stdout,
      actual: normalize(run.stdout),
    });
  }
  return caseResult(testCase, index, true);
}

/** "Your program threw java.util.NoSuchElementException" for a run that ended in an exception. */
function describeCrash(run: RunResult): string | undefined {
  if (run.exitCode === 0) return undefined;
  const thrown = /Exception in thread "main" (\S+)/.exec(run.stderr);
  if (thrown) return `Your program threw ${thrown[1].replace(/:$/, "")}`;
  return undefined;
}
