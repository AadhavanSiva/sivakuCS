// The small JUnit 5 runner (sivaku.sandbox.TestRunner and the sandbox's
// org.junit.jupiter.api) against real JUnit: the same Assertions signatures,
// and the same tests passing, failing and skipped, locally and in the
// browser. Real JUnit is downloaded by scripts/fetch-junit.mjs.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { JavaBackend } from "../lib/java/backend";
import { writeFiles } from "../lib/java/programs";
import { LocalJava } from "../scripts/lib/local-java";

const JUNIT_JAR = join(process.cwd(), "public", "m3-proof", "junit-platform-console-standalone-1.13.4.jar");
const SANDBOX_JAR = join(process.cwd(), "public", "cheerpj", "sandbox.jar");
const TOUR = readFileSync("e2e/fixtures/junit/AssertionsTour.java", "utf8");
const JVM_START_TIMEOUT = 4 * 60_000;

type Status = "passed" | "failed" | "skipped";

test.beforeAll(() => {
  execFileSync("node", ["scripts/fetch-junit.mjs"], { stdio: "inherit" });
});

const signatures = (jar: string) =>
  execFileSync("javap", ["-cp", jar, "org.junit.jupiter.api.Assertions"], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("public static"))
    .sort();

test("the small runner's Assertions has exactly real JUnit's public methods", () => {
  const real = signatures(JUNIT_JAR);
  expect(real.length).toBe(291);
  expect(signatures(SANDBOX_JAR)).toEqual(real);
});

/** Each test's outcome with real JUnit's console launcher, from its XML report. */
function withRealJunit(): Record<string, Status> {
  const dir = mkdtempSync(join(tmpdir(), "sivaku-tour-"));
  try {
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "AssertionsTour.java"), TOUR);
    execFileSync("javac", ["-d", join(dir, "classes"), "-cp", JUNIT_JAR, join(dir, "src", "AssertionsTour.java")]);
    spawnSync("java", [
      "-jar", JUNIT_JAR, "execute",
      "--class-path", join(dir, "classes"),
      "--select-class", "AssertionsTour",
      "--disable-banner", "--details=none",
      "--reports-dir", join(dir, "reports"),
    ]);
    const xml = readFileSync(join(dir, "reports", "TEST-junit-jupiter.xml"), "utf8");
    const out: Record<string, Status> = {};
    for (const m of xml.matchAll(/<testcase name="([^"]+)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g)) {
      const body = m[3] ?? "";
      out[m[1].replace(/&quot;/g, '"')] = /<skipped/.test(body) ? "skipped" : /<(failure|error)/.test(body) ? "failed" : "passed";
    }
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Each test's outcome with the small runner on a backend. */
async function withSmallRunner(java: JavaBackend): Promise<Record<string, Status>> {
  const own = `${java.paths.work}/${java.paths.own}`;
  await writeFiles(java, `${own}/tour-src`, { "AssertionsTour.java": TOUR });
  await java.call("reset", [`${own}/tour`]);
  const compiled = JSON.parse((await java.call("compileWith", [`${own}/tour-src`, `${own}/tour`, java.paths.sandboxJar]))!);
  if (!compiled.ok) throw new Error(compiled.output);
  const run = JSON.parse((await java.call("runTests", [`${own}/tour`, "AssertionsTour", ""], { timeoutMs: 60_000 }))!);
  if (!run.tests) throw new Error(run.error);
  const out: Record<string, Status> = {};
  // By method name, as real JUnit's XML report names tests (it ignores @DisplayName).
  for (const t of run.tests as { method: string; passed: boolean; skipped: boolean }[]) {
    out[t.method] = t.skipped ? "skipped" : t.passed ? "passed" : "failed";
  }
  return out;
}

async function inBrowser(page: Page): Promise<JavaBackend> {
  await page.goto("/lab/grade");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });
  const paths = await page.evaluate(() => window.sivakuJava!.paths);
  return {
    paths,
    call: (method, args, options) =>
      page.evaluate(([m, a, t]) => window.sivakuJava!.call(m, a, { timeoutMs: t }), [method, args, options?.timeoutMs] as const),
  };
}

test("the small runner passes, fails and skips the same tests as real JUnit, on the JDK and in the browser", async ({ page }) => {
  test.setTimeout(6 * 60_000);
  const real = withRealJunit();
  // The tour names its tests ok... and bad...: a check on the fixture itself.
  for (const [name, status] of Object.entries(real)) {
    if (name.startsWith("ok")) expect(status, name).toBe("passed");
    if (name.startsWith("bad")) expect(status, name).toBe("failed");
  }
  expect(Object.keys(real).length).toBeGreaterThan(30);

  const local = new LocalJava();
  try {
    expect(await withSmallRunner(local), "small runner on the JDK").toEqual(real);
  } finally {
    await local.close();
  }
  expect(await withSmallRunner(await inBrowser(page)), "small runner in the browser").toEqual(real);
});
