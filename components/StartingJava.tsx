"use client";

import { retryJava, useJavaRuntime } from "@/lib/java-runtime";

/**
 * "Starting Java…" while the in-browser JVM loads, including the restart
 * after Stop or a time-out, and a Retry button if it could not start.
 * Renders nothing once Java is ready.
 */
export function StartingJava({ className = "" }: { className?: string }) {
  const { status, attempt } = useJavaRuntime();
  if (status === "failed") {
    return (
      <p role="alert" data-testid="java-failed" className={`flex items-center gap-2 text-sm text-rose-400 ${className}`}>
        Java could not start.
        <button
          type="button"
          data-testid="java-retry"
          className="rounded border border-current px-2 py-0.5"
          onClick={retryJava}
        >
          Retry
        </button>
      </p>
    );
  }
  if (status !== "starting") return null;
  return (
    <p role="status" data-testid="starting-java" className={`flex items-center gap-2 text-sm ${className}`}>
      <span
        aria-hidden="true"
        className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {attempt > 1 ? "Starting Java… (trying again)" : "Starting Java…"}
    </p>
  );
}
