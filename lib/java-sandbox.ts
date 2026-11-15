// Page-side control of the in-browser JVM (public/cheerpj/sandbox-worker.js).
//
// The JVM lives in a Web Worker. A program that runs too long, or that the
// student stops, is ended by terminating the worker; a fresh one starts at
// once so the next Run is ready as soon as possible.

export type JavaFiles = Record<string, string>;

export type RunRequest = {
  /** Source files by path, e.g. { "Main.java": "..." }. */
  files: JavaFiles;
  /** Files placed in the program's working directory before it starts. */
  inputFiles?: JavaFiles;
  stdin?: string;
  mainClass?: string;
  /** Limit on the program's own running time; compiling does not count. */
  timeLimitMs?: number;
};

export type RunOutcome =
  | { kind: "compile-error"; output: string; compileMs: number }
  | {
      kind: "finished";
      exitCode: number;
      stdout: string;
      stderr: string;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
      /** Every file in the working directory after the run, inputs included. */
      files: JavaFiles;
      compileMs: number;
      runMs: number;
    }
  | { kind: "timeout"; timeLimitMs: number }
  | { kind: "stopped" }
  | { kind: "error"; message: string };

export type SandboxStatus = "starting" | "ready" | "compiling" | "running" | "failed";

export type RuntimeInfo = {
  javaVersion: string;
  vendor: string;
  hasJavaLangIO: boolean;
  hasCompiler: boolean;
};

export type SandboxEvents = {
  onStatus?: (status: SandboxStatus) => void;
  /** The JVM finished loading; msSinceStart includes downloading the runtime. */
  onReady?: (info: RuntimeInfo, msSinceStart: number) => void;
  /** The compiler finished its warm-up compile. */
  onWarm?: (warmUpMs: number) => void;
};

type Pending = {
  id: number;
  resolve: (outcome: RunOutcome) => void;
  timer?: ReturnType<typeof setTimeout>;
  timeLimitMs: number;
};

const WORKER_URL = "/cheerpj/sandbox-worker.js";
export const DEFAULT_TIME_LIMIT_MS = 5_000;

export class JavaSandbox {
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private nextId = 1;
  private startedAt = 0;

  constructor(private readonly events: SandboxEvents = {}) {}

  /** Starts the JVM. Safe to call again after dispose(). */
  start(): void {
    if (this.worker) return;
    this.startedAt = performance.now();
    this.setStatus("starting");
    const worker = new Worker(WORKER_URL);
    worker.onmessage = (event: MessageEvent) => this.handle(event.data);
    worker.onerror = (event) => {
      this.setStatus("failed");
      this.finish({ kind: "error", message: event.message || "The Java runtime failed to load." });
    };
    this.worker = worker;
  }

  /** Compiles and runs one program. Only one run at a time. */
  run(request: RunRequest): Promise<RunOutcome> {
    if (this.pending) {
      return Promise.resolve({ kind: "error", message: "A program is already running." });
    }
    this.start();
    const id = this.nextId++;
    return new Promise<RunOutcome>((resolve) => {
      this.pending = { id, resolve, timeLimitMs: request.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS };
      this.worker!.postMessage({
        id,
        op: "run",
        files: request.files,
        inputFiles: request.inputFiles ?? {},
        stdin: request.stdin ?? "",
        mainClass: request.mainClass ?? "Main",
      });
    });
  }

  /** Ends the current run, if any, and starts a fresh JVM. */
  stop(): void {
    if (!this.pending) return;
    this.restart({ kind: "stopped" });
  }

  dispose(): void {
    this.finish({ kind: "stopped" });
    this.worker?.terminate();
    this.worker = null;
  }

  private restart(outcome: RunOutcome): void {
    this.worker?.terminate();
    this.worker = null;
    this.finish(outcome);
    this.start();
  }

  private finish(outcome: RunOutcome): void {
    const pending = this.pending;
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending = null;
    pending.resolve(outcome);
  }

  private setStatus(status: SandboxStatus): void {
    this.events.onStatus?.(status);
  }

  // Messages from the worker; see the protocol at the top of the worker.
  private handle(message: { type: string; id?: number; [key: string]: unknown }): void {
    switch (message.type) {
      case "ready":
        this.setStatus(this.pending ? "compiling" : "ready");
        this.events.onReady?.(message.info as RuntimeInfo, Math.round(performance.now() - this.startedAt));
        return;
      case "warm":
        this.events.onWarm?.(message.ms as number);
        return;
      case "fatal":
        this.setStatus("failed");
        this.finish({ kind: "error", message: `The Java runtime failed to start: ${message.message}` });
        return;
    }

    const pending = this.pending;
    if (!pending || message.id !== pending.id) return;

    if (message.type === "phase") {
      if (message.phase === "compiling") this.setStatus("compiling");
      if (message.phase === "running") {
        this.setStatus("running");
        // Only the program's own time counts against the limit.
        pending.timer = setTimeout(
          () => this.restart({ kind: "timeout", timeLimitMs: pending.timeLimitMs }),
          pending.timeLimitMs,
        );
      }
      return;
    }

    this.setStatus("ready");
    if (message.type === "error") {
      this.finish({ kind: "error", message: String(message.message) });
      return;
    }
    const compile = message.compile as { ok: boolean; output: string; ms: number };
    const run = message.run as {
      exitCode: number;
      stdout: string;
      stderr: string;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
      ms: number;
    } | null;
    if (!compile.ok || !run) {
      this.finish({ kind: "compile-error", output: compile.output, compileMs: compile.ms });
      return;
    }
    this.finish({
      kind: "finished",
      ...run,
      runMs: run.ms,
      files: message.files as JavaFiles,
      compileMs: compile.ms,
    });
  }
}

/**
 * Splits text written as
 *   === Main.java ===
 *   ...
 *   === Student.java ===
 *   ...
 * into separate files. Text with no header becomes `defaultName`.
 */
export function splitFiles(text: string, defaultName: string): JavaFiles {
  const files: JavaFiles = {};
  let name: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    const body = lines.join("\n");
    if (name !== null) files[name] = body.replace(/\n+$/, "") + "\n";
    else if (body.trim()) files[defaultName] = body.replace(/\n+$/, "") + "\n";
  };
  for (const line of text.split(/\r?\n/)) {
    const header = /^===\s*(\S+)\s*===\s*$/.exec(line);
    if (header) {
      flush();
      name = header[1];
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();
  return files;
}
