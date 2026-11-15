"use client";

import { useEffect, useState } from "react";
import { StartingJava } from "@/components/StartingJava";
import { Testcases } from "@/components/Testcases";
import { getJava, preloadJava, useJavaRuntime } from "@/lib/java-runtime";
import { gradeQuestion } from "@/lib/grading/grade";
import type { GradeResult, Question } from "@/lib/grading/types";
import type { JavaFiles } from "@/lib/java/programs";

declare global {
  interface Window {
    /** For the browser tests: grade any question bundle in this tab's JVM. */
    sivakuGrade?: (question: Question, files: JavaFiles) => Promise<GradeResult>;
  }
}

export function GradeLab({ questions }: { questions: Question[] }) {
  const { status } = useJavaRuntime();
  const [index, setIndex] = useState(0);
  const question = questions[index];
  const [files, setFiles] = useState<JavaFiles>(question.starter);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    preloadJava();
    window.sivakuGrade = (q, f) => gradeQuestion(getJava(), q, f);
    return () => {
      delete window.sivakuGrade;
    };
  }, []);

  function choose(next: number) {
    setIndex(next);
    setFiles(questions[next].starter);
    setResult(null);
  }

  async function test() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await gradeQuestion(getJava(), question, files));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-6 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Grading in the browser (Milestone 2, development only)</h1>
        <div className="flex items-center gap-3">
          <StartingJava />
          <span data-testid="status" data-status={status} />
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            className={`rounded border px-2 py-1 ${i === index ? "border-emerald-600" : "border-neutral-500/40"}`}
            onClick={() => choose(i)}
          >
            {q.meta.title} ({q.tests.kind})
          </button>
        ))}
      </nav>

      <pre className="whitespace-pre-wrap rounded border border-neutral-500/40 p-3">{question.description}</pre>

      {question.meta.editable.map((name) => (
        <label key={name} className="flex flex-col gap-1 font-mono">
          {name}
          <textarea
            className="h-56 rounded border border-neutral-500/40 bg-transparent p-2"
            spellCheck={false}
            value={files[name] ?? ""}
            onChange={(e) => setFiles({ ...files, [name]: e.target.value })}
          />
        </label>
      ))}

      <div>
        <button
          data-testid="test"
          className="rounded bg-emerald-600 px-4 py-1 text-white disabled:opacity-50"
          disabled={busy || status === "failed"}
          onClick={test}
        >
          {busy ? "Testing…" : "Test"}
        </button>
      </div>

      {result && <Testcases result={result} />}
    </main>
  );
}
