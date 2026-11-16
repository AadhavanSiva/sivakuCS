// Midterm 3, before any question is written (cs180-exam-specs section 8):
// prove each way of grading works in CheerpJ, riskiest first, and time it.
// Each proof is a Java program under java/proofs/m3/ that prints one JSON
// object; it runs on the local JDK (the baseline, as npm run verify uses)
// and in the browser through the same sandbox calls the site makes.
// Results and timings go to test-results/m3-proofs.json.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { readFiles } from "../lib/content/load";
import type { JavaBackend } from "../lib/java/backend";
import { type JavaFiles, writeFiles } from "../lib/java/programs";
import { LocalJava } from "../scripts/lib/local-java";

const PROOFS = join(process.cwd(), "java", "proofs", "m3");
const JUNIT_JAR = "junit-platform-console-standalone-1.13.4.jar";
const JVM_START_TIMEOUT = 4 * 60_000;
const RUN_TIMEOUT = 5 * 60_000;

type Where = "local" | "browser";
type Timed<T> = { result: T; ms: number; stderr?: string };
// Written after every proof, before its checks: Playwright starts a new
// worker after a failure, so nothing is kept in memory between tests.
const REPORT = join("test-results", "m3-proofs.json");
function record(where: Where, proof: string, value: unknown) {
  mkdirSync("test-results", { recursive: true });
  const report = existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, "utf8")) : {};
  (report[where] ??= {})[proof] = value;
  writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
}

const files = (sub: string): JavaFiles => readFiles(join(PROOFS, sub));

/** Writes sources next to `out` and compiles them into `out`. */
async function compile(java: JavaBackend, out: string, sources: JavaFiles, classPath: string[] = []): Promise<number> {
  const src = `${out}-src`;
  await java.call("reset", [src]);
  await writeFiles(java, src, sources);
  await java.call("reset", [out]);
  const started = Date.now();
  const compiled = JSON.parse((await java.call("compileWith", [src, out, classPath.join(java.paths.pathSeparator)]))!);
  if (!compiled.ok) throw new Error(`${out} did not compile:\n${compiled.output}`);
  return Date.now() - started;
}

/** Runs a proof's main and parses the JSON object it prints. */
async function run<T>(java: JavaBackend, classPath: string[], main: string, stdin = ""): Promise<Timed<T>> {
  const started = Date.now();
  const outcome = JSON.parse(
    (await java.call("run", [classPath.join(java.paths.pathSeparator), main, stdin], { timeoutMs: RUN_TIMEOUT }))!,
  );
  const ms = Date.now() - started;
  if (outcome.exitCode !== 0) throw new Error(`${main} exited with ${outcome.exitCode}:\n${outcome.stderr}`);
  // Uncaught exceptions in other threads land here without failing the run.
  const stderr = outcome.stderr ? { stderr: outcome.stderr } : {};
  return { result: JSON.parse(outcome.stdout.trim().split("\n").pop()), ms, ...stderr };
}

const root = (java: JavaBackend, name: string) => `${java.paths.work}/${java.paths.own}/proofs/${name}`;

// ---- the four proofs ----------------------------------------------------------

type ThreadsResult = {
  runs: number;
  unsynchronisedAddFailed: number;
  synchronisedAddFailed: number;
  unsynchronisedTakeFailed: number;
  synchronisedTakeFailed: number;
  counterMs: number;
  split: Record<string, { detectedInRuns: number; firstRun: { readerOfIndex: string[]; mostAtOnce: number } }>;
  splitMs: number;
};

/** "warm" first runs each method once on one thread, as a grader can; "cold" does not. */
async function threads(java: JavaBackend, mode: "cold" | "warm") {
  const out = root(java, "threads");
  const compileMs = await compile(java, out, files("threads"));
  return { compileMs, ...(await run<ThreadsResult>(java, [out], "ThreadsProof", mode)) };
}

type SocketsResult = {
  real: { works: boolean; error?: string; ms: number };
  client: { returned: string; serverHeard: string[]; connectionClosed: string; ms: number };
  server: { replies: string[]; serverFailed: string | null; serverFinished: boolean; ms: number };
  handler: { replies: string[]; afterBye: string | null; handlerReturned: boolean; handlerClosed: boolean; ms: number };
  rewritten: number;
};

async function sockets(java: JavaBackend) {
  const student = `${root(java, "sockets")}/student`;
  const proof = `${root(java, "sockets")}/proof`;
  const compileMs = (await compile(java, student, files("sockets/student"))) + (await compile(java, proof, files("sockets/proof")));
  // The student's classes stay off the class path: only the rewriting loader may load them.
  return { compileMs, ...(await run<SocketsResult>(java, [proof], "SocketsProof", `${student}\n`)) };
}

type Scored = { points: number; runs: { implementation: string; passed: number; failed: number }[]; msPerImplementation: number[] };
type JunitResult = { runner: string; model: Scored; modelMs: number; starter: Scored; starterMs: number };

async function junit(java: JavaBackend, junitJar: string) {
  const base = root(java, "junit");
  const impls = `${base}/impls`;
  let compileMs = 0;
  for (const impl of ["correct", "empty", "boundary", "invalid", "average"]) {
    compileMs += await compile(java, `${impls}/${impl}`, files(`junit/impl/${impl}`));
  }
  const runner = files("junit/runner");
  // The small runner, its stand-in JUnit API, and the student's tests compiled against it.
  compileMs += await compile(java, `${base}/mini-api`, files("junit/mini-api"));
  compileMs += await compile(java, `${base}/mini`, runner, [`${base}/mini-api`]);
  // The real JUnit Platform runner, and the same student tests compiled against real JUnit.
  compileMs += await compile(java, `${base}/platform`, { "Scoring.java": runner["Scoring.java"], ...files("junit/platform") }, [junitJar]);
  for (const suite of ["model", "starter"]) {
    compileMs += await compile(java, `${base}/tests-mini/${suite}`, files(`junit/student/${suite}`), [`${base}/mini-api`, `${impls}/correct`]);
    compileMs += await compile(java, `${base}/tests-junit/${suite}`, files(`junit/student/${suite}`), [junitJar, `${impls}/correct`]);
  }
  const args = (kind: string) => `${impls}\n${base}/${kind}/model\n${base}/${kind}/starter\n`;
  // The real JUnit Platform first, so its time includes loading JUnit into this JVM.
  const platform = await run<JunitResult>(java, [`${base}/platform`, junitJar], "PlatformRunnerProof", args("tests-junit"));
  const platformAgain = await run<JunitResult>(java, [`${base}/platform`, junitJar], "PlatformRunnerProof", args("tests-junit"));
  const mini = await run<JunitResult>(java, [`${base}/mini`, `${base}/mini-api`], "MiniRunnerProof", args("tests-mini"));
  return { compileMs, platform, platformAgain, mini };
}

type SwingResult = {
  works: boolean;
  error?: string;
  headless: boolean;
  counter: { afterThreeClicks: string; otherPanelAfterOneClick: string; afterReset: string; afterFiveQuickClicks: string; firstPanelMs: number; fiveClicksMs: number; fiveQuickClicksMs: number };
  price: { initial: string; after3: string; afterThree: string; afterMinus1: string };
  eventThread: { label: string; ms: number };
  windows: number;
  anyShowing: boolean;
};

/** mode "headless" sets java.awt.headless before AWT loads; "default" leaves it alone. */
async function swing(java: JavaBackend, mode: "default" | "headless") {
  const out = root(java, "swing");
  const compileMs = await compile(java, out, files("swing"));
  return { compileMs, ...(await run<SwingResult>(java, [out], "SwingProof", mode)) };
}

// ---- checks -------------------------------------------------------------------

function checkThreads(r: ThreadsResult) {
  expect(r.runs).toBe(20);
  expect(r.unsynchronisedAddFailed, "an unsynchronised add loses updates in every run").toBe(20);
  expect(r.synchronisedAddFailed, "a synchronised add never does").toBe(0);
  expect(r.unsynchronisedTakeFailed, "unsynchronised takes oversell in every run").toBe(20);
  expect(r.synchronisedTakeFailed, "synchronised takes never do").toBe(0);
  for (const [split, { detectedInRuns }] of Object.entries(r.split)) {
    expect(detectedInRuns, `${split} recognised`).toBe(20);
  }
  // Which thread read each index: four slices of six, one thread each.
  expect(r.split.PARALLEL.firstRun.readerOfIndex).toEqual([0, 1, 2, 3].flatMap((w) => Array(6).fill(`worker-${w}`)));
}

function checkSocketFallback(r: SocketsResult) {
  expect(r.rewritten, "new Socket and new ServerSocket rewritten").toBe(2);
  expect(r.client).toMatchObject({ returned: "cy", serverHeard: ["ana", "bo", "cy"], connectionClosed: "yes" });
  expect(r.server.serverFailed).toBeNull();
  expect(r.server.serverFinished).toBe(true);
  expect(r.server.replies.map((reply) => reply.split(" ")[1]).sort()).toEqual(["1", "2", "3"]);
  expect(r.handler).toMatchObject({ replies: ["TOTAL 2", "TOTAL 7", "ERROR", "GOODBYE"], afterBye: null, handlerReturned: true, handlerClosed: true });
}

function checkJunit(r: JunitResult) {
  expect(r.model.points, `${r.runner}: the model suite`).toBe(14);
  expect(r.starter.points, `${r.runner}: the starter`).toBe(2);
  expect(r.model.runs.map((x) => x.failed)).toEqual([0, 1, 1, 1, 1]);
}

type SwingFallbackResult = {
  works: boolean;
  renamedConstants: number;
  superclass: string;
  counter: { afterThreeClicks: string; otherPanelAfterOneClick: string; afterReset: string; firstPanelMs: number; fiveClicksMs: number };
  price: { initial: string; after3: string; afterThree: string; afterMinus1: string; clickWhileDisabled: string };
};

async function swingFallback(java: JavaBackend) {
  const student = `${root(java, "swing-fallback")}/student`;
  const proof = `${root(java, "swing-fallback")}/proof`;
  const compileMs = (await compile(java, student, files("swing/student"))) + (await compile(java, proof, files("swing/fallback")));
  // The student's panels stay off the class path: only the renaming loader may load them.
  return { compileMs, ...(await run<SwingFallbackResult>(java, [proof], "SwingFallbackProof", `${student}\n`)) };
}

function checkSwingFallback(r: SwingFallbackResult) {
  expect(r.superclass).toBe("FakePanel");
  expect(r.counter).toMatchObject({ afterThreeClicks: "Count: 3", otherPanelAfterOneClick: "Count: 1", afterReset: "Count: 0" });
  expect(r.price).toEqual({
    initial: "Enter the hours",
    after3: "Cost: $37.50",
    afterThree: "Hours must be a number",
    afterMinus1: "Hours must be 0 or more",
    clickWhileDisabled: "Hours must be 0 or more",
  });
}

function checkSwing(r: SwingResult) {
  expect(r.counter).toMatchObject({ afterThreeClicks: "Count: 3", otherPanelAfterOneClick: "Count: 1", afterReset: "Count: 0", afterFiveQuickClicks: "Count: 6" });
  expect(r.price).toEqual({ initial: "Enter the hours", after3: "Cost: $37.50", afterThree: "Hours must be a number", afterMinus1: "Hours must be 0 or more" });
  expect(r.eventThread.label).toBe("Count: 1");
  expect(r.windows, "no window was created").toBe(0);
  expect(r.anyShowing).toBe(false);
}

// ---- where they run -----------------------------------------------------------

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

const junitJarFor = (where: Where) =>
  where === "browser" ? `/app/m3-proof/${JUNIT_JAR}` : join(process.cwd(), "public", "m3-proof", JUNIT_JAR);

test.beforeAll(() => {
  // The jar is gitignored; download it (checked against Maven Central's SHA-1) if missing.
  execFileSync("node", ["scripts/fetch-junit.mjs"], { stdio: "inherit" });
});

for (const where of ["local", "browser"] as const) {
  test.describe(`Midterm 3 proofs (${where})`, () => {
    let local: LocalJava | undefined;
    const java = async (page: Page) => (where === "local" ? (local ??= new LocalJava()) : inBrowser(page));
    test.afterAll(async () => {
      await local?.close();
    });

    // Each in a fresh JVM. Cold is recorded: in CheerpJ the first time several
    // threads run a path together, one can die inside the runtime. Warm (the
    // methods run once on one thread first) is what a grader will do.
    test("1. threads (cold): recorded, not required", async ({ page }) => {
      test.setTimeout(10 * 60_000);
      record(where, "threads-cold", await threads(await java(page), "cold"));
    });

    test("1. threads (warm): a slow store exposes a missing synchronized every time, and overlap is detected", async ({ page }) => {
      test.setTimeout(10 * 60_000);
      const r = await threads(await java(page), "warm");
      record(where, "threads-warm", r);
      expect(r.stderr ?? "", "no thread died").toBe("");
      checkThreads(r.result);
    });

    test("2. sockets: real localhost sockets, and the rewriting fallback", async ({ page }) => {
      test.setTimeout(5 * 60_000);
      const r = await sockets(await java(page));
      record(where, "sockets", r);
      // Real sockets are recorded, not required: the fallback must work either way.
      checkSocketFallback(r.result);
    });

    test("3. JUnit: a student test class against five implementations, real JUnit and a small runner", async ({ page }) => {
      test.setTimeout(10 * 60_000);
      const r = await junit(await java(page), junitJarFor(where));
      record(where, "junit", r);
      checkJunit(r.platform.result);
      checkJunit(r.platformAgain.result);
      checkJunit(r.mini.result);
    });

    // Each mode in its own test, so each gets a fresh JVM: AWT's state is global.
    for (const mode of ["default", "headless"] as const) {
      test(`4. Swing (${mode}): panels without a window, doClick, setText, read the label`, async ({ page }) => {
        test.setTimeout(5 * 60_000);
        const r = await swing(await java(page), mode);
        record(where, `swing-${mode}`, r);
        // Recorded either way; the checks apply to a mode that works.
        if (r.result.works) checkSwing(r.result);
      });
    }

    // Real Swing cannot start in CheerpJ's worker (no display); this is the way that works everywhere.
    test("4. Swing fallback: the student's panel with JPanel, JButton, JLabel, JTextField renamed to fakes", async ({ page }) => {
      test.setTimeout(5 * 60_000);
      const r = await swingFallback(await java(page));
      record(where, "swing-fallback", r);
      checkSwingFallback(r.result);
    });
  });
}

