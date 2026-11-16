"use server";

// Saving to the student's account, called from the exam workspace. Server
// actions are public endpoints, so each one reads the user from the session
// here, never from what the browser sends, and lib/db/attempts.ts checks the
// rest. They return a result rather than throwing, so the page can say
// what went wrong (production hides thrown errors' messages).
import { currentUserId } from "@/auth";
import {
  AttemptClosed,
  type AttemptInput,
  type CheckpointInput,
  InvalidInput,
  type SubmissionInput,
  recordSubmission,
  saveCheckpoint,
  startAttempt,
} from "@/lib/db/attempts";
import { getDb } from "@/lib/db/pool";

export type SaveResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function asUser<T extends object>(fn: (userId: string) => Promise<T>): Promise<SaveResult<T>> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You are signed out. Sign in again to save to your account." };
  try {
    return { ok: true, ...(await fn(userId)) };
  } catch (error) {
    if (error instanceof InvalidInput || error instanceof AttemptClosed) return { ok: false, error: error.message };
    console.error("Saving to the account failed:", error);
    return { ok: false, error: "The server could not save this just now." };
  }
}

/** The timer question was answered. */
export async function startAttemptAction(attempt: AttemptInput): Promise<SaveResult> {
  return asUser(async (userId) => {
    await startAttempt(getDb(), userId, attempt);
    return {};
  });
}

/** Test: the question's latest result and code replace the previous ones. */
export async function saveCheckpointAction(input: CheckpointInput): Promise<SaveResult<{ points: number; maxPoints: number }>> {
  return asUser((userId) => saveCheckpoint(getDb(), userId, input));
}

/** Submit: every question's result and code, and the score. */
export async function recordSubmissionAction(input: SubmissionInput): Promise<SaveResult<{ score: number; maxScore: number }>> {
  return asUser((userId) => recordSubmission(getDb(), userId, input));
}
