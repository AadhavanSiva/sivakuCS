// Opens the repro page in a fresh browser context (a fresh JVM) `runs`
// times and tallies what the program printed. Crashed tabs are counted.
//
//   node java/proofs/m3/cheerpj-thread-death/run.mjs <url> [runs]
//
// e.g. http://localhost:8765/?main=Repro&args=quiet. Run from the repository
// root (Playwright comes from its node_modules).
import { createRequire } from "node:module";

const { chromium } = createRequire(`${process.cwd()}/package.json`)("@playwright/test");
const [url, runs = "10"] = process.argv.slice(2);
const browser = await chromium.launch();
const tally = {};
for (let i = 0; i < Number(runs); i++) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let crashed = false;
  page.on("crash", () => (crashed = true));
  let outcome;
  try {
    await page.goto(url);
    await page.waitForFunction(() => document.title.startsWith("done"), null, { timeout: 120_000 });
    outcome = (await page.locator("#console").innerText()).trim();
  } catch (error) {
    outcome = crashed ? "THE TAB CRASHED" : `ERROR ${String(error.message).split("\n")[0]}`;
  }
  console.log(`run ${i + 1}: ${outcome.replace(/\n/g, " | ")}`);
  // Which thread fails varies; the rest of the outcome should not.
  const key = outcome.replace(/thread \d/g, "thread N").replace(/\n/g, " | ");
  tally[key] = (tally[key] ?? 0) + 1;
  await context.close();
}
await browser.close();
console.log(JSON.stringify(tally, null, 1));
