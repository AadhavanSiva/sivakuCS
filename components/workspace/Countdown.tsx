"use client";

import { useEffect, useRef, useState } from "react";

/** 3599000 -> "59:59"; minutes may pass 59 ("60:00") rather than switch to hours. */
export function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The time left in a timed attempt, counted down to its deadline (a
 * wall-clock time, so a refresh or a closed tab does not reset it). Calls
 * onExpire once when it reaches zero, or straight away if it already has.
 */
export function Countdown({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const expired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !expired.current) {
        expired.current = true;
        onExpire();
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline, onExpire]);

  const remaining = Math.max(0, deadline - now);
  const tone = remaining <= 60_000 ? "text-rose-400" : remaining <= 5 * 60_000 ? "text-amber-400" : "text-neutral-100";
  return (
    <span
      role="timer"
      aria-label={`Time left: ${formatRemaining(remaining)}`}
      data-testid="countdown"
      data-remaining-ms={remaining}
      className={`font-mono text-sm tabular-nums ${tone}`}
    >
      ⏱ {formatRemaining(remaining)}
    </span>
  );
}
