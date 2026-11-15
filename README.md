# sivakuCS

Practice exams for Purdue CS 18000 (Java) that look, run and score like the
real ones on Ed. Java compiles and runs entirely in the student's browser.

**Status:** Milestone 1 of 5 is done: Java 25 compiles and runs in the
browser. Try it at `/lab`. Questions, the exam workspace, accounts and the two
practice exams come next.

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
| `npm run test:e2e` | Browser tests (Playwright, headless Chromium). Starts a dev server on port 3100 unless one is running there |
| `npm run build:sandbox` | Rebuilds `public/cheerpj/sandbox.jar` from `java/sandbox` (needs JDK 25) |

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

## Adding questions

Comes with Milestone 2.
