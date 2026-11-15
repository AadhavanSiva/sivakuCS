// Fails if the CheerpJ runtime on the CDN differs from cheerpj-lock.json.
//
// The free CheerpJ licence requires loading the runtime from CheerpJ's CDN,
// which serves only a major.minor path (/5.0/) that can be updated in
// place. So the version cannot be frozen; instead any change is made loud:
// this check runs daily in CI (.github/workflows/cheerpj-pin.yml), and the
// browser tests compare the runtime's Java version with the lock.
//
// After a change: rerun `npm run test:e2e` (and `npm run verify` once it
// exists), and only if everything passes, record the new runtime with
//   node scripts/check-cheerpj.mjs --update
// and update "javaRuntime" from the version the page reports.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const lockPath = new URL("../cheerpj-lock.json", import.meta.url);
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const update = process.argv.includes("--update");

const worker = readFileSync(new URL("../public/cheerpj/sandbox-worker.js", import.meta.url), "utf8");
if (!worker.includes(`importScripts("${lock.loader}")`)) {
  console.error(`public/cheerpj/sandbox-worker.js does not load ${lock.loader}, the URL in cheerpj-lock.json.`);
  process.exit(1);
}

const base = lock.loader.slice(0, lock.loader.lastIndexOf("/") + 1);
const changed = [];
const seen = {};
for (const [name, expected] of Object.entries(lock.files)) {
  const response = await fetch(base + name);
  if (!response.ok) {
    console.error(`${base + name}: HTTP ${response.status}`);
    process.exit(1);
  }
  const actual = createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
  seen[name] = actual;
  const modified = response.headers.get("last-modified");
  if (actual !== expected) changed.push(`${name} changed (last modified ${modified})`);
  else console.log(`${name} unchanged`);
}

if (changed.length === 0) {
  console.log(`CheerpJ at ${base} matches cheerpj-lock.json.`);
} else if (update) {
  lock.files = seen;
  lock.verified = new Date().toISOString().slice(0, 10);
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  console.log(`Updated cheerpj-lock.json: ${changed.join("; ")}.`);
} else {
  console.error(`The CheerpJ runtime has changed since it was last verified:\n  ${changed.join("\n  ")}`);
  console.error("Rerun the browser tests before trusting it; see the comment at the top of this script.");
  process.exit(1);
}
