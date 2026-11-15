// A JavaBackend on the local JDK: one `java` process running
// sivaku.sandbox.Cli, the same Sandbox the browser runs in CheerpJ.
// A call past its time limit kills the process (files on disk survive)
// and the next call starts a fresh one, as the browser does with its worker.
import { type ChildProcessWithoutNullStreams, execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { createInterface } from "node:readline";
import {
  type CallOptions,
  type JavaBackend,
  JavaTimeoutError,
  type SandboxMethod,
  type SandboxPaths,
} from "../../lib/java/backend";

// npm scripts and Playwright both run from the repository root, as does
// lib/content/load.ts's CONTENT_ROOT.
const JAR = join(process.cwd(), "public", "cheerpj", "sandbox.jar");

/** `java` from JAVA_HOME if set, else from PATH. */
export function javaCommand(tool = "java"): string {
  return process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", tool) : tool;
}

/** The major version of the local JDK, e.g. 25. */
export function localJavaMajor(): number {
  const text = execFileSync(javaCommand("javac"), ["-version"], { encoding: "utf8" });
  return Number(/javac (\d+)/.exec(text)?.[1] ?? 0);
}

const encode = (s: string) => Buffer.from(s, "utf8").toString("base64");
const decode = (s: string) => Buffer.from(s, "base64").toString("utf8");

export class LocalJava implements JavaBackend {
  readonly paths: SandboxPaths;
  private readonly work: string;
  private process: ChildProcessWithoutNullStreams | null = null;
  private replies: ((line: string) => void)[] = [];
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.work = mkdtempSync(join(tmpdir(), "sivaku-"));
    this.paths = { work: this.work, own: ".sivaku", sandboxJar: JAR, pathSeparator: delimiter };
  }

  call(method: SandboxMethod, args: string[], options: CallOptions = {}): Promise<string | null> {
    // One call at a time, like the browser worker.
    const next = this.queue.then(() => this.send(method, args, options));
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Ends the Java process and deletes the working directory. */
  async close(): Promise<void> {
    const child = this.process;
    if (child && child.exitCode === null) {
      // Windows will not delete a directory a running process has as its cwd.
      const exited = new Promise((resolve) => child.once("exit", resolve));
      this.kill();
      await exited;
    }
    rmSync(this.work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }

  private start(): ChildProcessWithoutNullStreams {
    if (this.process) return this.process;
    // line.separator=\n: println writes \n everywhere, as in the browser,
    // so expected files compare the same on Windows.
    const child = spawn(
      javaCommand(),
      ["-Dline.separator=\n", `-Duser.dir=${this.work}`, "-cp", JAR, "sivaku.sandbox.Cli"],
      { cwd: this.work },
    );
    createInterface({ input: child.stdout }).on("line", (line) => this.replies.shift()?.(line));
    child.stderr.on("data", () => undefined);
    child.on("exit", () => {
      if (this.process === child) this.process = null;
      for (const reply of this.replies.splice(0)) reply("ERR " + encode("The Java process exited"));
    });
    this.process = child;
    return child;
  }

  private kill(): void {
    const child = this.process;
    this.process = null;
    this.replies = [];
    child?.kill("SIGKILL");
  }

  private send(method: SandboxMethod, args: string[], options: CallOptions): Promise<string | null> {
    const child = this.start();
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (options.timeoutMs !== undefined) {
        const limit = options.timeoutMs;
        timer = setTimeout(() => {
          this.kill();
          reject(new JavaTimeoutError(limit));
        }, limit);
      }
      this.replies.push((line) => {
        clearTimeout(timer);
        if (line === "NULL") resolve(null);
        else if (line.startsWith("OK ")) resolve(decode(line.slice(3)));
        else if (line === "OK") resolve("");
        else reject(new Error(decode(line.replace(/^ERR ?/, ""))));
      });
      child.stdin.write([method, ...args.map(encode)].join(" ") + "\n");
    });
  }
}
