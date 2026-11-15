import type { Question } from "../grading/types";

/** exam.json */
export type ExamMeta = {
  title: string;
  /** Length of the timed attempt. */
  minutes: number;
  /** Markdown shown on the Exam Instructions slide. */
  instructions: string;
  /** Unfinished: excused from the 100-points-per-exam rule. */
  draft?: boolean;
};

/** An exam as the site serves it: no solutions, no broken variants. */
export type Exam = {
  /** "<course>/<exam>" */
  id: string;
  meta: ExamMeta;
  /** reference.md */
  reference: string;
  questions: Question[];
};
