// What the workspace sends to the account (lib/actions/attempts.ts): the
// attempt, each question's editable files, and which cases passed. The
// server checks it and works out the points itself (lib/db/attempts.ts).
import type { AttemptState, Checkpoint, Submission } from "./attempt-storage";
import type { AttemptInput, CheckpointInput, OutcomeInput, SubmissionInput } from "./db/attempts";
import type { GradeResult } from "./grading/types";

/** The attempt as the account knows it; null before the timer question is answered. */
export function attemptInput(examId: string, attempt: AttemptState): AttemptInput | null {
  if (!attempt.timer) return null;
  return { id: attempt.id, examId, timed: attempt.timer.timed, startedAt: attempt.timer.startedAt };
}

const outcomeOf = (result: GradeResult): OutcomeInput => ({
  compiled: result.compiled,
  cases: result.cases.map((c) => ({ name: c.name, passed: c.passed })),
});

export function checkpointInput(attempt: AttemptInput, questionId: string, checkpoint: Checkpoint): CheckpointInput {
  return { attempt, question: { questionId, files: checkpoint.files, outcome: outcomeOf(checkpoint.result) } };
}

export function submissionInput(attempt: AttemptInput, submission: Submission): SubmissionInput {
  return {
    attempt,
    automatic: submission.automatic,
    questions: Object.entries(submission.results).map(([questionId, result]) => ({
      questionId,
      files: submission.files[questionId] ?? {},
      outcome: outcomeOf(result),
    })),
  };
}
