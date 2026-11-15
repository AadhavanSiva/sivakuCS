"use client";

import { useJavaRuntime } from "@/lib/java-runtime";

/**
 * "Starting Java…" while the in-browser JVM loads, including the restart
 * after Stop or a time-out. Renders nothing once Java is ready.
 */
export function StartingJava({ className = "" }: { className?: string }) {
  const { status } = useJavaRuntime();
  if (status === "failed") {
    return (
      <p role="alert" data-testid="java-failed" className={`text-sm text-rose-500 ${className}`}>
        Java could not start. Reload the page to try again.
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
      Starting Java…
    </p>
  );
}
