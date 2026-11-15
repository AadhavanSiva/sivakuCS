"use client";

// One in-browser JVM per tab, shared by every page.
//
// Starting Java takes several seconds, so pages that know Java is coming
// (the exam instructions slide) call preloadJava() early, and the JVM is
// already warm when the student reaches a question. Client-side navigation
// keeps it alive; it is never disposed while the tab is open.
import { useSyncExternalStore } from "react";
import lock from "@/cheerpj-lock.json";
import { BrowserJava, type JavaStatus, type RuntimeInfo } from "./java/browser-java";

export type JavaRuntimeState = {
  /** "idle" until something asks for Java. */
  status: JavaStatus | "idle";
  /** Which start attempt this is: 1, then 2 after an automatic retry, and so on. */
  attempt: number;
  info: RuntimeInfo | null;
  /** Time from the first start until the JVM was ready (the cold start). */
  readyMs: number | null;
  /** The compiler's warm-up compile, done in the background after ready. */
  warmMs: number | null;
  /**
   * The runtime reports a different Java build from the one recorded in
   * cheerpj-lock.json: CheerpJ was updated on its CDN since the site was
   * last verified against it.
   */
  runtimeChanged: boolean;
};

const INITIAL: JavaRuntimeState = {
  status: "idle",
  attempt: 0,
  info: null,
  readyMs: null,
  warmMs: null,
  runtimeChanged: false,
};

let state = INITIAL;
let java: BrowserJava | null = null;
const listeners = new Set<() => void>();

function update(change: Partial<JavaRuntimeState>) {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
}

/** The shared JVM, started if it is not already running. */
export function getJava(): BrowserJava {
  if (!java) {
    const events = {
      onStatus: (status: JavaStatus) => update({ status }),
      onAttempt: (attempt: number) => update({ attempt }),
      onReady: (info: RuntimeInfo, ms: number) => {
        const runtimeChanged = info.javaVersion !== lock.javaRuntime;
        if (runtimeChanged) {
          console.warn(
            `Java runtime ${info.javaVersion} differs from ${lock.javaRuntime} in cheerpj-lock.json; ` +
              "CheerpJ has changed since it was last verified.",
          );
        }
        // Only the first start is the cold start; restarts after Stop are not.
        update({ info, runtimeChanged, readyMs: state.readyMs ?? ms });
      },
      onWarm: (ms: number) => update({ warmMs: state.warmMs ?? ms }),
    };
    java = new BrowserJava(events, { startTimeoutMs: startTimeoutOverride() });
    java.start();
  }
  return java;
}

/**
 * For the browser tests: ?javaStartTimeoutMs=3000 in the page URL shortens
 * the start-up limit, so a stalled start can be tested in seconds.
 */
function startTimeoutOverride(): number | undefined {
  const value = Number(new URLSearchParams(window.location.search).get("javaStartTimeoutMs"));
  return value > 0 ? value : undefined;
}

/** After Java failed to start: try again. */
export function retryJava(): void {
  java?.retry();
}

/** Starts loading Java in the background. Safe to call any number of times. */
export function preloadJava(): void {
  if (typeof window !== "undefined") getJava();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useJavaRuntime(): JavaRuntimeState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}
