// The question format (content/<course>/<exam>/<nn-slug>/) and grading results.
import type { JavaFiles } from "../java/programs";

export type TestKind = "stdio" | "files" | "harness";

/** meta.json */
export type QuestionMeta = {
  title: string;
  /** Sum of the case points; 5 to 13 per question, 100 per exam. */
  points: number;
  /** Files the student edits; their starting text is in starter/. */
  editable: string[];
  /** Files shown as locked tabs; their text is in given/. */
  readOnly: string[];
  /** Class whose main the Run button and stdio/files tests start. Default "Main". */
  mainClass?: string;
  /** Harness tests: the class in harness/ whose methods are the cases. Default "Harness". */
  harnessClass?: string;
};

/** One entry in tests.json. The first is "Sample from the handout", worth 0. */
export type TestCase = {
  name: string;
  points: number;
  /** stdio and files: standard input. */
  stdin?: string;
  /** stdio: the exact expected output. files: optional; checked only if given. */
  stdout?: string;
  /** files: placed in the working directory before the run. Leave out for none. */
  inputFiles?: JavaFiles;
  /** files: expected contents after the run; null means the file must not exist. */
  outputFiles?: Record<string, string | null>;
  /** harness: the public static no-argument method of the harness class to call. */
  call?: string;
};

/** tests.json */
export type TestsFile = {
  kind: TestKind;
  /** Per case, the program's own running time. Default 5000. */
  timeLimitMs?: number;
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
  tests: TestsFile;
};

export type CaseResult = {
  name: string;
  points: number;
  /** The first case, shown with its reason; hidden cases show only pass or fail. */
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
