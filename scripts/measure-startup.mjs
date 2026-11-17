// How often does CheerpJ fail to start, and where does it stall? Starts the
// site's Java worker (public/cheerpj/sandbox-worker.js) many times, each in a
// fresh browser profile (a cold cache, as a student's first visit) and then
// once more in the same profile (a warm cache), from a public page of a
// running site, and records each start-up step's time (the worker's "phase"
// messages), or a stall when it is not ready within the cap.
//
//   node scripts/measure-startup.mjs http://localhost:3000 --runs 30 --label dev
//
// Writes test-results/startup-<label>.json and prints a summary.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const base = args.find((a) => /^https?:/.test(a)) ?? "http://localhost:3000";
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const runs = Number(option("runs", 20));
const capMs = Number(option("cap", 90_000));
const label = option("label", "local");

/** One start of the worker in the page; resolves with how it went. */
const startOnce = (cap) =>
  new Promise((resolve) => {
    const t0 = performance.now();
    const phases = [];
    const worker = new Worker("/cheerpj/sandbox-worker.js");
    const timer = setTimeout(() => done("stall"), cap);
    function done(outcome, extra = {}) {
      clearTimeout(timer);
      worker.terminate();
      resolve({ outcome, ms: Math.round(performance.now() - t0), phases, ...extra });
    }
    worker.onmessage = (event) => {
      const m = event.data;
      if (m.type === "phase") phases.push([m.name, Math.round(performance.now() - t0)]);
      else if (m.type === "ready") done("ready");
      else if (m.type === "fatal") done("fatal", { message: m.message });
    };
    worker.onerror = (event) => done("error", { message: event.message });
  });

const browser = await chromium.launch();
const results = [];
try {
  for (let i = 0; i < runs; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const cache of ["cold", "warm"]) {
      try {
        await page.goto(`${base}/privacy`, { timeout: 60_000 });
        const r = await page.evaluate(startOnce, capMs);
        results.push({ run: i + 1, cache, ...r });
        const last = r.phases.at(-1)?.[0] ?? "none";
        console.log(`${String(i + 1).padStart(3)} ${cache}: ${r.outcome} ${r.ms} ms (last step ${last})`);
      } catch (error) {
        results.push({ run: i + 1, cache, outcome: "page-error", message: String(error) });
        console.log(`${String(i + 1).padStart(3)} ${cache}: page error ${error}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null);
const summary = {};
for (const cache of ["cold", "warm"]) {
  const these = results.filter((r) => r.cache === cache);
  const ready = these.filter((r) => r.outcome === "ready").map((r) => r.ms).sort((a, b) => a - b);
  const stalls = these.filter((r) => r.outcome === "stall");
  summary[cache] = {
    starts: these.length,
    ready: ready.length,
    stalls: stalls.length,
    stalledAfter: stalls.map((r) => r.phases.at(-1)?.[0] ?? "none"),
    fatal: these.filter((r) => r.outcome === "fatal" || r.outcome === "error" || r.outcome === "page-error").length,
    readyMs: { p50: pct(ready, 50), p90: pct(ready, 90), max: ready.at(-1) ?? null },
  };
}
mkdirSync("test-results", { recursive: true });
writeFileSync(`test-results/startup-${label}.json`, JSON.stringify({ base, label, capMs, summary, results }, null, 2) + "\n");
console.log(JSON.stringify({ label, summary }, null, 2));
