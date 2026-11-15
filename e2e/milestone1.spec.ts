// Milestone 1 acceptance check: Java 25 compiles and runs in the browser.
//
// A program using `p instanceof Student s`, IO.readln, String.format,
// BufferedReader and PrintWriter compiles and runs; a while(true) program
// is stopped by the time limit without freezing the page. Timings are
// written to test-results/milestone1-timings.json for the README.
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  CHECK_EXPECTED_ROSTER,
  CHECK_EXPECTED_STDOUT,
  INFINITE_LOOP_PROGRAM,
} from "../lib/milestone1-samples";
import lock from "../cheerpj-lock.json";

const JVM_START_TIMEOUT = 4 * 60_000;
// Every measurement, as a list, so repeated runs (--repeat-each) all count.
const timings: Record<string, number[]> = {};
const record = (name: string, ms: number) => (timings[name] ??= []).push(ms);

async function openLab(page: Page) {
  await page.goto("/lab");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });
}

/** Waits for the compiler warm-up so measured compiles are warm ones. */
async function waitForWarm(page: Page) {
  await expect(page.getByTestId("timings")).not.toHaveAttribute("data-warm-ms", "", { timeout: JVM_START_TIMEOUT });
}

async function setSources(page: Page, text: string) {
  await page.getByTestId("sources").fill(text);
}

test("Starting Java shows while the runtime loads, and the runtime is the verified one", async ({ page }) => {
  await page.goto("/lab");
  await expect(page.getByTestId("starting-java")).toBeVisible();
  await expect(page.getByTestId("starting-java")).toHaveText("Starting Java…");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });
  await expect(page.getByTestId("starting-java")).toHaveCount(0);

  // CheerpJ is loaded from its CDN, which can change under us; the runtime
  // must be the build recorded in cheerpj-lock.json.
  await expect(page.getByTestId("status")).toHaveAttribute("data-java-version", lock.javaRuntime);
  await expect(page.getByTestId("runtime-changed")).toHaveCount(0);
});

test("the check program compiles and runs with stdin and files", async ({ page }) => {
  await openLab(page);
  record("coldJvmReadyMs", Number(await page.getByTestId("timings").getAttribute("data-ready-ms")));
  await waitForWarm(page);
  record("warmUpCompileMs", Number(await page.getByTestId("timings").getAttribute("data-warm-ms")));

  const info = await page.getByTestId("status").textContent();
  expect(info).toContain("Java 25");

  await page.getByTestId("run").click();
  await expect(page.getByTestId("outcome")).toHaveAttribute("data-kind", "finished", { timeout: 60_000 });
  expect(await page.getByTestId("stdout").textContent()).toBe(CHECK_EXPECTED_STDOUT);
  await expect(page.getByTestId("outcome")).toContainText("exit code 0");
  await expect(page.getByTestId("stderr")).toHaveCount(0);
  expect(await page.getByTestId("file-roster.txt").locator("pre").textContent()).toBe(CHECK_EXPECTED_ROSTER);
  await expect(page.getByTestId("file-visitors.txt")).toBeVisible();

  const lastCompile = async () => {
    const text = (await page.getByTestId("timings").textContent()) ?? "";
    return { compile: Number(/last compile (\d+) ms/.exec(text)?.[1]), run: Number(/run (\d+) ms/.exec(text)?.[1]) };
  };
  const first = await lastCompile();
  record("firstStudentCompileMs", first.compile);
  record("checkProgramRunMs", first.run);

  // Run it again: what every later Run in the session costs.
  await page.getByTestId("run").click();
  await expect(page.getByTestId("outcome")).toHaveAttribute("data-kind", "finished", { timeout: 60_000 });
  expect(await page.getByTestId("stdout").textContent()).toBe(CHECK_EXPECTED_STDOUT);
  record("repeatCompileMs", (await lastCompile()).compile);

  // A second visit: the runtime comes from the browser's cache.
  await page.reload();
  await openLab(page);
  record("warmJvmReadyMs", Number(await page.getByTestId("timings").getAttribute("data-ready-ms")));
});

test("a while(true) program is stopped by the time limit and the page stays responsive", async ({ page }) => {
  await openLab(page);
  await page.getByTestId("load-loop").click();
  await page.getByTestId("time-limit").fill("3");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "running", { timeout: 60_000 });

  // While the loop runs, the page's own timers must keep firing on time.
  const worstLagMs = await page.evaluate(async () => {
    let worst = 0;
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await new Promise((r) => setTimeout(r, 100));
      worst = Math.max(worst, performance.now() - start - 100);
    }
    return worst;
  });
  expect(worstLagMs).toBeLessThan(250);
  record("mainThreadWorstLagDuringLoopMs", Math.round(worstLagMs));

  await expect(page.getByTestId("outcome")).toHaveAttribute("data-kind", "timeout", { timeout: 15_000 });
  await expect(page.getByTestId("outcome")).toContainText("Time limit exceeded");

  // A fresh JVM replaces the stopped one, and the next run works.
  const restartedAt = Date.now();
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });
  record("restartAfterTimeoutMs", Date.now() - restartedAt);
  await page.getByTestId("load-check").click();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("outcome")).toHaveAttribute("data-kind", "finished", { timeout: 120_000 });
  expect(await page.getByTestId("stdout").textContent()).toBe(CHECK_EXPECTED_STDOUT);
});

test("Stop ends a running program", async ({ page }) => {
  await openLab(page);
  await setSources(page, INFINITE_LOOP_PROGRAM);
  await page.getByTestId("time-limit").fill("60");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "running", { timeout: 60_000 });
  await page.getByTestId("stop").click();
  await expect(page.getByTestId("outcome")).toHaveAttribute("data-kind", "stopped", { timeout: 5_000 });
});

test("compile errors are shown as javac reports them", async ({ page }) => {
  await openLab(page);
  await setSources(page, "public class Main {\n    public static void main(String[] args) {\n        int x = 5\n    }\n}\n");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("outcome")).toHaveAttribute("data-kind", "compile-error", { timeout: 60_000 });
  await expect(page.getByTestId("compile-output")).toContainText("Main.java:3: error: ';' expected");
});

test("System.exit ends the program with its status and the JVM survives", async ({ page }) => {
  await openLab(page);
  await setSources(page, 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("bye");\n        System.exit(3);\n        System.out.println("never");\n    }\n}\n');
  await page.getByTestId("run").click();
  await expect(page.getByTestId("outcome")).toHaveAttribute("data-kind", "finished", { timeout: 60_000 });
  await expect(page.getByTestId("outcome")).toContainText("exit code 3");
  expect(await page.getByTestId("stdout").textContent()).toBe("bye\n");

  await page.getByTestId("load-check").click();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("outcome")).toContainText("exit code 0", { timeout: 60_000 });
});

test.afterAll(() => {
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/milestone1-timings.json", JSON.stringify(timings, null, 2) + "\n");
  console.log("Milestone 1 timings:", timings);
});
