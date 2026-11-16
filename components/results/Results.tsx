"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { Testcases } from "@/components/Testcases";
import { DIALOG_DANGER, DIALOG_SECONDARY, Dialog } from "@/components/workspace/Dialog";
import { attemptInput, submissionInput } from "@/lib/account-payload";
import { recordSubmissionAction } from "@/lib/actions/attempts";
import { type AttemptState, clearAttempt, loadAttempt, saveAttempt } from "@/lib/attempt-storage";
import type { Exam } from "@/lib/content/types";

/**
 * After Submit: the total out of the exam's points, then each question's
 * points and test cases, laid out like the Feedback panel. Read from this
 * browser, where the full results (with the sample cases' reasons) are;
 * My attempts has the copy saved to the account.
 */
export function Results({ exam, userId }: { exam: Exam; userId: string }) {
  const router = useRouter();
  const which = useMemo(() => ({ userId, examId: exam.id }), [userId, exam.id]);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setAttempt(loadAttempt(which));
  }, [which]);

  /** Saves a submission that did not reach the account when it was made. */
  async function saveToAccount() {
    const info = attempt && attemptInput(exam.id, attempt);
    if (!attempt?.submission || !info) return;
    setSaving(true);
    setSaveError(null);
    const result = await recordSubmissionAction(submissionInput(info, attempt.submission)).catch(() => null);
    setSaving(false);
    if (result?.ok) {
      const next = { ...attempt, submission: { ...attempt.submission, saved: true } };
      saveAttempt(which, next);
      setAttempt(next);
    } else {
      setSaveError(result && !result.ok ? result.error : "The server could not be reached.");
    }
  }

  if (!attempt) return <main data-theme="exam" className="flex-1 bg-[#1e1e1e]" aria-busy="true" />;

  const submission = attempt.submission;
  return (
    <main data-theme="exam" className="flex-1 overflow-y-auto bg-[#1e1e1e] text-neutral-200">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <header>
          <p className="text-sm text-neutral-400">Results</p>
          <h1 className="text-2xl font-semibold text-neutral-100">{exam.meta.title}</h1>
        </header>

        {!submission ? (
          <p data-testid="not-submitted">
            This exam has not been submitted yet.{" "}
            <Link href={`/exams/${exam.id}`} className="underline">
              Back to the exam
            </Link>
          </p>
        ) : (
          <>
            <section className="flex flex-col gap-1">
              <p data-testid="results-total" className="text-4xl font-semibold tabular-nums text-neutral-100">
                {submission.score} / {submission.maxScore} points
              </p>
              <p data-testid="results-when" className="text-sm text-neutral-400">
                Submitted {new Date(submission.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                {attempt.timer?.timed ? " · timed" : " · untimed"}
                {submission.automatic && " · submitted automatically when time ran out"}
              </p>
              {submission.saved === false ? (
                <p data-testid="results-unsaved" className="mt-2 text-sm text-amber-300">
                  Not saved to your account yet{saveError ? `: ${saveError}` : "."}{" "}
                  <button type="button" className="underline disabled:opacity-50" disabled={saving} onClick={() => void saveToAccount()}>
                    {saving ? "Saving…" : "Try again"}
                  </button>
                </p>
              ) : (
                <p data-testid="results-saved" className="text-sm text-neutral-400">
                  Saved to{" "}
                  <Link href="/attempts" className="underline">
                    My attempts
                  </Link>
                  .
                </p>
              )}
            </section>

            <div className="overflow-hidden rounded border border-[#3c3c3c] bg-[#1f1f1f]">
              {exam.questions.map((question, i) => {
                const result = submission.results[question.id];
                if (!result) return null;
                const isOpen = open[question.id] ?? false;
                return (
                  <Collapsible
                    key={question.id}
                    title={`Q${i + 1}: ${question.meta.title}`}
                    testid={`result-q${i + 1}`}
                    open={isOpen}
                    onToggle={() => setOpen({ ...open, [question.id]: !isOpen })}
                    aside={
                      <span data-testid="question-points" className="font-mono text-[13px] tabular-nums text-neutral-300">
                        {result.score} / {result.maxScore}
                      </span>
                    }
                  >
                    <Testcases result={result} />
                  </Collapsible>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href={`/exams/${exam.id}#1`}
                data-testid="review-code"
                className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-500"
              >
                Review your code
              </Link>
              <button
                type="button"
                data-testid="results-new-attempt"
                className="rounded border border-[#4a4a4a] px-4 py-1.5 hover:bg-[#2d2d2d]"
                onClick={() => setConfirmingRestart(true)}
              >
                Start a new attempt
              </button>
              <Link href="/exams" className="rounded px-4 py-1.5 text-neutral-400 hover:text-neutral-200">
                All exams
              </Link>
            </div>
          </>
        )}
      </div>

      {confirmingRestart && (
        <Dialog
          title="Start a new attempt?"
          testid="restart-confirm"
          onDismiss={() => setConfirmingRestart(false)}
          actions={
            <>
              <button type="button" className={DIALOG_SECONDARY} onClick={() => setConfirmingRestart(false)}>
                Cancel
              </button>
              <button
                type="button"
                data-testid="restart-confirm-yes"
                className={DIALOG_DANGER}
                onClick={() => {
                  clearAttempt(which);
                  router.push(`/exams/${exam.id}#0`);
                }}
              >
                Start again
              </button>
            </>
          }
        >
          <p>
            You start this exam again from the beginning, with empty files. This attempt stays in My attempts.
          </p>
        </Dialog>
      )}
    </main>
  );
}
