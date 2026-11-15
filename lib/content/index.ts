// Exams for the site, from generated/content.json (built from content/ by
// `npm run content`; see scripts/build-content.ts). A static import rather
// than reading content/ at runtime, so the deployed site never contains
// solutions and its server bundle does not trace the whole project.
import bundle from "@/generated/content.json";
import type { Exam } from "./types";

// The JSON's inferred types (kind: string, readOnly: never[]) are narrower
// or wider than the declared ones; scripts/build-content.ts writes Exam[].
const exams = (bundle as unknown as { exams: Exam[] }).exams;

export function listExams(): Exam[] {
  return exams;
}

/** An exam by its id, "<course>/<exam>". */
export function getExam(id: string): Exam | undefined {
  return exams.find((exam) => exam.id === id);
}
