import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUserId } from "@/auth";
import { AttemptDetailView, type QuestionView } from "@/components/attempts/AttemptDetailView";
import { LocalTime } from "@/components/LocalTime";
import { SiteHeader } from "@/components/SiteHeader";
import { getExam } from "@/lib/content";
import { getAttemptDetail } from "@/lib/db/attempts";
import { getDb } from "@/lib/db/pool";
import type { GradeResult } from "@/lib/grading/types";

export const metadata: Metadata = { title: "Attempt · sivakuCS" };

export default function AttemptPage({ params }: PageProps<"/attempts/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <Link href="/attempts" className="text-sm underline">
          ← My attempts
        </Link>
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <Attempt params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function Attempt({ params }: { params: PageProps<"/attempts/[id]">["params"] }) {
  const [{ id }, userId] = await Promise.all([params, currentUserId()]);
  if (!userId) redirect("/");
  // Only the signed-in user's own attempts: anyone else's id is "not found".
  const detail = await getAttemptDetail(getDb(), userId, id);
  if (!detail) notFound();
  const { attempt, results, lastCode } = detail;
  const exam = getExam(attempt.examId);

  // The exam's questions in order (or, if the exam has since been removed, whatever was stored).
  const questionIds = exam ? exam.questions.map((q) => q.id) : [...new Set([...results.map((r) => r.questionId), ...lastCode.map((c) => c.questionId)])];
  const questions: QuestionView[] = questionIds.map((questionId, i) => {
    const question = exam?.questions.find((q) => q.id === questionId);
    const stored = results.find((r) => r.questionId === questionId);
    const code = lastCode.find((c) => c.questionId === questionId);
    const result: GradeResult | null = stored
      ? {
          compiled: stored.compiled,
          compileOutput: stored.compiled ? undefined : "This code did not compile. (Compiler messages are not stored.)",
          cases: stored.cases.map((c) => ({
            ...c,
            sample: question?.tests.cases.find((t) => t.name === c.name)?.sample ?? false,
          })),
          passed: stored.cases.filter((c) => c.passed).length,
          total: stored.cases.length,
          score: stored.points,
          maxScore: stored.maxPoints,
        }
      : null;
    return {
      id: questionId,
      title: `Q${i + 1}: ${question?.meta.title ?? questionId}`,
      maxPoints: question?.meta.points ?? stored?.maxPoints ?? 0,
      result,
      code: code ? { files: code.files, fromThisAttempt: code.attemptId === attempt.id, submittedAt: code.submittedAt } : null,
    };
  });

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{exam?.meta.title ?? attempt.examId}</h1>
        <p data-testid="attempt-total" className="text-3xl font-semibold tabular-nums">
          {attempt.submittedAt === null ? "Not submitted" : `${attempt.score} / ${attempt.maxScore} points`}
        </p>
        <p className="text-sm text-neutral-500">
          Started <LocalTime ms={attempt.startedAt} />
          {attempt.submittedAt !== null && (
            <>
              {" "}
              · submitted <LocalTime ms={attempt.submittedAt} />
            </>
          )}
          {attempt.timed ? " · timed" : " · untimed"}
          {attempt.automatic && " · submitted automatically when time ran out"}
        </p>
        {attempt.submittedAt === null && (
          <p className="text-sm text-neutral-500">The points below are from the last Test of each question.</p>
        )}
      </header>
      <AttemptDetailView questions={questions} />
    </>
  );
}
