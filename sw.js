// sw.js — NGL service worker
// Network-first for HTML (fresh deploys activate immediately)
// Cache-first for static assets (fast loads, offline-capable)

const CACHE = "ngl-v3"; // bump this to force a full cache refresh
const CORE = [
  "/",
  "/index.html",
  "/app.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ─── Install: precache the shell ─────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll is all-or-nothing, so fall back to individual adds if any file 404s
      cache.addAll(CORE).catch(async (err) => {
        console.warn(
          "[SW] addAll failed, falling back to individual adds:",
          err?.message,
        );
        for (const url of CORE) {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn("[SW] precache miss:", url, e?.message);
          }
        }
      }),
    ),
  );
});

// ─── Activate: delete old caches, take control of open tabs ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch: route requests ───────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GETs, same-origin
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ─── Always network for API (never cache) ───
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).catch(() => new Response("", { status: 503 })),
    );
    return;
  }

  // ─── Network-first for HTML / navigation ───
  const isHTML =
    req.mode === "navigate" ||
    req.destination === "document" ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches
              .open(CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || caches.match("/index.html")),
        ),
    );
    return;
  }

  // ─── Network-first for manifest + service worker metadata ───
  // (so a changed manifest is picked up on the very next load)
  if (url.pathname === "/manifest.json" || url.pathname === "/sw.js") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches
              .open(CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // ─── Cache-first for everything else (images, fonts, css, js) ───
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Only cache successful same-origin responses
          if (res && res.status === 200) {
            const copy = res.clone();
            caches
              .open(CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});
