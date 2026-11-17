// Downloads the JUnit Platform console-standalone jar for the Midterm 3
// JUnit proof (e2e/m3-proofs.spec.ts) into public/m3-proof/, which is
// gitignored: the jar (3 MB) is not committed, and the browser reads it
// from /app/m3-proof/ like the sandbox jar. Checked against Maven
// Central's SHA-1. Licence: EPL-2.0.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const JUNIT_VERSION = "1.13.4";
export const JUNIT_JAR = `junit-platform-console-standalone-${JUNIT_VERSION}.jar`;
const PATH = `org/junit/platform/junit-platform-console-standalone/${JUNIT_VERSION}/${JUNIT_JAR}`;
// Maven Central under both its names: CI has seen a passing 404 from one.
const MIRRORS = [`https://repo1.maven.org/maven2/${PATH}`, `https://repo.maven.apache.org/maven2/${PATH}`];
const dir = join(process.cwd(), "public", "m3-proof");
const file = join(dir, JUNIT_JAR);

const sha1 = (bytes) => createHash("sha1").update(bytes).digest("hex");

/** The body at the first mirror that answers, trying each up to three times. */
async function download(suffix) {
  const failures = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const mirror of MIRRORS) {
      try {
        const response = await fetch(mirror + suffix);
        if (response.ok) return Buffer.from(await response.arrayBuffer());
        failures.push(`${mirror + suffix}: HTTP ${response.status}`);
      } catch (error) {
        failures.push(`${mirror + suffix}: ${error.message}`);
      }
    }
    await new Promise((done) => setTimeout(done, 2000 * attempt));
  }
  throw new Error(`Could not download ${JUNIT_JAR}:\n${failures.join("\n")}`);
}

export async function fetchJunit() {
  const expected = (await download(".sha1")).toString("utf8").trim().split(/\s+/)[0];
  if (existsSync(file) && sha1(readFileSync(file)) === expected) return file;
  const bytes = await download("");
  if (sha1(bytes) !== expected) throw new Error(`${JUNIT_JAR}: SHA-1 does not match Maven Central's`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, bytes);
  return file;
}

// Run directly (node scripts/fetch-junit.mjs): download and print the path.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(await fetchJunit());
}
