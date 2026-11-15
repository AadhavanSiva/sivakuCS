import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

export default async function ExamPage({ params }: { params: Promise<Params> }) {
  const { course, exam } = await params;
  const found = getExam(`${course}/${exam}`);
  if (!found) notFound();
  return <Workspace exam={found} />;
}
