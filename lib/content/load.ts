// Reads exams and questions from content/ with the filesystem. For scripts
// and tests only (npm run verify, npm run content, the browser tests); the
// site itself imports the generated bundle through lib/content/index.ts, so
// solutions and broken variants are never part of what it deploys.
//
//   content/<course>/<exam>/exam.json        title, minutes, instructions
//   content/<course>/<exam>/reference.md     reference sheet for the whole exam
//   content/<course>/<exam>/<nn-slug>/       one question; see lib/grading/types.ts
//   content/<course>/<exam>/slot-NN/variant-a/  or one question of a bank (questionDirs)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import type { JavaFiles } from "../java/programs";
import type { Question, QuestionMeta, TestsFile } from "../grading/types";
import type { Exam, ExamMeta } from "./types";

export type { Exam, ExamMeta };

export const CONTENT_ROOT = join(process.cwd(), "content");

export function readJson<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : error}`);
  }
}

/** Every file under `dir` by relative path with "/" separators; {} if there is no such directory. */
export function readFiles(dir: string): JavaFiles {
  const files: JavaFiles = {};
  if (!existsSync(dir)) return files;
  const walk = (current: string) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else files[relative(dir, path).split(sep).join("/")] = readFileSync(path, "utf8");
    }
  };
  walk(dir);
  return files;
}

const subdirs = (dir: string, pattern: RegExp) =>
  readdirSync(dir)
    .filter((name) => pattern.test(name) && statSync(join(dir, name)).isDirectory())
    .sort();

/** The variants of a slot folder, in order: "variant-a", "variant-b", ... */
export function variantDirs(slotDir: string): string[] {
  return subdirs(slotDir, /^variant-[a-z0-9-]+$/).map((name) => join(slotDir, name));
}

/**
 * Question folders in an exam, in order. A folder named like "01-something"
 * is one question. A folder named like "slot-01" is one question of the exam
 * with interchangeable variants in "variant-a", "variant-b", ... (a question
 * bank); the exam serves its first variant. With `allVariants`, every variant
 * of every slot, for npm run verify.
 */
export function questionDirs(examDir: string, { allVariants = false } = {}): string[] {
  return subdirs(examDir, /^(\d{2}-[a-z0-9-]+|slot-\d{2})$/).flatMap((name) => {
    const dir = join(examDir, name);
    if (!name.startsWith("slot-")) return [dir];
    const variants = variantDirs(dir);
    if (variants.length === 0) throw new Error(`${dir}: a slot needs at least one folder named like variant-a`);
    return allVariants ? variants : [variants[0]];
  });
}

/** Exam folders: content/<course>/<exam> containing an exam.json. */
export function examDirs(root = CONTENT_ROOT): string[] {
  if (!existsSync(root)) return [];
  const dirs: string[] = [];
  for (const course of readdirSync(root).sort()) {
    const courseDir = join(root, course);
    if (!statSync(courseDir).isDirectory()) continue;
    for (const exam of readdirSync(courseDir).sort()) {
      if (existsSync(join(courseDir, exam, "exam.json"))) dirs.push(join(courseDir, exam));
    }
  }
  return dirs;
}

const idOf = (dir: string, root: string) => relative(root, dir).split(sep).join("/");

/** Each subfolder of dir/name as files: alternates/<set>/, implementations/<name>/. */
const folders = (dir: string, name: string): Record<string, JavaFiles> =>
  Object.fromEntries(
    (existsSync(join(dir, name)) ? subdirs(join(dir, name), /^[a-z0-9-]+$/) : []).map((sub) => [
      sub,
      readFiles(join(dir, name, sub)),
    ]),
  );

/** The exam folder a question folder is in: the nearest one up with an exam.json. */
function examDirOf(dir: string): string | null {
  for (let d = dirname(dir); d !== dirname(d); d = dirname(d)) {
    if (existsSync(join(d, "exam.json"))) return d;
  }
  return null;
}

/** sheets/<name>.md in the question's exam folder, for a question with its own reference sheet. */
export function sheetPath(questionDir: string, name: string): string {
  return join(examDirOf(questionDir) ?? dirname(questionDir), "sheets", `${name}.md`);
}

export function loadQuestion(dir: string, root = CONTENT_ROOT): Question {
  const meta = readJson<QuestionMeta>(join(dir, "meta.json"));
  const sheet = meta.reference ? sheetPath(dir, meta.reference) : null;
  return {
    id: idOf(dir, root),
    meta,
    description: readFileSync(join(dir, "question.md"), "utf8"),
    starter: readFiles(join(dir, "starter")),
    given: readFiles(join(dir, "given")),
    harness: readFiles(join(dir, "harness")),
    helpers: readFiles(join(dir, "helpers")),
    alternates: folders(dir, "alternates"),
    implementations: folders(dir, "implementations"),
    ...(sheet && existsSync(sheet) ? { reference: readFileSync(sheet, "utf8") } : {}),
    tests: readJson<TestsFile>(join(dir, "tests.json")),
  };
}

export function loadExam(dir: string, root = CONTENT_ROOT): Exam {
  return {
    id: idOf(dir, root),
    meta: readJson<ExamMeta>(join(dir, "exam.json")),
    reference: readFileSync(join(dir, "reference.md"), "utf8"),
    questions: questionDirs(dir).map((q) => loadQuestion(q, root)),
  };
}

/** The reference solution's editable files. Never sent to the browser. */
export function loadSolution(questionDir: string): JavaFiles {
  return readFiles(join(questionDir, "solution"));
}

/**
 * Other correct solutions in different styles (solutions/<name>/: a
 * synchronized block instead of a synchronized method, a Thread subclass
 * instead of a Runnable...). Never sent to the browser; each must pass
 * every case, as solution/ does.
 */
export function loadOtherSolutions(questionDir: string): Record<string, JavaFiles> {
  return Object.fromEntries(Object.entries(folders(questionDir, "solutions")).map(([name, files]) => [`solutions/${name}`, files]));
}

/**
 * The deliberately wrong solutions: broken/ holding the editable files
 * directly is one variant; subfolders of broken/ are one variant each.
 */
export function loadBrokenVariants(questionDir: string): Record<string, JavaFiles> {
  const dir = join(questionDir, "broken");
  if (!existsSync(dir)) return {};
  const variants: Record<string, JavaFiles> = {};
  const direct: JavaFiles = {};
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) variants[`broken/${name}`] = readFiles(path);
    else direct[name] = readFileSync(path, "utf8");
  }
  if (Object.keys(direct).length > 0) variants.broken = direct;
  return variants;
}
