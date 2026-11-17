// Compiling and running a student's program on any JavaBackend.
import { type JavaBackend, JavaStoppedError, JavaTimeoutError, sandboxDirs } from "./backend";

export type JavaFiles = Record<string, string>;

export type CompileResult = { ok: boolean; output: string; ms: number };

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  /** Why the run looks like it failed inside CheerpJ rather than in the student's code, or null. */
  runtimeFault?: string | null;
  ms: number;
};

export type RunRequest = {
  /** Source files by path, e.g. { "Main.java": "..." }. */
  files: JavaFiles;
  /** Files placed in the program's working directory before it starts. */
  inputFiles?: JavaFiles;
  stdin?: string;
  mainClass?: string;
  /** Limit on the program's own running time; compiling does not count. */
  timeLimitMs?: number;
  /** Sandbox run options (see runOptions in lib/grading/grade.ts): Swing fakes, a warm-up. */
  options?: string;
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

export const DEFAULT_TIME_LIMIT_MS = 5_000;

/** Only plain relative paths: no "..", nothing absolute, nothing in the sandbox's own directory. */
export function isSafeFileName(name: string, own: string): boolean {
  return /^[A-Za-z0-9_.\-/]+$/.test(name) && !name.startsWith("/") && !name.split("/").some((p) => p === ".." || p === own);
}

function checkNames(java: JavaBackend, files: JavaFiles) {
  for (const name of Object.keys(files)) {
    if (!isSafeFileName(name, java.paths.own)) throw new Error(`Not a valid file name: ${name}`);
  }
}

/** Replaces `dir` with exactly these files. */
export async function writeFiles(java: JavaBackend, dir: string, files: JavaFiles): Promise<void> {
  checkNames(java, files);
  await java.call("reset", [dir]);
  for (const [name, text] of Object.entries(files)) {
    await java.call("writeFile", [`${dir}/${name}`, text]);
  }
}

/** Compiles `files` into the sandbox's class directory, with anything else they need on `classPath`. */
export async function compileFiles(java: JavaBackend, files: JavaFiles, classPath: string[] = []): Promise<CompileResult> {
  const dirs = sandboxDirs(java.paths);
  await writeFiles(java, dirs.src, files);
  await java.call("reset", [dirs.classes]);
  const call = classPath.length
    ? java.call("compileWith", [dirs.src, dirs.classes, classPath.join(java.paths.pathSeparator)], { activity: "compiling" })
    : java.call("compile", [dirs.src, dirs.classes], { activity: "compiling" });
  return JSON.parse((await call)!);
}

/** Empties the working directory (keeping the sandbox's own files) and seeds it. */
export async function prepareWorkDir(java: JavaBackend, inputFiles: JavaFiles): Promise<void> {
  checkNames(java, inputFiles);
  await java.call("clearExcept", [java.paths.work, java.paths.own]);
  for (const [name, text] of Object.entries(inputFiles)) {
    await java.call("writeFile", [`${java.paths.work}/${name}`, text]);
  }
}

/** Every file in the working directory, by relative path. */
export async function readWorkDir(java: JavaBackend): Promise<JavaFiles> {
  return JSON.parse((await java.call("readTree", [java.paths.work, java.paths.own]))!);
}

/** Runs already-compiled classes. Throws JavaTimeoutError / JavaStoppedError. */
export async function runCompiled(
  java: JavaBackend,
  classPath: string,
  mainClass: string,
  stdin: string,
  timeLimitMs: number,
  options = "",
): Promise<RunResult> {
  const json = await java.call("runWith", [classPath, mainClass, stdin, options], { activity: "running", timeoutMs: timeLimitMs });
  return JSON.parse(json!);
}

/** Compiles and runs one program: the Run button. */
export async function runProgram(java: JavaBackend, request: RunRequest): Promise<RunOutcome> {
  const timeLimitMs = request.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
  try {
    const compile = await compileFiles(java, request.files);
    if (!compile.ok) return { kind: "compile-error", output: compile.output, compileMs: compile.ms };
    await prepareWorkDir(java, request.inputFiles ?? {});
    const run = await runCompiled(
      java,
      sandboxDirs(java.paths).classes,
      request.mainClass ?? "Main",
      request.stdin ?? "",
      timeLimitMs,
      request.options,
    );
    const files = await readWorkDir(java);
    const { ms, ...output } = run;
    return { kind: "finished", ...output, files, compileMs: compile.ms, runMs: ms };
  } catch (error) {
    if (error instanceof JavaTimeoutError) return { kind: "timeout", timeLimitMs };
    if (error instanceof JavaStoppedError) return { kind: "stopped" };
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

export type InteractiveOutcome =
  | { kind: "compile-error"; output: string; compileMs: number }
  | { kind: "finished"; exitCode: number; outputTruncated: boolean; compileMs: number; runMs: number }
  | { kind: "timeout"; timeLimitMs: number }
  | { kind: "stopped" }
  | { kind: "error"; message: string };

export type ConsoleIO = {
  /** Output as the program writes it. */
  onOutput: (stream: "out" | "err" | "ui", text: string) => void;
  /** The program is (or is no longer) waiting for a typed line. */
  onWaitingForInput: (waiting: boolean) => void;
};

/**
 * Compiles and runs a program connected to a console: output arrives as it
 * is written and input is typed while it runs (send lines with
 * BrowserJava.sendInput). The time limit does not count time spent waiting
 * for input. Browser only.
 */
export async function runInteractively(
  java: JavaBackend,
  request: Omit<RunRequest, "stdin">,
  io: ConsoleIO,
): Promise<InteractiveOutcome> {
  const timeLimitMs = request.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
  try {
    const compile = await compileFiles(java, request.files);
    if (!compile.ok) return { kind: "compile-error", output: compile.output, compileMs: compile.ms };
    await prepareWorkDir(java, request.inputFiles ?? {});
    const json = await java.call("runInteractiveWith", [sandboxDirs(java.paths).classes, request.mainClass ?? "Main", request.options ?? ""], {
      activity: "running",
      timeoutMs: timeLimitMs,
      onOutput: io.onOutput,
      onWaitingForInput: io.onWaitingForInput,
    });
    const run = JSON.parse(json!) as { exitCode: number; outputTruncated: boolean; ms: number };
    return { kind: "finished", exitCode: run.exitCode, outputTruncated: run.outputTruncated, compileMs: compile.ms, runMs: run.ms };
  } catch (error) {
    if (error instanceof JavaTimeoutError) return { kind: "timeout", timeLimitMs };
    if (error instanceof JavaStoppedError) return { kind: "stopped" };
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  } finally {
    io.onWaitingForInput(false);
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
