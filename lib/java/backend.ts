// A JVM running the sandbox helper (java/sandbox), wherever it runs: in
// the student's browser (BrowserJava, CheerpJ in a Web Worker) or on a
// local JDK for `npm run verify` (scripts/lib/local-java.ts). Running and
// grading are written once against this interface, so the browser and
// verify cannot grade differently.

/** Static methods of sivaku.sandbox.Sandbox; every argument is a String. */
export type SandboxMethod =
  | "info"
  | "reset"
  | "clearExcept"
  | "writeFile"
  | "readFile"
  | "readTree"
  | "compile"
  | "compileWith"
  | "run"
  | "callHarness";

export type SandboxPaths = {
  /** The program's working directory; relative file names land here. */
  work: string;
  /** A directory inside `work` that holds the sandbox's own files and survives clearing it. */
  own: string;
  /** Where the sandbox jar is, for javac's classpath when compiling a harness. */
  sandboxJar: string;
  /** Classpath separator on the JVM's platform. */
  pathSeparator: string;
};

export type CallOptions = {
  /**
   * Abandons the call if it runs longer than this, counted from when the
   * JVM starts executing it. The JVM is then restarted (files on its disk
   * survive) and the call rejects with JavaTimeoutError.
   */
  timeoutMs?: number;
  /** What the JVM is doing during the call, for status displays. */
  activity?: "compiling" | "running";
};

export interface JavaBackend {
  readonly paths: SandboxPaths;
  call(method: SandboxMethod, args: string[], options?: CallOptions): Promise<string | null>;
}

export class JavaTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Timed out after ${timeoutMs} ms`);
    this.name = "JavaTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/** The call was abandoned because the student pressed Stop. */
export class JavaStoppedError extends Error {
  constructor() {
    super("Stopped");
    this.name = "JavaStoppedError";
  }
}

/** Directories the sandbox uses under `paths.work/paths.own`. */
export function sandboxDirs(paths: SandboxPaths) {
  const own = `${paths.work}/${paths.own}`;
  return {
    src: `${own}/src`,
    classes: `${own}/classes`,
    harnessSrc: `${own}/harness-src`,
    harnessClasses: `${own}/harness-classes`,
  };
}
