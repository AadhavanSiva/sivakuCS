"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StartingJava } from "@/components/StartingJava";
import type { TimerChoice } from "@/lib/attempt-storage";
import type { Exam } from "@/lib/content/types";
import { preloadJava, useJavaRuntime } from "@/lib/java-runtime";

/**
 * The first slide. Java starts loading here, so it is ready by the time the
 * student reaches the first question.
 */
type Props = {
  exam: Exam;
  /** The answer to the timer question, once given. */
  timer?: TimerChoice;
  submitted: boolean;
  onStart: () => void;
  onNewAttempt: () => void;
};

export function InstructionsSlide({ exam, timer, submitted, onStart, onNewAttempt }: Props) {
  const { status } = useJavaRuntime();
  useEffect(preloadJava, []);

  const questions = exam.questions.length;
  const points = exam.questions.reduce((sum, q) => sum + q.meta.points, 0);
  // Ed's Midterm 1 pattern gives the sample run's tests points; other exams make the sample worth 0.
  const samplesScore = exam.questions.some((q) => q.tests.cases.some((c) => c.sample && c.points > 0));
  const javaReady = status !== "idle" && status !== "starting" && status !== "failed";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#1e1e1e]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
        <header>
          <p className="text-sm text-neutral-400">Exam instructions</p>
          <h1 className="text-2xl font-semibold text-neutral-100">{exam.meta.title}</h1>
        </header>

        {submitted && (
          <div data-testid="submitted-note" className="flex flex-wrap items-center gap-3 rounded border border-emerald-700/60 bg-emerald-900/20 px-4 py-3 text-sm">
            <span>You have submitted this exam. Your code is shown read-only.</span>
            <Link href={`/exams/${exam.id}/results`} className="underline">
              See your results
            </Link>
            <button type="button" data-testid="new-attempt" className="underline" onClick={onNewAttempt}>
              Start a new attempt
            </button>
          </div>
        )}

        <ul data-testid="exam-facts" className="flex flex-wrap gap-3 text-sm">
          <Fact>{exam.meta.minutes} minutes</Fact>
          <Fact>
            {questions} {questions === 1 ? "question" : "questions"}
          </Fact>
          <Fact>{points} points</Fact>
          {timer && (
            <Fact>
              <span data-testid="timer-mode">
                {timer.timed
                  ? `Timed: started ${new Date(timer.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : "No timer"}
              </span>
            </Fact>
          )}
        </ul>

        <article className="content-html" dangerouslySetInnerHTML={{ __html: exam.instructionsHtml ?? "" }} />

        <section className="content-html">
          <h2>How scoring works</h2>
          <ul>
            <li>
              Each question is worth the points shown beside it, earned from its test cases, usually 1 point each.
            </li>
            {samplesScore ? (
              <li>
                The tests from the handout&apos;s sample run count toward your score too. If one fails, it tells you
                why. Hidden cases show only whether they passed.
              </li>
            ) : (
              <li>
                The first test, <em>Sample from the handout</em>, is worth 0 points. If it fails, it tells you why.
                Hidden cases show only whether they passed.
              </li>
            )}
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
            {submitted ? "Review your code" : timer ? "Continue" : "Start"}
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
