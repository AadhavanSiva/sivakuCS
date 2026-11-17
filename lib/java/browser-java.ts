// The JVM in the student's browser: CheerpJ in a Web Worker
// (public/cheerpj/sandbox-worker.js). A call that runs too long, or that
// the student stops, is ended by terminating the worker; a fresh one
// starts at once. Its files live in IndexedDB, so compiled classes
// survive the restart.
//
// Starting can stall (a download that never finishes, a network that
// drops): if the JVM is not ready within startTimeoutMs, the worker is
// replaced and loading tries again, once by itself and then whenever
// retry() is called. Each try gets longer than the last, since a slow
// connection rather than a dead one is the likelier cause.
import {
  type CallOptions,
  type JavaBackend,
  JavaStoppedError,
  JavaTimeoutError,
  type SandboxMethod,
  type SandboxPaths,
} from "./backend";

const WORKER_URL = "/cheerpj/sandbox-worker.js";

// Must match WORK and OWN in the worker.
export const BROWSER_PATHS: SandboxPaths = {
  work: "/files",
  own: ".sivaku",
  sandboxJar: "/app/cheerpj/sandbox.jar",
  pathSeparator: ":",
};

/**
 * How long to wait for an attempt before starting another alongside it.
 * Measured cold starts: median 7 to 9 s, slowest about 30 s (README); an
 * attempt that stalls never finishes, so a second one 20 s in recovers
 * where waiting would not, and the first keeps going in case it is only slow.
 */
export const DEFAULT_START_TIMEOUT_MS = 20_000;
/** Attempts running at once, at most, before giving up and waiting for retry(). */
const AUTOMATIC_ATTEMPTS = 3;
/** The newest attempt then gets this many more start timeouts (60 s) to finish. */
const LAST_WINDOW = 3;

export type JavaStatus = "starting" | "ready" | "compiling" | "running" | "failed";

export type RuntimeInfo = {
  javaVersion: string;
  vendor: string;
  hasJavaLangIO: boolean;
  hasCompiler: boolean;
};

export type BrowserJavaEvents = {
  onStatus?: (status: JavaStatus) => void;
  /** A start attempt began; attempt counts from 1 and grows on each retry. */
  onAttempt?: (attempt: number) => void;
  /** The JVM finished loading; msSinceStart includes downloading the runtime. */
  onReady?: (info: RuntimeInfo, msSinceStart: number) => void;
  /** The compiler finished its warm-up compile. */
  onWarm?: (warmUpMs: number) => void;
};

type Pending = {
  message: { id: number; method: SandboxMethod; args: string[] };
  resolve: (value: string | null) => void;
  reject: (error: Error) => void;
  options: CallOptions;
  started: boolean;
  timer?: ReturnType<typeof setTimeout>;
  /** Time left on the limit, kept while the clock is paused for input. */
  remainingMs?: number;
  clockStartedAt?: number;
};

export class BrowserJava implements JavaBackend {
  readonly paths = BROWSER_PATHS;
  private readonly events: BrowserJavaEvents;
  private readonly startTimeoutMs: number;
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private startedAt = 0;
  private startTimer?: ReturnType<typeof setTimeout>;
  private attempt = 0;
  private attemptsSinceReady = 0;
  private ready = false;
  private failed = false;
  /** Start attempts in progress (none ready yet); the first ready becomes `worker`. */
  private attempts: Worker[] = [];
  /** The last start-up step each attempt reported (the worker's "phase" messages). */
  private readonly phases = new Map<Worker, string>();
  /** The last attempt has been started and is in its final window. */
  private lastWindow = false;

  constructor(events: BrowserJavaEvents = {}, options: { startTimeoutMs?: number } = {}) {
    this.events = events;
    this.startTimeoutMs = options.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS;
  }

  /** Starts the JVM if it is not running or starting. */
  start(): void {
    if (this.worker || this.attempts.length > 0 || this.failed) return;
    this.startedAt = performance.now();
    this.ready = false;
    this.events.onStatus?.("starting");
    this.launchAttempt();
  }

  /**
   * One start attempt, alongside any still in progress: a start that is
   * only slow keeps going, and whichever attempt is ready first is kept
   * (measured: cold starts take 5 to 30 s, and an attempt that stalls never
   * recovers; see the README).
   */
  private launchAttempt(): void {
    this.attempt++;
    this.attemptsSinceReady++;
    this.events.onAttempt?.(this.attempt);
    const worker = new Worker(WORKER_URL);
    this.attempts.push(worker);
    this.phases.set(worker, "none");
    worker.onmessage = (event: MessageEvent) => this.fromWorker(worker, event.data);
    worker.onerror = (event) => this.attemptFailed(worker, event.message || "The Java runtime failed to load.");
    // Calls made before Java was ready wait in each attempt; only the one kept runs them.
    for (const call of this.pending.values()) worker.postMessage(call.message);
    clearTimeout(this.startTimer);
    this.startTimer = setTimeout(() => this.notReadyYet(), this.startTimeoutMs);
  }

  /** No attempt is ready after another startTimeoutMs: start one more alongside, or, after the last, give up. */
  private notReadyYet(): void {
    const waited = Math.round((performance.now() - this.startedAt) / 1000);
    const where = [...this.phases.values()].join(", ");
    if (this.attemptsSinceReady < AUTOMATIC_ATTEMPTS) {
      console.warn(`Java did not start within ${waited} seconds (last steps: ${where}). Starting another attempt alongside.`);
      this.launchAttempt();
      return;
    }
    if (!this.lastWindow) {
      // The newest attempt gets as long as a slow cold start needs.
      this.lastWindow = true;
      this.startTimer = setTimeout(() => this.notReadyYet(), this.startTimeoutMs * LAST_WINDOW);
      return;
    }
    this.giveUp(`Java did not start within ${waited} seconds (last steps: ${where}).`);
  }

  private fromWorker(worker: Worker, message: { type: string; [key: string]: unknown }): void {
    if (message.type === "phase") {
      this.phases.set(worker, `${message.name} at ${message.ms} ms`);
      return;
    }
    if (message.type === "ready" && this.attempts.includes(worker)) {
      // The first attempt ready is kept; the others are stopped before they run any call.
      for (const other of this.attempts) if (other !== worker) other.terminate();
      this.attempts = [];
      this.phases.clear();
      this.lastWindow = false;
      this.worker = worker;
    }
    if (message.type === "fatal" && this.attempts.includes(worker)) {
      this.attemptFailed(worker, String(message.message));
      return;
    }
    if (this.worker === worker) this.handle(message);
  }

  /** An attempt failed outright: drop it; if none is left, start another or give up. */
  private attemptFailed(worker: Worker, message: string): void {
    if (!this.attempts.includes(worker)) return;
    worker.terminate();
    this.attempts = this.attempts.filter((w) => w !== worker);
    this.phases.delete(worker);
    if (this.attempts.length > 0) return;
    if (this.attemptsSinceReady < AUTOMATIC_ATTEMPTS) {
      console.warn(`${message} Trying again.`);
      this.launchAttempt();
      return;
    }
    this.giveUp(message);
  }

  /** Every attempt failed or stalled: stop them all and wait for retry(). */
  private giveUp(message: string): void {
    clearTimeout(this.startTimer);
    for (const w of this.attempts) w.terminate();
    this.attempts = [];
    this.phases.clear();
    this.lastWindow = false;
    this.failed = true;
    this.events.onStatus?.("failed");
    this.rejectAll(() => new Error(`Java could not start: ${message}`));
  }

  /** After start-up failed: try again. */
  retry(): void {
    if (!this.failed) return;
    this.failed = false;
    this.attemptsSinceReady = 0;
    this.start();
  }

  /** True while any call is waiting or running. */
  get busy(): boolean {
    return this.pending.size > 0;
  }

  call(method: SandboxMethod, args: string[], options: CallOptions = {}): Promise<string | null> {
    if (this.failed) return Promise.reject(new Error("Java could not start. Try again."));
    this.start();
    const id = this.nextId++;
    const message = { id, method, args };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { message, resolve, reject, options, started: false });
      // Ready: to the JVM. Still starting: to every attempt, as only the one kept will run it.
      for (const w of this.worker ? [this.worker] : this.attempts) w.postMessage(message);
    });
  }

  /** A line typed into the Run console; null ends the program's input. */
  sendInput(line: string | null): void {
    this.worker?.postMessage({ type: "input", line });
  }

  /** Abandons every call in progress and starts a fresh JVM. */
  stop(): void {
    if (this.pending.size === 0) return;
    this.restart(() => new JavaStoppedError());
  }

  dispose(): void {
    clearTimeout(this.startTimer);
    this.worker?.terminate();
    this.worker = null;
    for (const w of this.attempts) w.terminate();
    this.attempts = [];
    this.rejectAll(() => new JavaStoppedError());
  }

  private restart(errorFor: (id: number) => Error): void {
    clearTimeout(this.startTimer);
    this.worker?.terminate();
    this.worker = null;
    this.rejectAll(errorFor);
    this.start();
  }

  private rejectAll(errorFor: (id: number) => Error): void {
    for (const [id, call] of this.pending) {
      clearTimeout(call.timer);
      call.reject(errorFor(id));
    }
    this.pending.clear();
  }

  private settle(id: number): Pending | undefined {
    const call = this.pending.get(id);
    if (!call) return undefined;
    clearTimeout(call.timer);
    this.pending.delete(id);
    if (this.pending.size === 0 && this.ready) this.events.onStatus?.("ready");
    return call;
  }

  /** Starts or resumes the time limit with whatever is left of it. */
  private runClock(id: number, call: Pending): void {
    if (call.remainingMs === undefined) return;
    call.clockStartedAt = performance.now();
    call.timer = setTimeout(() => {
      const limit = call.options.timeoutMs!;
      this.restart((other) => (other === id ? new JavaTimeoutError(limit) : new JavaStoppedError()));
    }, call.remainingMs);
  }

  private pauseClock(call: Pending): void {
    if (call.remainingMs === undefined || call.clockStartedAt === undefined) return;
    clearTimeout(call.timer);
    call.remainingMs = Math.max(0, call.remainingMs - (performance.now() - call.clockStartedAt));
    call.clockStartedAt = undefined;
  }

  // Messages from the worker; see the protocol at the top of the worker.
  private handle(message: { type: string; id?: number; [key: string]: unknown }): void {
    switch (message.type) {
      case "ready":
        clearTimeout(this.startTimer);
        this.ready = true;
        this.attemptsSinceReady = 0;
        if (this.pending.size === 0) this.events.onStatus?.("ready");
        this.events.onReady?.(message.info as RuntimeInfo, Math.round(performance.now() - this.startedAt));
        return;
      case "warm":
        this.events.onWarm?.(message.ms as number);
        return;
      case "fatal":
        this.giveUp(String(message.message));
        return;
    }

    const id = message.id as number;
    const call = this.pending.get(id);
    if (!call) return;
    switch (message.type) {
      case "started":
        call.started = true;
        if (call.options.activity) this.events.onStatus?.(call.options.activity);
        if (call.options.timeoutMs !== undefined) {
          call.remainingMs = call.options.timeoutMs;
          this.runClock(id, call);
        }
        return;
      case "output":
        call.options.onOutput?.(message.stream as "out" | "err" | "ui", String(message.text));
        return;
      case "input-wait":
        // Time spent waiting for the student to type does not count.
        this.pauseClock(call);
        call.options.onWaitingForInput?.(true);
        return;
      case "input-resumed":
        call.options.onWaitingForInput?.(false);
        this.runClock(id, call);
        return;
      case "result":
        this.settle(id)?.resolve(message.value as string | null);
        return;
      case "error":
        this.settle(id)?.reject(new Error(String(message.message)));
        return;
    }
  }
}
