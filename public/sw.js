// ICEPOS SI Service Worker — offline podpora za blagajno
// Cache-a app shell (HTML, CSS, JS) za delo brez interneta
// API klici gredo vedno na server (network-first), fallback na cache

const CACHE_NAME = "icepos-si-v1";
const APP_SHELL = [
  "/",
  "/manifest.json",
];

// Install — cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate — počisti stare cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first za API, cache-first za statične datoteke
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ne posegaj v WebSocket
  if (event.request.url.startsWith("ws://") || event.request.url.startsWith("wss://")) {
    return;
  }

  // API klici — network first, fallback na cache (offline read-only)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache uspešne GET response
          if (event.request.method === "GET" && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Statične datoteke (HTML, CSS, JS, slike) — cache first
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match("/"));
      })
    );
  }
});
