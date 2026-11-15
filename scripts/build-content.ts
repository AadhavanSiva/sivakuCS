// npm run content: bundles content/ into generated/content.json, which the
// site imports (lib/content/index.ts). Only what students may see goes in:
// descriptions, starter and given files, tests and harnesses, reference
// sheets. Solutions and broken variants never leave content/.
//
// Runs automatically before `npm run dev` and `npm run build`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import { parseReferenceSheet } from "../lib/autocomplete/reference-api";
import { examDirs, loadExam } from "../lib/content/load";
import type { Exam } from "../lib/content/types";

// Markdown becomes HTML here, once, rather than in every student's
// browser. The content is written by the site's authors, so the HTML is
// trusted.
const html = (markdown: string) => marked.parse(markdown, { async: false, gfm: true });

const exams: Exam[] = examDirs().map((dir) => {
  const exam = loadExam(dir);
  return {
    ...exam,
    referenceHtml: html(exam.reference),
    referenceApi: parseReferenceSheet(exam.reference),
    instructionsHtml: html(exam.meta.instructions),
    questions: exam.questions.map((q) => ({ ...q, descriptionHtml: html(q.description) })),
  };
});
const out = join(process.cwd(), "generated");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "content.json"), JSON.stringify({ exams }) + "\n");
const questions = exams.reduce((n, exam) => n + exam.questions.length, 0);
console.log(`generated/content.json: ${exams.length} exam(s), ${questions} question(s)`);
