# CheerpJ 5.0 (Java 25): two bugs when threads first contend for a synchronized method

**Summary.** Eight threads each call a `synchronized` method ten times; the method sleeps for 2 ms while it holds
the lock. The same program always completes on OpenJDK 25.

- **Bug 1.** In a fresh CheerpJ JVM, one thread's first call throws `java.lang.ArrayIndexOutOfBoundsException`,
  with no message, so that thread does no work. 10 of 10 fresh JVMs, on Windows and on Linux.
- **Bug 2.** Reading the stack trace of that exception (`getStackTrace()`) crashes the browser tab on Linux,
  10 of 10 times. On Windows the same call throws another `ArrayIndexOutOfBoundsException`, 10 of 10 times.

## Environment

- CheerpJ 5.0 from `https://cjrtnc.leaningtech.com/5.0/loader.js` (Last-Modified 30 Oct 2026), started with
  `cheerpjInit({ version: 25, status: "none" })` and run with `cheerpjRunMain`.
- Chromium 159.0.8154.6 (Playwright 1.65.1), headless:
  - Windows 11 (10.0.26200);
  - Ubuntu 24.04 (GitHub Actions `ubuntu-24.04` runner).
- Classes compiled with OpenJDK 25.0.5 (`javac --release 25`).
- Seen in a page's main thread (this repro) and in a Web Worker.

## Steps to reproduce

The attached folder has `Repro.java`, `ReproConcat.java`, `index.html`, a static server and a Playwright script.

1. `sh build.sh`: builds `repro.jar` from the two classes.
2. `node serve.mjs 8765`: serves the folder, with the range requests CheerpJ uses to read jars.
3. Open a URL below in Chromium. Each page load is a fresh JVM. (`node run.mjs <url> 10` opens the URL in 10 fresh
   browser contexts and tallies the output.)
   - Bug 1: `http://localhost:8765/?main=Repro&args=quiet` (never reads the exception's stack trace).
   - Bug 2: `http://localhost:8765/?main=Repro` (prints the exception, then calls `getStackTrace()` on it).

`Repro.java`, in short:

```java
synchronized void add() throws InterruptedException {
    Thread.sleep(2);
    count++;
}
// main: 8 threads, each running
//     try { for (int k = 0; k < 10; k++) { calls[me]++; shared.add(); } }
//     catch (Throwable e) { caught[me] = e; }
// then start all, join all, and print the count. Without "quiet", for each
// exception caught, print it, then print caught[i].getStackTrace().length.
```

## Expected

`count 80 (expected 80)`, with no exception, which OpenJDK 25 prints every time. And if an exception is caught,
`getStackTrace()` returns its frames.

## Actual

10 fresh JVMs per row, each run in a new browser context:

| URL arguments | Windows 11 | Ubuntu 24.04 |
|---|---|---|
| `main=Repro&args=quiet` (only `getClass().getName()` is read) | not run | 10 of 10: `count 70`; one thread threw `ArrayIndexOutOfBoundsException` in call 1 of `add()`; no crash |
| `main=Repro` (`toString()`, then `getStackTrace()`) | 10 of 10: `count 70`; thread 3 (8 runs) or thread 6 (2 runs) threw `ArrayIndexOutOfBoundsException` in call 1 of `add()`, and `getStackTrace()` on it threw `ArrayIndexOutOfBoundsException` | 10 of 10: **the tab crashed** (Playwright: "Target crashed") |
| `main=ReproConcat` (the catch block runs `"caught " + e`, which calls `toString()`) | 10 of 10: `count 70` | 10 of 10: `count 70`; `caught java.lang.ArrayIndexOutOfBoundsException`; no crash |
| `main=Repro&args=warm` (`add()` called once on the main thread before the threads start) | 10 of 10: `count 80` | 10 of 10: `count 80` |

## Bug 1: what the failure needs

Each variation below ran in 3 fresh JVMs on Windows, with the same result each time:

| Variation | Result |
|---|---|
| 8 threads × 10 calls, `synchronized`, sleep inside the lock | one thread fails |
| The same without `synchronized` | no failure |
| The same with `synchronized` but no sleep | no failure |
| Sleep inside the lock in the method itself, or in an instance or static method it calls | one thread fails |
| A lambda or a named `Runnable` class for the threads | one thread fails |
| 6 threads × 10 calls | one thread fails |
| 4 threads × 10 calls; 8 threads × 1, 2 or 4 calls | no failure |
| 8 threads each entering a synchronized block once and sleeping in it | no failure |
| One thread started while 8 others are blocked on a monitor | no failure |

Other symptoms:

- In a variant where the threads' own code builds strings (`"calling add() #" + k`), the failing thread instead ends
  with `java.lang.ClassCastException` (no message), thrown from its `catch (Throwable)` block. That block also
  concatenates, so the handler's own string concatenation seems to throw, and the exception escapes the thread.
  This may be a third, related bug: concurrent first linkage of `invokedynamic` call sites.
- When the thread has no `catch` and a default uncaught-exception handler is set, the handler receives the same
  `ArrayIndexOutOfBoundsException` (Windows; not run on Linux).

## Bug 2: what crashes

On Linux, only the run that calls `getStackTrace()` on the exception crashes. Reading its class name (the `quiet`
run) or its `toString()` (`ReproConcat`) does not. `printStackTrace()` reads the same stack trace, so it presumably
does the same, but we did not run that variant.

## Workarounds

- Bug 1: before starting the threads, call the same methods once on one thread, with the same classes. After that,
  10 of 10 fresh JVMs are correct on both systems.
- Bug 2: never read the stack trace of an `ArrayIndexOutOfBoundsException` or `ClassCastException` that has no
  message. OpenJDK always gives these a message. CheerpJ's own index and cast checks do not, so this also skips
  their stack traces.
