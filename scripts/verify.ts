// npm run verify: every question is well formed, every reference solution
// passes all its tests, and every broken/ solution fails at least one
// hidden case. Grades on the local JDK 25 with the same code the browser
// uses (lib/grading/grade.ts over the sandbox jar). Exits 1 on any problem.
//
//   npm run verify                    all exams under content/
//   npm run verify -- cs180/samples   only exams or questions under this path
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_ROOT,
  examDirs,
  loadBrokenVariants,
  loadExam,
  loadQuestion,
  loadSolution,
  questionDirs,
  readFiles,
  type ExamMeta,
} from "../lib/content/load";
import { gradeQuestion } from "../lib/grading/grade";
import type { GradeResult, Question } from "../lib/grading/types";
import { LocalJava, localJavaMajor } from "./lib/local-java";
import { realJunitOutcomes } from "./lib/real-junit";

const filter = process.argv[2]?.replace(/\\/g, "/");

type Problems = string[];

function checkExam(dir: string, meta: ExamMeta, questionPoints: number[], problems: Problems) {
  if (typeof meta.title !== "string" || !meta.title) problems.push("exam.json: needs a title");
  if (!(meta.minutes > 0)) problems.push("exam.json: minutes must be a positive number");
  if (typeof meta.instructions !== "string") problems.push("exam.json: needs instructions");
  if (!existsSync(join(dir, "reference.md"))) problems.push("reference.md is missing");
  if (questionPoints.length === 0) problems.push("no questions (folders named like 01-some-name or slot-01/variant-a)");
  const total = questionPoints.reduce((a, b) => a + b, 0);
  if (!meta.draft && total !== 100) problems.push(`questions are worth ${total} points in all; an exam must total 100`);
}

function checkQuestion(dir: string, question: Question, problems: Problems) {
  const { meta, tests } = question;
  for (const file of ["question.md", "meta.json", "tests.json"]) {
    if (!existsSync(join(dir, file))) problems.push(`${file} is missing`);
  }
  if (!meta.title) problems.push("meta.json: needs a title");
  if (!Number.isInteger(meta.points) || meta.points < 4 || meta.points > 18) {
    problems.push(`meta.json: points is ${meta.points}; a question is worth 4 to 18`);
  }
  if (!Array.isArray(meta.editable) || meta.editable.length === 0) problems.push("meta.json: editable lists no files");
  if (!Array.isArray(meta.readOnly)) problems.push("meta.json: readOnly must be a list (it may be empty)");

  const solution = readFiles(join(dir, "solution"));
  for (const name of meta.editable ?? []) {
    if (!(name in question.starter)) problems.push(`starter/${name} is missing`);
    if (!(name in solution)) problems.push(`solution/${name} is missing`);
  }
  for (const name of meta.readOnly ?? []) {
    if (!(name in question.given)) problems.push(`given/${name} is missing (listed in readOnly)`);
  }
  for (const [set, files] of Object.entries(question.alternates ?? {})) {
    for (const name of Object.keys(files)) {
      if (!(name in question.given)) problems.push(`alternates/${set}/${name} does not replace a given file`);
    }
  }
  for (const c of question.tests.cases ?? []) {
    if (c.against && !question.alternates?.[c.against]) problems.push(`tests.json: ${c.name} is against alternates/${c.against}/, which is missing`);
  }
  for (const name of Object.keys(question.helpers ?? {})) {
    if (name in question.given || meta.editable?.includes(name)) problems.push(`helpers/${name} is also a given or editable file`);
  }
  for (const name of Object.keys(question.given)) {
    if (!meta.readOnly?.includes(name)) problems.push(`given/${name} is not listed in readOnly`);
    if (meta.editable?.includes(name)) problems.push(`${name} is both editable and given`);
  }

  if (!["stdio", "files", "harness", "junit"].includes(tests.kind)) problems.push(`tests.json: unknown kind "${tests.kind}"`);
  const cases = tests.cases ?? [];
  // Names are free-form ("Sample run from the handout: the Count line",
  // "Case 1.2"); "sample": true marks the cases whose failures say why.
  if (!cases.some((c) => c.sample)) problems.push('tests.json: needs at least one case with "sample": true');
  if (!cases.some((c) => !c.sample)) problems.push("tests.json: needs at least one hidden case");
  const names = new Set<string>();
  cases.forEach((c, i) => {
    if (typeof c.name !== "string" || !c.name.trim()) problems.push(`tests.json: case ${i + 1} has no name`);
    else if (names.has(c.name)) problems.push(`tests.json: two cases are named "${c.name}"`);
    names.add(c.name);
    if (!Number.isInteger(c.points) || c.points < 0) problems.push(`tests.json: ${c.name} must be worth a whole number of points`);
    const line = c.outputLine;
    if (line && (!Number.isInteger(line.number) || line.number === 0 || typeof line.text !== "string")) {
      problems.push(`tests.json: ${c.name} has an outputLine without a line number (from 1, or -1 for the last) and its text`);
    }
    const labelled = c.labelledLines;
    const groups = Array.isArray(labelled) ? labelled : labelled ? [labelled] : [];
    const wellFormed = (g: { prefix: string; lines: string[] }) =>
      typeof g?.prefix === "string" && g.prefix !== "" && Array.isArray(g.lines) &&
      g.lines.every((l) => typeof l === "string" && l.startsWith(g.prefix));
    if (labelled !== undefined && (groups.length === 0 || !groups.every(wellFormed))) {
      problems.push(`tests.json: ${c.name} needs labelledLines with a prefix and lines that each start with it`);
    }
    const checksOutput = c.stdout !== undefined || line !== undefined || labelled !== undefined;
    if (tests.kind === "stdio" && !checksOutput) problems.push(`tests.json: ${c.name} checks neither stdout nor an outputLine`);
    if (tests.kind === "files" && !c.outputFiles && !checksOutput) {
      problems.push(`tests.json: ${c.name} checks neither files nor output`);
    }
    if (tests.kind === "harness" && !c.call) problems.push(`tests.json: ${c.name} has no "call"`);
    if (tests.kind === "junit") {
      if (!c.implementation || !question.implementations?.[c.implementation]) {
        problems.push(`tests.json: ${c.name} needs an implementation in implementations/`);
      }
      if (c.expect !== "pass" && c.expect !== "catch") problems.push(`tests.json: ${c.name} needs "expect": "pass" or "catch"`);
    }
  });
  if (tests.kind === "junit") {
    if (!tests.testClass) problems.push("tests.json: a junit question needs testClass");
    if (!cases.some((c) => c.expect === "pass")) problems.push("tests.json: a junit question needs a pass-on-correct case");
  }
  if (meta.reference && !question.reference) problems.push(`meta.json: reference sheet sheets/${meta.reference}.md is missing`);
  if (meta.warmUp && !(`${meta.warmUp}.java` in (question.helpers ?? {}))) {
    problems.push(`helpers/${meta.warmUp}.java is missing (meta.json warmUp)`);
  }
  const casePoints = cases.reduce((sum, c) => sum + c.points, 0);
  if (casePoints !== meta.points) problems.push(`tests.json: cases are worth ${casePoints}, but meta.json says ${meta.points}`);
  if (tests.kind === "harness" && Object.keys(question.harness).length === 0) problems.push("harness/ is empty");
}

function describe(result: GradeResult): string {
  if (!result.compiled) return `does not compile:\n${indent(result.compileOutput ?? "")}`;
  const failed = result.cases.filter((c) => !c.passed);
  return failed.map((c) => `${c.name}: ${c.reason ?? "failed"}`).join("\n");
}

const indent = (text: string) => text.trimEnd().replace(/^/gm, "      ");

async function main() {
  const major = localJavaMajor();
  if (major !== 25) {
    console.error(`npm run verify needs JDK 25 (javac on PATH or JAVA_HOME); found ${major || "none"}.`);
    process.exit(1);
  }

  const java = new LocalJava();
  let failures = 0;
  let questionsChecked = 0;
  try {
    for (const examDir of examDirs()) {
      const exam = loadExam(examDir);
      const inScope = (id: string) => !filter || id.startsWith(filter) || filter.startsWith(id);
      if (!inScope(exam.id)) continue;

      const examProblems: Problems = [];
      checkExam(examDir, exam.meta, exam.questions.map((q) => q.meta.points), examProblems);
      console.log(`\n${exam.id}: ${exam.meta.title}${exam.meta.draft ? " (draft)" : ""}`);
      for (const problem of examProblems) console.log(`  ✗ ${problem}`);
      failures += examProblems.length;

      // Every variant of every slot, not only the one the exam serves, so a
      // variant is verified before it is ever swapped in.
      const slotPoints = new Map<string, number>();
      for (const dir of questionDirs(examDir, { allVariants: true })) {
        const question = loadQuestion(dir);
        if (filter && !question.id.startsWith(filter) && !filter.startsWith(question.id) && filter !== exam.id) continue;
        questionsChecked++;
        const problems: Problems = [];
        checkQuestion(dir, question, problems);

        // Variants of a slot are worth the same, so the exam's total does not depend on which is served.
        const slot = /^(.*\/slot-\d{2})\/variant-/.exec(question.id)?.[1];
        if (slot) {
          const points = slotPoints.get(slot);
          if (points === undefined) slotPoints.set(slot, question.meta.points);
          else if (points !== question.meta.points) {
            problems.push(`meta.json: worth ${question.meta.points}, but the slot's first variant is worth ${points}`);
          }
        }

        if (problems.length === 0) {
          const solution = await gradeQuestion(java, question, loadSolution(dir));
          if (solution.passed !== solution.total) problems.push(`solution/ fails:\n${indent(describe(solution))}`);
          if (question.tests.kind === "junit") {
            // The starter is one test that passes on the correct class and catches nothing.
            const starter = await gradeQuestion(java, question, question.starter);
            const passPoints = question.tests.cases.filter((c) => c.expect === "pass").reduce((sum, c) => sum + c.points, 0);
            if (starter.score !== passPoints) problems.push(`starter/ scores ${starter.score}; it must score exactly ${passPoints}`);
          }

          const variants = loadBrokenVariants(dir);
          if (Object.keys(variants).length === 0) problems.push("broken/ has no deliberately wrong solution");
          for (const [name, files] of Object.entries(variants)) {
            const extra = Object.keys(files).filter((f) => !question.meta.editable.includes(f));
            if (extra.length) problems.push(`${name}/ has files that are not editable: ${extra.join(", ")}`);
            const broken = await gradeQuestion(java, question, files);
            const hiddenFailed = broken.cases.some((c) => !c.sample && !c.passed);
            if (!hiddenFailed) problems.push(`${name}/ passes every hidden case; it must fail at least one`);
          }
          // The small JUnit runner must score every suite as real JUnit does.
          if (question.tests.kind === "junit") {
            const suites = { solution: loadSolution(dir), starter: question.starter, ...variants };
            for (const [name, files] of Object.entries(suites)) {
              const small = (await gradeQuestion(java, question, files)).cases.map((c) => c.passed);
              const real = await realJunitOutcomes(question, files);
              if (JSON.stringify(small) !== JSON.stringify(real)) {
                problems.push(`${name}: the small runner and real JUnit disagree (small ${JSON.stringify(small)}, JUnit ${JSON.stringify(real)})`);
              }
            }
          }
        }

        const label = `${question.id.slice(exam.id.length + 1)} (${question.meta.points} pts, ${question.tests.kind})`;
        if (problems.length === 0) {
          console.log(`  ✓ ${label}`);
        } else {
          failures += problems.length;
          console.log(`  ✗ ${label}`);
          for (const problem of problems) console.log(`      ${problem.replace(/\n/g, "\n      ")}`);
        }
      }
    }
  } finally {
    await java.close();
  }

  if (questionsChecked === 0) {
    console.error(`\nNo questions found${filter ? ` under ${filter}` : ""} in ${CONTENT_ROOT}.`);
    process.exit(1);
  }
  console.log(failures === 0 ? `\nAll ${questionsChecked} questions verified.` : `\n${failures} problem(s).`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
