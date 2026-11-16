// npm run test:accounts: the account data layer (lib/db/attempts.ts)
// against a real Postgres (in memory) through the site's own driver. Above
// all, Milestone 4's check: two accounts cannot see or change each other's
// data, even by sending the other's attempt id. Also: points come from the
// content not the browser, only the latest code is kept, a retried Submit
// changes nothing, and deleting an account deletes everything in it.
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { getExam } from "../lib/content";
import type { Exam } from "../lib/content/types";
import type { Question } from "../lib/grading/types";
import {
  AttemptClosed,
  InvalidInput,
  deleteUser,
  getAttemptDetail,
  listAttempts,
  recordSubmission,
  saveCheckpoint,
  startAttempt,
  upsertUser,
} from "../lib/db/attempts";
import { type Db, poolDb } from "../lib/db/db";
import { startTestPostgres } from "./lib/test-postgres";

const exam = getExam("cs180/samples") as Exam;
const [q1, q2] = exam.questions;

let pool: Pool;
let db: Db;
let stopPostgres: () => Promise<void>;

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer().listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

before(async () => {
  const postgres = await startTestPostgres(await freePort());
  stopPostgres = postgres.stop;
  pool = new Pool({ connectionString: postgres.url, max: 1 });
  db = poolDb(pool);
});

after(async () => {
  await pool.end();
  await stopPostgres();
});

const uuid = () => crypto.randomUUID();
const attemptOf = (id: string, timed = false) => ({ id, examId: exam.id, timed, startedAt: Date.now() - 60_000 });

/** A question's files and outcome as the browser sends them: every case passing, or failing. */
function sent(question: Question, passing: boolean, code = "void main() {}", compiled = true) {
  return {
    questionId: question.id,
    files: Object.fromEntries(question.meta.editable.map((name) => [name, code])),
    outcome: { compiled, cases: question.tests.cases.map((c) => ({ name: c.name, passed: passing })) },
  };
}

const allQuestions = (passingIds: string[] = []) => exam.questions.map((q) => sent(q, passingIds.includes(q.id), `// ${q.id}`));
const count = async (sql: string, values: unknown[]) => Number((await db.query<{ n: string }>(sql, values)).rows[0].n);

test("a Google account maps to one user, and different accounts to different users", async () => {
  const a = await upsertUser(db, "google-sub-1");
  assert.equal(await upsertUser(db, "google-sub-1"), a);
  assert.notEqual(await upsertUser(db, "google-sub-2"), a);
});

test("two accounts cannot see or change each other's attempts, results or code", async () => {
  const alice = await upsertUser(db, "alice");
  const bob = await upsertUser(db, "bob");
  const aliceAttempt = uuid();

  await startAttempt(db, alice, attemptOf(aliceAttempt));
  await saveCheckpoint(db, alice, { attempt: attemptOf(aliceAttempt), question: sent(q1, true, "alice's secret code") });

  // Bob sees nothing of Alice's, even with her attempt id.
  assert.deepEqual(await listAttempts(db, bob), []);
  assert.equal(await getAttemptDetail(db, bob, aliceAttempt), null);

  // Bob cannot write into Alice's attempt, by Test or by Submit.
  await assert.rejects(
    saveCheckpoint(db, bob, { attempt: attemptOf(aliceAttempt), question: sent(q1, false, "bob's code") }),
    InvalidInput,
  );
  await assert.rejects(
    recordSubmission(db, bob, { attempt: attemptOf(aliceAttempt), automatic: false, questions: allQuestions() }),
    InvalidInput,
  );

  // Alice's data is untouched; Bob's attempt list is still empty.
  const detail = await getAttemptDetail(db, alice, aliceAttempt);
  assert.ok(detail);
  assert.equal(detail.attempt.submittedAt, null);
  assert.equal(detail.results.find((r) => r.questionId === q1.id)?.points, q1.meta.points);
  assert.equal(detail.lastCode.find((c) => c.questionId === q1.id)?.files["Main.java"], "alice's secret code");
  assert.deepEqual(await listAttempts(db, bob), []);

  // Bob's own code for the same question is his alone, and Alice's view does not show it.
  const bobAttempt = uuid();
  await saveCheckpoint(db, bob, { attempt: attemptOf(bobAttempt), question: sent(q1, false, "bob's code") });
  const aliceAgain = await getAttemptDetail(db, alice, aliceAttempt);
  assert.deepEqual(aliceAgain?.lastCode.map((c) => c.files["Main.java"]), ["alice's secret code"]);
  const bobDetail = await getAttemptDetail(db, bob, bobAttempt);
  assert.deepEqual(bobDetail?.lastCode.map((c) => c.files["Main.java"]), ["bob's code"]);
  assert.deepEqual((await listAttempts(db, alice)).map((a) => a.id), [aliceAttempt]);
});

test("points come from the content, not from the browser", async () => {
  const user = await upsertUser(db, "scorer");
  const id = uuid();
  const questions = allQuestions([q1.id]);
  // Claimed points are ignored; a question that did not compile passes nothing.
  (questions[0] as Record<string, unknown>).points = 999;
  questions[1] = sent(q2, true, "x", false);
  const result = await recordSubmission(db, user, { attempt: attemptOf(id, true), automatic: true, questions });
  assert.deepEqual(result, { score: q1.meta.points, maxScore: exam.questions.reduce((s, q) => s + q.meta.points, 0) });
  const [summary] = await listAttempts(db, user);
  assert.equal(summary.score, q1.meta.points);
  assert.equal(summary.timed, true);
  assert.equal(summary.automatic, true);
});

test("what the browser sends is checked against the exam", async () => {
  const user = await upsertUser(db, "checker");
  const attempt = attemptOf(uuid());
  const bad: [string, unknown][] = [
    ["an attempt id that is not a UUID", { attempt: { ...attempt, id: "abc" }, question: sent(q1, true) }],
    ["an unknown exam", { attempt: { ...attempt, examId: "cs180/nope" }, question: sent(q1, true) }],
    ["a file the question does not have", { attempt, question: { ...sent(q1, true), files: { "Main.java": "", "Evil.java": "" } } }],
    ["a file that is too long", { attempt, question: sent(q1, true, "x".repeat(100_001)) }],
    ["cases that are not the question's", { attempt, question: { ...sent(q1, true), outcome: { compiled: true, cases: [{ name: "Case 1", passed: true }] } } }],
  ];
  for (const [what, input] of bad) {
    await assert.rejects(saveCheckpoint(db, user, input), InvalidInput, what);
  }
  await assert.rejects(
    recordSubmission(db, user, { attempt, automatic: false, questions: allQuestions().slice(1) }),
    InvalidInput,
    "a submission missing a question",
  );
  assert.deepEqual(await listAttempts(db, user), []);
});

test("only the latest code is kept per question, and a submitted attempt is final", async () => {
  const user = await upsertUser(db, "reviser");
  const first = uuid();
  await saveCheckpoint(db, user, { attempt: attemptOf(first), question: sent(q1, false, "version 1") });
  await saveCheckpoint(db, user, { attempt: attemptOf(first), question: sent(q1, true, "version 2") });
  const submitted = await recordSubmission(db, user, { attempt: attemptOf(first), automatic: false, questions: allQuestions() });
  assert.equal(submitted.score, 0);

  // A retried Submit, or a late Test, changes nothing.
  assert.deepEqual(
    await recordSubmission(db, user, { attempt: attemptOf(first), automatic: false, questions: allQuestions([q1.id]) }),
    submitted,
  );
  await assert.rejects(saveCheckpoint(db, user, { attempt: attemptOf(first), question: sent(q1, true) }), AttemptClosed);

  // A later attempt's Test replaces the code; there is one row per question.
  const second = uuid();
  await saveCheckpoint(db, user, { attempt: attemptOf(second), question: sent(q1, true, "version 3") });
  assert.equal(await count(`select count(*) as n from submissions where user_id = $1`, [user]), exam.questions.length);
  const firstDetail = await getAttemptDetail(db, user, first);
  const code = firstDetail?.lastCode.find((c) => c.questionId === q1.id);
  assert.equal(code?.files["Main.java"], "version 3");
  assert.equal(code?.attemptId, second);
  // The first attempt's own result for Q1 is still its submitted one.
  assert.equal(firstDetail?.results.find((r) => r.questionId === q1.id)?.points, 0);
});

test("deleting an account deletes its attempts, results and code, and nobody else's", async () => {
  const leaving = await upsertUser(db, "leaving");
  const staying = await upsertUser(db, "staying");
  for (const user of [leaving, staying]) {
    await recordSubmission(db, user, { attempt: attemptOf(uuid()), automatic: false, questions: allQuestions() });
  }
  await deleteUser(db, leaving);
  for (const table of ["attempts", "submissions"]) {
    assert.equal(await count(`select count(*) as n from ${table} where user_id = $1`, [leaving]), 0, table);
  }
  assert.equal(await count(`select count(*) as n from users where id = $1`, [leaving]), 0);
  assert.equal(
    await count(`select count(*) as n from question_results r where not exists (select 1 from attempts a where a.id = r.attempt_id)`, []),
    0,
  );
  assert.equal((await listAttempts(db, staying)).length, 1);
});

test("the test login can never be turned on on Vercel or in production", async () => {
  const { testLoginEnabled } = await import("../lib/test-login");
  const saved = { ...process.env };
  const env = process.env as Record<string, string | undefined>;
  try {
    env.SIVAKU_TEST_LOGIN = "1";
    env.NODE_ENV = "development";
    delete env.VERCEL;
    assert.equal(testLoginEnabled(), true);
    env.VERCEL = "1";
    assert.throws(testLoginEnabled);
    delete env.VERCEL;
    env.NODE_ENV = "production";
    assert.throws(testLoginEnabled);
    delete env.SIVAKU_TEST_LOGIN;
    assert.equal(testLoginEnabled(), false);
  } finally {
    process.env = saved;
  }
});
