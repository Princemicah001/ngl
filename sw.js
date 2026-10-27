// sw.js — Service Worker for NGL
// Must be served from site root with MIME application/javascript
// Requires HTTPS or localhost

const CACHE_VERSION = "ngl-v3"; // ← bumped to invalidate stale cache
const PRECACHE = ["/", "/index.html", "/app.html", "/send.html"];

/* ── Install ── */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {})),
  );
});

/* ── Activate: drop old caches, take control ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* ── Fetch: network-first, cache fallback ── */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches
            .open(CACHE_VERSION)
            .then((c) => c.put(req, clone))
            .catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        return (await caches.match("/index.html")) || Response.error();
      }),
  );
});

/* ── Notification click → focus/open app ── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of all) {
        if (c.url.includes("/app.html") && "focus" in c) {
          return c.focus();
        }
      }
      for (const c of all) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/app.html");
      }
    })(),
  );
});

/* ── Push (future-proof) ── */
self.addEventListener("push", (event) => {
  let payload = {
    title: "New anonymous message!",
    body: "You have a new message.",
    tag: "ngl-push",
  };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "https://framerusercontent.com/images/I5OG1V7seR2tatnsaXFQ2fIQpHA.png",
      badge:
        "https://framerusercontent.com/images/I5OG1V7seR2tatnsaXFQ2fIQpHA.png",
      vibrate: [80, 40, 80],
      renotify: true,
    }),
  );
});
