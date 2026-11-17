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
 * The files to compile: the question's hidden helpers and read-only files
 * plus the student's versions of the editable ones (starter text for any
 * the student lacks). Anything else the student sends is ignored.
 */
export function filesToCompile(question: Question, studentFiles: JavaFiles): JavaFiles {
  const files: JavaFiles = { ...question.helpers, ...question.given };
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
  const { cases } = question.tests;
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
  // A JUnit question's tests compile against the sandbox's JUnit 5 API.
  const junit = question.tests.kind === "junit";
  const compile = await compileFiles(java, filesToCompile(question, studentFiles), junit ? [java.paths.sandboxJar] : []);
  if (!compile.ok) {
    return result(failAll("Your code does not compile."), { compiled: false, compileOutput: compile.output, score: 0 });
  }
  if (junit) return result(await gradeJunit(java, question));

  // Cases run in groups: first those against the given files, then, for
  // each alternate set a case names, the student's code compiled again
  // against those versions of the given files (a parent class written
  // differently, to show the student's subclass calls super).
  const timeLimitMs = question.tests.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
  const results: CaseResult[] = new Array(cases.length);
  const sets = [undefined, ...new Set(cases.map((c) => c.against).filter((s): s is string => Boolean(s)))];
  for (const set of sets) {
    const group = [...cases.entries()].filter(([, c]) => c.against === set);
    if (set !== undefined) {
      const replaced = { ...filesToCompile(question, studentFiles), ...(question.alternates?.[set] ?? {}) };
      const again = await compileFiles(java, replaced);
      if (!again.ok) {
        for (const [i, c] of group) results[i] = caseResult(c, i, false, { reason: "Your code does not compile against other versions of the given classes." });
        continue;
      }
    }
    const classPath = await prepareHarness(java, question);
    if (typeof classPath !== "string") {
      for (const [i, c] of group) results[i] = caseResult(c, i, false, { reason: classPath.failed });
      continue;
    }
    const runs: RunCache = new Map();
    for (const [i, testCase] of group) {
      try {
        results[i] = await runCase(java, question, testCase, i, classPath, timeLimitMs, runs);
      } catch (error) {
        if (error instanceof JavaStoppedError) throw error;
        results[i] = caseResult(testCase, i, false, { reason: failureReason(error, timeLimitMs) });
      }
    }
  }
  return result(results);
}

/**
 * The class path to run with: the compiled classes, plus for harness
 * questions the hidden tests compiled against them, so a renamed method or
 * a changed signature fails the tests, not the build.
 */
async function prepareHarness(java: JavaBackend, question: Question): Promise<string | { failed: string }> {
  const dirs = sandboxDirs(java.paths);
  if (question.tests.kind !== "harness") return dirs.classes;
  await writeFiles(java, dirs.harnessSrc, question.harness);
  await java.call("reset", [dirs.harnessClasses]);
  const sep = java.paths.pathSeparator;
  const harness = JSON.parse(
    (await java.call("compileWith", [dirs.harnessSrc, dirs.harnessClasses, `${dirs.classes}${sep}${java.paths.sandboxJar}`], {
      activity: "compiling",
    }))!,
  );
  if (!harness.ok) return { failed: `The tests could not use your code:\n${harness.output}` };
  return `${dirs.classes}${sep}${dirs.harnessClasses}`;
}

/**
 * The sandbox's run options for a question (sivaku.sandbox.RunOptions):
 * Swing renamed to the fakes, and a thread question's warm-up.
 */
export function runOptions(question: Question): string {
  const { swingPanel, warmUp } = question.meta;
  return [swingPanel ? "swing" : "", warmUp ? `warmUp=${warmUp}` : ""].filter(Boolean).join(";");
}

type TestRun = {
  tests: { name: string; passed: boolean; skipped: boolean; reason: string | null }[] | null;
  error: string | null;
  runtimeFault: string | null;
};

/**
 * A JUnit question: the student's test class runs with the small runner
 * against each hidden implementation, each compiled into its own folder and
 * put first on the class path, so each gets its own class loader. A "pass"
 * case passes when every test passes; a "catch" case when at least one
 * fails. Any failing test on the correct implementation scores 0 for all.
 */
async function gradeJunit(java: JavaBackend, question: Question): Promise<CaseResult[]> {
  const { cases, testClass, timeLimitMs = DEFAULT_TIME_LIMIT_MS } = question.tests;
  const dirs = sandboxDirs(java.paths);
  const sep = java.paths.pathSeparator;
  const runs = new Map<string, TestRun | { failed: string }>();
  for (const name of new Set(cases.map((c) => c.implementation!))) {
    const src = `${dirs.root}/impl-${name}-src`;
    const out = `${dirs.root}/impl-${name}`;
    await writeFiles(java, src, question.implementations?.[name] ?? {});
    await java.call("reset", [out]);
    const compiled = JSON.parse((await java.call("compileWith", [src, out, dirs.classes], { activity: "compiling" }))!);
    if (!compiled.ok) {
      runs.set(name, { failed: `The hidden ${name} implementation did not compile:\n${compiled.output}` });
      continue;
    }
    const once = async () => {
      await prepareWorkDir(java, {});
      return JSON.parse(
        (await java.call("runTests", [`${out}${sep}${dirs.classes}`, testClass!, runOptions(question)], {
          activity: "running",
          timeoutMs: timeLimitMs,
        }))!,
      ) as TestRun;
    };
    try {
      let run = await once();
      if (run.runtimeFault) run = await once();
      runs.set(name, run);
    } catch (error) {
      if (error instanceof JavaStoppedError) throw error;
      runs.set(name, { failed: failureReason(error, timeLimitMs) });
    }
  }

  const results = cases.map((testCase, i) => {
    const run = runs.get(testCase.implementation!)!;
    if ("failed" in run) return caseResult(testCase, i, false, { reason: run.failed });
    if (run.tests === null) return caseResult(testCase, i, false, { reason: `Your tests could not run: ${run.error}` });
    const ran = run.tests.filter((t) => !t.skipped);
    const failed = ran.filter((t) => !t.passed);
    if (testCase.expect === "pass") {
      if (ran.length === 0) return caseResult(testCase, i, false, { reason: "There are no tests to run." });
      const why = failed.map((t) => `${t.name} failed: ${t.reason}`).join("\n");
      return caseResult(testCase, i, failed.length === 0, { reason: why });
    }
    return caseResult(testCase, i, failed.length > 0, { reason: "None of your tests failed on this implementation." });
  });
  // A suite that fails on a correct implementation proves nothing about the buggy ones.
  const wrongOnCorrect = results.some((r, i) => cases[i].expect === "pass" && !r.passed);
  if (!wrongOnCorrect) return results;
  return results.map((r, i) =>
    cases[i].expect === "pass" ? r : caseResult(cases[i], i, false, { reason: "Your tests fail on a correct implementation." }),
  );
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
      const once = async () => {
        await prepareWorkDir(java, inputFiles);
        const options = runOptions(question);
        const run = await runCompiled(java, classPath, question.meta.mainClass ?? "Main", testCase.stdin ?? "", timeLimitMs, options);
        return { run, files: kind === "files" ? await readWorkDir(java) : {} };
      };
      // A run that failed inside CheerpJ rather than in the student's code runs once more.
      let attempt = await once();
      if (attempt.run.runtimeFault) attempt = await once();
      cached = attempt;
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
    const harnessClass = question.meta.harnessClass ?? "Harness";
    const once = async () => {
      await prepareWorkDir(java, {});
      return JSON.parse(
        (await java.call("callHarnessWith", [classPath, harnessClass, testCase.call!, runOptions(question)], {
          activity: "running",
          timeoutMs: timeLimitMs,
        }))!,
      ) as { passed: boolean; reason: string | null; runtimeFault: string | null };
    };
    // A case that failed inside CheerpJ rather than in the student's code runs once more.
    let outcome = await once();
    if (!outcome.passed && outcome.runtimeFault) outcome = await once();
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
    const lines = outputLines(run.stdout);
    const actual = number > 0 ? lines[number - 1] : lines[lines.length + number];
    if (actual !== text) {
      const which = number > 0 ? `line ${number}` : number === -1 ? "the last line" : `line ${-number} from the end`;
      const was = actual === undefined ? `no ${which}` : actual;
      return caseResult(testCase, index, false, {
        reason: crash ?? `${which} ==> expected: <${text}> but was: <${was}>`,
      });
    }
  }

  const labelled = testCase.labelledLines;
  for (const { prefix, lines: expected } of Array.isArray(labelled) ? labelled : labelled ? [labelled] : []) {
    const actual = outputLines(run.stdout).filter((line) => line.startsWith(prefix));
    const at = expected.findIndex((line, i) => actual[i] !== line);
    const mismatch = at !== -1 ? at : actual.length !== expected.length ? expected.length : -1;
    if (mismatch !== -1) {
      const label = prefix.trim();
      // One expected line: "the Average: line"; several: "Battery: line 3".
      const which = expected.length === 1 ? `the "${label}" line` : `"${label}" line ${mismatch + 1}`;
      const said = (lines: string[]) =>
        mismatch < lines.length ? lines[mismatch] : expected.length === 1 ? "no such line" : `no line ${mismatch + 1}`;
      return caseResult(testCase, index, false, {
        reason: crash ?? `${which} ==> expected: <${said(expected)}> but was: <${said(actual)}>`,
        expected: expected.join("\n") + "\n",
        actual: actual.length ? actual.join("\n") + "\n" : "",
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
