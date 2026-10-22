// server.js — Node.js HTTP server
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3030;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

// Safety guard — refuse to start if browser code was accidentally pasted
if (typeof window !== "undefined" || typeof document !== "undefined") {
  console.error("\n[FATAL] server.js appears to contain BROWSER code.");
  console.error("You probably pasted backend.js into server.js by mistake.");
  console.error("Replace server.js with the Node server version.\n");
  process.exit(1);
}

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { profiles: {}, messages: {} };
  }
}
function saveData(d) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch (e) {
    console.warn("[NGL] saveData failed (read-only fs?):", e.message);
  }
}
let store = loadData();

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  // FIX: Buffers must be sent as-is, only plain objects get JSON-stringified
  res.end(
    typeof body === "string" || Buffer.isBuffer(body)
      ? body
      : JSON.stringify(body),
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 10 * 1024 * 1024) {
        reject(new Error("payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const cleanHandle = (h) => (h || "").trim().toLowerCase().replace(/[@\s]/g, "");
const newId = () => crypto.randomBytes(8).toString("hex");

async function handleApi(req, res, parts) {
  const method = req.method;

  if (parts[1] === "profile") {
    if (parts.length === 2 && method === "POST") {
      const body = await readBody(req);
      const h = cleanHandle(body.handle);
      if (!h) return send(res, 400, { error: "handle required" });

      const existing = store.profiles[h] || {};
      const profile = {
        handle: h,
        photoURL:
          body.photoURL !== undefined
            ? body.photoURL
            : existing.photoURL || null,
        prompt:
          body.prompt !== undefined
            ? body.prompt
            : existing.prompt || "send me anonymous messages!",
        theme: body.theme !== undefined ? body.theme : existing.theme || "dark",
        paused:
          body.paused !== undefined ? body.paused : existing.paused || false,
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.profiles[h] = profile;
      saveData(store);
      return send(res, 200, profile);
    }
    if (parts.length === 3 && method === "GET") {
      const p = store.profiles[cleanHandle(parts[2])];
      return p ? send(res, 200, p) : send(res, 404, { error: "not found" });
    }
    if (parts.length === 3 && method === "DELETE") {
      const h = cleanHandle(parts[2]);
      delete store.profiles[h];
      delete store.messages[h];
      saveData(store);
      return send(res, 200, { ok: true });
    }
  }

  if (parts[1] === "messages") {
    const h = cleanHandle(parts[2]);

    if (parts.length === 3 && method === "POST") {
      const body = await readBody(req);
      const msg = {
        id: newId(),
        text: (body.text || "").slice(0, 500),
        files: Array.isArray(body.files) ? body.files.slice(0, 5) : [],
        hint: body.hint || null,
        reply: null,
        createdAt: Date.now(),
      };
      if (!store.messages[h]) store.messages[h] = [];
      store.messages[h].unshift(msg);
      saveData(store);
      return send(res, 200, { id: msg.id });
    }

    if (parts.length === 3 && method === "GET") {
      return send(res, 200, store.messages[h] || []);
    }

    if (parts.length === 4 && method === "DELETE") {
      const id = parts[3];
      store.messages[h] = (store.messages[h] || []).filter((x) => x.id !== id);
      saveData(store);
      return send(res, 200, { ok: true });
    }

    if (parts.length === 5 && method === "POST" && parts[4] === "reply") {
      const id = parts[3];
      const body = await readBody(req);
      const m = (store.messages[h] || []).find((x) => x.id === id);
      if (!m) return send(res, 404, { error: "not found" });
      m.reply = (body.reply || "").slice(0, 240);
      m.repliedAt = new Date().toISOString();
      saveData(store);
      return send(res, 200, { ok: true, message: m });
    }
  }

  return send(res, 404, { error: "unknown endpoint" });
}

function serveStatic(req, res, pathname) {
  if (pathname === "/health" || pathname === "/_health") {
    return send(res, 200, {
      status: "ok",
      uptime: process.uptime(),
      indexHtmlExists: fs.existsSync(path.join(ROOT, "index.html")),
    });
  }

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, "bad request");
  }
  if (decoded.includes("..")) return send(res, 403, "forbidden");

  let file = decoded === "/" ? "index.html" : decoded.replace(/^\//, "");
  if (!file) file = "index.html";
  if (file === "app") file = "app.html";
  if (file === "send") file = "send.html";

  const base = path.basename(file);
  if (
    base === "data.json" ||
    base === "server.js" ||
    base === "package.json" ||
    base === "package-lock.json" ||
    base.startsWith(".")
  ) {
    return send(res, 403, "forbidden");
  }

  const fullPath = path.join(ROOT, file);
  if (!fullPath.startsWith(ROOT)) return send(res, 403, "forbidden");

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (file === "index.html") {
        let listing = "(could not read directory)";
        try {
          listing = fs.readdirSync(ROOT).sort().join("\n");
        } catch {}
        return send(
          res,
          404,
          `<!doctype html>
<html><head><meta charset="utf-8"><title>index.html not found</title></head>
<body style="font-family:system-ui,sans-serif;padding:40px;line-height:1.5;color:#111;background:#fff">
  <h1>index.html not found</h1>
  <p>Server is running fine. Missing file:</p>
  <pre style="background:#f3f4f6;padding:12px;border-radius:6px">${path.join(ROOT, "index.html")}</pre>
  <p>Files in deploy directory:</p>
  <pre style="background:#f3f4f6;padding:12px;border-radius:6px">${listing || "(empty)"}</pre>
</body></html>`,
          "text/html; charset=utf-8",
        );
      }

      const indexPath = path.join(ROOT, "index.html");
      if (!path.extname(file) && fs.existsSync(indexPath)) {
        return fs.readFile(indexPath, (err2, data2) => {
          if (err2) return send(res, 404, `not found: ${decoded}`);
          send(res, 200, data2, MIME[".html"]);
        });
      }

      return send(res, 404, `not found: ${decoded}`);
    }

    send(
      res,
      200,
      data,
      MIME[path.extname(fullPath).toLowerCase()] || "application/octet-stream",
    );
  });
}

const startedAt = new Date().toISOString();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

    if (url.pathname.startsWith("/api/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      return await handleApi(req, res, parts);
    }
    serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error("[500]", e);
    send(res, 500, { error: "server error", message: e.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  ✨ NGL running on port ${PORT} (bound to 0.0.0.0)`);
  console.log(`  📁 ROOT   : ${ROOT}`);
  console.log(`  🕒 Started: ${startedAt}`);
  let files = [];
  try {
    files = fs.readdirSync(ROOT).sort();
  } catch {}
  console.log(`  📄 Files  : ${files.join(", ") || "(empty)"}`);
  console.log(
    `  ✅ index.html present: ${fs.existsSync(path.join(ROOT, "index.html"))}\n`,
  );
});
