"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getJava } from "@/lib/java-runtime";
import { type JavaFiles, runInteractively } from "@/lib/java/programs";
import { type SwingNode, SwingPanelView } from "./SwingPanelView";

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
  /** Sandbox run options for this question (a thread question's warm-up). */
  options?: string;
  /** A Swing question's panel class: Run draws the panel instead of running main. */
  swingPanel?: string;
  onRunningChange: (running: boolean) => void;
};

/**
 * The Run console, as a terminal: one stream in which the program's output
 * and what the student types appear inline. While the program runs, the
 * caret sits after its last output; Enter sends the line, Ctrl+D ends input.
 */
export const RunConsole = forwardRef<RunConsoleHandle, Props>(function RunConsole(
  { files, inputFiles, mainClass, options = "", swingPanel, onRunningChange },
  ref,
) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [running, setRunning] = useState(false);
  const [inputEnded, setInputEnded] = useState(false);
  const [line, setLine] = useState("");
  // A Swing question's panel, as the sandbox last described it (see sivaku.swing.SwingHost).
  const [panel, setPanel] = useState<SwingNode | null>(null);
  const terminal = useRef<HTMLDivElement>(null);
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
    terminal.current?.scrollTo({ top: terminal.current.scrollHeight });
  }, [chunks, line]);

  async function run() {
    if (runningRef.current) return;
    setChunks([]);
    setPanel(null);
    setInputEnded(false);
    setLine("");
    runningRef.current = true;
    setRunning(true);
    onRunningChange(true);
    const outcome = await runInteractively(
      getJava(),
      {
        files,
        inputFiles,
        mainClass,
        timeLimitMs: RUN_TIME_LIMIT_MS,
        options: [options, swingPanel ? `swingPanel=${swingPanel}` : ""].filter(Boolean).join(";"),
      },
      {
        onOutput: (stream, text) => (stream === "ui" ? setPanel(JSON.parse(text) as SwingNode) : add({ kind: stream, text })),
        onWaitingForInput: (waiting) => {
          if (waiting) input.current?.focus({ preventScroll: true });
        },
      },
    );
    switch (outcome.kind) {
      case "compile-error":
        add({ kind: "problem", text: outcome.output });
        break;
      case "finished":
        if (swingPanel && outcome.exitCode === 0) {
          add({ kind: "note", text: "\n[Panel closed]" });
        } else {
          add({ kind: "note", text: outcome.exitCode === 0 ? "\n[Program finished]" : `\n[Program finished with exit code ${outcome.exitCode}]` });
        }
        break;
      case "timeout":
        add({ kind: "problem", text: `\n[Stopped: the program ran for more than ${outcome.timeLimitMs / 1000} seconds]` });
        break;
      case "stopped":
        add({ kind: "note", text: "\n[Stopped]" });
        break;
      case "error":
        add({ kind: "problem", text: `\n${outcome.message}` });
        break;
    }
    runningRef.current = false;
    setRunning(false);
    setPanel(null);
    setLine("");
    onRunningChange(false);
  }

  function stop() {
    if (runningRef.current) getJava().stop();
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
    <div
      ref={terminal}
      data-testid="console-output"
      onClick={() => {
        // Clicking anywhere types into the program, unless text is being selected.
        if (!window.getSelection()?.toString()) input.current?.focus({ preventScroll: true });
      }}
      className="h-full min-h-0 cursor-text overflow-y-auto whitespace-pre-wrap break-words bg-[#141414] px-3 py-2 font-mono text-[13px] leading-5 text-neutral-200"
    >
      {chunks.length === 0 && !running && (
        <span className="text-neutral-500">
          {swingPanel
            ? `Press Run to try your ${swingPanel}: it appears here, as it would in a window.`
            : `Press Run to compile and run ${mainClass}.java.`}
        </span>
      )}
      {chunks.length === 0 && running && !panel && <span className="text-neutral-500">Compiling…</span>}
      {panel && (
        <SwingPanelView
          root={panel}
          send={(event) => getJava().sendInput(event)}
          close={() => {
            getJava().sendInput(null);
            setInputEnded(true);
          }}
        />
      )}
      {chunks.map((chunk, i) => (
        <span key={i} data-kind={chunk.kind} className={CHUNK_STYLE[chunk.kind]}>
          {chunk.text}
        </span>
      ))}
      {running && !inputEnded && !swingPanel && (
        <input
          ref={input}
          data-testid="console-input"
          aria-label="Input to the program (Enter sends the line, Ctrl+D ends input)"
          autoComplete="off"
          spellCheck={false}
          className="m-0 inline-block border-0 bg-transparent p-0 font-mono text-[13px] leading-5 text-neutral-200 caret-emerald-400 outline-none"
          style={{ width: `${line.length + 1}ch` }}
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
      )}
    </div>
  );
});

const CHUNK_STYLE: Record<Chunk["kind"], string> = {
  out: "",
  err: "text-rose-400",
  // Typed input looks like the program's own text, as in a terminal.
  in: "",
  note: "text-neutral-500",
  problem: "text-rose-400",
};
