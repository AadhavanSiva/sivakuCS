"use client";

// An attempt's state in this browser: the code in progress, the last Test
// of each question (a checkpoint: its code and result) and where the
// student was. Kept in localStorage so a refresh, or closing the tab,
// loses nothing. Milestone 4 adds saving checkpoints to the server.
import type { GradeResult } from "./grading/types";
import type { JavaFiles } from "./java/programs";

export type Checkpoint = {
  files: JavaFiles;
  result: GradeResult;
  /** When the Test ran, as Date.now(). */
  at: number;
};

export type AttemptState = {
  /** The student's editable files, by question id. */
  files: Record<string, JavaFiles>;
  checkpoints: Record<string, Checkpoint>;
  /** 0 is the instructions; 1..n are the questions. */
  slide: number;
};

const VERSION = 1;
const key = (examId: string) => `sivaku:attempt:v${VERSION}:${examId}`;

export const EMPTY_ATTEMPT: AttemptState = { files: {}, checkpoints: {}, slide: 0 };

export function loadAttempt(examId: string): AttemptState {
  try {
    const saved = window.localStorage.getItem(key(examId));
    if (!saved) return EMPTY_ATTEMPT;
    const parsed = JSON.parse(saved) as Partial<AttemptState>;
    return {
      files: parsed.files ?? {},
      checkpoints: parsed.checkpoints ?? {},
      slide: Number.isInteger(parsed.slide) ? parsed.slide! : 0,
    };
  } catch {
    // Private browsing, storage turned off or full, or damaged data: start fresh.
    return EMPTY_ATTEMPT;
  }
}

/** Saves the attempt; false if the browser would not store it. */
export function saveAttempt(examId: string, state: AttemptState): boolean {
  try {
    window.localStorage.setItem(key(examId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAttempt(examId: string): void {
  try {
    window.localStorage.removeItem(key(examId));
  } catch {
    // Nothing to clear.
  }
}
