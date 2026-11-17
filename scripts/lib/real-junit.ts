// The cross-check for JUnit questions in `npm run verify`: runs a student's
// test class with real JUnit 5 (junit-platform-console-standalone, fetched by
// scripts/fetch-junit.mjs) on the local JDK against each hidden
// implementation, and scores the cases as lib/grading/grade.ts does, so
// verify can require the site's small runner to agree.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import type { Question } from "../../lib/grading/types";
import type { JavaFiles } from "../../lib/java/programs";

const JUNIT_JAR = join(process.cwd(), "public", "m3-proof", "junit-platform-console-standalone-1.13.4.jar");

const bin = (tool: string) => (process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", tool) : tool);

function ensureJar(): string {
  if (!existsSync(JUNIT_JAR)) execFileSync("node", ["scripts/fetch-junit.mjs"], { stdio: "inherit" });
  return JUNIT_JAR;
}

function write(dir: string, files: JavaFiles) {
  for (const [name, text] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}

function javaFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? javaFiles(path) : name.endsWith(".java") ? [path] : [];
  });
}

/** javac into out; false if it does not compile. */
function compile(src: string, out: string, classPath: string[]): boolean {
  const sources = javaFiles(src);
  if (sources.length === 0) return true;
  const result = spawnSync(bin("javac"), ["-d", out, "-encoding", "UTF-8", "-cp", classPath.join(delimiter), ...sources]);
  return result.status === 0;
}

/** Each case's pass or fail, scored with real JUnit as the site scores with its small runner. */
export async function realJunitOutcomes(question: Question, studentFiles: JavaFiles): Promise<boolean[]> {
  const jar = ensureJar();
  const { cases, testClass } = question.tests;
  const tmp = mkdtempSync(join(tmpdir(), "sivaku-junit-"));
  try {
    const given = Object.fromEntries(Object.entries(question.given).filter(([name]) => name.endsWith(".java")));
    const impls = new Map<string, string>();
    for (const name of new Set(cases.map((c) => c.implementation!))) {
      const src = join(tmp, "impl-src", name);
      write(src, { ...given, ...(question.implementations?.[name] ?? {}) });
      const out = join(tmp, "impl", name);
      if (!compile(src, out, [])) throw new Error(`implementations/${name} does not compile`);
      impls.set(name, out);
    }
    const correct = cases.find((c) => c.expect === "pass")!.implementation!;
    const testsSrc = join(tmp, "tests-src");
    const editable = Object.fromEntries(question.meta.editable.map((name) => [name, studentFiles[name] ?? question.starter[name] ?? ""]));
    write(testsSrc, editable);
    const testsOut = join(tmp, "tests");
    if (!compile(testsSrc, testsOut, [jar, impls.get(correct)!])) return cases.map(() => false);

    // JUnit's console launcher exits 0 when every test passed (and some ran), 1 or 2 otherwise.
    const allPassed = new Map<string, boolean>();
    for (const [name, dir] of impls) {
      const run = spawnSync(bin("java"), [
        "-jar", jar, "execute",
        "--class-path", [dir, testsOut].join(delimiter),
        "--select-class", testClass!,
        "--disable-banner", "--details=none", "--fail-if-no-tests",
      ]);
      allPassed.set(name, run.status === 0);
    }
    const results = cases.map((c) => (c.expect === "pass" ? allPassed.get(c.implementation!)! : !allPassed.get(c.implementation!)!));
    const wrongOnCorrect = cases.some((c, i) => c.expect === "pass" && !results[i]);
    return wrongOnCorrect ? cases.map((c, i) => (c.expect === "pass" ? results[i] : false)) : results;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
