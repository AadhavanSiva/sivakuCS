# sivakuCS

Practice exams for Purdue CS 18000 (Java) that look, run and score like the
real ones on Ed. Java compiles and runs entirely in the student's browser.

**Status:** Milestones 1 to 4 are done and live: Java 25 runs in the
browser, questions are graded by the same code in the browser and in `npm
run verify`, a full exam can be sat at `/exams`, timed or not, and attempts
are kept in the student's account ([Accounts](#accounts)). Milestone 5's two
exams, Midterm 1 and Midterm 2, are written (one variant per question so far)
and pass `npm run verify`; they wait for the owner to sit both, timed, and
sign off.

Unofficial practice. Not affiliated with Purdue University or Ed.

## Setup

You need Git, Node.js 26 LTS and a JDK 25.

### On a Mac (Apple Silicon)

1. **Command-line tools and Git.** In Terminal:

   ```bash
   xcode-select --install
   ```

   Accept the prompt. This installs `git`.

2. **Node.js 26 LTS.** Download the macOS installer (`.pkg`) for the 26.x LTS
   release from [nodejs.org](https://nodejs.org/en/download) and run it.
   Check with `node --version` (should print `v26.x`).

3. **JDK 25.** Download Eclipse Temurin 25 for macOS, aarch64, `.pkg`, from
   [adoptium.net](https://adoptium.net/temurin/releases/?version=25) and run
   it. Check with `javac -version` (should print `javac 25...`).

4. **GitHub CLI and the repo.**

   ```bash
   brew install gh            # or download from cli.github.com
   gh auth login              # sign in as AadhavanSiva
   gh repo clone AadhavanSiva/sivakuCS
   cd sivakuCS
   ```

   No Homebrew? Install it from [brew.sh](https://brew.sh), or download `gh` directly.

5. **Install.**

   ```bash
   npm ci
   npx playwright install chromium   # the browser the tests drive
   ```

6. **Secrets.** Create `.env.local` in the repo folder with the four
   variables in [`.env.example`](.env.example) ([Accounts](#accounts) says
   where each comes from). It is ignored by Git; never commit it.

7. **Database tables** (once per database): `npm run db:migrate`.

8. **Run.** `npm run dev`, then open <http://localhost:3000> and sign in.

The site is deployed on Vercel from `main` ([Accounts](#accounts) lists the
variables it needs there too).

### On Windows

The same tools, installed with `winget` in PowerShell:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact
winget install --id EclipseAdoptium.Temurin.25.JDK --exact
```

Then open a new terminal and follow steps 5 to 8 above.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates Next.js route types, then checks types with `tsc` |
| `npm run content` | Bundles `content/` into `generated/content.json` for the site, without solutions. Runs by itself before `dev` and `build` |
| `npm run verify` | Checks every question: its structure, that the reference solution passes every test, and that each broken solution fails a hidden one. Needs JDK 25 |
| `npm run test:e2e` | Browser tests (Playwright, headless Chromium). Starts its own in-memory database and a test dev server on port 3100 (built into `.next-e2e`, so it runs beside `npm run dev`, and it never uses `.env.local`'s database). The grading tests also need JDK 25. CI runs them on every push |
| `npm run test:accounts` | The account data layer against an in-memory Postgres: above all, that one account can never read or change another's data |
| `npm run db:migrate` | Creates the tables in `db/schema.sql` in the database in `DATABASE_URL` (from `.env.local`). Safe to run again |
| `npm run build:sandbox` | Rebuilds `public/cheerpj/sandbox.jar` from `java/sandbox` (needs JDK 25) |
| `npm run check:cheerpj` | Fails if the CheerpJ runtime on its CDN no longer matches `cheerpj-lock.json` |
| `npx tsx scripts/time-gradings.ts <question folder>` | Times one grading of the starter and of every correct and broken solution, case by case, on the local JDK |

## How Java runs in the browser

[CheerpJ](https://cheerpj.com) 5.0 is a full OpenJDK build compiled to
WebAssembly. The site uses its **Java 25** runtime, which CheerpJ currently
labels a preview.

- **`public/cheerpj/sandbox-worker.js`** loads CheerpJ in a Web Worker. A
  program stuck in `while (true)` keeps only that worker busy; the page
  stays responsive and stops the program by terminating the worker, then
  starts a fresh one.
- **`java/sandbox/.../Sandbox.java`**, built into `public/cheerpj/sandbox.jar`,
  runs inside the browser JVM. It compiles with the JDK's own `javac` and
  runs `Main` with the given standard input, capturing standard output and
  error (up to 1 MB each). Each run gets a new class loader, so static fields
  start over.
- **`lib/java-sandbox.ts`** is the page-side API: `run({ files, inputFiles,
  stdin, timeLimitMs })` returns the compile errors, or the output, the exit
  code and every file in the working directory afterwards. The time limit
  counts only the program's own running time, not compiling.
- **`lib/java-runtime.ts`** keeps one JVM per tab, shared by every page and
  kept alive across client-side navigation. `preloadJava()` starts it early;
  the exam instructions slide calls it, so Java is ready by the first
  question. `<StartingJava />` (in `components/`) shows "Starting Java…"
  while it loads, including the restart after Stop or a time-out.

### Pinned CheerpJ version

The free CheerpJ licence requires loading the runtime from CheerpJ's CDN,
which serves only a major.minor path: `https://cjrtnc.leaningtech.com/5.0/`.
No exact-build URL exists, and Leaning Technologies can update that path in
place. Freezing an exact build means self-hosting the runtime, which needs a
paid licence. So the version is pinned to 5.0, and any change within it is
made loud rather than prevented:

- `cheerpj-lock.json` records the SHA-256 of `loader.js`, `cj3.js` and
  `cj3.wasm`, and the Java build the runtime reports.
- `npm run check:cheerpj` compares the CDN with the lock. A GitHub Action
  (`.github/workflows/cheerpj-pin.yml`) runs it daily, and GitHub emails the
  owner if it fails.
- The browser tests fail if the runtime's Java build differs from the lock,
  and `/lab` shows a warning.

When it fires: rerun the browser tests (and `npm run verify` once it
exists). If everything passes, accept the new runtime with
`node scripts/check-cheerpj.mjs --update` and update `javaRuntime` in the
lock from the version `/lab` shows.

The jar is committed because Vercel's build machines have no JDK. After
changing anything under `java/sandbox`, run `npm run build:sandbox` and commit
the new jar.

### Measured times

From `npm run test:e2e` in headless Chromium on the development PC (Windows,
Node 26), against both the dev server and the production build. The full
numbers are in `test-results/milestone1-timings.json` after a run.

| | Time |
|---|---|
| JVM ready, empty browser cache | 4.8–9.6 s |
| JVM ready, repeat visit (cached) | 2.7–7.7 s |
| Compiler warm-up, in the background after the JVM is ready | 6.1–8.6 s |
| Compiling the 3-file check program, first Run | 0.7–2.2 s |
| Compiling it again | 0.6–1.3 s |
| Running it | 0.1–0.4 s |
| New JVM ready after Stop or a time-out | 2.9–8.0 s |

The slowest figure in each row is the first run of the day, when CheerpJ's
CDN and the server were cold. Without the warm-up compile, a student's
first Run would take 5–11 s.

## Licence note: CheerpJ

CheerpJ is not open source. Its free **Community** licence covers
"individuals, one-person companies and non-commercial open source"
publishing software under their own name, loaded from CheerpJ's CDN (which
this site does), with a "Built with CheerpJ" credit (in the site footer).
Companies and "public sites" outside those groups need a paid Application
licence, and self-hosting the runtime is paid too.

**Before a public launch, confirm that sivakuCS qualifies**, for example
with [CheerpJ's licensing page](https://cheerpj.com/licensing) or by asking
Leaning Technologies. If it is ever run by a company or a club, or is
self-hosted, it will need a paid licence.

## Known differences from a real JVM

Found while building Milestone 1. The browser tests cover the `System.exit`
handling and file paths.

- **Exception messages and line numbers are missing.** CheerpJ prints
  `java.lang.ArrayIndexOutOfBoundsException` at `Main.main(Unknown Source)`
  where a real JVM prints `Index 2 out of bounds for length 1` at
  `Main.java:3`. Standard output, which is what tests grade, is unaffected.
- **`System.exit` would end the whole browser JVM**, so after compiling, the
  sandbox rewrites calls to `System.exit`, `Runtime.exit` and
  `Runtime.halt` in the student's bytecode to end only the run. One
  difference remains: `finally` blocks around a `System.exit` call still
  run, where a real JVM would skip them.
- **Relative paths:** CheerpJ resolves `java.io` relative paths against
  `/files/` regardless of `user.dir`, so the program's working directory is
  `/files/` and `user.dir` is set to match.

## Midterm 3: what grading in the browser needs

Before any Midterm 3 question, each way of grading was proved in CheerpJ
(section 8 of the private exam specs), riskiest first. The proofs are Java
programs in `java/proofs/m3/`; `e2e/m3-proofs.spec.ts` runs each on the
local JDK and in the browser, checks it, and writes the numbers to
`test-results/m3-proofs.json`. They run nightly
(`.github/workflows/nightly.yml`), not on every push; locally,
`SIVAKU_NIGHTLY=1 npx playwright test e2e/m3-proofs.spec.ts`. The JUnit jar
they need is downloaded (and checked against Maven Central) into the
gitignored `public/m3-proof/` by `node scripts/fetch-junit.mjs`. Browser
times below are from a Windows laptop.

| Topic | In the browser | How it will be graded |
|---|---|---|
| Threads (A, B, G) | Works. With a store that sleeps between read and write, an unsynchronised counter lost updates in 20 of 20 runs and oversold a stock in 20 of 20; a synchronised one never did. An instrumented source told parallel from serial, and overlapping or skipped slices, in 20 of 20 runs each, and recorded which thread read each index. 80 counter runs took 9.2 s (7.5 s on the JDK). | **Run the student's methods once on one thread first.** Without that, the first time several threads run a path together CheerpJ can kill one inside its own code (a `ClassCastException` or `ArrayIndexOutOfBoundsException` before the thread's code starts): a correct synchronised counter then ended at 70 of 80, reproducibly. With the warm-up: 80 of 80 runs correct, in 4 fresh JVMs. `join()` itself always waits. |
| Sockets (E, F, G) | Real `ServerSocket`/`Socket` do not work (`UnsatisfiedLinkError` in the NIO socket code). The fallback works: the student's compiled `new Socket(...)` and `new ServerSocket(...)` are rewritten to in-memory fakes, and a handler is given a fake socket directly. A client, a thread-per-client server and a handler all behaved as on the JDK, in 25–60 ms each. | The fallback. The fakes pass an inert `SocketImpl` to `Socket`'s and `ServerSocket`'s protected constructors, so the real one is never created. |
| JUnit (D) | Both work and score alike: the model suite 14, the starter 2, each bug caught by its own test with JUnit's messages. Real JUnit Platform (3.2 MB jar): first run 2.1 s (1.7 s of it loading JUnit), a second run 1.0 s. A small runner (`@Test` and the reference sheet's assertions): 72 ms, no download. | **The small runner**, about 20 times faster with nothing to download; real JUnit stays in the proof as the reference it must agree with. |
| Swing (C) | Real Swing cannot start: CheerpJ runs in a Web Worker with no display, and Swing's look and feel needs AWT's toolkit (`NullPointerException` in `CheerpJDisplay`), headless or not. The fallback works: the student's panel class is loaded with `JPanel`, `JButton`, `JLabel` and `JTextField` renamed in its constant pool to small fakes built on AWT's `Component`; clicks, typed text, labels, disabled buttons, lambda and inner-class listeners all behave as with Swing. | The fallback. The fakes keep their own enabled flag, since `Component.setEnabled` checks focus, which starts the toolkit. On the JDK, `doClick()` holds the button for 68 ms; graders use `doClick(0)`. |

### What grading Midterm 3 uses

- **Thread questions (`meta.json` `warmUp`).** A class in the question's
  `helpers/` whose static `warmUp()` the sandbox calls in the run's own
  class loader, with its output discarded, before Run and before every
  test. Building the questions showed the failure more precisely than the
  proof: in a fresh CheerpJ JVM, when several threads first make calls the
  student's code has not yet made **with the classes they now see**, one
  thread can die silently (no exception at all; a correct counter ends at
  70 of 80, every time). A warm-up through the same classes the concurrent
  tests use prevents it (3 of 3 fresh JVMs); one that also goes through
  another class (the given `MemoryTally` as well as the tests' `SlowTally`)
  does not (0 of 2). So a warm-up uses exactly the tests' classes; for the
  socket questions, the hidden server and test client live in `helpers/`
  so the warm-up can use them too. `e2e/m3-grading.spec.ts` checks this in
  a fresh JVM.
- **The CheerpJ bug behind it** has a minimal reproduction in
  `java/proofs/m3/cheerpj-thread-death` (plain CheerpJ, no sandbox) and a
  draft report of two bugs for Leaning Technologies (`REPORT.md` there). Eight threads
  each calling a `synchronized` method that sleeps: in a fresh JVM, one
  thread's first call throws an `ArrayIndexOutOfBoundsException` with no
  message (10 of 10 JVMs on Windows and on Linux), and calling the method
  once on one thread first prevents it (10 of 10). **Reading that
  exception's stack trace crashes the browser tab on Linux** (10 of 10),
  which is what crashed the nightly cold-threads proof; on Windows it
  throws. So the sandbox never reads the stack trace of an
  `ArrayIndexOutOfBoundsException` or `ClassCastException` without a
  message (the JDK always gives those one): not in its uncaught-exception
  handler, not when deciding whether CheerpJ threw, and not in the run's
  code, whose `e.printStackTrace()` and `e.getStackTrace()` calls (on any
  class that extends `Throwable`, the student's own included) are rewritten
  to guarded versions. For an ordinary exception the guard prints exactly
  what Java prints, minus the sandbox's frames below `main`, as the java
  launcher shows it; a messageless `ArrayIndexOutOfBoundsException` or
  `ClassCastException` (CheerpJ gives its own index and cast checks no
  message) prints only its first line. The nightly `cheerpj-bug` job reruns the
  reproduction, so a CheerpJ release that fixes it shows.
- **CheerpJ's own failures are rerun once.** The sandbox notes an
  exception with no stack frame from the run's own classes (student, given,
  harness): one CheerpJ threw, not the student's code. Run results and
  harness cases report it as `runtimeFault`, a harness case with one
  fails, and the grader runs such a test once more before it counts.
- **Concurrent cases are rerun up to twice** (tests.json `"concurrent":
  true`, on the cases that start threads): a failed one runs up to two more
  times, each in a fresh class loader and working folder, and passes if any
  run passes. So that this can never let a wrong answer through, `npm run
  verify` grades a question with concurrent cases 20 times per solution:
  each correct solution must pass every concurrent case all 20 times, and
  each broken one must fail a hidden case all 20 times, with the rule. The
  repeated gradings run on up to 4 JVMs at once.
- **Other correct solutions** (`solutions/<name>/`) are graded like
  `solution/`: the thread questions have one per common style (a
  synchronized method or block, a private lock object, a lock on the
  store, a `Thread` subclass, a `Runnable` class, lambdas, threads kept in
  a list). Q2's race cases hold every racer at `count()` until all have
  called it, so a check-then-act `take()` oversells every time; the wait
  ends after 300 ms at most, only the first racers wait, and none waits
  when the caller holds the bank's or the store's lock. The slowest correct
  style, a private lock with `take()` calling `count()` inside it, takes
  3.5 s on that case against a 15 s limit.
- **Sockets.** Every compile (the student's code, the given files and the
  hidden tests) has `new Socket(...)` and `new ServerSocket(...)` rewritten
  to `sivaku.net.FakeSocket` and `FakeServerSocket`: subclasses on an
  in-memory network, so the JDK and the browser grade exactly alike. They
  behave as TCP does for what students use (ordered lines, `readLine()`
  returning `null` once the other side closes and everything is read,
  half-close, `SO_TIMEOUT`, `BindException` for a port in use, port 0 for
  a free one, closing a stream closes the socket). The network is reset
  before and after each run, closing every server and socket, so no thread
  of a run stays blocked in `accept()` or `readLine()`.
- **Unfinished socket answers fail fast.** A hidden test waits 2 s for each
  reply; with none, it throws `sivaku.harness.NoReply`, naming what got no
  reply (a command, or `concurrent` for a second client while the first is
  connected). The grader then fails, without running them, the later cases
  whose tests.json `"needs"` include it, and does not rerun the case. So
  Test on Q6's or Q7's starter, or on an answer that never replies to one
  command, takes 2 to 8 s in the browser (measured; `e2e/m3-grading.spec.ts`
  requires 10 s at most), while other cases still earn their points.
- **Thread questions in 20 fresh browser JVMs** (`e2e/m3-threads-stress.spec.ts`,
  nightly): every question with concurrent cases, every correct solution
  graded and run as the Test and Run buttons do, and every broken one
  graded, each round in a new browser context; no tab may crash.
- **Swing questions (`swingPanel`).** The sandbox's Swing class loader
  (`RunLoader`) renames `JPanel`, `JButton`, `JLabel`, `JTextField`,
  `JComponent`, `AbstractButton` and `JTextComponent` to the fakes in
  `java/sandbox/sivaku/swing`, which cover what course panels use (texts,
  listeners, enabling, visibility, borders, fonts, colours, sizes,
  alignment, mnemonics, client properties, layouts, adding and removing).
  **Run draws the panel** under the editor as plain HTML: buttons click,
  fields type (Enter fires a field's listeners), labels follow, a Close
  button ends it.
- **The JUnit question (`"kind": "junit"`).** The sandbox's small runner
  (`TestRunner`) runs the student's test class against each hidden
  implementation in `implementations/`, each in its own class loader.
  Its `org.junit.jupiter.api.Assertions` is generated from real JUnit's
  (`scripts/gen-junit-assertions.mjs`): all 291 methods with identical
  signatures, so anything that compiles on Ed compiles here, plus
  `@Test`, `@BeforeEach`, `@AfterEach`, `@BeforeAll`, `@AfterAll`,
  `@DisplayName`, `@Disabled` and `@Tag`. Real JUnit stays as the
  cross-check: `npm run verify` runs every JUnit question's solution,
  starter and broken suites with real JUnit too and requires the same
  result for every case, and `e2e/junit-runner.spec.ts` requires the
  same pass, fail or skip for every test of a tour of the assertions, on
  the JDK and in the browser. A run whose own class path has a real JUnit
  jar (the nightly JUnit proof) gets real JUnit's `org.junit` classes, not
  the stand-ins.
- **Per-question reference sheets** (`meta.json` `reference`), two
  columns, from the exam's `sheets/` folder.

### Java start-up: how often it stalls

`scripts/measure-startup.mjs` starts the site's Java worker 30 times in
fresh browser profiles (a cold cache) and again with a warm cache, from a
public page, timing each step the worker reports. 16 Nov 2026, a Windows
laptop and, through the nightly workflow, CI:

| | Starts | Stalled | Cold: median / 90% / slowest | Warm: median / slowest |
|---|---|---|---|---|
| Dev server | 60 | 0 | 6.7 / 14.6 / 28.4 s | 2.0 / 12.3 s |
| Production build | 60 | 0 | 8.7 / 13.3 / 18.4 s | 1.9 / 8.7 s |
| CI (GitHub's Ubuntu runner, production build) | 60 | 0 | 14.2 / 15.1 / 15.7 s | 2.9 / 9.5 s |

Almost all of a cold start is loading the sandbox jar into CheerpJ
(`cheerpjRunLibrary`: median 4.8 to 6.5 s, up to 23 s). The stalls seen
before happened only during long browser-test runs, where an attempt never
finished.

**Retrying sooner.** A start used to wait 60 s, then kill the attempt and
start again. Now a second attempt starts *alongside* the first after 20 s,
and a third after 40 s; the first ready is kept and the others stopped, and
the last gets 60 s more before Java gives up. A start that is only slow
(the slowest measured took 28 s) is never cut off. With CheerpJ's loader
held back on the first attempt (as `e2e/workspace.spec.ts` does):

| | Before | After |
|---|---|---|
| No stall | 6.2–6.7 s | 5.6–7.2 s |
| First attempt stalls | 66.3–66.9 s | 26.6–27.5 s |
| First attempt 25 s slow | about 31 s | 27.6 s |

A timed-out attempt's console warning now names the last step each
attempt reached.

## The exam workspace

`/exams` lists the exams; `/exams/<course>/<exam>` is an attempt, laid out
like a coding challenge on the real exam (dark theme, sized for a 1366x768
laptop):

- **Top bar:** back to the exams, Prev / Next, the slide's title
  (`Q1: Ticket price`), Submit.
- **Rail:** a page icon for the instructions, then a `<>` icon per
  question, marked ● once tested and ✓ once every test passed.
- **Left:** two collapsible sections. **Description** holds the question
  and the exam's reference sheet. **Feedback** holds the test results under
  `TESTCASES 3 / 14 passed, 2 points`: a row per test with its name, ✓ or
  ✗, and points; a failed sample row opens to show why.
- **Right:** file tabs (read-only files locked), the editor (Monaco, served
  from the site itself) and a status bar (`/home/Main.java`, "All changes
  saved", `Spaces: 4 (Auto)`).
- **Autocomplete:** typing a dot offers the members of what is before it:
  `Integer.` the reference sheet's static methods, `s.` on a `String` its
  instance methods, `song.` or `tracks[0].` the members of the question's
  own and given classes (inherited ones included; private ones only inside
  their class), and after `new`, the constructors. Types come from
  declarations, string literals, `this`, chained calls whose return type is
  known, and array indexing. Methods insert as calls with their parameters
  ready to type over. See `lib/autocomplete/`.
- **Below the editor:** the console, a terminal. **Run** compiles and runs
  `Main.java`; output and what the student types appear inline in one
  stream, and a line typed early waits until the program reads it (Ctrl+D
  ends input). Data files the question provides, like `laps.txt`, are in
  the working directory. A run may use 10 seconds of computing; time spent
  waiting for input does not count. **Test** grades the question, opens
  Feedback, and saves a checkpoint.
- **Instructions slide:** the exam's length, questions and points, how
  scoring works, and that Test saves a checkpoint. Java starts loading
  here, behind a "Starting Java…" indicator. If it is not ready within 60
  seconds it starts again by itself, allowing 120 seconds this time, and
  after a second stall it offers a Retry button.

### Timer, Submit and results

- **The timer question.** Opening an exam with no attempt in progress asks
  "Do you want a 60-minute timer?" (the length comes from `exam.json`), and
  answering starts the attempt.
- **Timed.** A countdown runs in the top bar towards a stored deadline, so
  a refresh, or closing the tab, does not stop or restart it. At zero the
  files lock and the exam is submitted automatically, even if the time ran
  out while the page was closed.
- **Untimed.** No clock and no lock.
- **Submit** asks for confirmation, since it ends the attempt, then grades
  every question's code as it stands with the same grader as Test. A
  submission interrupted by a refresh carries on.
- **Results** (`/exams/<course>/<exam>/results`): the total out of the
  exam's points, then each question's points, opening to its test cases
  laid out like the Feedback panel.
- **Afterwards,** the exam reopens with the submitted code, read-only (Run,
  Test and Submit are off); "Start a new attempt" clears it and starts over.

The attempt (timer, code, checkpoints, current slide, submission) is kept
in the browser's local storage (`lib/attempt-storage.ts`), so a refresh
resumes where the student was. Test and Submit also save to the student's
account ([Accounts](#accounts)).

The editor is a small Monaco component of our own
(`components/workspace/JavaEditor.tsx`) rather than `@monaco-editor/react`'s:
Next.js keeps a visited page alive in the background, and that wrapper's
editor failed ("InstantiationService has been disposed") when a student left
the exam page and came back. A browser test covers leaving and returning.

## Accounts

Sign-in is required: Google through [Auth.js](https://authjs.dev) (v5,
`next-auth@5.0.0-beta.32`, pinned because v5 is still published as a beta),
any Google account. A signed-out visitor sees only the landing page and
`/privacy`; `proxy.ts` sends every other page to the landing page, which
returns them to where they were going after sign-in.

### What is stored

Four small tables in Neon Postgres (`db/schema.sql`), described to students
on `/privacy` (keep the two in step):

| Table | Holds |
|---|---|
| `users` | Our id, the Google account id ("sub"), when they first signed in. Not the name, email or picture |
| `attempts` | User, exam, started, submitted, timed, submitted automatically, score |
| `question_results` | Per attempt and question: points and each case's pass or fail, from the latest Test or Submit, overwritten each time |
| `submissions` | Per user and question: only the last code sent with Test or Submit, overwritten each time |

The code being written stays in the browser until Test or Submit. There is
no checkpoint history, no compiler output, no program output. Signing out
clears the browser's copy of every attempt; deleting the account (on
`/privacy`) deletes all four tables' rows for that user.

### How it fits together

- **Sessions** are encrypted cookies (Auth.js's JWT strategy), so the
  database has no session tables. On first sign-in `auth.ts` adds the Google
  account id to `users`, and the session carries our user id after that.
- **Every query is limited to the signed-in user on the server.** The
  server actions (`lib/actions/attempts.ts`) read the user from the session,
  never from the browser, and every query in `lib/db/attempts.ts` filters by
  that user, so another student's attempt id is simply "not found".
- **What the browser sends is checked** against the exam's content: the
  question must be in the exam, the files must be its editable files, and
  the cases must be its cases. Points come from the content. Which cases
  passed is taken on trust, since the Java runs in the student's browser; a
  student who tampers with that only fools their own practice score.
- **Saving can fail without losing work.** Results are kept in the browser
  first; a checkpoint that does not reach the account says so (Submit saves
  every question again), and the results page offers "Try again" for a
  submission that did not.
- **The database driver** is node-postgres with a pool and
  `attachDatabasePool`, as Neon recommends for Vercel Functions.

### Environment variables

Set in `.env.local` for development and in Vercel (Project, Settings,
Environment Variables) for the site. None of them reach the browser.

| Name | What it is |
|---|---|
| `AUTH_SECRET` | Random secret that encrypts the session cookies. Generate with `npx auth secret --raw`. Use a different one in Vercel than locally |
| `AUTH_GOOGLE_ID` | The OAuth client ID from Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | The OAuth client secret from Google Cloud Console |
| `DATABASE_URL` | Neon's **pooled** connection string (the host has `-pooler` in it), with `sslmode=require` changed to `sslmode=verify-full`: the same strict certificate check `pg` does today, without its warning that `require` will mean less in a future version |

The database is the Neon project `sivakucs` (AWS US East, N. Virginia, near
Vercel's default region), with two branches: `dev` for localhost
(`.env.local`) and `main` for the site (Vercel). Both have the schema; after
a schema change, run `npm run db:migrate` locally and apply `db/schema.sql`
to `main` in Neon's SQL Editor.

Google sign-in redirects to `<site>/api/auth/callback/google`; both
`http://localhost:3000/...` and the production address must be listed in
the Google OAuth client. Vercel preview deployments have their own
addresses, which Google does not know, so sign-in works on localhost and the
production address only.

### Tests

A test cannot sign in with Google, so the browser tests use a test login
(`lib/test-login.ts`): with `SIVAKU_TEST_LOGIN=1` the landing page also
offers "Test sign-in" as any made-up name. It is refused on Vercel and in
production builds (the site stops with an error rather than offer it), and
`npm run test:accounts` checks that. The tests' database is
[PGlite](https://pglite.dev) (Postgres compiled to WebAssembly, in memory)
served on a local port, so the site's own driver talks to it as it does to
Neon. `e2e/accounts.spec.ts` checks Milestone 4's acceptance test: two
accounts cannot see each other's attempts or code, even with the address of
the other's attempt, nor on the same computer after signing out.

### Choices

How Milestone 4 reads the brief, where it left room:

- **Test saves to the account,** as well as Submit ("in-progress code lives
  in the browser until Test or Submit"): the question's latest result in
  the attempt, and its code into `submissions`. So "last submitted code"
  means the last code sent with Test or Submit.
- **A few columns beyond the brief's list**, all small: whether an attempt
  was submitted automatically, its maximum score, whether the code
  compiled, and when, and from which attempt, the code was saved (My
  attempts says whether the code shown is from that attempt or a later one,
  since only the latest is kept).
- **Delete my account** on `/privacy`, so the privacy page can promise it.
- **Unsubmitted attempts** show in My attempts as "not submitted", with the
  points of each question's last Test.

## Owner decisions

Choices that differ from the original build brief, made by the owner:

- **Java 25, not 21.** The site uses CheerpJ's Java 25 runtime, with no
  fallback to an older Java. Java 25 has `java.lang.IO` built in, so the
  brief's `IO` shim is not needed.
- **CheerpJ is pinned to 5.0** and changes within it are detected (above).
- **Java starts loading on the exam instructions slide**, behind a
  "Starting Java…" indicator, so students do not wait for it at the first
  question.

## Adding questions

A question is a folder; a new exam or course is a new folder, not new code.

```
content/<course>/<exam>/
  exam.json          {"title", "minutes": 60, "instructions": "markdown", "draft"?: true}
  reference.md       the reference sheet shown under every question in the exam
  sheets/<name>.md   reference sheets of their own, for questions that name one
  <nn-slug>/         one question, e.g. 03-playlist; folders sort into exam order
    question.md      the description and the sample (no hints, no topic label)
    meta.json        {"title", "points", "editable": [...], "readOnly": [...],
                      "mainClass"?: "Main", "harnessClass"?: "Harness",
                      "reference"?: sheet name, "warmUp"?: helper class
                      (thread questions), "swingPanel"?: panel class (Swing)}
    implementations/ "kind": "junit" only: the hidden classes the student's
                     tests run against, one folder each (correct, and one per bug)
    starter/         what the student starts with: Main.java holding an empty
                     void main() { } for a whole-program question (the
                     samples start from an empty file); otherwise the editable files with
                     signatures, doc comments and stub bodies (return 0;)
    given/           the read-only files, shown as locked tabs; often a small Main.java
    solution/        the reference solution's editable files
    solutions/<name>/ other correct solutions in other styles, graded like solution/
    broken/          a deliberately wrong solution; or several, one per subfolder
    tests.json       the test cases
    harness/         harness questions only: the hidden test driver
    helpers/         classes compiled with the student's code for Run and Test
                     but not shown, like a pre-compiled helper (Grid.read())
    alternates/<set>/ other versions of given files; a case with "against": "<set>"
                     compiles the student's code again with them (a parent class
                     written differently, so copying its logic instead of calling
                     super fails)
  slot-NN/variant-a/ the same question files, as one variant of a slot
```

The midterms use slots, so each question can grow into a bank: a slot is
one question of the exam, and each `variant-*` folder inside it is an
interchangeable version (new scenario, same skill, same points). The exam
serves the slot's first variant for now; `npm run verify` checks every
variant, and fails if two variants of a slot are worth different points.

`tests.json` is `{"kind", "timeLimitMs"?: 5000, "cases": [...]}`. Each case
has a free-form `name` and its own `points` (a whole number, 0 or more).
`"sample": true` marks the tests from the handout: a failed sample says why,
and every other case is hidden and shows only pass or fail. Sample tests may
be worth points. Case points add up to the question's `points`, which is 4
to 18 (the midterms' range); an exam's questions add up to 100 unless
`exam.json` says `"draft": true`.

The kinds of test:

| `kind` | Each case has | Passes when |
|---|---|---|
| `stdio` | `stdin`, and `stdout`, `outputLine` or `labelledLines` | running `Main` with that input prints exactly that output, that line, or those lines |
| `files` | `inputFiles` (left out for none), `outputFiles` (`null` means "must not exist"), optionally an output check as for `stdio` | the files after the run, and the output if given, are exactly as expected |
| `harness` | `call`: a public static method of the harness class; `"concurrent": true` if it starts threads (a failed one runs up to twice more); `"needs"`: what it needs the student's code to reply to (see Sockets above) | the method returns rather than throwing |
| `junit` | `implementation` (a folder in implementations/) and `expect`: `"pass"` or `"catch"`; tests.json names the `testClass` | the student's tests all pass on it ("pass", the correct class) or one fails ("catch", a buggy one); any failure on the correct class makes every case fail |

For Ed's Midterm 1 pattern, one test per output line, give each case an
`outputLine` instead of `stdout`:

```json
{ "name": "Sample run from the handout: the Words line", "points": 1, "sample": true,
  "stdin": "the quick brown fox\n", "outputLine": { "number": 2, "text": "Words: 4" } },
{ "name": "Case 1.1", "points": 1, "stdin": "hello\n", "outputLine": { "number": 2, "text": "Words: 1" } }
```

Cases with the same input share one run of the program. A failed line reads
`line 2 ==> expected: <Words: 4> but was: <Words: 3>`. Line numbers count
every line, prompts included, so a missing prompt fails the lines after it;
a negative number counts from the end (`-1` is the last line).

`labelledLines` finds result lines by their label instead, so a missing or
reworded prompt (or a menu worded as the student likes) changes nothing: the
lines that start with `prefix`, in order, must be exactly `lines`.

```json
{ "name": "Case 1.2", "points": 2, "stdin": "7\n8\n",
  "labelledLines": { "prefix": "Average per day: ", "lines": ["Average per day: 7.50"] } },
{ "name": "Case 2.1", "points": 1, "stdin": "1\n1\n",
  "labelledLines": { "prefix": "Battery: ", "lines": ["Battery: 50", "Battery: 35", "Battery: 20"] } }
```

A failed one reads `the "Average per day:" line ==> expected: <Average per day: 7.50> but was: <Average per day: 7.00>`.
`labelledLines` may also be a list, to check several labels in one case
(Midterm 2's input loop checks its `Invalid:` lines, `Table:` and
`Attempts:` together); an empty `lines` means no line may have that label.

Midterm 1 follows the course's pattern (in `reference-private/`, which is
gitignored): only result lines are tests, never prompts, and each is found
by its label. Sample tests are named after the line they check ("Sample run
from the handout: the Average line", with ", exact text" for formatted
strings) and are worth 1 or 2 points, 2 for the line that needs the hard
part. Hidden tests are "Case N" when one line of a run is checked and
"Case N.1", "Case N.2"... when several are. Loop output is one test, "the
Battery lines, in order". Fixed output (Q1) is checked line by line and as
a whole, as is a zero divisor's single line. In the Feedback panel every
row opens: a failed sample says why, any other case says only "Passed." or
"Failed: Case 1: did not pass."

Midterm 2's harness questions score as Ed does: "Sample from the handout"
is worth 0, then "Case 1" to "Case N" are 1 point each.

A harness is Java in `harness/` that calls the student's code, including
with classes the student has never seen. It checks results with
`sivaku.harness.Check`:

```java
import sivaku.harness.Check;

public class Harness {
    public static void sampleFromTheHandout() {
        Check.equal("total of the sample songs", 345, Playlist.totalSeconds(sample()));
    }
}
```

A failed check reads `total of the sample songs ==> expected: <345> but was: <0>`.
The student sees that reason for sample tests only; hidden cases show only
pass or fail. Code that does not compile scores 0 and shows the compiler's
messages. Line endings never count.

### Reference sheets

`reference.md` is Markdown tables in Ed's three columns: the code, what it
returns, and what it does (two columns, code and what it does, also work).
Autocomplete reads the code spans, and uses the return type to complete
chained calls such as `s.trim().`. Picking a suggestion inserts only the
name; the parameters show in the dropdown. `Integer.parseInt(s)`
is a static method of `Integer`, `new PrintWriter(name)` a constructor, and
`s.trim()` an instance method of whatever `s` is. Say what each receiver is
in a comment at the top (it is not shown); `s` and `t` default to `String`:

```markdown
<!-- receivers: s=String, t=String, reader=BufferedReader, writer=PrintWriter -->
```

Students write Java 25: a whole program can be a compact source file,
`void main() { ... }` with no class, and console input and output use
`IO.readln` and `IO.println`, as on the course's reference sheets.

Then run `npm run verify`. CI runs it on every push and fails if any
reference solution misses a test or any broken solution passes every hidden
case. `content/cs180/samples` has a worked example of each kind, including
`04-word-count` for one test per output line.

### How grading works

`lib/grading/grade.ts` grades by calling the sandbox helper's methods through
`lib/java/backend.ts`: in the browser through CheerpJ (`BrowserJava`), and in
`npm run verify` through a local `java` process running the same jar
(`scripts/lib/local-java.ts`). The browser tests grade every sample question's
starter, solution and broken variants both ways and require identical
results.

Each case has its own time limit; a case that runs past it fails, and the JVM
is restarted for the next one. The hidden harness is compiled against the
student's compiled classes, so a renamed method or a changed signature fails
the tests rather than the build.

The site never reads `content/` itself: `npm run content` bundles what
students may see into `generated/content.json`, which pages import. Solutions
and broken variants are left out, so they are not in the deployed site at
all, not even on the server.

Grading happens in the student's browser, so the hidden cases and harness
are sent to it, and a determined student could read them. That is acceptable
for practice.
