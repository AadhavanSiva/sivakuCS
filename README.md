# sivakuCS

Practice exams for Purdue CS 18000 (Java) that look, run and score like the
real ones on Ed. Java compiles and runs entirely in the student's browser.

**Status:** Milestones 1 and 2 of 5 are done, and Milestone 3 (the exam
workspace) is in progress: its layout, Run console, Test panel and
instructions slide work at `/exams`. Autocomplete, the timer and the results
page come next, then accounts and the two practice exams.

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

5. **Install and run.**

   ```bash
   npm ci
   npx playwright install chromium   # the browser the tests drive
   npm run dev
   ```

   Open <http://localhost:3000/lab>.

Vercel comes later. No account is needed until the first deploy, and the
deploy waits for the owner's go-ahead.

### On Windows

The same tools, installed with `winget` in PowerShell:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact
winget install --id EclipseAdoptium.Temurin.25.JDK --exact
```

Then open a new terminal and follow step 5 above.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates Next.js route types, then checks types with `tsc` |
| `npm run content` | Bundles `content/` into `generated/content.json` for the site, without solutions. Runs by itself before `dev` and `build` |
| `npm run verify` | Checks every question: its structure, that the reference solution passes every test, and that each broken solution fails a hidden one. Needs JDK 25 |
| `npm run test:e2e` | Browser tests (Playwright, headless Chromium). Starts a dev server on port 3100 unless one is running there; with `npm run dev` already running, use `E2E_PORT=3000 npm run test:e2e`. The grading tests also need JDK 25. CI runs them on every push |
| `npm run build:sandbox` | Rebuilds `public/cheerpj/sandbox.jar` from `java/sandbox` (needs JDK 25) |
| `npm run check:cheerpj` | Fails if the CheerpJ runtime on its CDN no longer matches `cheerpj-lock.json` |

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

## The exam workspace

`/exams` lists the exams; `/exams/<course>/<exam>` is an attempt, laid out
like a coding challenge on the real exam (dark theme, sized for a 1366x768
laptop):

- **Top bar:** back to the exams, Prev / Next, the slide's title, Submit.
- **Rail:** the instructions, then one button per question, marked ● once
  tested and ✓ once every test passed.
- **Left:** the question, then the exam's reference sheet.
- **Right:** file tabs (read-only files locked), the editor (Monaco, served
  from the site itself) and a status bar ("All changes saved").
- **Below the editor:** **Run** compiles and runs `Main.java` in an
  interactive console: output appears as it is printed and the student
  types input while it runs (Ctrl+D ends input). Data files the question
  provides, like `laps.txt`, are in the working directory. A run may use 10
  seconds of computing; time spent waiting for input does not count.
  **Test** grades the question, shows the results, and saves a checkpoint.
- **Instructions slide:** the exam's length, questions and points, how
  scoring works, and that Test saves a checkpoint. Java starts loading
  here, behind a "Starting Java…" indicator. If it is not ready within 60
  seconds it starts again by itself, allowing 120 seconds this time, and
  after a second stall it offers a Retry button.

The code, the checkpoints and the current slide are kept in the browser's
local storage (`lib/attempt-storage.ts`), so a refresh resumes where the
student was; Milestone 4 adds saving to an account.

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
  <nn-slug>/         one question, e.g. 03-playlist; folders sort into exam order
    question.md      the description and the sample (no hints, no topic label)
    meta.json        {"title", "points", "editable": [...], "readOnly": [...],
                      "mainClass"?: "Main", "harnessClass"?: "Harness"}
    starter/         what the student starts with: the editable files, with
                     signatures, doc comments and stub bodies (return 0;)
    given/           the read-only files, shown as locked tabs; often a small Main.java
    solution/        the reference solution's editable files
    broken/          a deliberately wrong solution; or several, one per subfolder
    tests.json       the test cases
    harness/         harness questions only: the hidden test driver
```

`tests.json` is `{"kind", "timeLimitMs"?: 5000, "cases": [...]}`. The first case
is named `Sample from the handout` and is worth 0 points; the rest are named
`Case 1`, `Case 2`, ... and are each worth at least 1 point (usually 1). The case
points add up to the question's `points`, which is 5 to 13; an exam's
questions add up to 100 unless `exam.json` says `"draft": true`.

The three kinds of test:

| `kind` | Each case has | Passes when |
|---|---|---|
| `stdio` | `stdin`, `stdout` | running `Main` with that input prints exactly that output |
| `files` | `inputFiles` (left out for none), `outputFiles` (`null` means "must not exist"), optionally `stdout` | the files after the run, and the output if given, are exactly as expected |
| `harness` | `call`: a public static method of the harness class | the method returns rather than throwing |

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
The student sees that reason for the sample only; hidden cases show only pass
or fail. Code that does not compile scores 0 and shows the compiler's
messages. Line endings never count.

Then run `npm run verify`. CI runs it on every push and fails if any
reference solution misses a test or any broken solution passes every hidden
case. `content/cs180/samples` has one worked example of each kind.

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
