// Midterm 3 grading: what section 8 of the private exam specs asks of the
// graders, on the local JDK and in CheerpJ.
//
// - A test that fails inside CheerpJ rather than in the student's code is
//   rerun once before it fails.
// - A thread question's warm-up (meta.json warmUp) runs before Run and
//   Test, so the CheerpJ failure where a thread silently dies never happens.
// - The Swing fakes cover the components' methods, and Run draws a Swing
//   question's panel as HTML.
// - Every Midterm 3 broken solution grades the same in the browser.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { CONTENT_ROOT, loadBrokenVariants, loadExam, loadSolution, questionDirs } from "../lib/content/load";
import { gradeQuestion } from "../lib/grading/grade";
import type { GradeResult, Question } from "../lib/grading/types";
import type { JavaBackend } from "../lib/java/backend";
import type { JavaFiles } from "../lib/java/programs";
import { LocalJava } from "../scripts/lib/local-java";
import { openExam } from "./helpers";

const JVM_START_TIMEOUT = 4 * 60_000;

async function openLab(page: Page) {
  await page.goto("/lab/grade");
  await expect(page.getByTestId("status")).toHaveAttribute("data-status", "ready", { timeout: JVM_START_TIMEOUT });
}

/** The browser's JVM as a JavaBackend, for gradeQuestion and direct sandbox calls. */
async function inBrowser(page: Page): Promise<JavaBackend> {
  await openLab(page);
  const paths = await page.evaluate(() => window.sivakuJava!.paths);
  return {
    paths,
    call: (method, args, options) =>
      page.evaluate(([m, a, t]) => window.sivakuJava!.call(m, a, { timeoutMs: t }), [method, args, options?.timeoutMs] as const),
  };
}

const summary = (r: GradeResult) => ({ score: r.score, cases: r.cases.map((c) => `${c.name}: ${c.passed ? "pass" : "fail"}`) });

// ---- a test that fails inside CheerpJ runs once more --------------------------

/**
 * A harness question whose student code starts a thread that dies with an
 * exception carrying no stack frames, as CheerpJ's own failures do: on the
 * first attempt only, or on every attempt. Case 2 reports how many attempts
 * Case 1 took, from a system property (which lasts as long as the JVM).
 */
function flaky(key: string, always: boolean): { question: Question; files: JavaFiles } {
  const harness = `import sivaku.harness.Check;
public class Harness {
    public static void go() throws InterruptedException { Flaky.go(); }
    public static void attempts() { Check.equal("attempts at Case 1", 2, Integer.getInteger("${key}", 0).intValue()); }
}`;
  const student = `public class Flaky {
    public static void go() throws InterruptedException {
        int n = Integer.getInteger("${key}", 0) + 1;
        System.setProperty("${key}", String.valueOf(n));
        if (${always} || n == 1) {
            Thread t = new Thread(() -> {
                RuntimeException e = new ClassCastException();
                e.setStackTrace(new StackTraceElement[0]);
                throw e;
            });
            t.start();
            t.join();
        }
    }
}`;
  return {
    question: {
      id: "e2e/flaky",
      meta: { title: "Flaky", points: 2, editable: ["Flaky.java"], readOnly: [] },
      description: "",
      starter: {},
      given: {},
      harness: { "Harness.java": harness },
      tests: { kind: "harness", cases: [{ name: "Case 1", points: 1, call: "go" }, { name: "Case 2", points: 1, call: "attempts" }] },
    },
    files: { "Flaky.java": student },
  };
}

async function checkRerun(java: JavaBackend) {
  const key = `sivaku.e2e.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const once = flaky(`${key}.once`, false);
  const passedOnRerun = await gradeQuestion(java, once.question, once.files);
  expect(summary(passedOnRerun).cases, "faulting once: the rerun passes, and Case 1 took two attempts").toEqual([
    "Case 1: pass",
    "Case 2: pass",
  ]);
  const always = flaky(`${key}.always`, true);
  const failed = await gradeQuestion(java, always.question, always.files);
  expect(summary(failed).cases, "faulting every time: fails after exactly one rerun").toEqual(["Case 1: fail", "Case 2: pass"]);
  expect(failed.cases[0].reason).toContain("A thread stopped unexpectedly");
}

test("a test that fails inside CheerpJ, not in the student's code, is rerun once (JDK)", async () => {
  const java = new LocalJava();
  try {
    await checkRerun(java);
  } finally {
    await java.close();
  }
});

test("a test that fails inside CheerpJ, not in the student's code, is rerun once (browser)", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await checkRerun(await inBrowser(page));
});

// ---- the warm-up ------------------------------------------------------------------

// 8 threads each add 1 ten times through a synchronized method on a slow
// store. In a fresh CheerpJ JVM, run cold, one thread dies before doing
// anything; the warm-up (the same calls once, on one thread, with the same
// classes) prevents it. java/proofs/m3/threads has the investigation.
const RACE: JavaFiles = {
  "Race.java": `import java.util.*;
public class Race {
    public static void main(String[] args) throws Exception {
        Tally tally = new Tally();
        Bank bank = new Bank(tally);
        int[] done = new int[8];
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            int me = t;
            threads.add(new Thread(() -> { for (int i = 0; i < 10; i++) { bank.add(1); done[me]++; } }));
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        System.out.println("Total: " + tally.value + " " + Arrays.toString(done));
    }
}`,
  "Tally.java": `public class Tally {
    volatile int value;
    static void pause() { try { Thread.sleep(2); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }
    int get() { int v = value; pause(); return v; }
    void set(int v) { pause(); value = v; }
}`,
  "Bank.java": `public class Bank {
    private final Tally tally;
    Bank(Tally tally) { this.tally = tally; }
    synchronized void add(int n) { tally.set(tally.get() + n); }
}`,
  "Warm.java": `public class Warm {
    public static void warmUp() { new Bank(new Tally()).add(1); }
}`,
};

async function race(java: JavaBackend, options: string) {
  const own = `${java.paths.work}/${java.paths.own}`;
  await java.call("reset", [`${own}/race-src`]);
  for (const [name, text] of Object.entries(RACE)) await java.call("writeFile", [`${own}/race-src/${name}`, text]);
  await java.call("reset", [`${own}/race`]);
  await java.call("compileWith", [`${own}/race-src`, `${own}/race`, ""]);
  const run = JSON.parse((await java.call("runWith", [`${own}/race`, "Race", "", options], { timeoutMs: 120_000 }))!);
  return String(run.stdout).trim();
}

test("in a fresh browser JVM, the warm-up keeps every thread of a race alive", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  expect(await race(await inBrowser(page), "warmUp=Warm")).toBe("Total: 80 [10, 10, 10, 10, 10, 10, 10, 10]");
});

test("in a fresh browser JVM without the warm-up, the same race (recorded, not required)", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  // At CheerpJ 5.0 one thread dies: "Total: 70 [10, 10, 10, 0, 10, 10, 10, 10]".
  // Recorded rather than required, so a fixed CheerpJ does not fail the suite.
  test.info().annotations.push({ type: "cold race", description: await race(await inBrowser(page), "") });
});

// ---- Midterm 3's broken solutions in the browser ----------------------------------

test("Midterm 3 starters and solutions grade the same in the browser as on the JDK, and every broken solution fails there too", async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const examDir = join(CONTENT_ROOT, "cs180", "midterm-3");
  const exam = loadExam(examDir);
  const dirs = questionDirs(examDir);
  const local = new LocalJava();
  const browser = await inBrowser(page);
  try {
    for (const [i, question] of exam.questions.entries()) {
      const variants: Record<string, JavaFiles> = {
        starter: question.starter,
        solution: loadSolution(dirs[i]),
        ...loadBrokenVariants(dirs[i]),
      };
      for (const [name, files] of Object.entries(variants)) {
        const expected = await gradeQuestion(local, question, files);
        const actual = await gradeQuestion(browser, question, files);
        if (name.startsWith("broken")) {
          // Thread races can land on different cases in each JVM; what matters is that
          // the browser, too, fails the broken solution on at least one hidden case.
          expect(actual.cases.some((c) => !c.sample && !c.passed), `${question.id} ${name} fails a hidden case`).toBe(true);
        } else {
          expect(summary(actual), `${question.id} ${name}`).toEqual(summary(expected));
        }
      }
    }
  } finally {
    await local.close();
  }
});

// ---- the Swing fakes ----------------------------------------------------------------

const EVERYTHING: Question = {
  id: "e2e/swing-everything",
  meta: { title: "Everything", points: 5, editable: ["EverythingPanel.java"], readOnly: [], swingPanel: "EverythingPanel" },
  description: "",
  starter: {},
  given: {},
  harness: { "Harness.java": readFileSync("e2e/fixtures/swing/Harness.java", "utf8") },
  tests: {
    kind: "harness",
    cases: ["builds", "clicksAndTyping", "enterInTheField", "disabledAndCleared", "removing"].map((call) => ({ name: call, points: 1, call })),
  },
};
const EVERYTHING_FILES = { "EverythingPanel.java": readFileSync("e2e/fixtures/swing/EverythingPanel.java", "utf8") };

async function checkEverything(java: JavaBackend) {
  const result = await gradeQuestion(java, EVERYTHING, EVERYTHING_FILES);
  expect(result.compiled, result.compileOutput).toBe(true);
  expect(result.cases.filter((c) => !c.passed).map((c) => `${c.name}: ${c.reason}`)).toEqual([]);
}

test("the Swing fakes cover the panel, button, label and text field methods students use (JDK)", async () => {
  const java = new LocalJava();
  try {
    await checkEverything(java);
  } finally {
    await java.close();
  }
});

test("the Swing fakes cover the panel, button, label and text field methods students use (browser)", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await checkEverything(await inBrowser(page));
});

// ---- Run draws a Swing question's panel ------------------------------------------------

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

const Q1 = "cs180/midterm-3/slot-01/variant-a";

test("Run on the Swing question draws the panel: buttons click and the label follows", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await openExam(page, "/exams/cs180/midterm-3#1");
  await setFile(page, `${Q1}/LapCounterPanel.java`, readFileSync(join("content", Q1, "solution", "LapCounterPanel.java"), "utf8"));
  await page.getByTestId("run").click();
  const panel = page.getByTestId("swing-panel");
  await expect(panel).toBeVisible({ timeout: JVM_START_TIMEOUT });
  const label = panel.getByTestId("swing-label");
  await expect(label).toHaveText("Laps: 0");
  await panel.getByRole("button", { name: "Add lap" }).click();
  await expect(label).toHaveText("Laps: 1");
  await panel.getByRole("button", { name: "Add lap" }).click();
  await expect(label).toHaveText("Laps: 2");
  await panel.getByRole("button", { name: "Reset" }).click();
  await expect(label).toHaveText("Laps: 0");
  await panel.getByTestId("swing-close").click();
  await expect(page.getByTestId("console-output")).toContainText("[Panel closed]");
});

test("Run on the Swing question: text fields type, disabled buttons stay put", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await openExam(page, "/exams/cs180/midterm-3#1");
  // Any panel the student writes is drawn, here one with a text field.
  await setFile(
    page,
    `${Q1}/LapCounterPanel.java`,
    `import javax.swing.*;
public class LapCounterPanel extends JPanel {
    JTextField laps = new JTextField(4);
    JButton add = new JButton("Add");
    JButton never = new JButton("Never");
    JLabel total = new JLabel("Total: 0");
    int sum;
    public LapCounterPanel() {
        add(laps);
        add(add);
        add(never);
        add(total);
        never.setEnabled(false);
        add.addActionListener(e -> {
            sum += Integer.parseInt(laps.getText().trim());
            total.setText("Total: " + sum);
            laps.setText("");
        });
    }
}
`,
  );
  await page.getByTestId("run").click();
  const panel = page.getByTestId("swing-panel");
  await expect(panel).toBeVisible({ timeout: JVM_START_TIMEOUT });
  await expect(panel.getByRole("button", { name: "Never" })).toBeDisabled();
  await panel.getByTestId("swing-field").fill("3");
  await panel.getByRole("button", { name: "Add" }).click();
  await expect(panel.getByTestId("swing-label")).toHaveText("Total: 3");
  await expect(panel.getByTestId("swing-field")).toHaveValue("");
  await panel.getByTestId("swing-field").fill(" 4 ");
  await panel.getByRole("button", { name: "Add" }).click();
  await expect(panel.getByTestId("swing-label")).toHaveText("Total: 7");
});

