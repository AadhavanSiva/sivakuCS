import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Workspace } from "@/components/workspace/Workspace";
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
  return { title: found ? `${found.meta.title} · sivakuCS` : "sivakuCS" };
}

// The shell does not depend on the URL; only the part that reads params
// waits for them, behind Suspense, so navigation here can be instant.
export default function ExamPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#1e1e1e]" aria-busy="true" />}>
      <ExamWorkspace params={params} />
    </Suspense>
  );
}

async function ExamWorkspace({ params }: { params: Promise<Params> }) {
  const { course, exam } = await params;
  const found = getExam(`${course}/${exam}`);
  if (!found) notFound();
  return <Workspace exam={found} />;
}
