"use client";

// An attempt's state in this browser: the timer choice, the code in
// progress, the last Test of each question (a checkpoint: its code and
// result), where the student was, and once submitted, what was submitted
// and how it scored. Kept in localStorage so a refresh, or closing the tab,
// loses nothing, and a timed attempt's clock keeps running. Each signed-in
// user has their own copy (the key holds their user id), and signing out
// clears them all from the browser. Test and Submit also save to the
// account (lib/actions/attempts.ts).
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
  /** Saved to the student's account (My attempts); false if that failed and needs a retry. */
  saved?: boolean;
};

export type AttemptState = {
  /**
   * A UUID made when the attempt starts: the attempt's id in the account
   * too, and it keys the editor's buffers.
   */
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

const PREFIX = "sivaku:attempt:";
const VERSION = 2;
/** Whose attempt at which exam: "sivaku:attempt:v2:<user id>:<exam id>". */
export type AttemptKey = { userId: string; examId: string };
const key = ({ userId, examId }: AttemptKey) => `${PREFIX}v${VERSION}:${userId}:${examId}`;

/** A random (version 4) UUID; crypto.randomUUID needs https or localhost, so built by hand. */
export function randomUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function newAttempt(): AttemptState {
  return { id: randomUuid(), files: {}, checkpoints: {}, slide: 0 };
}

export function loadAttempt(which: AttemptKey): AttemptState {
  try {
    const saved = window.localStorage.getItem(key(which));
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
export function saveAttempt(which: AttemptKey, state: AttemptState): boolean {
  try {
    window.localStorage.setItem(key(which), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAttempt(which: AttemptKey): void {
  try {
    window.localStorage.removeItem(key(which));
  } catch {
    // Nothing to clear.
  }
}

/** Every attempt in this browser, anyone's (at sign-out, so the next person sees none of it). */
export function clearAllAttempts(): void {
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // Nothing to clear.
  }
}
