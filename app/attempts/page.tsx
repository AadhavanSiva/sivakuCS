import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUserId } from "@/auth";
import { LocalTime } from "@/components/LocalTime";
import { SiteHeader } from "@/components/SiteHeader";
import { getExam } from "@/lib/content";
import { listAttempts } from "@/lib/db/attempts";
import { getDb } from "@/lib/db/pool";

export const metadata: Metadata = { title: "My attempts · sivakuCS" };

export default function AttemptsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">My attempts</h1>
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <AttemptList />
        </Suspense>
      </main>
    </>
  );
}

async function AttemptList() {
  const userId = await currentUserId();
  if (!userId) redirect("/");
  const attempts = await listAttempts(getDb(), userId);
  if (attempts.length === 0) {
    return (
      <p data-testid="no-attempts" className="text-neutral-500">
        No attempts yet. Start one from the{" "}
        <Link href="/exams" className="underline">
          practice exams
        </Link>
        .
      </p>
    );
  }
  return (
    <ul data-testid="attempt-list" className="flex flex-col gap-3">
      {attempts.map((a) => (
        <li key={a.id}>
          <Link
            href={`/attempts/${a.id}`}
            data-testid="attempt"
            data-attempt-id={a.id}
            className="flex items-center justify-between gap-4 rounded border border-neutral-500/40 p-4 hover:border-emerald-600"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{getExam(a.examId)?.meta.title ?? a.examId}</span>
              <span className="text-sm text-neutral-500">
                Started <LocalTime ms={a.startedAt} /> · {a.timed ? "timed" : "untimed"}
                {a.submittedAt === null ? " · not submitted" : a.automatic ? " · submitted when time ran out" : ""}
              </span>
            </span>
            <span data-testid="attempt-score" className="shrink-0 font-mono tabular-nums">
              {a.submittedAt === null ? "—" : `${a.score} / ${a.maxScore}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
