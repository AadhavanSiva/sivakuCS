// A static server for this folder, with the range requests CheerpJ uses
// to read jars: node serve.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const types = { ".html": "text/html", ".jar": "application/java-archive", ".js": "text/javascript" };
const port = Number(process.argv[2] ?? 8765);

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "") || "index.html";
  try {
    const body = await readFile(join(root, path));
    const type = types[extname(path)] ?? "application/octet-stream";
    // CheerpJ reads jars with range requests.
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? "");
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      res.writeHead(206, {
        "content-type": type,
        "content-range": `bytes ${start}-${end}/${body.length}`,
        "content-length": end - start + 1,
        "accept-ranges": "bytes",
      });
      res.end(body.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { "content-type": type, "content-length": body.length, "accept-ranges": "bytes" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, () => console.log(`http://localhost:${port}/`));
