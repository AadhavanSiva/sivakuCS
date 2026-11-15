// Compiles java/sandbox into public/cheerpj/sandbox.jar, the helper that
// compiles and runs student code inside the browser JVM.
//
// Needs a JDK 25 (javac and jar on PATH, or JAVA_HOME set). The jar is
// committed because Vercel's build machines have no JDK; rerun this after
// changing anything under java/sandbox.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const src = join(root, "java", "sandbox");
const classes = join(root, "build", "sandbox-classes");
const jar = join(root, "public", "cheerpj", "sandbox.jar");

const bin = (tool) => (process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", tool) : tool);

function javaFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return javaFiles(path);
    return name.endsWith(".java") ? [path] : [];
  });
}

const version = execFileSync(bin("javac"), ["-version"], { encoding: "utf8" }).trim();
if (!/^javac 25\b/.test(version)) {
  console.error(`Need JDK 25 to build the sandbox, found: ${version}`);
  process.exit(1);
}

rmSync(classes, { recursive: true, force: true });
mkdirSync(classes, { recursive: true });
mkdirSync(join(root, "public", "cheerpj"), { recursive: true });

execFileSync(bin("javac"), ["--release", "25", "-d", classes, ...javaFiles(src)], { stdio: "inherit" });
rmSync(jar, { force: true });
execFileSync(bin("jar"), ["--create", "--file", jar, "-C", classes, "."], { stdio: "inherit" });
console.log(`Built ${jar} with ${version}`);
