import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { listExams } from "@/lib/content";

export const metadata: Metadata = { title: "Exams · sivakuCS" };

export default function ExamsPage() {
  const exams = listExams();
  return (
    <>
    <SiteHeader />
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Practice exams</h1>
      <ul className="flex flex-col gap-3">
        {exams.map((exam) => {
          const points = exam.questions.reduce((sum, q) => sum + q.meta.points, 0);
          return (
            <li key={exam.id}>
              <Link
                href={`/exams/${exam.id}`}
                data-testid={`exam-${exam.id}`}
                className="flex flex-col gap-1 rounded border border-neutral-500/40 p-4 hover:border-emerald-600"
              >
                <span className="font-medium">
                  {exam.meta.title}
                  {exam.meta.draft && <span className="ml-2 text-xs text-neutral-500">(samples)</span>}
                </span>
                <span className="text-sm text-neutral-500">
                  {exam.questions.length} questions · {points} points · {exam.meta.minutes} minutes
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
    </>
  );
}
