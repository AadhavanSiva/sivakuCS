"use client";

import { useEffect } from "react";
import { StartingJava } from "@/components/StartingJava";
import type { Exam } from "@/lib/content/types";
import { preloadJava, useJavaRuntime } from "@/lib/java-runtime";

/**
 * The first slide. Java starts loading here, so it is ready by the time the
 * student reaches the first question.
 */
export function InstructionsSlide({ exam, onStart }: { exam: Exam; onStart: () => void }) {
  const { status } = useJavaRuntime();
  useEffect(preloadJava, []);

  const questions = exam.questions.length;
  const points = exam.questions.reduce((sum, q) => sum + q.meta.points, 0);
  const javaReady = status !== "idle" && status !== "starting" && status !== "failed";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#1e1e1e]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
        <header>
          <p className="text-sm text-neutral-400">Exam instructions</p>
          <h1 className="text-2xl font-semibold text-neutral-100">{exam.meta.title}</h1>
        </header>

        <ul data-testid="exam-facts" className="flex flex-wrap gap-3 text-sm">
          <Fact>{exam.meta.minutes} minutes</Fact>
          <Fact>
            {questions} {questions === 1 ? "question" : "questions"}
          </Fact>
          <Fact>{points} points</Fact>
        </ul>

        <article className="content-html" dangerouslySetInnerHTML={{ __html: exam.instructionsHtml ?? "" }} />

        <section className="content-html">
          <h2>How scoring works</h2>
          <ul>
            <li>
              Each question is worth the points shown beside it, earned from hidden test cases, usually 1 point each.
            </li>
            <li>
              The first test, <em>Sample from the handout</em>, is worth 0 points. If it fails, it tells you why. Hidden
              cases show only whether they passed.
            </li>
            <li>Code that does not compile scores 0 for that question.</li>
            <li>
              <strong>Test</strong> runs all the tests for the question and saves a checkpoint of your code.{" "}
              <strong>Run</strong> compiles and runs <code>Main.java</code> so you can try your program; it does not
              change your score.
            </li>
            <li>Your code is saved in this browser as you type.</li>
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-testid="start-exam"
            className="rounded bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-500"
            onClick={onStart}
          >
            Start
          </button>
          <StartingJava className="text-neutral-300" />
          {javaReady && (
            <p data-testid="java-ready" className="text-sm text-emerald-400">
              Java is ready.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return <li className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-1.5 text-neutral-200">{children}</li>;
}
