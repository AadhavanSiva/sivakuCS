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

/** A cold start is 5 to 10 s on a good connection; this allows for a slow one. */
export const DEFAULT_START_TIMEOUT_MS = 60_000;
/** Attempts before giving up and waiting for retry(). */
const AUTOMATIC_ATTEMPTS = 2;

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

  constructor(events: BrowserJavaEvents = {}, options: { startTimeoutMs?: number } = {}) {
    this.events = events;
    this.startTimeoutMs = options.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS;
  }

  /** Starts the JVM if it is not running. */
  start(): void {
    if (this.worker || this.failed) return;
    this.startedAt = performance.now();
    this.ready = false;
    this.attempt++;
    this.attemptsSinceReady++;
    this.events.onAttempt?.(this.attempt);
    this.events.onStatus?.("starting");
    const worker = new Worker(WORKER_URL);
    worker.onmessage = (event: MessageEvent) => {
      if (this.worker === worker) this.handle(event.data);
    };
    worker.onerror = (event) => {
      if (this.worker === worker) this.startFailed(event.message || "The Java runtime failed to load.");
    };
    this.worker = worker;
    const limit = this.startTimeoutMs * this.attemptsSinceReady;
    this.startTimer = setTimeout(
      () => this.startFailed(`Java did not start within ${limit / 1000} seconds.`),
      limit,
    );
    // Calls made while an earlier attempt stalled were never run; send them again.
    for (const call of this.pending.values()) worker.postMessage(call.message);
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
      this.worker!.postMessage(message);
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

  /** The JVM failed or stalled before it was ready: try again, or give up. */
  private startFailed(message: string): void {
    clearTimeout(this.startTimer);
    this.worker?.terminate();
    this.worker = null;
    if (this.attemptsSinceReady < AUTOMATIC_ATTEMPTS) {
      console.warn(`${message} Trying again.`);
      this.start();
      return;
    }
    this.failed = true;
    this.events.onStatus?.("failed");
    this.rejectAll(() => new Error(`Java could not start: ${message}`));
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
        this.startFailed(String(message.message));
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
        call.options.onOutput?.(message.stream as "out" | "err", String(message.text));
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
