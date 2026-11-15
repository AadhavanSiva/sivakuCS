// Copies the Monaco editor's prebuilt files into public/monaco/vs, so the
// site serves its own copy instead of loading it from a CDN at runtime
// (a pinned version, and one less third party in the exam). Runs before
// `npm run dev` and `npm run build`; public/monaco is not committed.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const from = join(root, "node_modules", "monaco-editor", "min", "vs");
const to = join(root, "public", "monaco", "vs");
const version = JSON.parse(readFileSync(join(root, "node_modules", "monaco-editor", "package.json"), "utf8")).version;
const stamp = join(root, "public", "monaco", "VERSION");

if (existsSync(stamp) && readFileSync(stamp, "utf8").trim() === version && existsSync(join(to, "loader.js"))) {
  console.log(`public/monaco: monaco-editor ${version} already in place`);
} else {
  rmSync(join(root, "public", "monaco"), { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  cpSync(join(root, "node_modules", "monaco-editor", "LICENSE"), join(root, "public", "monaco", "LICENSE"));
  cpSync(join(root, "node_modules", "monaco-editor", "ThirdPartyNotices.txt"), join(root, "public", "monaco", "ThirdPartyNotices.txt"));
  // Written last, so an interrupted copy is redone next time.
  writeFileSync(stamp, version + "\n");
  console.log(`public/monaco: copied monaco-editor ${version}`);
}
