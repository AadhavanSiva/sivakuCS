// Everything the site reads and writes about a student's attempts. Every
// function takes the signed-in user's id, from the session on the server
// (never from the browser), and every query is limited to that user's rows:
// one student can never read or change another's data, even by guessing an
// attempt id. `npm run test:accounts` checks this against a real Postgres.
//
// What the browser sends is checked against the exam's content: the
// question must belong to the exam, the files must be its editable files,
// and the test cases must be its cases. Points come from the content, not
// from the browser; only which cases passed is taken on trust (the Java
// runs in the student's browser, so that cannot be checked here).
import { getExam } from "../content";
import type { Exam } from "../content/types";
import type { Db, Queryable } from "./db";

/** The browser sent something malformed, or for an attempt that is not the user's. */
export class InvalidInput extends Error {}
/** The attempt was already submitted: its results no longer change. */
export class AttemptClosed extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

const MAX_FILE_CHARS = 100_000;
const WEEK_MS = 7 * 24 * 60 * 60_000;

// ---- What the browser sends --------------------------------------------

/** An attempt as the browser knows it; the id is made in the browser when the attempt starts. */
export type AttemptInput = { id: string; examId: string; timed: boolean; startedAt: number };

/** Which of a question's cases passed, in tests.json order. */
export type OutcomeInput = { compiled: boolean; cases: { name: string; passed: boolean }[] };

export type QuestionInput = { questionId: string; files: Record<string, string>; outcome: OutcomeInput };

export type CheckpointInput = { attempt: AttemptInput; question: QuestionInput };

export type SubmissionInput = { attempt: AttemptInput; automatic: boolean; questions: QuestionInput[] };

// ---- Checking it --------------------------------------------------------

function object(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidInput(`${what}: expected an object`);
  return value as Record<string, unknown>;
}

type Attempt = AttemptInput & { exam: Exam };

export function parseAttempt(value: unknown, now = Date.now()): Attempt {
  const input = object(value, "attempt");
  if (!isUuid(input.id)) throw new InvalidInput("attempt: id must be a UUID");
  const exam = typeof input.examId === "string" ? getExam(input.examId) : undefined;
  if (!exam) throw new InvalidInput("attempt: unknown exam");
  if (typeof input.timed !== "boolean") throw new InvalidInput("attempt: timed must be true or false");
  // The browser's clock: kept within the last week and never in the future.
  const startedAt =
    typeof input.startedAt === "number" && Number.isFinite(input.startedAt)
      ? Math.min(Math.max(input.startedAt, now - WEEK_MS), now)
      : now;
  return { id: input.id.toLowerCase(), examId: exam.id, timed: input.timed, startedAt, exam };
}

export type StoredCase = { name: string; points: number; passed: boolean };

export type ScoredQuestion = {
  questionId: string;
  files: Record<string, string>;
  compiled: boolean;
  points: number;
  maxPoints: number;
  cases: StoredCase[];
};

/** Checks one question's files and outcome against the exam, and scores it from the content's points. */
export function scoreQuestion(exam: Exam, value: unknown): ScoredQuestion {
  const input = object(value, "question");
  const question = exam.questions.find((q) => q.id === input.questionId);
  if (!question) throw new InvalidInput("question: not in this exam");

  const sent = object(input.files, "files");
  const editable = question.meta.editable;
  if (Object.keys(sent).some((name) => !editable.includes(name))) throw new InvalidInput("files: not an editable file");
  const files: Record<string, string> = {};
  for (const name of editable) {
    const text = sent[name];
    if (typeof text !== "string" || text.length > MAX_FILE_CHARS) throw new InvalidInput(`files: ${name} is missing or too long`);
    files[name] = text;
  }

  const outcome = object(input.outcome, "outcome");
  if (typeof outcome.compiled !== "boolean") throw new InvalidInput("outcome: compiled must be true or false");
  const compiled = outcome.compiled;
  const claimed = outcome.cases;
  const expected = question.tests.cases;
  if (!Array.isArray(claimed) || claimed.length !== expected.length) throw new InvalidInput("outcome: wrong number of cases");
  const cases = expected.map((testCase, i) => {
    const c = object(claimed[i], "case");
    if (c.name !== testCase.name || typeof c.passed !== "boolean") throw new InvalidInput("outcome: cases do not match the question");
    // Code that does not compile passes nothing.
    return { name: testCase.name, points: testCase.points, passed: compiled && c.passed };
  });

  return {
    questionId: question.id,
    files,
    compiled,
    points: cases.reduce((sum, c) => sum + (c.passed ? c.points : 0), 0),
    maxPoints: cases.reduce((sum, c) => sum + c.points, 0),
    cases,
  };
}

export function parseCheckpoint(value: unknown, now = Date.now()) {
  const input = object(value, "checkpoint");
  const attempt = parseAttempt(input.attempt, now);
  return { attempt, question: scoreQuestion(attempt.exam, input.question) };
}

export function parseSubmission(value: unknown, now = Date.now()) {
  const input = object(value, "submission");
  const attempt = parseAttempt(input.attempt, now);
  if (typeof input.automatic !== "boolean") throw new InvalidInput("submission: automatic must be true or false");
  if (!Array.isArray(input.questions)) throw new InvalidInput("submission: questions must be a list");
  const questions = input.questions.map((q) => scoreQuestion(attempt.exam, q));
  const ids = new Set(questions.map((q) => q.questionId));
  if (ids.size !== questions.length || ids.size !== attempt.exam.questions.length) {
    throw new InvalidInput("submission: every question, once each");
  }
  return { attempt, automatic: input.automatic, questions };
}

// ---- Users --------------------------------------------------------------

/** The user's id for a Google account id, adding the user on first sign-in. */
export async function upsertUser(db: Queryable, googleSub: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into users (google_sub) values ($1)
     on conflict (google_sub) do update set google_sub = excluded.google_sub
     returning id`,
    [googleSub],
  );
  return rows[0].id;
}

/** Deletes the user and, through the foreign keys, all their attempts, results and code. */
export async function deleteUser(db: Queryable, userId: string): Promise<void> {
  await db.query(`delete from users where id = $1`, [userId]);
}

// ---- Writing attempts ---------------------------------------------------

/** Adds the attempt if it is new; does nothing if it exists (whoever's it is). */
async function insertAttempt(db: Queryable, userId: string, attempt: Attempt) {
  await db.query(
    `insert into attempts (id, user_id, exam_id, started_at, timed)
     values ($1, $2, $3, to_timestamp($4 / 1000.0), $5)
     on conflict (id) do nothing`,
    [attempt.id, userId, attempt.examId, attempt.startedAt, attempt.timed],
  );
}

/** The user's attempt, added if new and locked for this transaction; InvalidInput if it is someone else's. */
async function openAttempt(tx: Queryable, userId: string, attempt: Attempt) {
  await insertAttempt(tx, userId, attempt);
  const { rows } = await tx.query<{ submitted: boolean; score: number | null; max_score: number | null }>(
    `select submitted_at is not null as submitted, score, max_score
     from attempts where id = $1 and user_id = $2 and exam_id = $3
     for update`,
    [attempt.id, userId, attempt.examId],
  );
  if (!rows[0]) throw new InvalidInput("attempt: not found");
  return rows[0];
}

async function saveQuestion(tx: Queryable, userId: string, attempt: Attempt, q: ScoredQuestion) {
  await tx.query(
    `insert into question_results (attempt_id, question_id, points, max_points, compiled, cases)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     on conflict (attempt_id, question_id) do update set
       points = excluded.points, max_points = excluded.max_points, compiled = excluded.compiled,
       cases = excluded.cases, updated_at = now()`,
    [attempt.id, q.questionId, q.points, q.maxPoints, q.compiled, JSON.stringify(q.cases)],
  );
  // Only the latest code is kept: each Test or Submit overwrites it.
  await tx.query(
    `insert into submissions (user_id, exam_id, question_id, files, attempt_id)
     values ($1, $2, $3, $4::jsonb, $5)
     on conflict (user_id, exam_id, question_id) do update set
       files = excluded.files, attempt_id = excluded.attempt_id, submitted_at = now()`,
    [userId, attempt.examId, q.questionId, JSON.stringify(q.files), attempt.id],
  );
}

/** The timer question was answered: the attempt begins. */
export async function startAttempt(db: Queryable, userId: string, value: unknown): Promise<void> {
  await insertAttempt(db, userId, parseAttempt(value));
}

/** Test was pressed: the question's latest result and code. */
export async function saveCheckpoint(db: Db, userId: string, value: unknown) {
  const { attempt, question } = parseCheckpoint(value);
  return db.transaction(async (tx) => {
    const row = await openAttempt(tx, userId, attempt);
    if (row.submitted) throw new AttemptClosed("This attempt has been submitted.");
    await saveQuestion(tx, userId, attempt, question);
    return { points: question.points, maxPoints: question.maxPoints };
  });
}

/**
 * Submit: every question's result and code, and the attempt's score. Sending
 * the same submission again (a retry after a lost reply) changes nothing.
 */
export async function recordSubmission(db: Db, userId: string, value: unknown) {
  const { attempt, automatic, questions } = parseSubmission(value);
  return db.transaction(async (tx) => {
    const row = await openAttempt(tx, userId, attempt);
    if (row.submitted) return { score: row.score ?? 0, maxScore: row.max_score ?? 0 };
    for (const q of questions) await saveQuestion(tx, userId, attempt, q);
    const score = questions.reduce((sum, q) => sum + q.points, 0);
    const maxScore = questions.reduce((sum, q) => sum + q.maxPoints, 0);
    await tx.query(
      `update attempts set submitted_at = now(), automatic = $3, score = $4, max_score = $5
       where id = $1 and user_id = $2`,
      [attempt.id, userId, automatic, score, maxScore],
    );
    return { score, maxScore };
  });
}

// ---- Reading them back --------------------------------------------------

export type AttemptSummary = {
  id: string;
  examId: string;
  startedAt: number;
  /** null while the attempt is in progress. */
  submittedAt: number | null;
  timed: boolean;
  automatic: boolean;
  score: number | null;
  maxScore: number | null;
};

type AttemptRow = {
  id: string;
  exam_id: string;
  started_at: Date;
  submitted_at: Date | null;
  timed: boolean;
  automatic: boolean;
  score: number | null;
  max_score: number | null;
};

const ATTEMPT_COLUMNS = "id, exam_id, started_at, submitted_at, timed, automatic, score, max_score";

function summary(row: AttemptRow): AttemptSummary {
  return {
    id: row.id,
    examId: row.exam_id,
    startedAt: row.started_at.getTime(),
    submittedAt: row.submitted_at?.getTime() ?? null,
    timed: row.timed,
    automatic: row.automatic,
    score: row.score,
    maxScore: row.max_score,
  };
}

/** The user's attempts, newest first. */
export async function listAttempts(db: Queryable, userId: string, limit = 200): Promise<AttemptSummary[]> {
  const { rows } = await db.query<AttemptRow>(
    `select ${ATTEMPT_COLUMNS} from attempts where user_id = $1 order by started_at desc limit $2`,
    [userId, limit],
  );
  return rows.map(summary);
}

export type QuestionResultRow = { questionId: string; points: number; maxPoints: number; compiled: boolean; cases: StoredCase[] };

export type LastCode = { questionId: string; files: Record<string, string>; attemptId: string | null; submittedAt: number };

export type AttemptDetail = {
  attempt: AttemptSummary;
  results: QuestionResultRow[];
  /** The user's last code for each question of the exam, from whichever attempt sent it last. */
  lastCode: LastCode[];
};

/** One of the user's attempts with its results; null if there is no such attempt of theirs. */
export async function getAttemptDetail(db: Queryable, userId: string, attemptId: string): Promise<AttemptDetail | null> {
  if (!isUuid(attemptId)) return null;
  const found = await db.query<AttemptRow>(`select ${ATTEMPT_COLUMNS} from attempts where id = $1 and user_id = $2`, [
    attemptId,
    userId,
  ]);
  if (!found.rows[0]) return null;
  const attempt = summary(found.rows[0]);

  const results = await db.query<{ question_id: string; points: number; max_points: number; compiled: boolean; cases: StoredCase[] }>(
    `select r.question_id, r.points, r.max_points, r.compiled, r.cases
     from question_results r join attempts a on a.id = r.attempt_id
     where a.id = $1 and a.user_id = $2`,
    [attemptId, userId],
  );
  const code = await db.query<{ question_id: string; files: Record<string, string>; attempt_id: string | null; submitted_at: Date }>(
    `select question_id, files, attempt_id, submitted_at from submissions where user_id = $1 and exam_id = $2`,
    [userId, attempt.examId],
  );
  return {
    attempt,
    results: results.rows.map((r) => ({
      questionId: r.question_id,
      points: r.points,
      maxPoints: r.max_points,
      compiled: r.compiled,
      cases: r.cases,
    })),
    lastCode: code.rows.map((r) => ({
      questionId: r.question_id,
      files: r.files,
      attemptId: r.attempt_id,
      submittedAt: r.submitted_at.getTime(),
    })),
  };
}
