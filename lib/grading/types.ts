// The question format (content/<course>/<exam>/<nn-slug>/) and grading results.
import type { ApiMember } from "../autocomplete/reference-api";
import type { JavaFiles } from "../java/programs";

export type TestKind = "stdio" | "files" | "harness" | "junit";

/** meta.json */
export type QuestionMeta = {
  title: string;
  /** Sum of the case points; 4 to 18 per question (the midterms' range), 100 per exam. */
  points: number;
  /** Files the student edits; their starting text is in starter/. */
  editable: string[];
  /** Files shown as locked tabs; their text is in given/. */
  readOnly: string[];
  /** Class whose main the Run button and stdio/files tests start. Default "Main". */
  mainClass?: string;
  /** Harness tests: the class in harness/ whose methods are the cases. Default "Harness". */
  harnessClass?: string;
  /**
   * A Swing question: the student's panel class. Its JPanel, JButton,
   * JLabel and JTextField are replaced by the sandbox's fakes for Test, and
   * Run draws the panel as HTML instead of running main (sivaku.swing).
   */
  swingPanel?: string;
  /**
   * A thread question: a class in helpers/ whose static warmUp() runs the
   * student's methods once on one thread before Run and before each test.
   * CheerpJ can kill a thread the first time several threads start the same
   * code together (java/proofs/m3/threads).
   */
  warmUp?: string;
  /** The reference sheet for this question alone: sheets/<name>.md in the exam's folder. */
  reference?: string;
};

/**
 * One entry in tests.json. Names are free-form ("Sample run from the
 * handout: the Count line", "Case 1.2"); any case may be worth points.
 */
export type TestCase = {
  name: string;
  points: number;
  /**
   * A test from the handout: if it fails, the student sees why. Every other
   * case is hidden and shows only pass or fail.
   */
  sample?: boolean;
  /** stdio and files: standard input. Cases with the same input share one run. */
  stdin?: string;
  /** stdio: the exact expected output. files: optional; checked only if given. */
  stdout?: string;
  /**
   * stdio and files: one line of the output instead of all of it, for one
   * test per line (Ed's Midterm 1 pattern). number counts from 1; a
   * negative number counts from the end, so -1 is the last line.
   */
  outputLine?: { number: number; text: string };
  /**
   * stdio and files: the lines of the output that start with `prefix`, in
   * order, must be exactly `lines`; other lines are ignored. For output
   * whose surrounding lines are up to the student (a menu's wording). A list
   * checks several labels in one case; all must match.
   */
  labelledLines?: LabelledLines | LabelledLines[];
  /** files: placed in the working directory before the run. Leave out for none. */
  inputFiles?: JavaFiles;
  /** files: expected contents after the run; null means the file must not exist. */
  outputFiles?: Record<string, string | null>;
  /** harness: the public static no-argument method of the harness class to call. */
  call?: string;
  /**
   * The name of a folder in alternates/: for this case the student's code is
   * compiled again with those versions of the given files, such as a parent
   * class written differently, to show the student's subclass calls super.
   */
  against?: string;
  /**
   * junit: the hidden implementation (a folder in implementations/) the
   * student's test class runs against, and what it should do there: "pass"
   * (every test passes: the correct implementation) or "catch" (at least one
   * test fails: a buggy one). If a "pass" case fails, every case scores 0.
   */
  implementation?: string;
  expect?: "pass" | "catch";
  /**
   * harness: the case runs threads, so its outcome can depend on how they
   * are scheduled. If it fails it runs up to two more times, each in a fresh
   * class loader, and passes if any run passes (CONCURRENT_RERUNS in grade.ts).
   */
  concurrent?: boolean;
  /**
   * harness: what this case needs the student's code to reply to (for a
   * socket question, the commands it sends, or "concurrent"). Once a case
   * gets no reply to one of them (the harness throws sivaku.harness.NoReply),
   * later cases that need it fail without running.
   */
  needs?: string[];
};

/** The lines of the output that start with `prefix`, in order. */
export type LabelledLines = { prefix: string; lines: string[] };

/** tests.json */
export type TestsFile = {
  kind: TestKind;
  /** Per case, the program's own running time. Default 5000. */
  timeLimitMs?: number;
  /** junit: the student's test class, run by the sandbox's small JUnit 5 runner. */
  testClass?: string;
  cases: TestCase[];
};

/** A question as the student's browser receives it: no solution, no broken variants. */
export type Question = {
  /** "<course>/<exam>/<nn-slug>" */
  id: string;
  meta: QuestionMeta;
  /** question.md */
  description: string;
  /** question.md as HTML; added by `npm run content` for the site. */
  descriptionHtml?: string;
  starter: JavaFiles;
  given: JavaFiles;
  /** Hidden harness sources; empty unless tests.kind is "harness". */
  harness: JavaFiles;
  /**
   * helpers/: classes compiled with the student's code for Run and Test
   * but never shown as tabs, like a pre-compiled helper the student uses
   * only through its documented methods.
   */
  helpers?: JavaFiles;
  /** alternates/<name>/: other versions of given files, for cases with `against`. */
  alternates?: Record<string, JavaFiles>;
  /** junit: implementations/<name>/, the hidden classes the student's tests run against. */
  implementations?: Record<string, JavaFiles>;
  /** The question's own reference sheet (meta.reference), when it has one instead of the exam's. */
  reference?: string;
  referenceHtml?: string;
  referenceApi?: ApiMember[];
  tests: TestsFile;
};

export type CaseResult = {
  name: string;
  points: number;
  /** A sample case, shown with its reason; hidden cases show only pass or fail. */
  sample: boolean;
  passed: boolean;
  /** Why it failed, e.g. "describe a student ==> expected: <x> but was: <y>". */
  reason?: string;
  /** For output comparisons: what was expected and what the program produced. */
  expected?: string;
  actual?: string;
};

export type GradeResult = {
  compiled: boolean;
  /** javac's messages when the student's code did not compile. */
  compileOutput?: string;
  cases: CaseResult[];
  passed: number;
  total: number;
  /** Points earned; 0 if the code does not compile. */
  score: number;
  maxScore: number;
};
