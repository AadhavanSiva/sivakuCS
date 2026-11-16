import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUserId } from "@/auth";
import { Results } from "@/components/results/Results";
import { getExam, listExams } from "@/lib/content";

type Params = { course: string; exam: string };

export function generateStaticParams(): Params[] {
  return listExams().map((exam) => {
    const [course, name] = exam.id.split("/");
    return { course, exam: name };
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { course, exam } = await params;
  const found = getExam(`${course}/${exam}`);
  return { title: found ? `Results: ${found.meta.title} · sivakuCS` : "sivakuCS" };
}

// As on the exam page: the URL is read only behind Suspense.
export default function ResultsPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#1e1e1e]" aria-busy="true" />}>
      <ExamResults params={params} />
    </Suspense>
  );
}

async function ExamResults({ params }: { params: Promise<Params> }) {
  const { course, exam } = await params;
  const found = getExam(`${course}/${exam}`);
  if (!found) notFound();
  const userId = await currentUserId();
  if (!userId) redirect("/");
  return <Results exam={found} userId={userId} />;
}
