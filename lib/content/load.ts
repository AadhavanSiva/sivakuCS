// Reads exams and questions from content/ with the filesystem. For scripts
// and tests only (npm run verify, npm run content, the browser tests); the
// site itself imports the generated bundle through lib/content/index.ts, so
// solutions and broken variants are never part of what it deploys.
//
//   content/<course>/<exam>/exam.json        title, minutes, instructions
//   content/<course>/<exam>/reference.md     reference sheet for the whole exam
//   content/<course>/<exam>/<nn-slug>/       one question; see lib/grading/types.ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
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

/** Question folders in an exam, in order: those named like "01-something". */
export function questionDirs(examDir: string): string[] {
  return readdirSync(examDir)
    .filter((name) => /^\d{2}-[a-z0-9-]+$/.test(name) && statSync(join(examDir, name)).isDirectory())
    .sort()
    .map((name) => join(examDir, name));
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

export function loadQuestion(dir: string, root = CONTENT_ROOT): Question {
  return {
    id: idOf(dir, root),
    meta: readJson<QuestionMeta>(join(dir, "meta.json")),
    description: readFileSync(join(dir, "question.md"), "utf8"),
    starter: readFiles(join(dir, "starter")),
    given: readFiles(join(dir, "given")),
    harness: readFiles(join(dir, "harness")),
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
