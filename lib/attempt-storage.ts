"use client";

// An attempt's state in this browser: the timer choice, the code in
// progress, the last Test of each question (a checkpoint: its code and
// result), where the student was, and once submitted, what was submitted
// and how it scored. Kept in localStorage so a refresh, or closing the tab,
// loses nothing, and a timed attempt's clock keeps running. Milestone 4
// adds saving to an account.
import type { GradeResult } from "./grading/types";
import type { JavaFiles } from "./java/programs";

export type Checkpoint = {
  files: JavaFiles;
  result: GradeResult;
  /** When the Test ran, as Date.now(). */
  at: number;
};

/** The answer to "Do you want a timer?", which starts the attempt. */
export type TimerChoice = {
  timed: boolean;
  startedAt: number;
  /** Timed only: when time runs out, as Date.now(). A refresh keeps it. */
  deadline?: number;
};

export type Submission = {
  at: number;
  /** True when the timer ran out, rather than the student pressing Submit. */
  automatic: boolean;
  /** Every question's editable files as submitted. */
  files: Record<string, JavaFiles>;
  results: Record<string, GradeResult>;
  score: number;
  maxScore: number;
};

export type AttemptState = {
  /** Distinguishes one attempt from the next (it keys the editor's buffers). */
  id: string;
  timer?: TimerChoice;
  /** The student's editable files, by question id. */
  files: Record<string, JavaFiles>;
  checkpoints: Record<string, Checkpoint>;
  /** 0 is the instructions; 1..n are the questions. */
  slide: number;
  /**
   * Submitting has begun but not finished grading: a refresh mid-way
   * resumes it rather than losing it.
   */
  submitting?: { at: number; automatic: boolean };
  submission?: Submission;
};

const VERSION = 1;
const key = (examId: string) => `sivaku:attempt:v${VERSION}:${examId}`;

export function newAttempt(): AttemptState {
  return { id: Math.random().toString(36).slice(2, 10), files: {}, checkpoints: {}, slide: 0 };
}

export function loadAttempt(examId: string): AttemptState {
  try {
    const saved = window.localStorage.getItem(key(examId));
    if (!saved) return newAttempt();
    const parsed = JSON.parse(saved) as Partial<AttemptState>;
    return {
      id: parsed.id ?? newAttempt().id,
      timer: parsed.timer,
      files: parsed.files ?? {},
      checkpoints: parsed.checkpoints ?? {},
      slide: Number.isInteger(parsed.slide) ? parsed.slide! : 0,
      submitting: parsed.submitting,
      submission: parsed.submission,
    };
  } catch {
    // Private browsing, storage turned off or full, or damaged data: start fresh.
    return newAttempt();
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
