// server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { profiles: {}, messages: {} };
  }
}
function saveData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}
let store = loadData();

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
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

async function handleApi(req, res, parts, url) {
  const method = req.method;

  // --- PROFILES ---
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

  // --- MESSAGES ---
  if (parts[1] === "messages") {
    const h = cleanHandle(parts[2]);

    if (parts.length === 3 && method === "POST") {
      const body = await readBody(req);
      const msg = {
        id: newId(),
        text: (body.text || "").slice(0, 500),
        files: Array.isArray(body.files) ? body.files.slice(0, 5) : [],
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

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function serveStatic(req, res, pathname) {
  let file = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  if (file === "app") file = "app.html";
  if (file === "send") file = "send.html";

  if (file === "data.json" || file === "server.js")
    return send(res, 403, "forbidden");

  const fullPath = path.join(ROOT, file);
  fs.readFile(fullPath, (err, data) => {
    if (err) return send(res, 404, "not found");
    res.writeHead(200, {
      "Content-Type":
        MIME[path.extname(fullPath)] || "application/octet-stream",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    if (url.pathname.startsWith("/api/")) {
      const parts = url.pathname.split("/").filter(Boolean); // FIXED ROUTING HERE
      return await handleApi(req, res, parts, url);
    }
    serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "server error" });
  }
});

server.listen(PORT, () =>
  console.log(`\n  ✨ NGL running at http://localhost:${PORT}\n`),
);
