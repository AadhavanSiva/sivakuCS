"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { Testcases } from "@/components/Testcases";
import { DIALOG_DANGER, DIALOG_SECONDARY, Dialog } from "@/components/workspace/Dialog";
import { type AttemptState, clearAttempt, loadAttempt } from "@/lib/attempt-storage";
import type { Exam } from "@/lib/content/types";

/**
 * After Submit: the total out of the exam's points, then each question's
 * points and test cases, laid out like the Feedback panel.
 */
export function Results({ exam }: { exam: Exam }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setAttempt(loadAttempt(exam.id));
  }, [exam.id]);

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
                  clearAttempt(exam.id);
                  router.push(`/exams/${exam.id}#0`);
                }}
              >
                Start again
              </button>
            </>
          }
        >
          <p>Your submitted code and results for this exam are cleared, and you start from the beginning.</p>
        </Dialog>
      )}
    </main>
  );
}
