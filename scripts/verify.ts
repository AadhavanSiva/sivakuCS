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
  loadSolution,
  questionDirs,
  readFiles,
  type ExamMeta,
} from "../lib/content/load";
import { gradeQuestion } from "../lib/grading/grade";
import type { GradeResult, Question } from "../lib/grading/types";
import { LocalJava, localJavaMajor } from "./lib/local-java";

const SAMPLE_NAME = "Sample from the handout";
const filter = process.argv[2]?.replace(/\\/g, "/");

type Problems = string[];

function checkExam(dir: string, meta: ExamMeta, questionPoints: number[], problems: Problems) {
  if (typeof meta.title !== "string" || !meta.title) problems.push("exam.json: needs a title");
  if (!(meta.minutes > 0)) problems.push("exam.json: minutes must be a positive number");
  if (typeof meta.instructions !== "string") problems.push("exam.json: needs instructions");
  if (!existsSync(join(dir, "reference.md"))) problems.push("reference.md is missing");
  if (questionPoints.length === 0) problems.push("no questions (folders named like 01-some-name)");
  const total = questionPoints.reduce((a, b) => a + b, 0);
  if (!meta.draft && total !== 100) problems.push(`questions are worth ${total} points in all; an exam must total 100`);
}

function checkQuestion(dir: string, question: Question, problems: Problems) {
  const { meta, tests } = question;
  for (const file of ["question.md", "meta.json", "tests.json"]) {
    if (!existsSync(join(dir, file))) problems.push(`${file} is missing`);
  }
  if (!meta.title) problems.push("meta.json: needs a title");
  if (!Number.isInteger(meta.points) || meta.points < 5 || meta.points > 13) {
    problems.push(`meta.json: points is ${meta.points}; a question is worth 5 to 13`);
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
  for (const name of Object.keys(question.given)) {
    if (!meta.readOnly?.includes(name)) problems.push(`given/${name} is not listed in readOnly`);
    if (meta.editable?.includes(name)) problems.push(`${name} is both editable and given`);
  }

  if (!["stdio", "files", "harness"].includes(tests.kind)) problems.push(`tests.json: unknown kind "${tests.kind}"`);
  const cases = tests.cases ?? [];
  if (cases.length < 2) problems.push("tests.json: needs the sample and at least one hidden case");
  if (cases[0] && (cases[0].name !== SAMPLE_NAME || cases[0].points !== 0)) {
    problems.push(`tests.json: the first case must be "${SAMPLE_NAME}" worth 0 points`);
  }
  cases.slice(1).forEach((c, i) => {
    if (c.name !== `Case ${i + 1}`) problems.push(`tests.json: case ${i + 2} is named "${c.name}"; expected "Case ${i + 1}"`);
    if (!Number.isInteger(c.points) || c.points < 1) problems.push(`tests.json: ${c.name} must be worth a whole number of points, at least 1`);
  });
  cases.forEach((c) => {
    if (tests.kind === "stdio" && c.stdout === undefined) problems.push(`tests.json: ${c.name} has no expected stdout`);
    if (tests.kind === "files" && !c.outputFiles && c.stdout === undefined) {
      problems.push(`tests.json: ${c.name} checks neither files nor stdout`);
    }
    if (tests.kind === "harness" && !c.call) problems.push(`tests.json: ${c.name} has no "call"`);
  });
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

      for (const [i, dir] of questionDirs(examDir).entries()) {
        const question = exam.questions[i];
        if (filter && !question.id.startsWith(filter) && !filter.startsWith(question.id) && filter !== exam.id) continue;
        questionsChecked++;
        const problems: Problems = [];
        checkQuestion(dir, question, problems);

        if (problems.length === 0) {
          const solution = await gradeQuestion(java, question, loadSolution(dir));
          if (solution.passed !== solution.total) problems.push(`solution/ fails:\n${indent(describe(solution))}`);

          const variants = loadBrokenVariants(dir);
          if (Object.keys(variants).length === 0) problems.push("broken/ has no deliberately wrong solution");
          for (const [name, files] of Object.entries(variants)) {
            const extra = Object.keys(files).filter((f) => !question.meta.editable.includes(f));
            if (extra.length) problems.push(`${name}/ has files that are not editable: ${extra.join(", ")}`);
            const broken = await gradeQuestion(java, question, files);
            const hiddenFailed = broken.cases.some((c) => !c.sample && !c.passed);
            if (!hiddenFailed) problems.push(`${name}/ passes every hidden case; it must fail at least one`);
          }
        }

        const label = `${question.id.split("/").pop()} (${question.meta.points} pts, ${question.tests.kind})`;
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
