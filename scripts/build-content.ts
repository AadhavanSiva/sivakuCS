// npm run content: bundles content/ into generated/content.json, which the
// site imports (lib/content/index.ts). Only what students may see goes in:
// descriptions, starter and given files, tests and harnesses, reference
// sheets. Solutions and broken variants never leave content/.
//
// Runs automatically before `npm run dev` and `npm run build`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { examDirs, loadExam } from "../lib/content/load";
import type { Exam } from "../lib/content/types";

const exams: Exam[] = examDirs().map((dir) => loadExam(dir));
const out = join(process.cwd(), "generated");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "content.json"), JSON.stringify({ exams }) + "\n");
const questions = exams.reduce((n, exam) => n + exam.questions.length, 0);
console.log(`generated/content.json: ${exams.length} exam(s), ${questions} question(s)`);
