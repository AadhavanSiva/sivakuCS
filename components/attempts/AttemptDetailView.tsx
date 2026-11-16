"use client";

import { useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { LocalTime } from "@/components/LocalTime";
import { Testcases } from "@/components/Testcases";
import type { GradeResult } from "@/lib/grading/types";

export type QuestionView = {
  id: string;
  title: string;
  maxPoints: number;
  /** The question's result in this attempt; null if it was never tested or submitted. */
  result: GradeResult | null;
  /** The last code sent for this question, from whichever attempt sent it last. */
  code: { files: Record<string, string>; fromThisAttempt: boolean; submittedAt: number } | null;
};

/** One attempt's questions, each opening to its test cases and the last code submitted for it. */
export function AttemptDetailView({ questions }: { questions: QuestionView[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div data-theme="exam" className="overflow-hidden rounded border border-[#3c3c3c] bg-[#1f1f1f] text-neutral-200">
      {questions.map((q, i) => {
        const isOpen = open[q.id] ?? false;
        return (
          <Collapsible
            key={q.id}
            title={q.title}
            testid={`attempt-q${i + 1}`}
            open={isOpen}
            onToggle={() => setOpen({ ...open, [q.id]: !isOpen })}
            aside={
              <span data-testid="question-points" className="font-mono text-[13px] tabular-nums text-neutral-300">
                {q.result ? `${q.result.score} / ${q.result.maxScore}` : `– / ${q.maxPoints}`}
              </span>
            }
          >
            <div className="flex flex-col gap-4">
              {q.result ? (
                <Testcases result={q.result} />
              ) : (
                <p className="text-sm text-neutral-400">Not tested or submitted in this attempt.</p>
              )}
              <section data-testid="last-code" className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-neutral-300">Last submitted code</h3>
                {q.code ? (
                  <>
                    <p className="text-xs text-neutral-500">
                      {q.code.fromThisAttempt ? "From this attempt" : "From a later attempt"}, sent{" "}
                      <LocalTime ms={q.code.submittedAt} />. Only your latest code for each question is kept.
                    </p>
                    {Object.entries(q.code.files).map(([name, text]) => (
                      <div key={name}>
                        <p className="font-mono text-[12px] text-neutral-400">{name}</p>
                        <pre
                          data-testid="code-file"
                          data-name={name}
                          className="max-h-96 overflow-auto rounded border border-neutral-500/30 bg-black/30 p-3 font-mono text-[12px] leading-relaxed"
                        >
                          {text || "(empty)"}
                        </pre>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-neutral-500">No code submitted for this question yet.</p>
                )}
              </section>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
