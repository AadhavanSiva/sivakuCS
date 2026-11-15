import { notFound } from "next/navigation";
import { getExam } from "@/lib/content";
import { GradeLab } from "./grade-lab";

// Development only: grade the sample questions in the browser, and the
// hook the browser tests use to check that in-browser grading agrees with
// `npm run verify`. Not part of the site; 404 in production builds.
export default function GradeLabPage() {
  const exam = getExam("cs180/samples");
  if (process.env.NODE_ENV === "production" || !exam) notFound();
  return <GradeLab questions={exam.questions} />;
}
