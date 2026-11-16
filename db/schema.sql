-- sivakuCS accounts: everything the site stores about a student.
-- Safe to run more than once (npm run db:migrate, or paste into Neon's SQL
-- Editor). The privacy page (app/privacy/page.tsx) describes these tables;
-- keep the two in step.

-- One row per Google account that has signed in. Only Google's account id
-- ("sub"), never the name, email address or picture.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  created_at timestamptz not null default now()
);

-- One row per attempt at an exam, from the timer question to Submit.
create table if not exists attempts (
  id uuid primary key,
  user_id uuid not null references users (id) on delete cascade,
  exam_id text not null,
  started_at timestamptz not null,
  submitted_at timestamptz,
  timed boolean not null,
  -- True when the timer ran out rather than the student pressing Submit.
  automatic boolean not null default false,
  score integer,
  max_score integer
);
create index if not exists attempts_user_started on attempts (user_id, started_at desc);

-- Each question's latest result in an attempt, from Test or Submit,
-- overwritten each time (no history). cases: [{"name", "points", "passed"}].
create table if not exists question_results (
  attempt_id uuid not null references attempts (id) on delete cascade,
  question_id text not null,
  points integer not null,
  max_points integer not null,
  compiled boolean not null,
  cases jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- Only the last code a student sent with Test or Submit, per question,
-- overwritten each time. files: {"Main.java": "..."}.
create table if not exists submissions (
  user_id uuid not null references users (id) on delete cascade,
  exam_id text not null,
  question_id text not null,
  files jsonb not null,
  attempt_id uuid references attempts (id) on delete set null,
  submitted_at timestamptz not null default now(),
  primary key (user_id, exam_id, question_id)
);
