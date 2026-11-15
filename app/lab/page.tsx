"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_TIME_LIMIT_MS,
  JavaSandbox,
  type RunOutcome,
  type RuntimeInfo,
  type SandboxStatus,
  splitFiles,
} from "@/lib/java-sandbox";
import {
  CHECK_INPUT_FILES,
  CHECK_PROGRAM,
  CHECK_STDIN,
  INFINITE_LOOP_PROGRAM,
} from "@/lib/milestone1-samples";

// Milestone 1: prove Java 25 compiles and runs in the browser. Deliberately
// bare; the exam workspace comes in Milestone 3.

const STATUS_TEXT: Record<SandboxStatus, string> = {
  starting: "Starting Java…",
  ready: "Ready",
  compiling: "Compiling…",
  running: "Running…",
  failed: "Java failed to start",
};

const OUTCOME_TEXT: Record<RunOutcome["kind"], string> = {
  "compile-error": "Did not compile",
  finished: "Finished",
  timeout: "Time limit exceeded",
  stopped: "Stopped",
  error: "Something went wrong",
};

export default function LabPage() {
  const sandbox = useRef<JavaSandbox | null>(null);
  const [status, setStatus] = useState<SandboxStatus>("starting");
  const [info, setInfo] = useState<RuntimeInfo | null>(null);
  const [readyMs, setReadyMs] = useState<number | null>(null);
  const [warmMs, setWarmMs] = useState<number | null>(null);

  const [sources, setSources] = useState(CHECK_PROGRAM);
  const [stdin, setStdin] = useState(CHECK_STDIN);
  const [inputFiles, setInputFiles] = useState(CHECK_INPUT_FILES);
  const [seconds, setSeconds] = useState(DEFAULT_TIME_LIMIT_MS / 1000);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  useEffect(() => {
    const box = new JavaSandbox({
      onStatus: setStatus,
      onReady: (runtime, ms) => {
        setInfo(runtime);
        // Only the first start is the cold start; restarts after Stop are not.
        setReadyMs((previous) => previous ?? ms);
      },
      onWarm: (ms) => setWarmMs((previous) => previous ?? ms),
    });
    sandbox.current = box;
    box.start();
    return () => box.dispose();
  }, []);

  async function run() {
    if (!sandbox.current) return;
    setBusy(true);
    setOutcome(null);
    const result = await sandbox.current.run({
      files: splitFiles(sources, "Main.java"),
      inputFiles: splitFiles(inputFiles, "input.txt"),
      stdin,
      timeLimitMs: Math.max(1, seconds) * 1000,
    });
    setOutcome(result);
    setBusy(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-6 font-mono text-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold">Java in the browser (Milestone 1)</h1>
        <p data-testid="status" data-status={status}>
          {STATUS_TEXT[status]}
          {info && ` · Java ${info.javaVersion.split("-")[0]}`}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <label className="flex flex-col gap-1">
          <span>Source files (start each with a line like === Main.java ===)</span>
          <textarea
            data-testid="sources"
            className="h-[28rem] resize-y rounded border border-neutral-500/40 bg-transparent p-2"
            spellCheck={false}
            value={sources}
            onChange={(e) => setSources(e.target.value)}
          />
        </label>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span>Standard input</span>
            <textarea
              data-testid="stdin"
              className="h-28 resize-y rounded border border-neutral-500/40 bg-transparent p-2"
              spellCheck={false}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Files in the working directory before the run</span>
            <textarea
              data-testid="input-files"
              className="h-28 resize-y rounded border border-neutral-500/40 bg-transparent p-2"
              spellCheck={false}
              value={inputFiles}
              onChange={(e) => setInputFiles(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              Time limit
              <input
                data-testid="time-limit"
                type="number"
                min={1}
                max={120}
                className="w-16 rounded border border-neutral-500/40 bg-transparent px-1"
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
              />
              s
            </label>
            <button
              data-testid="run"
              className="rounded bg-emerald-600 px-4 py-1 text-white disabled:opacity-50"
              disabled={busy || status === "failed"}
              onClick={run}
            >
              Run
            </button>
            <button
              data-testid="stop"
              className="rounded bg-rose-600 px-4 py-1 text-white disabled:opacity-50"
              disabled={!busy}
              onClick={() => sandbox.current?.stop()}
            >
              Stop
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="load-check"
              className="rounded border border-neutral-500/40 px-2 py-1"
              onClick={() => {
                setSources(CHECK_PROGRAM);
                setStdin(CHECK_STDIN);
                setInputFiles(CHECK_INPUT_FILES);
              }}
            >
              Load the check program
            </button>
            <button
              data-testid="load-loop"
              className="rounded border border-neutral-500/40 px-2 py-1"
              onClick={() => {
                setSources(INFINITE_LOOP_PROGRAM);
                setStdin("");
                setInputFiles("");
              }}
            >
              Load an infinite loop
            </button>
          </div>
          <p
            data-testid="timings"
            data-ready-ms={readyMs ?? ""}
            data-warm-ms={warmMs ?? ""}
            className="text-neutral-500"
          >
            JVM ready: {readyMs === null ? "…" : `${readyMs} ms`} · compiler warm-up:{" "}
            {warmMs === null ? "…" : `${warmMs} ms`}
            {outcome?.kind === "finished" && ` · last compile ${outcome.compileMs} ms, run ${outcome.runMs} ms`}
            {outcome?.kind === "compile-error" && ` · last compile ${outcome.compileMs} ms`}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2" aria-live="polite">
        <h2 className="font-semibold">
          Output{" "}
          {outcome && (
            <span data-testid="outcome" data-kind={outcome.kind}>
              · {OUTCOME_TEXT[outcome.kind]}
              {outcome.kind === "finished" && ` (exit code ${outcome.exitCode})`}
              {outcome.kind === "timeout" && ` (${outcome.timeLimitMs / 1000} s)`}
            </span>
          )}
        </h2>
        {outcome && <OutcomeView outcome={outcome} />}
      </section>
    </main>
  );
}

function OutcomeView({ outcome }: { outcome: RunOutcome }) {
  const box = "min-h-10 whitespace-pre-wrap rounded border border-neutral-500/40 p-2";
  switch (outcome.kind) {
    case "compile-error":
      return <pre data-testid="compile-output" className={`${box} text-rose-500`}>{outcome.output}</pre>;
    case "timeout":
      return <p>The program ran for more than {outcome.timeLimitMs / 1000} seconds and was stopped.</p>;
    case "stopped":
      return <p>The program was stopped.</p>;
    case "error":
      return <p className="text-rose-500">{outcome.message}</p>;
    case "finished":
      return (
        <>
          <pre data-testid="stdout" className={box}>
            {outcome.stdout}
            {outcome.stdoutTruncated && "\n[output cut off at 1 MB]"}
          </pre>
          {outcome.stderr && (
            <pre data-testid="stderr" className={`${box} text-rose-500`}>
              {outcome.stderr}
              {outcome.stderrTruncated && "\n[output cut off at 1 MB]"}
            </pre>
          )}
          <h3 className="font-semibold">Files after the run</h3>
          <div data-testid="out-files" className="flex flex-col gap-2">
            {Object.keys(outcome.files).length === 0 && <p>None.</p>}
            {Object.entries(outcome.files).map(([name, text]) => (
              <div key={name} data-testid={`file-${name}`}>
                <p>{name}</p>
                <pre className={box}>{text}</pre>
              </div>
            ))}
          </div>
        </>
      );
  }
}
