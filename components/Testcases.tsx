import { testcasesHeader } from "@/lib/grading/format";
import type { CaseResult, GradeResult } from "@/lib/grading/types";

/**
 * The test results panel, as on the real exam: a "TESTCASES 3 / 14 passed,
 * 2 points" header, the sample case with the reason it failed, and hidden
 * cases showing only pass or fail.
 */
export function Testcases({ result }: { result: GradeResult }) {
  return (
    <section data-testid="testcases" className="flex flex-col gap-2 font-mono text-sm">
      <h3 data-testid="testcases-header" className="whitespace-pre font-semibold">
        {testcasesHeader(result)}
      </h3>
      {!result.compiled && (
        <pre data-testid="testcases-compile-error" className="whitespace-pre-wrap rounded border border-rose-500/50 p-2 text-rose-500">
          {result.compileOutput}
        </pre>
      )}
      <ul className="flex flex-col gap-1">
        {result.cases.map((testCase) => (
          <CaseRow key={testCase.name} testCase={testCase} />
        ))}
      </ul>
    </section>
  );
}

function CaseRow({ testCase }: { testCase: CaseResult }) {
  const mark = testCase.passed ? "✓" : "✗";
  const colour = testCase.passed ? "text-emerald-600" : "text-rose-500";
  return (
    <li data-testid="testcase" data-name={testCase.name} data-passed={testCase.passed} className="flex flex-col gap-1">
      <span className={colour}>
        {mark} {testCase.name}
        {testCase.points > 0 && ` (${testCase.points} ${testCase.points === 1 ? "point" : "points"})`}
      </span>
      {/* Only the sample says why; hidden cases show pass or fail. */}
      {testCase.sample && !testCase.passed && testCase.reason && (
        <div className="ml-5 flex flex-col gap-1">
          <p data-testid="sample-reason" className="whitespace-pre-wrap">
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
    </li>
  );
}

function OutputBox({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-neutral-500">{label}</p>
      <pre className="min-h-8 whitespace-pre-wrap rounded border border-neutral-500/40 p-2">{text}</pre>
    </div>
  );
}
