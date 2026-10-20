const CACHE = "ngl-v6";
const ASSETS = [
  "/",
  "/index.html",
  "/app.html",
  "/send.html",
  "/manifest.json",
  "/firebase-config.js",
  "/backend.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // IGNORE Firebase, APIs, External CDNs, AND .js files (so you get fresh code)
  if (
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin ||
    url.pathname.endsWith(".js")
  )
    return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const resClone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => {
          if (e.request.mode === "navigate") return caches.match("/index.html");
        });
    }),
  );
});
