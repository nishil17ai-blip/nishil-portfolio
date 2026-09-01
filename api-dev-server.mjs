/**
 * Runs api/chat.js as a plain Node HTTP server, so `npm run dev` works
 * end-to-end without the Vercel CLI. Vercel itself never runs this file -
 * in production, Vercel calls the same handler directly. This exists
 * purely to give Vite's dev server (localhost:5173) something at
 * localhost:8787 to proxy /api/* to.
 *
 * Usage:
 *   node api-dev-server.mjs        (in one terminal)
 *   npm run dev                    (in another)
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

// Load .env.local by hand - no extra dependency for one line.
// This has to run, and process.env has to be populated, BEFORE
// api/chat.js is imported: that module reads GROQ_API_KEY at the top
// level, once, the moment it's loaded. A static `import` at the top of
// this file would hoist above this block and always lose the race, so
// the load happens here and api/chat.js is imported dynamically below.
try {
  let envText = readFileSync(new URL("./.env.local", import.meta.url), "utf8");

  // Strip a UTF-8 byte-order-mark if present. Windows editors (Notepad
  // especially) commonly save .env files with a leading BOM, which is
  // invisible but not a \w character - it silently breaks the match on
  // whatever line comes first in the file, with no error and no warning,
  // which is exactly the "loaded: NO" symptom with no earlier warning.
  if (envText.charCodeAt(0) === 0xfeff) envText = envText.slice(1);

  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  }
} catch {
  console.warn("No .env.local found - make sure GROQ_API_KEY is set another way.");
}

// Temporary diagnostic - safe to leave in, never prints the actual key.
console.log(
  "GROQ_API_KEY loaded:",
  process.env.GROQ_API_KEY ? `yes (${process.env.GROQ_API_KEY.length} chars)` : "NO - not found",
);

const { default: handler } = await import("./api/chat.js");

const PORT = 8787;

const server = createServer((req, res) => {
  if (!req.url?.startsWith("/api/chat")) {
    res.writeHead(404).end();
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const rawBody = Buffer.concat(chunks).toString("utf8");

    // Adapt Node's raw req/res to the (req, res) shape api/chat.js expects
    // from Vercel: req.body pre-parsed, res.status().json() available.
    const fakeReq = { method: req.method, headers: req.headers, body: rawBody };
    const fakeRes = {
      _status: 200,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        res.writeHead(this._status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      },
      end() {
        res.writeHead(this._status);
        res.end();
      },
    };

    handler(fakeReq, fakeRes).catch((err) => {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Local dev server crashed handling that request." }));
    });
  });
});

server.listen(PORT, () => {
  console.log(`api/chat.js is running locally at http://localhost:${PORT}/api/chat`);
  console.log(`Now run "npm run dev" in another terminal and use the site as normal.`);
});