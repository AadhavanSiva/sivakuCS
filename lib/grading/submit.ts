// Grading a whole exam at submission: every question's code as it stands,
// with the same grader as the Test button.
import type { JavaBackend } from "../java/backend";
import type { JavaFiles } from "../java/programs";
import type { Exam } from "../content/types";
import { gradeQuestion } from "./grade";
import type { GradeResult } from "./types";

export type ExamResults = {
  /** Each question's editable files as submitted (starter text where untouched). */
  files: Record<string, JavaFiles>;
  results: Record<string, GradeResult>;
  score: number;
  /** The exam's points: every question's, whether or not it was attempted. */
  maxScore: number;
};

/** The editable files of a question: the student's, or the starter where they have none. */
export function submittedFiles(exam: Exam, studentFiles: Record<string, JavaFiles>): Record<string, JavaFiles> {
  return Object.fromEntries(
    exam.questions.map((q) => [
      q.id,
      Object.fromEntries(q.meta.editable.map((name) => [name, studentFiles[q.id]?.[name] ?? q.starter[name] ?? ""])),
    ]),
  );
}

export async function gradeExam(
  java: JavaBackend,
  exam: Exam,
  studentFiles: Record<string, JavaFiles>,
  onProgress?: (questionNumber: number) => void,
): Promise<ExamResults> {
  const files = submittedFiles(exam, studentFiles);
  const results: Record<string, GradeResult> = {};
  for (const [i, question] of exam.questions.entries()) {
    onProgress?.(i + 1);
    results[question.id] = await gradeQuestion(java, question, files[question.id]);
  }
  return {
    files,
    results,
    score: Object.values(results).reduce((sum, r) => sum + r.score, 0),
    maxScore: exam.questions.reduce((sum, q) => sum + q.meta.points, 0),
  };
}
