// Serves a copy of the site on this computer only, the way GitHub Pages
// serves it: folders resolve to their index.html, and anything missing gets
// 404.html.
//
//   node tools/serve.mjs                 serve this folder on port 8000
//   node tools/serve.mjs 8123            choose a port
//   node tools/serve.mjs 8123 <folder>   serve another copy of the site

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./rules.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export function serve(root = ROOT, port = 0) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    let file = path.join(base, p);
    let status = 200;

    const isDir = file.startsWith(base + path.sep) && fs.existsSync(file) && fs.statSync(file).isDirectory();
    if (isDir) {
      res.writeHead(301, { location: p + "/" }).end();
      return;
    }
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file)) {
      file = path.join(base, "404.html");
      status = 404;
      if (!fs.existsSync(file)) {
        res.writeHead(404).end("not found");
        return;
      }
    }
    res.writeHead(status, {
      "content-type": MIME[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] ?? 8000);
  const root = process.argv[3] ?? ROOT;
  try {
    const server = await serve(root, port);
    console.log(`Serving ${path.resolve(root)}\n  http://localhost:${server.address().port}/\nCtrl-C to stop.`);
  } catch (e) {
    console.error(e.code === "EADDRINUSE" ? `Port ${port} is already in use. Try: npm start -- ${port + 1}` : e.message);
    process.exit(1);
  }
}
