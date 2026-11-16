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
const url = `https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/${JUNIT_VERSION}/${JUNIT_JAR}`;
const dir = join(process.cwd(), "public", "m3-proof");
const file = join(dir, JUNIT_JAR);

const sha1 = (bytes) => createHash("sha1").update(bytes).digest("hex");

export async function fetchJunit() {
  const expected = (await (await fetch(`${url}.sha1`)).text()).trim().split(/\s+/)[0];
  if (existsSync(file) && sha1(readFileSync(file)) === expected) return file;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha1(bytes) !== expected) throw new Error(`${JUNIT_JAR}: SHA-1 does not match Maven Central's`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, bytes);
  return file;
}

// Run directly (node scripts/fetch-junit.mjs): download and print the path.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(await fetchJunit());
}
