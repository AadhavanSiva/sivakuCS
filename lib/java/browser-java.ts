// The JVM in the student's browser: CheerpJ in a Web Worker
// (public/cheerpj/sandbox-worker.js). A call that runs too long, or that
// the student stops, is ended by terminating the worker; a fresh one
// starts at once. Its files live in IndexedDB, so compiled classes
// survive the restart.
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

export type JavaStatus = "starting" | "ready" | "compiling" | "running" | "failed";

export type RuntimeInfo = {
  javaVersion: string;
  vendor: string;
  hasJavaLangIO: boolean;
  hasCompiler: boolean;
};

export type BrowserJavaEvents = {
  onStatus?: (status: JavaStatus) => void;
  /** The JVM finished loading; msSinceStart includes downloading the runtime. */
  onReady?: (info: RuntimeInfo, msSinceStart: number) => void;
  /** The compiler finished its warm-up compile. */
  onWarm?: (warmUpMs: number) => void;
};

type Pending = {
  resolve: (value: string | null) => void;
  reject: (error: Error) => void;
  options: CallOptions;
  timer?: ReturnType<typeof setTimeout>;
};

export class BrowserJava implements JavaBackend {
  readonly paths = BROWSER_PATHS;
  private readonly events: BrowserJavaEvents;
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private startedAt = 0;
  private ready = false;

  constructor(events: BrowserJavaEvents = {}) {
    this.events = events;
  }

  /** Starts the JVM if it is not running. */
  start(): void {
    if (this.worker) return;
    this.startedAt = performance.now();
    this.ready = false;
    this.events.onStatus?.("starting");
    const worker = new Worker(WORKER_URL);
    worker.onmessage = (event: MessageEvent) => this.handle(event.data);
    worker.onerror = (event) => this.fail(event.message || "The Java runtime failed to load.");
    this.worker = worker;
  }

  /** True while any call is waiting or running. */
  get busy(): boolean {
    return this.pending.size > 0;
  }

  call(method: SandboxMethod, args: string[], options: CallOptions = {}): Promise<string | null> {
    this.start();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, options });
      this.worker!.postMessage({ id, method, args });
    });
  }

  /** Abandons every call in progress and starts a fresh JVM. */
  stop(): void {
    if (this.pending.size === 0) return;
    this.restart(() => new JavaStoppedError());
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.rejectAll(() => new JavaStoppedError());
  }

  private restart(errorFor: (id: number) => Error): void {
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

  private fail(message: string): void {
    this.events.onStatus?.("failed");
    this.rejectAll(() => new Error(`The Java runtime failed to start: ${message}`));
  }

  private settle(id: number): Pending | undefined {
    const call = this.pending.get(id);
    if (!call) return undefined;
    clearTimeout(call.timer);
    this.pending.delete(id);
    if (this.pending.size === 0 && this.ready) this.events.onStatus?.("ready");
    return call;
  }

  // Messages from the worker; see the protocol at the top of the worker.
  private handle(message: { type: string; id?: number; [key: string]: unknown }): void {
    switch (message.type) {
      case "ready":
        this.ready = true;
        if (this.pending.size === 0) this.events.onStatus?.("ready");
        this.events.onReady?.(message.info as RuntimeInfo, Math.round(performance.now() - this.startedAt));
        return;
      case "warm":
        this.events.onWarm?.(message.ms as number);
        return;
      case "fatal":
        this.fail(String(message.message));
        return;
    }

    const id = message.id as number;
    if (message.type === "started") {
      const call = this.pending.get(id);
      if (!call) return;
      if (call.options.activity) this.events.onStatus?.(call.options.activity);
      const { timeoutMs } = call.options;
      if (timeoutMs !== undefined) {
        call.timer = setTimeout(
          () => this.restart((other) => (other === id ? new JavaTimeoutError(timeoutMs) : new JavaStoppedError())),
          timeoutMs,
        );
      }
      return;
    }
    if (message.type === "result") {
      this.settle(id)?.resolve(message.value as string | null);
    } else if (message.type === "error") {
      this.settle(id)?.reject(new Error(String(message.message)));
    }
  }
}
