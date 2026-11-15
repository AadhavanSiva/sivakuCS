"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getJava } from "@/lib/java-runtime";
import { type JavaFiles, runInteractively } from "@/lib/java/programs";

/** Program time per Run; time spent waiting for typed input does not count. */
export const RUN_TIME_LIMIT_MS = 10_000;

type Chunk = { kind: "out" | "err" | "in" | "note" | "problem"; text: string };

export type RunConsoleHandle = {
  run: () => void;
  stop: () => void;
};

type Props = {
  /** Everything to compile: given files and the student's. */
  files: JavaFiles;
  /** Data files (laps.txt...) placed in the working directory first. */
  inputFiles: JavaFiles;
  mainClass: string;
  onRunningChange: (running: boolean) => void;
};

/**
 * The Run console: the program's output as it is written, and a line to
 * type its input into while it runs, like a terminal.
 */
export const RunConsole = forwardRef<RunConsoleHandle, Props>(function RunConsole(
  { files, inputFiles, mainClass, onRunningChange },
  ref,
) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [running, setRunning] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [inputEnded, setInputEnded] = useState(false);
  const [line, setLine] = useState("");
  const output = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // For the unmount clean-up, which must not see a stale `running`.
  const runningRef = useRef(false);

  const add = (chunk: Chunk) =>
    setChunks((all) => {
      // Merge consecutive output so a print loop does not make thousands of spans.
      const last = all[all.length - 1];
      if (last && last.kind === chunk.kind && (chunk.kind === "out" || chunk.kind === "err")) {
        return [...all.slice(0, -1), { kind: chunk.kind, text: last.text + chunk.text }];
      }
      return [...all, chunk];
    });

  useEffect(() => {
    output.current?.scrollTo({ top: output.current.scrollHeight });
  }, [chunks]);

  useEffect(() => {
    if (waiting) input.current?.focus();
  }, [waiting]);

  async function run() {
    if (running) return;
    setChunks([]);
    setRunning(true);
    setInputEnded(false);
    setLine("");
    runningRef.current = true;
    onRunningChange(true);
    const outcome = await runInteractively(
      getJava(),
      { files, inputFiles, mainClass, timeLimitMs: RUN_TIME_LIMIT_MS },
      { onOutput: (stream, text) => add({ kind: stream, text }), onWaitingForInput: setWaiting },
    );
    switch (outcome.kind) {
      case "compile-error":
        add({ kind: "problem", text: outcome.output });
        break;
      case "finished":
        add({ kind: "note", text: `\nProgram finished${outcome.exitCode === 0 ? "" : ` with exit code ${outcome.exitCode}`}.` });
        break;
      case "timeout":
        add({ kind: "problem", text: `\nStopped: the program ran for more than ${outcome.timeLimitMs / 1000} seconds.` });
        break;
      case "stopped":
        add({ kind: "note", text: "\nStopped." });
        break;
      case "error":
        add({ kind: "problem", text: `\n${outcome.message}` });
        break;
    }
    runningRef.current = false;
    setRunning(false);
    setWaiting(false);
    onRunningChange(false);
  }

  function stop() {
    if (running) getJava().stop();
  }

  useImperativeHandle(ref, () => ({ run, stop }));

  // A program still running when the student leaves the question is
  // stopped. Only this console's run: a Test in progress is left alone.
  useEffect(
    () => () => {
      if (runningRef.current) getJava().stop();
    },
    [],
  );

  function send() {
    getJava().sendInput(line);
    add({ kind: "in", text: line + "\n" });
    setLine("");
  }

  function endInput() {
    getJava().sendInput(null);
    setInputEnded(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={output}
        data-testid="console-output"
        className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[13px] leading-5"
      >
        {chunks.length === 0 && !running && (
          <span className="text-neutral-500">Press Run to compile and run {mainClass}.java.</span>
        )}
        {chunks.length === 0 && running && <span className="text-neutral-500">Compiling…</span>}
        {chunks.map((chunk, i) => (
          <span key={i} data-kind={chunk.kind} className={CHUNK_STYLE[chunk.kind]}>
            {chunk.text}
          </span>
        ))}
      </div>
      {running && (
        <div className="flex items-center gap-2 border-t border-[#3c3c3c] px-3 py-1.5">
          <span aria-hidden="true" className="font-mono text-emerald-400">
            &gt;
          </span>
          <input
            ref={input}
            data-testid="console-input"
            aria-label="Input to the program"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:text-neutral-600"
            placeholder={inputEnded ? "Input ended" : waiting ? "Type input and press Enter" : "Typing ahead is fine"}
            disabled={inputEnded}
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              } else if (e.key === "d" && e.ctrlKey) {
                e.preventDefault();
                endInput();
              }
            }}
          />
          <button
            type="button"
            className="text-xs text-neutral-400 hover:text-neutral-200 disabled:opacity-40"
            disabled={inputEnded}
            onClick={endInput}
            title="Ctrl+D"
          >
            End input
          </button>
        </div>
      )}
    </div>
  );
});

const CHUNK_STYLE: Record<Chunk["kind"], string> = {
  out: "text-neutral-200",
  err: "text-rose-400",
  in: "text-emerald-400",
  note: "text-neutral-500",
  problem: "text-rose-400",
};
