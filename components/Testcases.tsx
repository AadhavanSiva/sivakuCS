"use client";

import { useState } from "react";
import { testcasesHeader } from "@/lib/grading/format";
import type { CaseResult, GradeResult } from "@/lib/grading/types";

/**
 * Test results, as on the real exam: "TESTCASES 3 / 14 passed, 2 points",
 * then one row per case (name, ✓ or ✗, points). Every row opens: a failed
 * sample case shows why; any other case shows only "Passed." or
 * "Failed: Case 1: did not pass."
 */
export function Testcases({ result }: { result: GradeResult }) {
  return (
    <section data-testid="testcases" className="flex flex-col gap-2 text-sm">
      <h3 data-testid="testcases-header" className="whitespace-pre font-mono text-[13px] font-semibold tracking-wide">
        {testcasesHeader(result)}
      </h3>
      {!result.compiled && (
        <pre
          data-testid="testcases-compile-error"
          className="whitespace-pre-wrap rounded border border-rose-500/50 bg-black/20 p-2 font-mono text-[12px] text-rose-400"
        >
          {result.compileOutput}
        </pre>
      )}
      <ul className="flex flex-col divide-y divide-neutral-500/20 rounded border border-neutral-500/30">
        {result.cases.map((testCase) => (
          <CaseRow key={testCase.name} testCase={testCase} />
        ))}
      </ul>
    </section>
  );
}

function CaseRow({ testCase }: { testCase: CaseResult }) {
  // Every row opens. Only a failed sample case says why; a failed hidden
  // case says only that it did not pass.
  const explained = testCase.sample && !testCase.passed && Boolean(testCase.reason);
  const [open, setOpen] = useState(false);
  const earned = testCase.passed ? testCase.points : 0;

  const row = (
    <>
      <span className="min-w-0 flex-1 truncate" title={testCase.name}>
        <span aria-hidden="true" className="mr-1 inline-block w-3 text-neutral-500">
          {open ? "▾" : "▸"}
        </span>
        {testCase.name}
      </span>
      <span
        aria-label={testCase.passed ? "passed" : "failed"}
        className={`w-5 text-center ${testCase.passed ? "text-emerald-500" : "text-rose-500"}`}
      >
        {testCase.passed ? "✓" : "✗"}
      </span>
      <span data-testid="testcase-points" className="w-12 text-right tabular-nums text-neutral-400">
        {earned}/{testCase.points}
      </span>
    </>
  );

  return (
    <li
      data-testid="testcase"
      data-name={testCase.name}
      data-passed={testCase.passed}
      data-sample={testCase.sample}
      className="flex flex-col"
    >
      <button
        type="button"
        data-testid="testcase-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/5"
      >
        {row}
      </button>
      {open && explained && (
        <div className="flex flex-col gap-2 px-2.5 pb-2.5 pl-6">
          <p data-testid="sample-reason" className="whitespace-pre-wrap font-mono text-[12px] text-neutral-200">
            Failed: {testCase.reason}
          </p>
          {testCase.expected !== undefined && (
            <div className="grid gap-2 md:grid-cols-2">
              <OutputBox label="Expected" text={testCase.expected} />
              <OutputBox label="Your output" text={testCase.actual ?? ""} />
            </div>
          )}
        </div>
      )}
      {open && !explained && (
        <p data-testid="testcase-detail" className="px-2.5 pb-2.5 pl-6 font-mono text-[12px] text-neutral-200">
          {testCase.passed ? "Passed." : `Failed: ${testCase.name}: did not pass.`}
        </p>
      )}
    </li>
  );
}

function OutputBox({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[12px] text-neutral-500">{label}</p>
      <pre className="min-h-8 whitespace-pre-wrap rounded border border-neutral-500/30 bg-black/20 p-2 font-mono text-[12px]">
        {text}
      </pre>
    </div>
  );
}
